import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, Clock3, ListTodo, Plus, Search, Wrench } from "lucide-react";
import Link from "next/link";

import type { SessionUser } from "@/lib/auth/types";
import { formatOrderCategory, formatRubles, formatSchedule, ORDER_STATUS_LABEL } from "@/lib/orders/presentation";
import type { ClientDashboardData } from "@/lib/orders/types";

export function ClientDashboard({ user, data }: { user: SessionUser; data: ClientDashboardData }) {
  return (
    <div className="client-dashboard">
      <header className="client-dashboard__heading">
        <span>Личный кабинет</span>
        <h1>Здравствуйте, {user.name.split(" ")[0]}</h1>
        <p>Что нужно сделать сегодня?</p>
      </header>

      <section className="client-order-start" aria-label="Создание заказа">
        <Link className="client-primary-cta" href="/client/orders/new">
          <span className="client-primary-cta__icon"><Plus size={25} /></span>
          <span><small>Новая задача</small><strong>Создать новый заказ</strong><b>Добавьте фото, описание и удобное время</b></span>
          <ArrowRight size={22} />
        </Link>
        <Link className="client-urgent-link" href="/client/orders/new?type=URGENT">
          <AlertTriangle size={17} />
          <span><strong>Нужен мастер прямо сейчас?</strong><small>Создать срочный заказ</small></span>
          <ArrowRight size={17} />
        </Link>
      </section>

      {data.activeOrder ? (
        <section className="client-active-order">
          <div className="client-section-title"><div><span>Активный заказ</span><h2>{formatOrderCategory(data.activeOrder)}</h2></div><Link href={`/client/orders/${data.activeOrder.id}`}>Открыть <ArrowRight size={16} /></Link></div>
          <div className="client-active-order__body">
            <span className="search-pulse"><Search size={24} /></span>
            <div><span className="order-status-badge">{ORDER_STATUS_LABEL[data.activeOrder.status]}</span><p>{data.activeOrder.description}</p><small>{formatSchedule(data.activeOrder.scheduleKind, data.activeOrder.scheduledAt)} · {formatRubles(data.activeOrder.totalPriceRubles)}</small></div>
          </div>
        </section>
      ) : (
        <section className="client-no-active-order">
          <span><CheckCircle2 size={21} /></span>
          <div><strong>Активных заказов нет</strong><small>Когда создадите заказ, его статус появится здесь.</small></div>
        </section>
      )}

      <div className="client-dashboard-grid">
        <section className="client-list-panel">
          <div className="client-section-title"><div><span>Планы</span><h2>Ближайшие задачи</h2></div><Link href="/client/tasks">Все задачи <ArrowRight size={15} /></Link></div>
          {data.upcomingTasks.length === 0 ? (
            <div className="client-compact-empty"><span><ListTodo size={23} /></span><div><strong>Ближайших задач нет</strong><small>Добавьте бытовую задачу, чтобы ничего не забыть.</small></div></div>
          ) : (
            <ul className="client-task-list">
              {data.upcomingTasks.map((task) => <li key={task.id}><span><CalendarDays size={17} /></span><div><strong>{task.title}</strong><small>{task.dueAt ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(task.dueAt) : "Без даты"}</small></div></li>)}
            </ul>
          )}
        </section>

        <section className="client-list-panel">
          <div className="client-section-title"><div><span>История</span><h2>Последние заказы</h2></div><Link href="/client/orders">Все заказы <ArrowRight size={15} /></Link></div>
          {data.recentOrders.length === 0 ? (
            <div className="client-compact-empty"><span><Wrench size={23} /></span><div><strong>Заказов пока нет</strong><small>Первый заказ можно создать за несколько простых шагов.</small></div></div>
          ) : (
            <ul className="client-order-list">
              {data.recentOrders.map((order) => <li key={order.id}><Link href={`/client/orders/${order.id}`}><span className="client-order-list__icon"><Clock3 size={18} /></span><div><strong>{formatOrderCategory(order)}</strong><small>{ORDER_STATUS_LABEL[order.status]} · {formatRubles(order.totalPriceRubles)}</small></div><ArrowRight size={16} /></Link></li>)}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
