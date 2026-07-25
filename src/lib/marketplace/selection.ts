import { getDb } from "@/lib/db";
import {
  appendOrderStatusHistory,
  transitionOrderInTransaction,
} from "@/lib/orders/lifecycle";
import type { OrderStatus, OrderType, ScheduleKind } from "@/lib/orders/types";
import { syncTaskStatusForOrder } from "@/lib/tasks/sync";

import { expireOffers } from "./offers";
import { specialistLabel } from "./ranking";
import type { SelectedMaster } from "./types";

const incompatibleStatuses = [
  "MASTER_SELECTED",
  "MASTER_CONFIRMED",
  "MASTER_ON_THE_WAY",
  "MASTER_ARRIVED",
  "ASSIGNED",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED_BY_MASTER",
  "AWAITING_CONFIRMATION",
] as const;

type SelectionOfferRow = {
  masterId: string;
  name: string;
  avatarId: string | null;
  categorySlug: string;
  categoryName: string;
  proposedPriceMinor: number;
  etaMinutes: number;
};

export type SelectedOrderForMaster = {
  id: string;
  status: OrderStatus;
  description: string;
  categoryName: string;
  subcategoryName: string;
  city: string;
  street: string;
  house: string;
  apartment: string;
  addressComment: string;
  scheduleKind: ScheduleKind;
  scheduledAt: number | null;
  orderType: OrderType;
  agreedPriceRubles: number;
  selectedAt: number;
};

function isMasterBusy(database: ReturnType<typeof getDb>, masterId: string, excludedOrderId: string) {
  const placeholders = incompatibleStatuses.map(() => "?").join(", ");
  return Boolean(database
    .prepare(
      `SELECT 1
      FROM order_assignments
      INNER JOIN orders ON orders.id = order_assignments.order_id
      WHERE order_assignments.master_id = ?
        AND orders.id != ?
        AND orders.status IN (${placeholders})`,
    )
    .get(masterId, excludedOrderId, ...incompatibleStatuses));
}

