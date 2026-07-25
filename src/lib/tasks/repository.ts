import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";

import type {
  ClientTask,
  ClientTaskInput,
  ClientTaskPhoto,
  ClientTaskStatus,
} from "./types";

type TaskRow = {
  id: string;
  clientId: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  priority: ClientTask["priority"];
  desiredDate: number | null;
  status: ClientTaskStatus;
  linkedOrderId: string | null;
  linkedOrderStatus: string | null;
  createdAt: number;
  updatedAt: number;
};

const taskSelect = `
  SELECT
    client_tasks.id,
    client_tasks.client_id AS clientId,
    client_tasks.title,
    client_tasks.description,
    client_tasks.category_id AS categoryId,
    service_categories.name AS categoryName,
    client_tasks.priority,
    client_tasks.desired_date AS desiredDate,
    client_tasks.status,
    client_tasks.linked_order_id AS linkedOrderId,
    orders.status AS linkedOrderStatus,
    client_tasks.created_at AS createdAt,
    client_tasks.updated_at AS updatedAt
  FROM client_tasks
  LEFT JOIN service_categories ON service_categories.id = client_tasks.category_id
  LEFT JOIN orders ON orders.id = client_tasks.linked_order_id`;

function listTaskPhotos(taskId: string): ClientTaskPhoto[] {
  const rows = getDb()
    .prepare(
      `SELECT id, file_name AS fileName, byte_size AS byteSize
      FROM client_task_media WHERE task_id = ? ORDER BY created_at`,
    )
    .all(taskId) as Array<{ id: string; fileName: string; byteSize: number }>;
  return rows.map((photo) => ({ ...photo, url: `/api/task-media/${photo.id}` }));
}

function listClientTaskPhotos(clientId: string) {
  const rows = getDb()
    .prepare(
      `SELECT task_id AS taskId, id, file_name AS fileName, byte_size AS byteSize
      FROM client_task_media
      WHERE client_id = ?
      ORDER BY task_id, created_at`,
    )
    .all(clientId) as Array<{ taskId: string; id: string; fileName: string; byteSize: number }>;
  const grouped = new Map<string, ClientTaskPhoto[]>();
  for (const row of rows) {
    const photos = grouped.get(row.taskId) ?? [];
    photos.push({ id: row.id, fileName: row.fileName, byteSize: row.byteSize, url: `/api/task-media/${row.id}` });
    grouped.set(row.taskId, photos);
  }
  return grouped;
}

function mapTask(row: TaskRow, photos = listTaskPhotos(row.id)): ClientTask {
  return {
    id: row.id,
    clientId: row.clientId,
    title: row.title,
    description: row.description ?? "",
    categoryId: row.categoryId ?? "",
    categoryName: row.categoryName ?? "Без категории",
    priority: row.priority,
    desiredDate: row.desiredDate,
    status: row.status,
    linkedOrderId: row.linkedOrderId,
    linkedOrderStatus: row.linkedOrderStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    photos,
  };
}

export function syncClientTaskStatuses(clientId?: string) {
  const clientFilter = clientId ? "AND client_tasks.client_id = ?" : "";
  const parameters = clientId ? [Date.now(), clientId] : [Date.now()];
  return getDb()
    .prepare(
      `UPDATE client_tasks
      SET status = CASE
        WHEN EXISTS (
          SELECT 1 FROM orders
          WHERE orders.id = client_tasks.linked_order_id
            AND orders.status IN ('COMPLETED', 'REVIEWED')
        ) THEN 'DONE'
        WHEN EXISTS (
          SELECT 1 FROM orders
          WHERE orders.id = client_tasks.linked_order_id
            AND orders.status IN (
              'MASTER_SELECTED', 'MASTER_CONFIRMED', 'MASTER_ON_THE_WAY',
              'MASTER_ARRIVED', 'IN_PROGRESS', 'COMPLETED_BY_MASTER', 'DISPUTED',
              'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'AWAITING_CONFIRMATION'
            )
        ) THEN 'MASTER_FOUND'
        WHEN status = 'MASTER_FOUND' THEN CASE
          WHEN desired_date IS NOT NULL THEN 'PLANNED' ELSE 'TODO'
        END
        ELSE status
      END,
      updated_at = CASE
        WHEN status != CASE
          WHEN EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = client_tasks.linked_order_id
              AND orders.status IN ('COMPLETED', 'REVIEWED')
          ) THEN 'DONE'
          WHEN EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = client_tasks.linked_order_id
              AND orders.status IN (
                'MASTER_SELECTED', 'MASTER_CONFIRMED', 'MASTER_ON_THE_WAY',
                'MASTER_ARRIVED', 'IN_PROGRESS', 'COMPLETED_BY_MASTER', 'DISPUTED',
                'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'AWAITING_CONFIRMATION'
              )
          ) THEN 'MASTER_FOUND'
          WHEN status = 'MASTER_FOUND' THEN CASE
            WHEN desired_date IS NOT NULL THEN 'PLANNED' ELSE 'TODO'
          END
          ELSE status
        END THEN ? ELSE updated_at
      END
      WHERE linked_order_id IS NOT NULL ${clientFilter}`,
    )
    .run(...parameters);
}

export function listClientTasks(clientId: string) {
  syncClientTaskStatuses(clientId);
  const rows = getDb()
    .prepare(
      `${taskSelect}
      WHERE client_tasks.client_id = ?
      ORDER BY
        CASE client_tasks.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
        client_tasks.desired_date IS NULL,
        client_tasks.desired_date,
        client_tasks.updated_at DESC`,
    )
    .all(clientId) as TaskRow[];
  const photos = listClientTaskPhotos(clientId);
  return rows.map((row) => mapTask(row, photos.get(row.id) ?? []));
}

