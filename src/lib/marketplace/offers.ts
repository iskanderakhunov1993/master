import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";
import { appendAnalyticsEvent } from "@/lib/analytics/events";
import { appendOrderStatusHistory } from "@/lib/orders/lifecycle";

import { getMarketplaceConfig } from "./config";
import { isMasterEligibleForOrder } from "./matching";
import type { MasterOffer, MasterOfferStatus } from "./types";

type OfferRow = {
  id: string;
  orderId: string;
  masterId: string;
  proposedPriceMinor: number;
  etaMinutes: number;
  comment: string | null;
  status: MasterOfferStatus;
  createdAt: number;
  expiresAt: number;
};

function mapOffer(row: OfferRow): MasterOffer {
  return {
    id: row.id,
    orderId: row.orderId,
    masterId: row.masterId,
    proposedPriceRubles: row.proposedPriceMinor / 100,
    etaMinutes: row.etaMinutes,
    comment: row.comment ?? "",
    status: row.status,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  };
}

function expireOffersInTransaction(now: number) {
  const database = getDb();
  const expired = database
    .prepare(
      `SELECT order_id AS orderId, master_id AS masterId
      FROM master_offers
      WHERE status = 'ACTIVE' AND expires_at <= ?`,
    )
    .all(now) as Array<{ orderId: string; masterId: string }>;
  if (expired.length === 0) return 0;

  database
    .prepare(
      `UPDATE master_offers
      SET status = 'EXPIRED', updated_at = ?
      WHERE status = 'ACTIVE' AND expires_at <= ?`,
    )
    .run(now, now);

  const resetMatch = database.prepare(
    `UPDATE order_matches
    SET status = CASE WHEN expires_at > ? THEN 'VIEWED' ELSE 'EXPIRED' END, updated_at = ?
    WHERE order_id = ? AND master_id = ? AND status = 'OFFERED'`,
  );
  for (const offer of expired) resetMatch.run(now, now, offer.orderId, offer.masterId);

  const affectedOrderIds = [...new Set(expired.map((offer) => offer.orderId))];
  const resetOrder = database.prepare(
    `UPDATE orders
    SET status = 'SEARCHING_MASTERS', updated_at = ?, version = version + 1
    WHERE id = ? AND status = 'OFFERS_RECEIVED'
      AND NOT EXISTS (
        SELECT 1 FROM master_offers
        WHERE master_offers.order_id = orders.id
          AND master_offers.status = 'ACTIVE'
          AND master_offers.expires_at > ?
      )`,
  );
  for (const orderId of affectedOrderIds) {
    const reset = resetOrder.run(now, orderId, now);
    if (reset.changes === 1) {
      appendOrderStatusHistory(database, {
        orderId,
        fromStatus: "OFFERS_RECEIVED",
        toStatus: "SEARCHING_MASTERS",
        actorRole: "SYSTEM",
        createdAt: now,
        reason: "Все активные предложения истекли",
      });
    }
  }
  return expired.length;
}

export function expireOffers(now = Date.now()) {
  return getDb().transaction(() => expireOffersInTransaction(now))();
}

