import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";

import { appendOrderStatusHistory } from "./lifecycle";
import type { OrderStatus } from "./types";

export type ChangeRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";

export type OrderChangeRequest = {
  id: string;
  orderId: string;
  previousPriceRubles: number;
  proposedPriceRubles: number;
  reason: string;
  status: ChangeRequestStatus;
  createdAt: number;
  respondedAt: number | null;
};

// Only the master actively at the client's home may ask for a different
// price, and only while there is something left to price.
const CHANGE_ELIGIBLE_STATUSES: OrderStatus[] = ["MASTER_ARRIVED", "IN_PROGRESS"];

type OrderRow = {
  id: string;
  clientId: string;
  selectedMasterId: string | null;
  status: OrderStatus;
  agreedPriceMinor: number | null;
  totalPriceMinor: number | null;
};

function requireOrderRow(orderId: string): OrderRow {
  const row = getDb()
    .prepare(
      `SELECT id, client_id AS clientId, selected_master_id AS selectedMasterId,
        status, agreed_price_minor AS agreedPriceMinor, total_price_minor AS totalPriceMinor
      FROM orders WHERE id = ?`,
    )
    .get(orderId) as OrderRow | undefined;
  if (!row) throw new Error("ORDER_NOT_FOUND");
  return row;
}

function mapRow(row: {
  id: string;
  orderId: string;
  previousPriceMinor: number;
  proposedPriceMinor: number;
  reason: string;
  status: ChangeRequestStatus;
  createdAt: number;
  respondedAt: number | null;
}): OrderChangeRequest {
  return {
    id: row.id,
    orderId: row.orderId,
    previousPriceRubles: row.previousPriceMinor / 100,
    proposedPriceRubles: row.proposedPriceMinor / 100,
    reason: row.reason,
    status: row.status,
    createdAt: row.createdAt,
    respondedAt: row.respondedAt,
  };
}

export function listOrderChangeRequests(orderId: string): OrderChangeRequest[] {
  const rows = getDb()
    .prepare(
      `SELECT id, order_id AS orderId, previous_price_minor AS previousPriceMinor,
        proposed_price_minor AS proposedPriceMinor, reason, status,
        created_at AS createdAt, responded_at AS respondedAt
      FROM order_change_requests WHERE order_id = ? ORDER BY created_at`,
    )
    .all(orderId) as Array<Parameters<typeof mapRow>[0]>;
  return rows.map(mapRow);
}

export function createChangeRequest(input: {
  masterId: string;
  orderId: string;
  proposedPriceRubles: number;
  reason: string;
}): OrderChangeRequest {
  const database = getDb();
  return database.transaction(() => {
    const order = requireOrderRow(input.orderId);
    if (order.selectedMasterId !== input.masterId) throw new Error("ORDER_ACCESS_DENIED");
    if (!CHANGE_ELIGIBLE_STATUSES.includes(order.status)) {
      throw new Error("CHANGE_REQUEST_NOT_ALLOWED");
    }

    const currentPriceMinor = order.agreedPriceMinor ?? order.totalPriceMinor ?? 0;
    const proposedPriceMinor = Math.round(input.proposedPriceRubles * 100);
    if (proposedPriceMinor === currentPriceMinor) throw new Error("CHANGE_REQUEST_SAME_PRICE");

    const existingPending = database
      .prepare("SELECT 1 FROM order_change_requests WHERE order_id = ? AND status = 'PENDING'")
      .get(input.orderId);
    if (existingPending) throw new Error("CHANGE_REQUEST_ALREADY_PENDING");

    const id = randomUUID();
    const now = Date.now();
    database
      .prepare(
        `INSERT INTO order_change_requests (
          id, order_id, requested_by_master_id, previous_price_minor,
          proposed_price_minor, reason, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
      )
      .run(id, input.orderId, input.masterId, currentPriceMinor, proposedPriceMinor, input.reason, now);

    appendOrderStatusHistory(database, {
      orderId: input.orderId,
      fromStatus: order.status,
      toStatus: order.status,
      actorUserId: input.masterId,
      actorRole: "MASTER",
      reason: `Запросил новую цену: ${input.reason}`,
      createdAt: now,
    });

    return mapRow({
      id,
      orderId: input.orderId,
      previousPriceMinor: currentPriceMinor,
      proposedPriceMinor,
      reason: input.reason,
      status: "PENDING",
      createdAt: now,
      respondedAt: null,
    });
  })();
}

export function respondToChangeRequest(input: {
  clientId: string;
  orderId: string;
  requestId: string;
  accept: boolean;
}): OrderChangeRequest {
  const database = getDb();
  return database.transaction(() => {
    const order = requireOrderRow(input.orderId);
    if (order.clientId !== input.clientId) throw new Error("ORDER_ACCESS_DENIED");

    const request = database
      .prepare(
        `SELECT id, order_id AS orderId, previous_price_minor AS previousPriceMinor,
          proposed_price_minor AS proposedPriceMinor, reason, status,
          created_at AS createdAt, responded_at AS respondedAt
        FROM order_change_requests WHERE id = ? AND order_id = ?`,
      )
      .get(input.requestId, input.orderId) as Parameters<typeof mapRow>[0] | undefined;
    if (!request) throw new Error("CHANGE_REQUEST_NOT_FOUND");
    if (request.status !== "PENDING") throw new Error("CHANGE_REQUEST_STALE");

    const now = Date.now();
    const nextStatus: ChangeRequestStatus = input.accept ? "ACCEPTED" : "REJECTED";
    const updated = database
      .prepare(
        `UPDATE order_change_requests SET status = ?, responded_at = ?
        WHERE id = ? AND status = 'PENDING'`,
      )
      .run(nextStatus, now, input.requestId);
    if (updated.changes !== 1) throw new Error("CHANGE_REQUEST_STALE");

    if (input.accept) {
      database
        .prepare(
          `UPDATE orders SET agreed_price_minor = ?, total_price_minor = ?,
            updated_at = ?, version = version + 1
          WHERE id = ?`,
        )
        .run(request.proposedPriceMinor, request.proposedPriceMinor, now, input.orderId);
    }

    appendOrderStatusHistory(database, {
      orderId: input.orderId,
      fromStatus: order.status,
      toStatus: order.status,
      actorUserId: input.clientId,
      actorRole: "CLIENT",
      reason: input.accept
        ? `Принял новую цену: ${(request.proposedPriceMinor / 100).toLocaleString("ru-RU")} ₽`
        : "Отклонил запрос на изменение цены",
      createdAt: now,
    });

    return mapRow({ ...request, status: nextStatus, respondedAt: now });
  })();
}
