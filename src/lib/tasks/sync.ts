import type Database from "better-sqlite3";

import type { OrderStatus } from "@/lib/orders/types";

const masterFoundStatuses: OrderStatus[] = [
  "MASTER_SELECTED",
  "MASTER_CONFIRMED",
  "MASTER_ON_THE_WAY",
  "MASTER_ARRIVED",
  "IN_PROGRESS",
  "COMPLETED_BY_MASTER",
  "DISPUTED",
  "ASSIGNED",
  "EN_ROUTE",
  "ARRIVED",
  "AWAITING_CONFIRMATION",
];

export function syncTaskStatusForOrder(
  database: Database.Database,
  orderId: string,
  orderStatus: OrderStatus,
  now: number,
) {
  if (["COMPLETED", "REVIEWED"].includes(orderStatus)) {
    database
      .prepare(
        `UPDATE client_tasks SET status = 'DONE', updated_at = ?
        WHERE linked_order_id = ? AND status != 'DONE'`,
      )
      .run(now, orderId);
    return;
  }
  if (masterFoundStatuses.includes(orderStatus)) {
    database
      .prepare(
        `UPDATE client_tasks SET status = 'MASTER_FOUND', updated_at = ?
        WHERE linked_order_id = ? AND status != 'MASTER_FOUND'`,
      )
      .run(now, orderId);
    return;
  }
  if (["CANCELLED_BY_CLIENT", "CANCELLED_BY_MASTER", "CANCELLED"].includes(orderStatus)) {
    database
      .prepare(
        `UPDATE client_tasks
        SET status = CASE WHEN desired_date IS NULL THEN 'TODO' ELSE 'PLANNED' END,
            updated_at = ?
        WHERE linked_order_id = ?`,
      )
      .run(now, orderId);
  }
}
