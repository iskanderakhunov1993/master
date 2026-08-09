import { Plus, Search } from "lucide-react";

import { createPostgresClientOrderAction } from "@/lib/orders/postgres-actions";
import {
  POSTGRES_ORDER_CATEGORIES,
  type PostgresClientOrder,
} from "@/lib/orders/postgres-repository";
import type { SessionUser } from "@/lib/auth/types";

const categoryNames: Record<string, string> = Object.fromEntries(POSTGRES_ORDER_CATEGORIES);

export function PostgresClientDashboard({ user, orders }: { user: SessionUser; orders: PostgresClientOrder[] }) {
  return (
    <div className="client-dashboard postgres-client-dashboard">
      <header className="client-dashboard__heading">
        <span>Мои заказы</span>
        <h1>Здравствуйте, {user.name.split(" ")[0]}</h1>
        <p>Опишите задачу — заявка сохранится и будет доступна в вашем кабинете.</p>
      </header>

      <section className="dashboard-panel postgres-order-form">
        <div className="dashboard-panel__heading"><div><span>Новая задача</span><h2>Найти мастера</h2></div></div>
        <form action={createPostgresClientOrderAction}>
          <label>Категория<select name="categoryId" required defaultValue=""><option value="" disabled>Выберите категорию</option>{POSTGRES_ORDER_CATEGORIES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label>Что случилось?<textarea name="description" required minLength={10} placeholder="Например: течёт смеситель на кухне, нужна диагностика и замена" /></label>
          <div className="postgres-order-form__row"><label>Бюджет, ₽<input name="budgetRubles" type="number" min="500" step="100" required placeholder="1500" /></label><label>Срочность<select name="orderType" defaultValue="NORMAL"><option value="NORMAL">Обычная</option><option value="URGENT">Срочно</option></select></label></div>
          <button className="button button--primary" type="submit"><Plus size={18} /> Опубликовать заявку</button>
        </form>
      </section>

      <section className="client-list-panel">
        <div className="client-section-title"><div><span>История</span><h2>Ваши заявки</h2></div></div>
        {orders.length === 0 ? <div className="client-compact-empty"><span><Search size={23} /></span><div><strong>Заявок пока нет</strong><small>Первая заявка появится здесь сразу после публикации.</small></div></div> : <ul className="postgres-order-list">{orders.map((order) => <li key={order.id}><span className="client-order-list__icon"><Search size={18} /></span><div><strong>{categoryNames[order.categoryId ?? ""] ?? "Заявка"}</strong><p>{order.description}</p><small>Ищем мастера</small></div></li>)}</ul>}
      </section>
    </div>
  );
}
