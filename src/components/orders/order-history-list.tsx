import { ArrowRight, ClipboardList, Plus } from "lucide-react";
import Link from "next/link";

import {
  classifyOrderForHistory,
  type OrderHistoryTab,
} from "@/lib/orders/details";
import {
  formatOrderCategory,
  formatRubles,
  formatSchedule,
  ORDER_STATUS_LABEL,
} from "@/lib/orders/presentation";
import type { OrderSummary } from "@/lib/orders/types";

const tabs: Array<{ id: OrderHistoryTab; label: string }> = [
  { id: "ACTIVE", label: "Активные" },
  { id: "PLANNED", label: "Запланированные" },
  { id: "COMPLETED", label: "Завершённые" },
  { id: "CANCELLED", label: "Отменённые" },
];

const emptyCopy: Record<OrderHistoryTab, { title: string; text: string }> = {
  ACTIVE: { title: "Нет активных заказов", text: "Текущий заказ появится здесь после запуска поиска." },
  PLANNED: { title: "Нет запланированных заказов", text: "Заказы с выбранной будущей датой появятся здесь." },
  COMPLETED: { title: "История пока пуста", text: "Завершённые работы и отзывы будут храниться здесь." },
  CANCELLED: { title: "Нет отменённых заказов", text: "Здесь появятся только отменённые заказы." },
};

function normalizeTab(value: string | undefined): OrderHistoryTab {
  return tabs.some((tab) => tab.id === value) ? value as OrderHistoryTab : "ACTIVE";
}

export function OrderHistoryList({
  orders,
  audience,
  requestedTab,
}: {
  orders: OrderSummary[];
  audience: "CLIENT" | "MASTER";
  requestedTab?: string;
}) {
  const activeTab = normalizeTab(requestedTab);
  const baseHref = audience === "CLIENT" ? "/client/orders" : "/master/orders";
  const visibleOrders = orders.filter((order) => classifyOrderForHistory(order) === activeTab);
  const counts = new Map<OrderHistoryTab, number>(tabs.map((tab) => [tab.id, 0]));
  for (const order of orders) {
    const tab = classifyOrderForHistory(order);
    counts.set(tab, (counts.get(tab) ?? 0) + 1);
  }

  return (
    <div className="client-orders-page">
      <header className="client-page-heading">
        <div>
          <span>{audience === "CLIENT" ? "Кабинет клиента" : "Кабинет мастера"}</span>
          <h1>Мои заказы</h1>
          <p>{audience === "CLIENT" ? "Следите за работой и возвращайтесь к истории заказов." : "Управляйте текущими выездами и смотрите историю работ."}</p>
        </div>
        {audience === "CLIENT" && <Link className="button button--primary" href="/client/orders/new"><Plus size={18} /> Создать заказ</Link>}
      </header>

      <nav className="order-history-tabs" aria-label="Разделы заказов">
        {tabs.map((tab) => (
          <Link
            aria-current={activeTab === tab.id ? "page" : undefined}
            className={activeTab === tab.id ? "is-active" : ""}
            href={`${baseHref}?tab=${tab.id}`}
            key={tab.id}
          >
            {tab.label}<span>{counts.get(tab.id) ?? 0}</span>
          </Link>
        ))}
      </nav>

      {visibleOrders.length === 0 ? (
        <section className="client-empty-card order-history-empty">
          <span><ClipboardList size={29} /></span>
          <h2>{emptyCopy[activeTab].title}</h2>
          <p>{emptyCopy[activeTab].text}</p>
          {audience === "CLIENT" && activeTab === "ACTIVE" && <Link className="button button--primary" href="/client/orders/new">Создать заказ</Link>}
          {audience === "MASTER" && activeTab === "ACTIVE" && <Link className="button button--secondary" href="/master/orders/new">Новые заказы</Link>}
        </section>
      ) : (
        <div className="orders-list-grid">
          {visibleOrders.map((order) => (
            <Link className="order-list-card" href={`${baseHref}/${order.id}`} key={order.id}>
              <div>
                <span className={`order-status-badge order-status-badge--${order.status.toLowerCase()}`}>{ORDER_STATUS_LABEL[order.status]}</span>
                <small>{order.orderType === "URGENT" ? "Срочный" : "Обычный"}</small>
              </div>
              <h2>{formatOrderCategory(order)}</h2>
              <p>{order.description}</p>
              <footer><span>{formatSchedule(order.scheduleKind, order.scheduledAt)}</span><strong>{formatRubles(order.totalPriceRubles)}</strong><ArrowRight size={17} /></footer>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
