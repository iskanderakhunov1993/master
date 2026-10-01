import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";

export type OrderWarranty = {
  id: string;
  orderId: string;
  categoryName: string;
  durationDays: number;
  startedAt: number;
  endsAt: number;
  isActive: boolean;
  daysRemaining: number;
  claimComplaintId: string | null;
};

type WarrantyRow = {
  id: string;
  orderId: string;
  categoryName: string | null;
  durationDays: number;
  startedAt: number;
  endsAt: number;
  claimComplaintId: string | null;
};

function toWarranty(row: WarrantyRow, now: number): OrderWarranty {
  const isActive = row.endsAt > now;
  return {
    id: row.id,
    orderId: row.orderId,
    categoryName: row.categoryName ?? "Без категории",
    durationDays: row.durationDays,
    startedAt: row.startedAt,
    endsAt: row.endsAt,
    isActive,
    daysRemaining: isActive ? Math.ceil((row.endsAt - now) / (24 * 60 * 60 * 1000)) : 0,
    claimComplaintId: row.claimComplaintId,
  };
}

const warrantySelect = `
  SELECT
    order_warranties.id, order_warranties.order_id AS orderId,
    service_categories.name AS categoryName,
    order_warranties.duration_days AS durationDays,
    order_warranties.started_at AS startedAt, order_warranties.ends_at AS endsAt,
    order_warranties.claim_complaint_id AS claimComplaintId
  FROM order_warranties
  LEFT JOIN orders ON orders.id = order_warranties.order_id
  LEFT JOIN service_categories ON service_categories.id = orders.category_id`;

export function listClientWarranties(clientId: string, now = Date.now()): OrderWarranty[] {
  const rows = getDb()
    .prepare(`${warrantySelect} WHERE order_warranties.client_id = ? ORDER BY order_warranties.ends_at DESC`)
    .all(clientId) as WarrantyRow[];
  return rows.map((row) => toWarranty(row, now));
}

export function getWarrantyForOrder(orderId: string, now = Date.now()): OrderWarranty | null {
  const row = getDb()
    .prepare(`${warrantySelect} WHERE order_warranties.order_id = ?`)
    .get(orderId) as WarrantyRow | undefined;
  return row ? toWarranty(row, now) : null;
}

export function fileWarrantyClaim(input: { clientId: string; warrantyId: string; description: string }): string {
  const database = getDb();
  return database.transaction(() => {
    const warranty = database
      .prepare(
        `SELECT order_warranties.id, order_warranties.order_id AS orderId,
          order_warranties.client_id AS clientId, order_warranties.master_id AS masterId,
          order_warranties.ends_at AS endsAt, order_warranties.claim_complaint_id AS claimComplaintId
        FROM order_warranties WHERE id = ?`,
      )
      .get(input.warrantyId) as { id: string; orderId: string; clientId: string; masterId: string; endsAt: number; claimComplaintId: string | null } | undefined;

    if (!warranty) throw new Error("WARRANTY_NOT_FOUND");
    if (warranty.clientId !== input.clientId) throw new Error("ORDER_ACCESS_DENIED");
    if (warranty.claimComplaintId) throw new Error("WARRANTY_ALREADY_CLAIMED");
    if (warranty.endsAt <= Date.now()) throw new Error("WARRANTY_EXPIRED");

    const complaintId = randomUUID();
    const now = Date.now();
    database
      .prepare(
        `INSERT INTO complaints (
          id, order_id, reporter_id, against_user_id, kind, status, subject, description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'DISPUTE', 'OPEN', ?, ?, ?, ?)`,
      )
      .run(complaintId, warranty.orderId, input.clientId, warranty.masterId, "Гарантийное обращение", input.description, now, now);

    database
      .prepare("UPDATE order_warranties SET claim_complaint_id = ? WHERE id = ?")
      .run(complaintId, warranty.id);

    return complaintId;
  })();
}
