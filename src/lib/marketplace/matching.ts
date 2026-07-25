import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";
import type { OrderType, ScheduleKind } from "@/lib/orders/types";

import { getMarketplaceConfig } from "./config";
import type { MatchedOrder, OrderMatchStatus } from "./types";

const incompatibleOrderStatuses = [
  "MASTER_SELECTED",
  "MASTER_CONFIRMED",
  "MASTER_ON_THE_WAY",
  "MASTER_ARRIVED",
  "COMPLETED_BY_MASTER",
  "ASSIGNED",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
  "AWAITING_CONFIRMATION",
] as const;

type OpenOrderRow = {
  id: string;
  orderType: OrderType;
};

type MatchFeedRow = {
  matchId: string;
  orderId: string;
  matchStatus: OrderMatchStatus;
  categoryName: string;
  subcategoryName: string | null;
  description: string;
  serviceAreaName: string;
  city: string;
  approximateDistanceX10: number;
  scheduleKind: ScheduleKind;
  scheduledAt: number | null;
  orderType: OrderType;
  clientPriceMinor: number;
  createdAt: number;
  expiresAt: number;
};

function approximateDistanceX10(orderId: string, masterId: string) {
  let hash = 2166136261;
  for (const character of `${orderId}:${masterId}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return 12 + (Math.abs(hash) % 89);
}

function matchExpiry(orderType: OrderType, now: number) {
  const config = getMarketplaceConfig();
  const minutes = orderType === "URGENT"
    ? config.urgentMatchTtlMinutes
    : config.normalMatchTtlMinutes;
  return now + minutes * 60_000;
}

export function expireOrderMatches(now = Date.now()) {
  return getDb()
    .prepare(
      `UPDATE order_matches
      SET status = 'EXPIRED', updated_at = ?
      WHERE status IN ('NEW', 'VIEWED') AND expires_at <= ?`,
    )
    .run(now, now).changes;
}

/**
 * Central eligibility check. It deliberately does not depend on any UI state.
 * A missing ServiceArea relation means the order is not matchable.
 */
export function isMasterEligibleForOrder(masterId: string, orderId: string) {
  const statusPlaceholders = incompatibleOrderStatuses.map(() => "?").join(", ");
  return Boolean(
    getDb()
      .prepare(
        `SELECT 1
        FROM orders
        INNER JOIN order_service_areas ON order_service_areas.order_id = orders.id
        INNER JOIN master_profiles ON master_profiles.master_id = ?
        INNER JOIN users ON users.id = master_profiles.master_id
        WHERE orders.id = ?
          AND orders.status IN ('SEARCHING_MASTERS', 'OFFERS_RECEIVED')
          AND master_profiles.is_online = 1
          AND master_profiles.is_blocked = 0
          AND users.is_blocked = 0
          AND master_profiles.verification_status = 'VERIFIED'
          AND master_profiles.onboarding_completed = 1
          AND EXISTS (
            SELECT 1 FROM master_categories
            WHERE master_categories.master_id = master_profiles.master_id
              AND master_categories.category_id = orders.category_id
          )
          AND EXISTS (
            SELECT 1 FROM master_service_areas
            WHERE master_service_areas.master_id = master_profiles.master_id
              AND master_service_areas.service_area_id = order_service_areas.service_area_id
          )
          AND NOT EXISTS (
            SELECT 1
            FROM order_assignments
            INNER JOIN orders AS assigned_order ON assigned_order.id = order_assignments.order_id
            WHERE order_assignments.master_id = master_profiles.master_id
              AND assigned_order.status IN (${statusPlaceholders})
          )`,
      )
      .get(masterId, orderId, ...incompatibleOrderStatuses),
  );
}

export function findEligibleMasterIds(orderId: string) {
  const candidates = getDb()
    .prepare(
      `SELECT master_profiles.master_id AS masterId
      FROM master_profiles
      INNER JOIN users ON users.id = master_profiles.master_id
      WHERE master_profiles.is_online = 1
        AND master_profiles.is_blocked = 0
        AND users.is_blocked = 0
        AND master_profiles.verification_status = 'VERIFIED'
        AND master_profiles.onboarding_completed = 1
      ORDER BY master_profiles.rating_x100 DESC, master_profiles.completed_jobs DESC`,
    )
    .all() as Array<{ masterId: string }>;

  return candidates
    .map((candidate) => candidate.masterId)
    .filter((masterId) => isMasterEligibleForOrder(masterId, orderId));
}

function insertMatch(order: OpenOrderRow, masterId: string, now: number) {
  const database = getDb();
  const skipped = database
    .prepare("SELECT 1 FROM master_order_skips WHERE order_id = ? AND master_id = ?")
    .get(order.id, masterId);
  if (skipped || !isMasterEligibleForOrder(masterId, order.id)) return false;

  return database
    .prepare(
      `INSERT INTO order_matches (
        id, order_id, master_id, status, approx_distance_km_x10,
        created_at, expires_at, updated_at
      ) VALUES (?, ?, ?, 'NEW', ?, ?, ?, ?)
      ON CONFLICT(order_id, master_id) DO UPDATE SET
        status = 'NEW',
        approx_distance_km_x10 = excluded.approx_distance_km_x10,
        created_at = excluded.created_at,
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at
      WHERE order_matches.status = 'EXPIRED'`,
    )
    .run(
      randomUUID(),
      order.id,
      masterId,
      approximateDistanceX10(order.id, masterId),
      now,
      matchExpiry(order.orderType, now),
      now,
    ).changes === 1;
}

export function matchOrder(orderId: string, now = Date.now()) {
  const database = getDb();
  return database.transaction(() => {
    expireOrderMatches(now);
    const order = database
      .prepare(
        `SELECT id, order_type AS orderType
        FROM orders
        WHERE id = ? AND status IN ('SEARCHING_MASTERS', 'OFFERS_RECEIVED')`,
      )
      .get(orderId) as OpenOrderRow | undefined;
    if (!order) throw new Error("ORDER_NOT_OPEN");

    let created = 0;
    for (const masterId of findEligibleMasterIds(orderId)) {
      if (insertMatch(order, masterId, now)) created += 1;
    }
    return created;
  })();
}

export function matchOpenOrdersForMaster(masterId: string, now = Date.now()) {
  const database = getDb();
  return database.transaction(() => {
    expireOrderMatches(now);
    const orders = database
      .prepare(
        `SELECT id, order_type AS orderType
        FROM orders
        WHERE status IN ('SEARCHING_MASTERS', 'OFFERS_RECEIVED')
        ORDER BY submitted_at DESC`,
      )
      .all() as OpenOrderRow[];

    let created = 0;
    for (const order of orders) {
      if (insertMatch(order, masterId, now)) created += 1;
    }
    return created;
  })();
}

export function listMatchedOrdersForMaster(masterId: string, now = Date.now()) {
  expireOrderMatches(now);
  const statusPlaceholders = incompatibleOrderStatuses.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(
      `SELECT
        order_matches.id AS matchId,
        orders.id AS orderId,
        order_matches.status AS matchStatus,
        service_categories.name AS categoryName,
        service_subcategories.name AS subcategoryName,
        orders.description,
        service_areas.name AS serviceAreaName,
        service_areas.city,
        order_matches.approx_distance_km_x10 AS approximateDistanceX10,
        orders.schedule_kind AS scheduleKind,
        orders.scheduled_at AS scheduledAt,
        orders.order_type AS orderType,
        orders.total_price_minor AS clientPriceMinor,
        order_matches.created_at AS createdAt,
        order_matches.expires_at AS expiresAt
      FROM order_matches
      INNER JOIN orders ON orders.id = order_matches.order_id
      INNER JOIN service_categories ON service_categories.id = orders.category_id
      LEFT JOIN service_subcategories ON service_subcategories.id = orders.subcategory_id
      INNER JOIN order_service_areas ON order_service_areas.order_id = orders.id
      INNER JOIN service_areas ON service_areas.id = order_service_areas.service_area_id
      INNER JOIN master_profiles ON master_profiles.master_id = order_matches.master_id
      INNER JOIN users ON users.id = master_profiles.master_id
      WHERE order_matches.master_id = ?
        AND order_matches.status IN ('NEW', 'VIEWED')
        AND order_matches.expires_at > ?
        AND orders.status IN ('SEARCHING_MASTERS', 'OFFERS_RECEIVED')
        AND master_profiles.is_online = 1
        AND master_profiles.is_blocked = 0
        AND users.is_blocked = 0
        AND master_profiles.verification_status = 'VERIFIED'
        AND master_profiles.onboarding_completed = 1
        AND EXISTS (
          SELECT 1 FROM master_categories
          WHERE master_categories.master_id = master_profiles.master_id
            AND master_categories.category_id = orders.category_id
        )
        AND EXISTS (
          SELECT 1 FROM master_service_areas
          WHERE master_service_areas.master_id = master_profiles.master_id
            AND master_service_areas.service_area_id = order_service_areas.service_area_id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM order_assignments
          INNER JOIN orders AS assigned_order ON assigned_order.id = order_assignments.order_id
          WHERE order_assignments.master_id = master_profiles.master_id
            AND assigned_order.status IN (${statusPlaceholders})
        )
      ORDER BY orders.order_type = 'URGENT' DESC, order_matches.created_at DESC`,
    )
    .all(masterId, now, ...incompatibleOrderStatuses) as MatchFeedRow[];

  const photosByOrder = new Map<string, Array<{ id: string }>>();
  if (rows.length > 0) {
    const orderIds = [...new Set(rows.map((row) => row.orderId))];
    const placeholders = orderIds.map(() => "?").join(", ");
    const mediaRows = getDb()
      .prepare(
        `SELECT order_id AS orderId, id
        FROM order_media
        WHERE order_id IN (${placeholders})
        ORDER BY order_id, created_at`,
      )
      .all(...orderIds) as Array<{ orderId: string; id: string }>;
    for (const media of mediaRows) {
      const photos = photosByOrder.get(media.orderId) ?? [];
      if (photos.length < 5) photos.push({ id: media.id });
      photosByOrder.set(media.orderId, photos);
    }
  }

  return rows.map<MatchedOrder>((row) => ({
    matchId: row.matchId,
    orderId: row.orderId,
    matchStatus: row.matchStatus,
    categoryName: row.categoryName,
    subcategoryName: row.subcategoryName ?? "",
    description: row.description,
    serviceAreaName: row.serviceAreaName,
    city: row.city,
    approximateDistanceKm: row.approximateDistanceX10 / 10,
    scheduleKind: row.scheduleKind,
    scheduledAt: row.scheduledAt,
    orderType: row.orderType,
    clientPriceRubles: row.clientPriceMinor / 100,
    photos: (photosByOrder.get(row.orderId) ?? []).map((media) => ({
      id: media.id,
      url: `/api/order-media/${media.id}`,
    })),
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  }));
}

export function skipMatchedOrder(masterId: string, orderId: string, now = Date.now()) {
  const database = getDb();
  return database.transaction(() => {
    const match = database
      .prepare(
        `SELECT id FROM order_matches
        WHERE order_id = ? AND master_id = ?
          AND status IN ('NEW', 'VIEWED') AND expires_at > ?`,
      )
      .get(orderId, masterId, now) as { id: string } | undefined;
    if (!match) throw new Error("MATCH_NOT_AVAILABLE");

    database
      .prepare(
        `INSERT INTO master_order_skips (order_id, master_id, skipped_at)
        VALUES (?, ?, ?)
        ON CONFLICT(order_id, master_id) DO UPDATE SET skipped_at = excluded.skipped_at`,
      )
      .run(orderId, masterId, now);
    database
      .prepare("UPDATE order_matches SET status = 'SKIPPED', updated_at = ? WHERE id = ?")
      .run(now, match.id);
  })();
}

export function getOrderSearchMeta(orderId: string, now = Date.now()) {
  expireOrderMatches(now);
  const row = getDb()
    .prepare(
      `SELECT
        COUNT(DISTINCT CASE
          WHEN order_matches.status IN ('NEW', 'VIEWED', 'OFFERED')
            AND order_matches.expires_at > ? THEN order_matches.master_id
        END) AS matchedMasters,
        COUNT(DISTINCT CASE
          WHEN master_offers.status = 'ACTIVE' AND master_offers.expires_at > ?
            THEN master_offers.id
        END) AS activeOffers
      FROM orders
      LEFT JOIN order_matches ON order_matches.order_id = orders.id
      LEFT JOIN master_offers ON master_offers.order_id = orders.id
      WHERE orders.id = ?`,
    )
    .get(now, now, orderId) as { matchedMasters: number; activeOffers: number };
  return row;
}
