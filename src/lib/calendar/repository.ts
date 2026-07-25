import { getDb } from "@/lib/db";
import { ORDER_STATUS_LABEL } from "@/lib/orders/presentation";
import type { OrderStatus } from "@/lib/orders/types";
import { syncClientTaskStatuses } from "@/lib/tasks/repository";
import type { ClientTaskStatus } from "@/lib/tasks/types";

import type { CalendarEvent, CalendarEventTone } from "./types";

const activeOrderStatuses: OrderStatus[] = [
  "SEARCHING_MASTERS",
  "OFFERS_RECEIVED",
  "MASTER_SELECTED",
  "MASTER_CONFIRMED",
  "MASTER_ON_THE_WAY",
  "MASTER_ARRIVED",
  "IN_PROGRESS",
  "COMPLETED_BY_MASTER",
  "DISPUTED",
];

function orderTone(status: OrderStatus, orderType: "NORMAL" | "URGENT"): CalendarEventTone {
  if (["COMPLETED", "REVIEWED"].includes(status)) return "COMPLETED";
  if (orderType === "URGENT") return "URGENT";
  return activeOrderStatuses.includes(status) ? "ACTIVE" : "PLANNED";
}

export function listClientCalendarEvents(clientId: string): CalendarEvent[] {
  syncClientTaskStatuses(clientId);
  const tasks = getDb()
    .prepare(
      `SELECT id, title, desired_date AS startAt, status
      FROM client_tasks
      WHERE client_id = ? AND desired_date IS NOT NULL`,
    )
    .all(clientId) as Array<{
      id: string;
      title: string;
      startAt: number;
      status: ClientTaskStatus;
    }>;
  const orders = getDb()
    .prepare(
      `SELECT
        orders.id,
        COALESCE(service_subcategories.name, service_categories.name, 'Заказ мастеру') AS title,
        COALESCE(orders.scheduled_at, orders.updated_at) AS startAt,
        orders.status,
        orders.order_type AS orderType
      FROM orders
      LEFT JOIN service_categories ON service_categories.id = orders.category_id
      LEFT JOIN service_subcategories ON service_subcategories.id = orders.subcategory_id
      WHERE orders.client_id = ? AND orders.status != 'DRAFT'
        AND (orders.scheduled_at IS NOT NULL OR orders.status IN (
          'SEARCHING_MASTERS', 'OFFERS_RECEIVED', 'MASTER_SELECTED',
          'MASTER_CONFIRMED', 'MASTER_ON_THE_WAY', 'MASTER_ARRIVED',
          'IN_PROGRESS', 'COMPLETED_BY_MASTER', 'DISPUTED'
        ))`,
    )
    .all(clientId) as Array<{
      id: string;
      title: string;
      startAt: number;
      status: OrderStatus;
      orderType: "NORMAL" | "URGENT";
    }>;

  return [
    ...tasks.map<CalendarEvent>((task) => ({
      id: `task-${task.id}`,
      kind: "TASK",
      title: task.title,
      startAt: task.startAt,
      href: `/client/tasks/${task.id}`,
      statusLabel: task.status === "DONE" ? "Готово" : task.status === "MASTER_FOUND" ? "Мастер найден" : "Запланировано",
      tone: task.status === "DONE" ? "COMPLETED" : "PLANNED",
    })),
    ...orders.map<CalendarEvent>((order) => ({
      id: `order-${order.id}`,
      kind: "ORDER",
      title: order.title,
      startAt: order.startAt,
      href: `/client/orders/${order.id}`,
      statusLabel: ORDER_STATUS_LABEL[order.status],
      tone: orderTone(order.status, order.orderType),
    })),
  ].sort((left, right) => left.startAt - right.startAt);
}

export function listMasterCalendarEvents(masterId: string): CalendarEvent[] {
  const orders = getDb()
    .prepare(
      `SELECT
        orders.id,
        COALESCE(service_subcategories.name, service_categories.name, 'Заказ') AS title,
        COALESCE(orders.scheduled_at, orders.updated_at) AS startAt,
        orders.status,
        orders.order_type AS orderType,
        users.name AS clientName,
        TRIM(orders.address_city || ', ' || orders.address_street || ', ' || orders.address_house) AS location
      FROM orders
      INNER JOIN order_assignments ON order_assignments.order_id = orders.id
      INNER JOIN users ON users.id = orders.client_id
      LEFT JOIN service_categories ON service_categories.id = orders.category_id
      LEFT JOIN service_subcategories ON service_subcategories.id = orders.subcategory_id
      WHERE order_assignments.master_id = ?
        AND orders.status NOT IN (
          'DRAFT', 'SEARCHING_MASTERS', 'OFFERS_RECEIVED',
          'COMPLETED', 'REVIEWED',
          'CANCELLED_BY_CLIENT', 'CANCELLED_BY_MASTER', 'CANCELLED'
        )`,
    )
    .all(masterId) as Array<{
      id: string;
      title: string;
      startAt: number;
      status: OrderStatus;
      orderType: "NORMAL" | "URGENT";
      clientName: string;
      location: string;
    }>;

  return orders.map((order) => ({
    id: `order-${order.id}`,
    kind: "ORDER" as const,
    title: order.title,
    startAt: order.startAt,
    href: `/master/orders/${order.id}`,
    statusLabel: ORDER_STATUS_LABEL[order.status],
    tone: orderTone(order.status, order.orderType),
    clientName: order.clientName,
    location: order.location,
  })).sort((left, right) => left.startAt - right.startAt);
}