export function selectMasterOffer(input: {
  clientId: string;
  orderId: string;
  offerId: string;
  now?: number;
}) {
  const now = input.now ?? Date.now();
  expireOffers(now);
  const database = getDb();

  return database.transaction(() => {
    const order = database
      .prepare(
        `SELECT status, selected_master_id AS selectedMasterId
        FROM orders WHERE id = ? AND client_id = ?`,
      )
      .get(input.orderId, input.clientId) as
        | { status: OrderStatus; selectedMasterId: string | null }
        | undefined;
    if (!order) throw new Error("ORDER_NOT_FOUND");
    if (order.selectedMasterId || ["MASTER_SELECTED", "MASTER_CONFIRMED"].includes(order.status)) {
      throw new Error("MASTER_ALREADY_SELECTED");
    }
    if (order.status !== "OFFERS_RECEIVED") throw new Error("ORDER_NOT_SELECTABLE");

    const offer = database
      .prepare(
        `SELECT
          master_offers.master_id AS masterId,
          users.name,
          (
            SELECT id FROM master_media
            WHERE master_media.master_id = master_offers.master_id
              AND master_media.kind = 'AVATAR'
            ORDER BY created_at DESC LIMIT 1
          ) AS avatarId,
          service_categories.slug AS categorySlug,
          service_categories.name AS categoryName,
          master_offers.proposed_price_minor AS proposedPriceMinor,
          master_offers.eta_minutes AS etaMinutes
        FROM master_offers
        INNER JOIN orders ON orders.id = master_offers.order_id
        INNER JOIN users ON users.id = master_offers.master_id
        INNER JOIN master_profiles ON master_profiles.master_id = master_offers.master_id
        INNER JOIN service_categories ON service_categories.id = orders.category_id
        WHERE master_offers.id = ?
          AND master_offers.order_id = ?
          AND master_offers.status = 'ACTIVE'
          AND master_offers.expires_at > ?
          AND master_profiles.verification_status = 'VERIFIED'
          AND master_profiles.is_online = 1
          AND master_profiles.is_blocked = 0
          AND users.is_blocked = 0
          AND master_profiles.onboarding_completed = 1`,
      )
      .get(input.offerId, input.orderId, now) as SelectionOfferRow | undefined;
    if (!offer) throw new Error("OFFER_NOT_AVAILABLE");
    if (isMasterBusy(database, offer.masterId, input.orderId)) throw new Error("MASTER_BUSY");

    const accepted = database
      .prepare(
        `UPDATE master_offers
        SET status = 'ACCEPTED', updated_at = ?
        WHERE id = ? AND order_id = ? AND status = 'ACTIVE' AND expires_at > ?`,
      )
      .run(now, input.offerId, input.orderId, now);
    if (accepted.changes !== 1) throw new Error("OFFER_NOT_AVAILABLE");

    const selected = database
      .prepare(
        `UPDATE orders
        SET status = 'MASTER_SELECTED', selected_master_id = ?, selected_offer_id = ?,
            agreed_price_minor = ?, master_selected_at = ?, updated_at = ?,
            version = version + 1
        WHERE id = ? AND client_id = ? AND status = 'OFFERS_RECEIVED'
          AND selected_master_id IS NULL AND selected_offer_id IS NULL`,
      )
      .run(
        offer.masterId,
        input.offerId,
        offer.proposedPriceMinor,
        now,
        now,
        input.orderId,
        input.clientId,
      );
    if (selected.changes !== 1) throw new Error("MASTER_ALREADY_SELECTED");

    appendOrderStatusHistory(database, {
      orderId: input.orderId,
      fromStatus: "OFFERS_RECEIVED",
      toStatus: "MASTER_SELECTED",
      actorUserId: input.clientId,
      actorRole: "CLIENT",
      createdAt: now,
    });
    syncTaskStatusForOrder(database, input.orderId, "MASTER_SELECTED", now);

    try {
      database
        .prepare(
          `INSERT INTO order_assignments (order_id, master_id, assigned_at)
          VALUES (?, ?, ?)`,
        )
        .run(input.orderId, offer.masterId, now);
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
        throw new Error("MASTER_ALREADY_SELECTED");
      }
      throw error;
    }

    database
      .prepare(
        `UPDATE master_offers
        SET status = 'REJECTED', updated_at = ?
        WHERE order_id = ? AND id != ? AND status = 'ACTIVE'`,
      )
      .run(now, input.orderId, input.offerId);
    database
      .prepare(
        `UPDATE order_matches
        SET status = 'EXPIRED', updated_at = ?
        WHERE order_id = ? AND master_id != ? AND status != 'SKIPPED'`,
      )
      .run(now, input.orderId, offer.masterId);

    return {
      orderId: input.orderId,
      masterId: offer.masterId,
      offerId: input.offerId,
      name: offer.name,
      avatarUrl: offer.avatarId ? `/api/master-media/${offer.avatarId}` : null,
      specialization: specialistLabel(offer.categorySlug, offer.categoryName),
      agreedPriceRubles: offer.proposedPriceMinor / 100,
      etaMinutes: offer.etaMinutes,
      status: "MASTER_SELECTED",
      selectedAt: now,
      confirmedAt: null,
    } satisfies SelectedMaster;
  })();
}

export function confirmMasterSelection(masterId: string, orderId: string, now = Date.now()) {
  const database = getDb();
  return database.transaction(() => {
    const order = database
      .prepare(
        `SELECT status, selected_master_id AS selectedMasterId
        FROM orders WHERE id = ?`,
      )
      .get(orderId) as { status: OrderStatus; selectedMasterId: string | null } | undefined;
    if (!order || order.selectedMasterId !== masterId) throw new Error("SELECTION_NOT_FOUND");
    if (order.status === "MASTER_CONFIRMED") throw new Error("SELECTION_ALREADY_CONFIRMED");
    if (order.status !== "MASTER_SELECTED") throw new Error("SELECTION_NOT_CONFIRMABLE");
    if (isMasterBusy(database, masterId, orderId)) throw new Error("MASTER_BUSY");

    const assignment = database
      .prepare("SELECT master_id AS masterId FROM order_assignments WHERE order_id = ?")
      .get(orderId) as { masterId: string } | undefined;
    if (!assignment || assignment.masterId !== masterId) throw new Error("SELECTION_NOT_FOUND");

    transitionOrderInTransaction(database, {
      orderId,
      actorId: masterId,
      actorRole: "MASTER",
      toStatus: "MASTER_CONFIRMED",
      now,
    });
  })();
}

