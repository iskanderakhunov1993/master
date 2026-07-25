import { randomUUID } from "node:crypto";

import { listClientAddresses } from "@/lib/addresses/repository";
import { getDb } from "@/lib/db";
import { matchOrder } from "@/lib/marketplace/matching";
import { listOrderServiceAreas, listServiceCategories } from "@/lib/orders/repository";

import { insertSubscriptionOrder, resumeSubscriptionWithNextOrder } from "./sync";
import type {
  ClientSubscription,
  SubscriptionInput,
  SubscriptionPageData,
  SubscriptionStatus,
} from "./types";

type SubscriptionRow = {
  id: string;
  categoryId: string;
  categoryName: string;
  subcategoryName: string | null;
  description: string;
  addressCity: string;
  addressStreet: string;
  addressHouse: string;
  addressApartment: string | null;
  frequency: ClientSubscription["frequency"];
  nextServiceAt: number;
  basePriceMinor: number;
  status: SubscriptionStatus;
  currentOrderId: string | null;
  currentOrderStatus: ClientSubscription["currentOrderStatus"];
  currentCycle: number | null;
  createdAt: number;
  updatedAt: number;
};

const subscriptionSelect = `
  SELECT
    service_subscriptions.id,
    service_subscriptions.category_id AS categoryId,
    service_categories.name AS categoryName,
    service_subcategories.name AS subcategoryName,
    service_subscriptions.description,
    service_subscriptions.address_city AS addressCity,
    service_subscriptions.address_street AS addressStreet,
    service_subscriptions.address_house AS addressHouse,
    service_subscriptions.address_apartment AS addressApartment,
    service_subscriptions.frequency,
    service_subscriptions.next_service_at AS nextServiceAt,
    service_subscriptions.base_price_minor AS basePriceMinor,
    service_subscriptions.status,
    subscription_orders.order_id AS currentOrderId,
    orders.status AS currentOrderStatus,
    subscription_orders.cycle_number AS currentCycle,
    service_subscriptions.created_at AS createdAt,
    service_subscriptions.updated_at AS updatedAt
  FROM service_subscriptions
  INNER JOIN service_categories ON service_categories.id = service_subscriptions.category_id
  LEFT JOIN service_subcategories ON service_subcategories.id = service_subscriptions.subcategory_id
  LEFT JOIN subscription_orders ON
    subscription_orders.subscription_id = service_subscriptions.id
    AND subscription_orders.cycle_number = (
      SELECT MAX(latest.cycle_number)
      FROM subscription_orders AS latest
      WHERE latest.subscription_id = service_subscriptions.id
    )
  LEFT JOIN orders ON orders.id = subscription_orders.order_id`;