export function createMasterOffer(input: {
  orderId: string;
  masterId: string;
  proposedPriceRubles?: number;
  etaMinutes: number;
  comment?: string;
  acceptClientPrice: boolean;
  now?: number;
}) {
  const database = getDb();
  return database.transaction(() => {
    const now = input.now ?? Date.now();
    expireOffersInTransaction(now);

    const order = database
      .prepare(
        `SELECT status, total_price_minor AS totalPriceMinor
        FROM orders WHERE id = ?`,
      )
      .get(input.orderId) as { status: string; totalPriceMinor: number | null } | undefined;
    if (!order || !["SEARCHING_MASTERS", "OFFERS_RECEIVED"].includes(order.status)) {
      throw new Error("ORDER_NOT_OPEN");
    }
    if (!order.totalPriceMinor) throw new Error("ORDER_PRICE_MISSING");
    if (!isMasterEligibleForOrder(input.masterId, input.orderId)) {
      throw new Error("MASTER_NOT_ELIGIBLE");
    }

    const duplicate = database
      .prepare(
        `SELECT 1 FROM master_offers
        WHERE order_id = ? AND master_id = ? AND status = 'ACTIVE' AND expires_at > ?`,
      )
      .get(input.orderId, input.masterId, now);
    if (duplicate) throw new Error("DUPLICATE_OFFER");

    const match = database
      .prepare(
        `SELECT id
        FROM order_matches
        WHERE order_id = ? AND master_id = ?
          AND status IN ('NEW', 'VIEWED') AND expires_at > ?`,
      )
      .get(input.orderId, input.masterId, now) as { id: string } | undefined;
    if (!match) throw new Error("MATCH_NOT_AVAILABLE");

    const proposedPriceMinor = input.acceptClientPrice
      ? order.totalPriceMinor
      : Math.round((input.proposedPriceRubles ?? 0) * 100);
    if (proposedPriceMinor < 50_000 || proposedPriceMinor > 100_000_000) {
      throw new Error("OFFER_PRICE_INVALID");
    }
    if (!Number.isInteger(input.etaMinutes) || input.etaMinutes < 5 || input.etaMinutes > 240) {
      throw new Error("OFFER_ETA_INVALID");
    }
    const comment = input.comment?.trim() ?? "";
    if (comment.length > 500) throw new Error("OFFER_COMMENT_TOO_LONG");

    const id = randomUUID();
    const expiresAt = now + getMarketplaceConfig().offerTtlMinutes * 60_000;
    try {
      database
        .prepare(
          `INSERT INTO master_offers (
            id, order_id, master_id, proposed_price_minor, eta_minutes,
            comment, status, created_at, expires_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`,
        )
        .run(
          id,
          input.orderId,
          input.masterId,
          proposedPriceMinor,
          input.etaMinutes,
          comment || null,
          now,
          expiresAt,
          now,
        );
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
        throw new Error("DUPLICATE_OFFER");
      }
      throw error;
    }

    database
      .prepare("UPDATE order_matches SET status = 'OFFERED', updated_at = ? WHERE id = ?")
      .run(now, match.id);
    const orderUpdated = database
      .prepare(
        `UPDATE orders
        SET status = 'OFFERS_RECEIVED', updated_at = ?, version = version + 1
        WHERE id = ? AND status = 'SEARCHING_MASTERS'`,
      )
      .run(now, input.orderId);
    if (orderUpdated.changes === 1) {
      appendOrderStatusHistory(database, {
        orderId: input.orderId,
        fromStatus: "SEARCHING_MASTERS",
        toStatus: "OFFERS_RECEIVED",
        actorUserId: input.masterId,
        actorRole: "MASTER",
        createdAt: now,
      });
    }
    appendAnalyticsEvent(database, { name: "offer_created", actorId: input.masterId, actorRole: "MASTER", orderId: input.orderId, occurredAt: now });

    return {
      id,
      orderId: input.orderId,
      masterId: input.masterId,
      proposedPriceRubles: proposedPriceMinor / 100,
      etaMinutes: input.etaMinutes,
      comment,
      status: "ACTIVE",
      createdAt: now,
      expiresAt,
    } satisfies MasterOffer;
  })();
}

export function listMasterOffers(masterId: string, now = Date.now()) {
  expireOffers(now);
  const rows = getDb()
    .prepare(
      `SELECT
        id,
        order_id AS orderId,
        master_id AS masterId,
        proposed_price_minor AS proposedPriceMinor,
        eta_minutes AS etaMinutes,
        comment,
        status,
        created_at AS createdAt,
        expires_at AS expiresAt
      FROM master_offers
      WHERE master_id = ?
      ORDER BY created_at DESC`,
    )
    .all(masterId) as OfferRow[];
  return rows.map(mapOffer);
}