export function getClientTask(clientId: string, taskId: string) {
  syncClientTaskStatuses(clientId);
  const row = getDb()
    .prepare(`${taskSelect} WHERE client_tasks.id = ? AND client_tasks.client_id = ?`)
    .get(taskId, clientId) as TaskRow | undefined;
  return row ? mapTask(row) : null;
}

function validateCategory(categoryId: string | undefined) {
  if (!categoryId) return null;
  const category = getDb()
    .prepare("SELECT id FROM service_categories WHERE id = ? AND is_active = 1")
    .get(categoryId) as { id: string } | undefined;
  if (!category) throw new Error("TASK_CATEGORY_NOT_FOUND");
  return category.id;
}

export function createClientTask(clientId: string, input: ClientTaskInput) {
  const categoryId = validateCategory(input.categoryId);
  const now = Date.now();
  const id = randomUUID();
  const initialStatus: ClientTaskStatus = input.desiredDate ? "PLANNED" : "TODO";
  getDb()
    .prepare(
      `INSERT INTO client_tasks (
        id, client_id, title, description, category_id, priority,
        desired_date, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      clientId,
      input.title.trim(),
      input.description?.trim() || null,
      categoryId,
      input.priority,
      input.desiredDate ?? null,
      initialStatus,
      now,
      now,
    );
  return getClientTask(clientId, id)!;
}

export function updateClientTask(clientId: string, taskId: string, input: ClientTaskInput) {
  const categoryId = validateCategory(input.categoryId);
  const current = getClientTask(clientId, taskId);
  if (!current) throw new Error("TASK_NOT_FOUND");
  const updated = getDb()
    .prepare(
      `UPDATE client_tasks
      SET title = ?, description = ?, category_id = ?, priority = ?, desired_date = ?,
          status = CASE
            WHEN linked_order_id IS NULL AND status IN ('TODO', 'PLANNED')
              THEN CASE WHEN ? IS NULL THEN 'TODO' ELSE 'PLANNED' END
            ELSE status
          END,
          updated_at = ?
      WHERE id = ? AND client_id = ?`,
    )
    .run(
      input.title.trim(),
      input.description?.trim() || null,
      categoryId,
      input.priority,
      input.desiredDate ?? null,
      input.desiredDate ?? null,
      Date.now(),
      taskId,
      clientId,
    );
  if (updated.changes !== 1) throw new Error("TASK_NOT_FOUND");
  return getClientTask(clientId, taskId)!;
}

export function deleteClientTask(clientId: string, taskId: string) {
  const deleted = getDb()
    .prepare("DELETE FROM client_tasks WHERE id = ? AND client_id = ?")
    .run(taskId, clientId);
  if (deleted.changes !== 1) throw new Error("TASK_NOT_FOUND");
}

export function moveClientTask(
  clientId: string,
  taskId: string,
  status: ClientTaskStatus,
  expectedUpdatedAt: number,
) {
  syncClientTaskStatuses(clientId);
  const task = getClientTask(clientId, taskId);
  if (!task) throw new Error("TASK_NOT_FOUND");
  if (
    task.linkedOrderStatus
    && (task.status === "MASTER_FOUND" || task.status === "DONE")
    && status !== task.status
  ) {
    throw new Error("TASK_STATUS_MANAGED_BY_ORDER");
  }
  const now = Math.max(Date.now(), task.updatedAt + 1);
  const updated = getDb()
    .prepare(
      `UPDATE client_tasks SET status = ?, updated_at = ?
      WHERE id = ? AND client_id = ? AND updated_at = ?`,
    )
    .run(status, now, taskId, clientId, expectedUpdatedAt);
  if (updated.changes !== 1) throw new Error("TASK_UPDATE_CONFLICT");
  return getClientTask(clientId, taskId)!;
}

export function addTaskMedia(input: {
  clientId: string;
  taskId: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  content: Buffer;
}) {
  const database = getDb();
  return database.transaction(() => {
    if (!getClientTask(input.clientId, input.taskId)) throw new Error("TASK_NOT_FOUND");
    const count = (database
      .prepare("SELECT COUNT(*) AS count FROM client_task_media WHERE task_id = ?")
      .get(input.taskId) as { count: number }).count;
    if (count >= 5) throw new Error("PHOTO_LIMIT");
    const id = randomUUID();
    database
      .prepare(
        `INSERT INTO client_task_media (
          id, task_id, client_id, file_name, mime_type, byte_size, content, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.taskId,
        input.clientId,
        input.fileName,
        input.mimeType,
        input.byteSize,
        input.content,
        Date.now(),
      );
    return { id, url: `/api/task-media/${id}`, fileName: input.fileName, byteSize: input.byteSize };
  })();
}

export function deleteTaskMedia(clientId: string, taskId: string, mediaId: string) {
  const deleted = getDb()
    .prepare(
      `DELETE FROM client_task_media
      WHERE id = ? AND task_id = ? AND client_id = ?`,
    )
    .run(mediaId, taskId, clientId);
  if (deleted.changes !== 1) throw new Error("PHOTO_NOT_FOUND");
}

export function getOwnedTaskMedia(clientId: string, mediaId: string) {
  return getDb()
    .prepare(
      `SELECT mime_type AS mimeType, content, byte_size AS byteSize
      FROM client_task_media WHERE id = ? AND client_id = ?`,
    )
    .get(mediaId, clientId) as
      | { mimeType: string; content: Buffer; byteSize: number }
      | undefined;
}
