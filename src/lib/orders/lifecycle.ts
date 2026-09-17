import { randomUUID } from "node:crypto";

import type Database from "better-sqlite3";

import { getDb } from "@/lib/db";
import { matchOrder } from "@/lib/marketplace/matching";
import { advanceSubscriptionAfterCompletedOrder } from "@/lib/subscriptions/sync";
import { syncTaskStatusForOrder } from "@/lib/tasks/sync";

import { getWarrantyDurationDays } from "./config";
import type { OrderStatus } from "./types";

export type OrderActorRole = "CLIENT" | "MASTER" | "ADMIN" | "SYSTEM";

type TransitionRule = {
  from: OrderStatus;
  to: OrderStatus;
  role: OrderActorRole;
};

export const ORDER_TRANSITION_RULES: readonly TransitionRule[] = [
  { from: "MASTER_SELECTED", to: "MASTER_CONFIRMED", role: "MASTER" },
  { from: "MASTER_CONFIRMED", to: "MASTER_ON_THE_WAY", role: "MASTER" },
  { from: "MASTER_ON_THE_WAY", to: "MASTER_ARRIVED", role: "MASTER" },
  { from: "MASTER_ARRIVED", to: "IN_PROGRESS", role: "MASTER" },
  { from: "IN_PROGRESS", to: "COMPLETED_BY_MASTER", role: "MASTER" },
  { from: "COMPLETED_BY_MASTER", to: "COMPLETED", role: "CLIENT" },
  { from: "COMPLETED_BY_MASTER", to: "DISPUTED", role: "CLIENT" },
  { from: "COMPLETED", to: "REVIEWED", role: "CLIENT" },
  { from: "SEARCHING_MASTERS", to: "CANCELLED_BY_CLIENT", role: "CLIENT" },
  { from: "OFFERS_RECEIVED", to: "CANCELLED_BY_CLIENT", role: "CLIENT" },
  { from: "MASTER_SELECTED", to: "CANCELLED_BY_CLIENT", role: "CLIENT" },
  { from: "MASTER_CONFIRMED", to: "CANCELLED_BY_CLIENT", role: "CLIENT" },
  { from: "MASTER_SELECTED", to: "CANCELLED_BY_MASTER", role: "MASTER" },
  { from: "MASTER_CONFIRMED", to: "CANCELLED_BY_MASTER", role: "MASTER" },
  { from: "MASTER_ON_THE_WAY", to: "CANCELLED_BY_MASTER", role: "MASTER" },
  { from: "MASTER_ARRIVED", to: "CANCELLED_BY_MASTER", role: "MASTER" },
] as const;

export function canTransitionOrder(
  from: OrderStatus,
  to: OrderStatus,
  role: OrderActorRole,
) {
  return ORDER_TRANSITION_RULES.some(
    (rule) => rule.from === from && rule.to === to && rule.role === role,
  );
}