function mapSubscription(row: SubscriptionRow): ClientSubscription {
  return {
    id: row.id,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    subcategoryName: row.subcategoryName ?? "",
    description: row.description,
    address: {
      city: row.addressCity,
      street: row.addressStreet,
      house: row.addressHouse,
      apartment: row.addressApartment ?? "",
    },
    frequency: row.frequency,
    nextServiceAt: row.nextServiceAt,
    priceRubles: row.basePriceMinor / 100,
    status: row.status,
    currentOrderId: row.currentOrderId,
    currentOrderStatus: row.currentOrderStatus,
    currentCycle: row.currentCycle ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function listClientSubscriptions(clientId: string) {
  const rows = getDb()
    .prepare(
      `${subscriptionSelect}
      WHERE service_subscriptions.client_id = ?
      ORDER BY
        CASE service_subscriptions.status WHEN 'ACTIVE' THEN 1 WHEN 'PAUSED' THEN 2 ELSE 3 END,
        service_subscriptions.next_service_at`,
    )
    .all(clientId) as SubscriptionRow[];
  return rows.map(mapSubscription);
}

export function getClientSubscription(clientId: string, subscriptionId: string) {
  const row = getDb()
    .prepare(
      `${subscriptionSelect}
      WHERE service_subscriptions.id = ? AND service_subscriptions.client_id = ?`,
    )
    .get(subscriptionId, clientId) as SubscriptionRow | undefined;
  return row ? mapSubscription(row) : null;
}

function requireCreationData(clientId: string, input: SubscriptionInput) {
  const database = getDb();
  const category = database
    .prepare("SELECT id FROM service_categories WHERE id = ? AND is_active = 1")
    .get(input.categoryId) as { id: string } | undefined;
  if (!category) throw new Error("SUBSCRIPTION_CATEGORY_NOT_FOUND");

  if (input.subcategoryId) {
    const subcategory = database
      .prepare(
        `SELECT id FROM service_subcategories
        WHERE id = ? AND category_id = ? AND is_active = 1`,
      )
      .get(input.subcategoryId, input.categoryId) as { id: string } | undefined;
    if (!subcategory) throw new Error("SUBSCRIPTION_SUBCATEGORY_NOT_FOUND");
  }

  const address = database
    .prepare(
      `SELECT id, city, street, house, apartment, comment
      FROM client_addresses WHERE id = ? AND client_id = ?`,
    )
    .get(input.addressId, clientId) as
      | { id: string; city: string; street: string; house: string; apartment: string | null; comment: string | null }
      | undefined;
  if (!address) throw new Error("SUBSCRIPTION_ADDRESS_NOT_FOUND");

  const serviceArea = database
    .prepare("SELECT id, city FROM service_areas WHERE id = ? AND is_active = 1")
    .get(input.serviceAreaId) as { id: string; city: string } | undefined;
  if (!serviceArea) throw new Error("SUBSCRIPTION_AREA_NOT_FOUND");
  if (serviceArea.city.trim().toLocaleLowerCase("ru-RU") !== address.city.trim().toLocaleLowerCase("ru-RU")) {
    throw new Error("SUBSCRIPTION_AREA_CITY_MISMATCH");
  }
  return { address };
}

export function createClientSubscription(clientId: string, input: SubscriptionInput, now = Date.now()) {
  const database = getDb();
  const { address } = requireCreationData(clientId, input);
  const subscriptionId = randomUUID();
  const basePriceMinor = Math.round(input.priceRubles * 100);
  const description = input.description.trim();

  const orderId = database.transaction(() => {
    database
      .prepare(
        `INSERT INTO service_subscriptions (
          id, client_id, category_id, subcategory_id, address_id, service_area_id,
          description, address_city, address_street, address_house,
          address_apartment, address_comment, frequency, next_service_at,
          base_price_minor, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
      )
      .run(
        subscriptionId,
        clientId,
        input.categoryId,
        input.subcategoryId || null,
        address.id,
        input.serviceAreaId,
        description,
        address.city,
        address.street,
        address.house,
        address.apartment,
        address.comment,
        input.frequency,
        input.firstServiceAt,
        basePriceMinor,
        now,
        now,
      );
    return insertSubscriptionOrder(
      database,
      {
        subscriptionId,
        clientId,
        categoryId: input.categoryId,
        subcategoryId: input.subcategoryId || null,
        addressId: address.id,
        serviceAreaId: input.serviceAreaId,
        description,
        addressCity: address.city,
        addressStreet: address.street,
        addressHouse: address.house,
        addressApartment: address.apartment,
        addressComment: address.comment,
        frequency: input.frequency,
        nextServiceAt: input.firstServiceAt,
        basePriceMinor,
        currentCycle: 0,
      },
      input.firstServiceAt,
      1,
      now,
    );
  })();

  matchOrder(orderId, now);
  return { subscription: getClientSubscription(clientId, subscriptionId)!, orderId };
}

export function updateClientSubscriptionStatus(
  clientId: string,
  subscriptionId: string,
  status: SubscriptionStatus,
  now = Date.now(),
) {
  const current = getClientSubscription(clientId, subscriptionId);
  if (!current) throw new Error("SUBSCRIPTION_NOT_FOUND");
  if (current.status === "CANCELLED") throw new Error("SUBSCRIPTION_CANCELLED");
  const database = getDb();
  const nextOrderId = database.transaction(() => {
    const updated = database
      .prepare(
        `UPDATE service_subscriptions
        SET status = ?, paused_at = CASE WHEN ? = 'PAUSED' THEN ? ELSE NULL END,
            cancelled_at = CASE WHEN ? = 'CANCELLED' THEN ? ELSE cancelled_at END,
            updated_at = ?
        WHERE id = ? AND client_id = ? AND status != 'CANCELLED'`,
      )
      .run(status, status, now, status, now, now, subscriptionId, clientId);
    if (updated.changes !== 1) throw new Error("SUBSCRIPTION_UPDATE_CONFLICT");
    return status === "ACTIVE"
      ? resumeSubscriptionWithNextOrder(database, subscriptionId, now)
      : null;
  })();
  if (nextOrderId) matchOrder(nextOrderId, now);
  return getClientSubscription(clientId, subscriptionId)!;
}

export function getSubscriptionPageData(clientId: string): SubscriptionPageData {
  return {
    subscriptions: listClientSubscriptions(clientId),
    categories: listServiceCategories(),
    addresses: listClientAddresses(clientId),
    serviceAreas: listOrderServiceAreas(),
  };
}
