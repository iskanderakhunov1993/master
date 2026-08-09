import { ClipboardList, House, Search, ShieldCheck, UserRound } from "lucide-react";

import type { SessionUser } from "@/lib/auth/types";
import {
  POSTGRES_ORDER_CATEGORIES,
  type PostgresClientOrder,
} from "@/lib/orders/postgres-repository";

const categoryNames: Record<string, string> = Object.fromEntries(POSTGRES_ORDER_CATEGORIES);

function rubles(value: number | null) {
  return new Intl.NumberFormat("ru-RU").format((value ?? 0) / 100) + " ₽";
}

function OrderRows({ orders }: { orders: PostgresClientOrder[] }) {
  if (orders.length === 0) {
    return <div className="client-compact-empty"><span><Search size={23} /></span><div><strong>Заявок пока нет</strong><small>Создайте первую заявку на главной странице кабинета.</small></div></div>;
  }

  return <ul className="postgres-order-list">{orders.map((order) => <li key={order.id}><span className="client-order-list__icon"><ClipboardList size={18} /></span><div><strong>{categoryNames[order.categoryId ?? ""] ?? "Заявка"}</strong><p>{order.description}</p><small>{rubles(order.totalPriceMinor)} · Ищем мастера · {new Intl.DateTimeFormat("ru-RU").format(order.createdAt)}</small></div></li>)}</ul>;
}

export function PostgresOrdersPage({ orders }: { orders: PostgresClientOrder[] }) {
  return <div className="section-page postgres-section"><header><span>Заказы</span><h1>Мои заказы</h1><p>Все заявки, сохранённые в вашем аккаунте.</p></header><section className="dashboard-panel"><div className="dashboard-panel__heading"><div><span>История</span><h2>Заявки и их статусы</h2></div></div><OrderRows orders={orders} /></section></div>;
}

export function PostgresHomePage({ orders }: { orders: PostgresClientOrder[] }) {
  const total = orders.reduce((sum, order) => sum + (order.totalPriceMinor ?? 0), 0);
  return <div className="section-page postgres-section"><header><span>Паспорт дома</span><h1>Мой дом</h1><p>История заявок и расходов на обслуживание дома или квартиры.</p></header><div className="dashboard-stat-grid"><article><span className="dashboard-stat-icon dashboard-stat-icon--blue"><House /></span><div><small>Работ и заявок</small><strong>{orders.length}</strong></div></article><article><span className="dashboard-stat-icon dashboard-stat-icon--green"><ShieldCheck /></span><div><small>Зафиксировано расходов</small><strong>{rubles(total)}</strong></div></article><article><span className="dashboard-stat-icon dashboard-stat-icon--orange"><ClipboardList /></span><div><small>Активные заявки</small><strong>{orders.filter((order) => order.status !== "COMPLETED").length}</strong></div></article></div><section className="dashboard-panel"><div className="dashboard-panel__heading"><div><span>Журнал</span><h2>Последние события</h2></div></div><OrderRows orders={orders.slice(0, 5)} /></section></div>;
}

export function PostgresProfilePage({ user }: { user: SessionUser }) {
  return <div className="section-page postgres-section"><header><span>Аккаунт</span><h1>Профиль</h1><p>Данные, используемые для входа и связи с сервисом.</p></header><section className="dashboard-panel postgres-profile-card"><span className="dashboard-stat-icon dashboard-stat-icon--blue"><UserRound /></span><div><small>Имя</small><strong>{user.name}</strong></div><div><small>Email</small><strong>{user.email}</strong></div><div><small>Тип аккаунта</small><strong>Клиент</strong></div></section></div>;
}
