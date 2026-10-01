import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";

export type WorkMediaStage = "BEFORE" | "AFTER";

export type WorkPhoto = {
  id: string;
  url: string;
  fileName: string;
  stage: WorkMediaStage;
  createdAt: number;
};

// The same statuses the lifecycle gate checks against: a "before" photo only
// makes sense once the master is on site, an "after" photo only while the
// job is actively being worked.
const STAGE_UPLOAD_STATUS: Record<WorkMediaStage, string> = {
  BEFORE: "MASTER_ARRIVED",
  AFTER: "IN_PROGRESS",
};

function requireAssignedOrder(masterId: string, orderId: string, stage: WorkMediaStage) {
  const order = getDb()
    .prepare("SELECT id, status, selected_master_id AS selectedMasterId FROM orders WHERE id = ?")
    .get(orderId) as { id: string; status: string; selectedMasterId: string | null } | undefined;
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.selectedMasterId !== masterId) throw new Error("ORDER_ACCESS_DENIED");
  if (order.status !== STAGE_UPLOAD_STATUS[stage]) throw new Error("WORK_MEDIA_WRONG_STAGE");
}

export function addOrderWorkMedia(input: {
  masterId: string;
  orderId: string;
  stage: WorkMediaStage;
  fileName: string;
  mimeType: string;
  byteSize: number;
  content: Buffer;
}): WorkPhoto {
  const database = getDb();
  return database.transaction(() => {
    requireAssignedOrder(input.masterId, input.orderId, input.stage);
    const count = (database
      .prepare("SELECT COUNT(*) AS count FROM order_work_media WHERE order_id = ? AND stage = ?")
      .get(input.orderId, input.stage) as { count: number }).count;
    if (count >= 5) throw new Error("PHOTO_LIMIT");

    const id = randomUUID();
    const now = Date.now();
    database
      .prepare(
        `INSERT INTO order_work_media (
          id, order_id, master_id, stage, file_name, mime_type, byte_size, content, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, input.orderId, input.masterId, input.stage, input.fileName, input.mimeType, input.byteSize, input.content, now);

    return { id, url: `/api/order-work-media/${id}`, fileName: input.fileName, stage: input.stage, createdAt: now };
  })();
}

export function listOrderWorkMedia(orderId: string): WorkPhoto[] {
  const rows = getDb()
    .prepare(
      `SELECT id, file_name AS fileName, stage, created_at AS createdAt
      FROM order_work_media WHERE order_id = ? ORDER BY created_at`,
    )
    .all(orderId) as Array<{ id: string; fileName: string; stage: WorkMediaStage; createdAt: number }>;
  return rows.map((row) => ({ ...row, url: `/api/order-work-media/${row.id}` }));
}

/** Anyone party to the order (its client or its assigned master) may view evidence photos. */
export function getOrderWorkMediaForViewer(userId: string, mediaId: string) {
  return getDb()
    .prepare(
      `SELECT order_work_media.mime_type AS mimeType, order_work_media.content, order_work_media.byte_size AS byteSize
      FROM order_work_media
      INNER JOIN orders ON orders.id = order_work_media.order_id
      WHERE order_work_media.id = ?
        AND (orders.client_id = ? OR orders.selected_master_id = ?)`,
    )
    .get(mediaId, userId, userId) as { mimeType: string; content: Buffer; byteSize: number } | undefined;
}

/** Admins reviewing a dispute may view any order's evidence photos. */
export function getOrderWorkMediaForAdmin(mediaId: string) {
  return getDb()
    .prepare(
      "SELECT mime_type AS mimeType, content, byte_size AS byteSize FROM order_work_media WHERE id = ?",
    )
    .get(mediaId) as { mimeType: string; content: Buffer; byteSize: number } | undefined;
}