export function getSelectedMasterForClient(clientId: string, orderId: string) {
  const row = getDb()
    .prepare(
      `SELECT
        orders.id AS orderId,
        orders.selected_master_id AS masterId,
        orders.selected_offer_id AS offerId,
        users.name,
        (
          SELECT id FROM master_media
          WHERE master_media.master_id = orders.selected_master_id
            AND master_media.kind = 'AVATAR'
          ORDER BY created_at DESC LIMIT 1
        ) AS avatarId,
        service_categories.slug AS categorySlug,
        service_categories.name AS categoryName,
        orders.agreed_price_minor AS agreedPriceMinor,
        master_offers.eta_minutes AS etaMinutes,
        orders.status,
        orders.master_selected_at AS selectedAt,
        orders.master_confirmed_at AS confirmedAt
      FROM orders
      INNER JOIN users ON users.id = orders.selected_master_id
      INNER JOIN master_offers ON master_offers.id = orders.selected_offer_id
      INNER JOIN service_categories ON service_categories.id = orders.category_id
      WHERE orders.id = ? AND orders.client_id = ?
        AND orders.status IN (
          'MASTER_SELECTED', 'MASTER_CONFIRMED', 'MASTER_ON_THE_WAY',
          'MASTER_ARRIVED', 'IN_PROGRESS', 'COMPLETED_BY_MASTER',
          'COMPLETED', 'REVIEWED', 'DISPUTED',
          'CANCELLED_BY_CLIENT', 'CANCELLED_BY_MASTER'
        )`,
    )
    .get(orderId, clientId) as
      | {
          orderId: string;
          masterId: string;
          offerId: string;
          name: string;
          avatarId: string | null;
          categorySlug: string;
          categoryName: string;
          agreedPriceMinor: number;
          etaMinutes: number;
          status: OrderStatus;
          selectedAt: number;
          confirmedAt: number | null;
        }
      | undefined;
  if (!row) return null;
  return {
    orderId: row.orderId,
    masterId: row.masterId,
    offerId: row.offerId,
    name: row.name,
    avatarUrl: row.avatarId ? `/api/master-media/${row.avatarId}` : null,
    specialization: specialistLabel(row.categorySlug, row.categoryName),
    agreedPriceRubles: row.agreedPriceMinor / 100,
    etaMinutes: row.etaMinutes,
    status: row.status,
    selectedAt: row.selectedAt,
    confirmedAt: row.confirmedAt,
  } satisfies SelectedMaster;
}

export function getSelectedOrderForMaster(masterId: string, orderId?: string) {
  const orderFilter = orderId ? "AND orders.id = ?" : "";
  const parameters = orderId ? [masterId, orderId] : [masterId];
  const row = getDb()
    .prepare(
      `SELECT
        orders.id,
        orders.status,
        orders.description,
        service_categories.name AS categoryName,
        service_subcategories.name AS subcategoryName,
        orders.address_city AS city,
        orders.address_street AS street,
        orders.address_house AS house,
        orders.address_apartment AS apartment,
        orders.address_comment AS addressComment,
        orders.schedule_kind AS scheduleKind,
        orders.scheduled_at AS scheduledAt,
        orders.order_type AS orderType,
        orders.agreed_price_minor AS agreedPriceMinor,
        orders.master_selected_at AS selectedAt
      FROM orders
      INNER JOIN order_assignments ON order_assignments.order_id = orders.id
      INNER JOIN service_categories ON service_categories.id = orders.category_id
      LEFT JOIN service_subcategories ON service_subcategories.id = orders.subcategory_id
      WHERE order_assignments.master_id = ?
        AND orders.status IN (
          'MASTER_SELECTED', 'MASTER_CONFIRMED', 'ASSIGNED', 'EN_ROUTE',
          'MASTER_ON_THE_WAY', 'MASTER_ARRIVED', 'ARRIVED', 'IN_PROGRESS',
          'COMPLETED_BY_MASTER', 'AWAITING_CONFIRMATION'
        )
        ${orderFilter}
      ORDER BY orders.master_selected_at DESC
      LIMIT 1`,
    )
    .get(...parameters) as
      | {
          id: string;
          status: OrderStatus;
          description: string;
          categoryName: string;
          subcategoryName: string | null;
          city: string;
          street: string;
          house: string;
          apartment: string | null;
          addressComment: string | null;
          scheduleKind: ScheduleKind;
          scheduledAt: number | null;
          orderType: OrderType;
          agreedPriceMinor: number;
          selectedAt: number;
        }
      | undefined;
  if (!row) return null;
  return {
    ...row,
    subcategoryName: row.subcategoryName ?? "",
    apartment: row.apartment ?? "",
    addressComment: row.addressComment ?? "",
    agreedPriceRubles: row.agreedPriceMinor / 100,
  } satisfies SelectedOrderForMaster;
}
