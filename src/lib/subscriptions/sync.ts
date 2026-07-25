import { randomUUID } from "node:crypto";

import type Database from "better-sqlite3";

import type { SubscriptionFrequency } from "./types";

type SubscriptionOrderSource = {
  subscriptionId: string;
  clientId: string;
  categoryId: string;
  subcategoryId: string | null;
  addressId: string | null;
  serviceAreaId: string;
  description: string;
  addressCity: string;
  addressStreet: string;
  addressHouse: string;
  addressApartment: string | null;
  addressComment: string | null;
  frequency: SubscriptionFrequency;
  nextServiceAt: number;
  basePriceMinor: number;
  currentCycle: number;
};

type ResumableSubscriptionOrderSource = SubscriptionOrderSource & {
  currentOrderStatus: string | null;
};

const day = 24 * 60 * 60 * 1000;

export function getNextSubscriptionDate(from: number, frequency: SubscriptionFrequency) {
  const date = new Date(from);
  if (frequency === "WEEKLY") return from + 7 * day;
  if (frequency === "BIWEEKLY") return from + 14 * day;
  date.setMonth(date.getMonth() + 1);
  return date.getTime();
}

export function insertSubscriptionOrder(
  database: Database.Database,
  source: SubscriptionOrderSource,
  scheduledAt: number,
  cycleNumber: number,
  now: number,
) {
  const orderId = randomUUID();
  database
    .prepare(
      `INSERT INTO orders (
        id, client_id, status, description, category_id, subcategory_id,
        address_id, address_city, address_street, address_house,
        address_apartment, address_comment, schedule_kind, scheduled_at,
        order_type, base_price_minor, urgency_multiplier_bps, total_price_minor,
        current_step, version, created_at, updated_at, submitted_at
      ) VALUES (?, ?, 'SEARCHING_MASTERS', ?, ?, ?, ?, ?, ?, ?, ?, ?,
        'CUSTOM', ?, 'NORMAL', ?, 10000, ?, 8, 1, ?, ?, ?)`,
    )
    .run(
      orderId,
      source.clientId,
      source.description,
      source.categoryId,
      source.subcategoryId,
      source.addressId,
      source.addressCity,
      source.addressStreet,
      source.addressHouse,
      source.addressApartment,
      source.addressComment,
      scheduledAt,
      source.basePriceMinor,
      source.basePriceMinor,
      now,
      now,
      now,
    );
  database
    .prepare("INSERT INTO order_service_areas (order_id, service_area_id) VALUES (?, ?)")
    .run(orderId, source.serviceAreaId);
  database
    .prepare(
      `INSERT INTO subscription_orders (subscription_id, order_id, cycle_number, created_at)
      VALUES (?, ?, ?, ?)`,
    )
    .run(source.subscriptionId, orderId, cycleNumber, now);
  database
    .prepare(
      `INSERT INTO order_status_history (
        id, order_id, from_status, to_status, actor_user_id, actor_role, reason, created_at
      ) VALUES (?, ?, NULL, 'SEARCHING_MASTERS', ?, 'SYSTEM', ?, ?)`,
    )
    .run(
      randomUUID(),
      orderId,
      source.clientId,
      `Регулярный выезд по подписке, цикл ${cycleNumber}`,
      now,
    );
  return orderId;
}

export function advanceSubscriptionAfterCompletedOrder(
  database: Database.Database,
  orderId: string,
  now: number,
) {
  const source = database
    .prepare(
      `SELECT
        service_subscriptions.id AS subscriptionId,
        service_subscriptions.client_id AS clientId,
        service_subscriptions.category_id AS categoryId,
        service_subscriptions.subcategory_id AS subcategoryId,
        service_subscriptions.address_id AS addressId,
        service_subscriptions.service_area_id AS serviceAreaId,
        service_subscriptions.description,
        service_subscriptions.address_city AS addressCity,
        service_subscriptions.address_street AS addressStreet,
        service_subscriptions.address_house AS addressHouse,
        service_subscriptions.address_apartment AS addressApartment,
        service_subscriptions.address_comment AS addressComment,
        service_subscriptions.frequency,
        service_subscriptions.next_service_at AS nextServiceAt,
        service_subscriptions.base_price_minor AS basePriceMinor,
        subscription_orders.cycle_number AS currentCycle
      FROM subscription_orders
      INNER JOIN service_subscriptions
        ON service_subscriptions.id = subscription_orders.subscription_id
      WHERE subscription_orders.order_id = ?
        AND service_subscriptions.status = 'ACTIVE'
        AND subscription_orders.cycle_number = (
          SELECT MAX(latest.cycle_number)
          FROM subscription_orders AS latest
          WHERE latest.subscription_id = subscription_orders.subscription_id
        )`,
    )
    .get(orderId) as SubscriptionOrderSource | undefined;

  if (!source) return null;
  return insertNextSubscriptionCycle(database, source, now);
}

function insertNextSubscriptionCycle(
  database: Database.Database,
  source: SubscriptionOrderSource,
  now: number,
) {
  const nextServiceAt = getNextSubscriptionDate(source.nextServiceAt, source.frequency);
  const nextOrderId = insertSubscriptionOrder(
    database,
    source,
    nextServiceAt,
    source.currentCycle + 1,
    now,
  );
  database
    .prepare(
      `UPDATE service_subscriptions
      SET next_service_at = ?, updated_at = ?
      WHERE id = ? AND status = 'ACTIVE'`,
    )
    .run(nextServiceAt, now, source.subscriptionId);
  return nextOrderId;
}

export function resumeSubscriptionWithNextOrder(
  database: Database.Database,
  subscriptionId: string,
  now: number,
) {
  const source = database
    .prepare(
      `SELECT
        service_subscriptions.id AS subscriptionId,
        service_subscriptions.client_id AS clientId,
        service_subscriptions.category_id AS categoryId,
        service_subscriptions.subcategory_id AS subcategoryId,
        service_subscriptions.address_id AS addressId,
        service_subscriptions.service_area_id AS serviceAreaId,
        service_subscriptions.description,
        service_subscriptions.address_city AS addressCity,
        service_subscriptions.address_street AS addressStreet,
        service_subscriptions.address_house AS addressHouse,
        service_subscriptions.address_apartment AS addressApartment,
        service_subscriptions.address_comment AS addressComment,
        service_subscriptions.frequency,
        service_subscriptions.next_service_at AS nextServiceAt,
        service_subscriptions.base_price_minor AS basePriceMinor,
        COALESCE(subscription_orders.cycle_number, 0) AS currentCycle,
        orders.status AS currentOrderStatus
      FROM service_subscriptions
      LEFT JOIN subscription_orders ON
        subscription_orders.subscription_id = service_subscriptions.id
        AND subscription_orders.cycle_number = (
          SELECT MAX(latest.cycle_number)
          FROM subscription_orders AS latest
          WHERE latest.subscription_id = service_subscriptions.id
        )
      LEFT JOIN orders ON orders.id = subscription_orders.order_id
      WHERE service_subscriptions.id = ? AND service_subscriptions.status = 'ACTIVE'`,
    )
    .get(subscriptionId) as ResumableSubscriptionOrderSource | undefined;
  if (!source) return null;
  const terminalStatuses = new Set([
    "COMPLETED",
    "REVIEWED",
    "CANCELLED_BY_CLIENT",
    "CANCELLED_BY_MASTER",
    "CANCELLED",
  ]);
  if (source.currentOrderStatus && !terminalStatuses.has(source.currentOrderStatus)) return null;
  return insertNextSubscriptionCycle(database, source, now);
}
