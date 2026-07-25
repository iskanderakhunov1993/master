import type { OrderStatus, OrderSummary, ScheduleKind } from "./types";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  DRAFT: "Черновик",
  SEARCHING_MASTERS: "Ищем мастеров",
  OFFERS_RECEIVED: "Получены предложения",
  MASTER_SELECTED: "Мастер выбран",
  MASTER_CONFIRMED: "Мастер подтвердил заказ",
  MASTER_ON_THE_WAY: "Мастер едет",
  MASTER_ARRIVED: "Мастер на месте",
  COMPLETED_BY_MASTER: "Ожидает подтверждения",
  REVIEWED: "Отзыв оставлен",
  CANCELLED_BY_CLIENT: "Отменён клиентом",
  CANCELLED_BY_MASTER: "Отменён мастером",
  DISPUTED: "Есть проблема",
  AWAITING_SELECTION: "Выберите мастера",
  SEARCH_EXHAUSTED: "Поиск завершён",
  ASSIGNED: "Мастер выбран",
  EN_ROUTE: "Мастер в пути",
  ARRIVED: "Мастер приехал",
  IN_PROGRESS: "Работа выполняется",
  AWAITING_CONFIRMATION: "Подтвердите выполнение",
  COMPLETED: "Выполнен",
  CANCELLED: "Отменён",
};

export function formatRubles(value: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value) + " ₽";
}

export function formatSchedule(kind: ScheduleKind, timestamp: number | null) {
  if (kind === "NOW") return "Сейчас";
  if (!timestamp) return kind === "TODAY" ? "Сегодня" : "Время не указано";

  const date = new Date(timestamp);
  const datePart = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return `${kind === "TODAY" ? "Сегодня" : datePart}, ${timePart}`;
}

export function formatOrderCategory(order: Pick<OrderSummary, "categoryName" | "subcategoryName">) {
  return order.subcategoryName
    ? `${order.categoryName} · ${order.subcategoryName}`
    : order.categoryName;
}