export function appendOrderStatusHistory(
  database: Database.Database,
  input: {
    orderId: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    actorUserId?: string | null;
    actorRole: OrderActorRole;
    reason?: string;
    createdAt: number;
  },
) {
  database
    .prepare(
      `INSERT INTO order_status_history (
        id, order_id, from_status, to_status, actor_user_id, actor_role, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      input.orderId,
      input.fromStatus,
      input.toStatus,
      input.actorUserId ?? null,
      input.actorRole,
      input.reason?.trim() || null,
      input.createdAt,
    );
}

type TransitionOrderInput = {
  orderId: string;
  actorId: string;
  actorRole: Exclude<OrderActorRole, "SYSTEM">;
  toStatus: OrderStatus;
  reason?: string;
  now?: number;
};

type LifecycleOrderRow = {
  id: string;
  clientId: string;
  selectedMasterId: string | null;
  status: OrderStatus;
  categoryId: string | null;
  categoryName: string | null;
  subcategoryName: string | null;
  description: string | null;
};

function requireActorAccess(order: LifecycleOrderRow, actorId: string, role: OrderActorRole) {
  if (role === "CLIENT" && order.clientId !== actorId) throw new Error("ORDER_ACCESS_DENIED");
  if (role === "MASTER" && order.selectedMasterId !== actorId) throw new Error("ORDER_ACCESS_DENIED");
  if (role === "SYSTEM") return;
  if (role === "ADMIN") return;
}

function applyCompletionSideEffects(
  database: Database.Database,
  order: LifecycleOrderRow,
  now: number,
) {
  if (!order.selectedMasterId) throw new Error("SELECTED_MASTER_MISSING");

  database
    .prepare(
      `UPDATE master_profiles
      SET completed_jobs = completed_jobs + 1,
          confirmed_completions = confirmed_completions + 1,
          updated_at = ?
      WHERE master_id = ?`,
    )
    .run(now, order.selectedMasterId);

  if (order.categoryId) {
    database
      .prepare(
        `INSERT INTO master_category_stats (master_id, category_id, completed_jobs, updated_at)
        VALUES (?, ?, 1, ?)
        ON CONFLICT(master_id, category_id) DO UPDATE SET
          completed_jobs = master_category_stats.completed_jobs + 1,
          updated_at = excluded.updated_at`,
      )
      .run(order.selectedMasterId, order.categoryId, now);
  }

  database
    .prepare(
      `INSERT OR IGNORE INTO master_work_history (
        id, master_id, title, description, completed_at
      ) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      `order-${order.id}`,
      order.selectedMasterId,
      order.subcategoryName || order.categoryName || "Выполненная работа",
      order.description || "Работа выполнена и подтверждена клиентом.",
      now,
    );

  const durationDays = getWarrantyDurationDays();
  const endsAt = now + durationDays * 24 * 60 * 60 * 1000;
  database
    .prepare(
      `INSERT OR IGNORE INTO order_warranties (
        id, order_id, client_id, master_id, duration_days, started_at, ends_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(randomUUID(), order.id, order.clientId, order.selectedMasterId, durationDays, now, endsAt, now);
}

export function transitionOrderInTransaction(
  database: Database.Database,
  input: TransitionOrderInput,
) {
  const now = input.now ?? Date.now();
  const order = database
    .prepare(
      `SELECT
        orders.id,
        orders.client_id AS clientId,
        orders.selected_master_id AS selectedMasterId,
        orders.status,
        orders.category_id AS categoryId,
        service_categories.name AS categoryName,
        service_subcategories.name AS subcategoryName,
        orders.description
      FROM orders
      LEFT JOIN service_categories ON service_categories.id = orders.category_id
      LEFT JOIN service_subcategories ON service_subcategories.id = orders.subcategory_id
      WHERE orders.id = ?`,
    )
    .get(input.orderId) as LifecycleOrderRow | undefined;

  if (!order) throw new Error("ORDER_NOT_FOUND");
  requireActorAccess(order, input.actorId, input.actorRole);
  if (!canTransitionOrder(order.status, input.toStatus, input.actorRole)) {
    throw new Error("ORDER_TRANSITION_NOT_ALLOWED");
  }

  // Work is proven, not just declared: no "before" photo, no starting the
  // job; no "after" photo, no marking it done. Enforced here, not just in
  // the UI, so the guarantee holds regardless of which client calls this.
  if (order.status === "MASTER_ARRIVED" && input.toStatus === "IN_PROGRESS") {
    const hasBeforePhoto = database
      .prepare("SELECT 1 FROM order_work_media WHERE order_id = ? AND stage = 'BEFORE' LIMIT 1")
      .get(order.id);
    if (!hasBeforePhoto) throw new Error("BEFORE_PHOTO_REQUIRED");
  }
  if (order.status === "IN_PROGRESS" && input.toStatus === "COMPLETED_BY_MASTER") {
    const hasAfterPhoto = database
      .prepare("SELECT 1 FROM order_work_media WHERE order_id = ? AND stage = 'AFTER' LIMIT 1")
      .get(order.id);
    if (!hasAfterPhoto) throw new Error("AFTER_PHOTO_REQUIRED");

    const hasPendingChange = database
      .prepare("SELECT 1 FROM order_change_requests WHERE order_id = ? AND status = 'PENDING'")
      .get(order.id);
    if (hasPendingChange) throw new Error("CHANGE_REQUEST_PENDING");
  }

  const updated = database
    .prepare(
      `UPDATE orders
      SET status = ?, updated_at = ?, version = version + 1,
          master_confirmed_at = CASE
            WHEN ? = 'MASTER_CONFIRMED' THEN COALESCE(master_confirmed_at, ?)
            ELSE master_confirmed_at
          END
      WHERE id = ? AND status = ?`,
    )
    .run(input.toStatus, now, input.toStatus, now, order.id, order.status);
  if (updated.changes !== 1) throw new Error("ORDER_TRANSITION_CONFLICT");

  appendOrderStatusHistory(database, {
    orderId: order.id,
    fromStatus: order.status,
    toStatus: input.toStatus,
    actorUserId: input.actorId,
    actorRole: input.actorRole,
    reason: input.reason,
    createdAt: now,
  });

  syncTaskStatusForOrder(database, order.id, input.toStatus, now);

  if (input.toStatus === "CANCELLED_BY_CLIENT") {
    database
      .prepare("UPDATE master_offers SET status = 'REJECTED', updated_at = ? WHERE order_id = ? AND status = 'ACTIVE'")
      .run(now, order.id);
    database
      .prepare("UPDATE order_matches SET status = 'EXPIRED', updated_at = ? WHERE order_id = ? AND status IN ('NEW', 'VIEWED', 'OFFERED')")
      .run(now, order.id);
  }

  if (input.toStatus === "DISPUTED") {
    database
      .prepare(
        `INSERT OR IGNORE INTO complaints (
          id, order_id, reporter_id, against_user_id, kind, status,
          subject, description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'DISPUTE', 'OPEN', ?, ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        order.id,
        order.clientId,
        order.selectedMasterId,
        "Проблема с выполнением заказа",
        input.reason?.trim() || "Клиент сообщил о проблеме после завершения работы.",
        now,
        now,
      );
  }

  if (["CANCELLED_BY_CLIENT", "CANCELLED_BY_MASTER", "DISPUTED"].includes(input.toStatus)) {
    database
      .prepare(
        `UPDATE order_change_requests SET status = 'CANCELLED', responded_at = ?
        WHERE order_id = ? AND status = 'PENDING'`,
      )
      .run(now, order.id);
  }

  let nextSubscriptionOrderId: string | null = null;
  if (input.toStatus === "COMPLETED") {
    applyCompletionSideEffects(database, order, now);
    nextSubscriptionOrderId = advanceSubscriptionAfterCompletedOrder(database, order.id, now);
  }
  if (input.toStatus === "CANCELLED_BY_MASTER" && order.selectedMasterId) {
    database
      .prepare(
        `UPDATE master_profiles
        SET master_cancellations = master_cancellations + 1, updated_at = ?
        WHERE master_id = ?`,
      )
      .run(now, order.selectedMasterId);
  }

  return {
    fromStatus: order.status,
    toStatus: input.toStatus,
    updatedAt: now,
    nextSubscriptionOrderId,
  };
}

export function transitionOrder(input: TransitionOrderInput) {
  const database = getDb();
  const result = database.transaction(() => transitionOrderInTransaction(database, input))();
  if (result.nextSubscriptionOrderId) matchOrder(result.nextSubscriptionOrderId, result.updatedAt);
  return result;
}
