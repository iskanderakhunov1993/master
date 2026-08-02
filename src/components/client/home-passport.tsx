import { ArrowRight, CalendarDays, ClipboardCheck, House, MapPinned, Repeat2, ShieldCheck, WalletCards, Wrench } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { ClientAddress } from "@/lib/addresses/types";
import { formatOrderCategory, formatRubles, ORDER_STATUS_LABEL } from "@/lib/orders/presentation";
import type { OrderSummary } from "@/lib/orders/types";
import type { ClientTask } from "@/lib/tasks/types";
import type { ClientWarranty } from "@/lib/warranties/repository";
import { WarrantyCenter } from "./warranty-center";

function formatRussianCount(count: number, one: string, few: string, many: string) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  const noun = mod100 >= 11 && mod100 <= 14
    ? many
    : mod10 === 1
      ? one
      : mod10 >= 2 && mod10 <= 4
        ? few
        : many;
  return `${count} ${noun}`;
}

export function HomePassport({
  addresses,
  activeOrder,
  recentOrders,
  warranties,
  tasks,
  referenceTime,
}: {
  addresses: ClientAddress[];
  activeOrder: OrderSummary | null;
  recentOrders: OrderSummary[];
  warranties: ClientWarranty[];
  tasks: ClientTask[];
  referenceTime: number;
}) {
  const home = addresses.find((address) => address.isPrimary) ?? addresses[0];
  const completed = recentOrders.filter((order) => ["COMPLETED", "REVIEWED"].includes(order.status));
  const total = completed.reduce((sum, order) => sum + order.totalPriceRubles, 0);
  const showTracking = activeOrder?.status === "MASTER_ON_THE_WAY";
  const activeWarranties = warranties.filter((warranty) => warranty.status === "ACTIVE" || warranty.status === "CLAIMED").length;
  const openTasks = tasks.filter((task) => task.status !== "DONE");
  const scheduledTasks = openTasks
    .filter((task) => task.desiredDate)
    .sort((left, right) => (left.desiredDate ?? 0) - (right.desiredDate ?? 0));
  const overdueTasks = scheduledTasks.filter((task) => (task.desiredDate ?? 0) < referenceTime);
  const nextTask = scheduledTasks.find((task) => (task.desiredDate ?? 0) >= referenceTime);

  return (
    <div className="home-passport-page">
      <header className="home-passport-heading">
        <div><span>Мой объект</span><h1>Мой дом</h1><p>{home ? `${home.street}, ${home.house}${home.apartment ? `, кв. ${home.apartment}` : ""}` : "Добавьте адрес первого объекта"}</p></div>
        <Link className="button button--primary" href="/client/orders/new"><Wrench size={17} /> Новая работа</Link>
      </header>

      {activeOrder && (
        <section className="home-live-visit">
          <header><div><small>{showTracking ? "Мастер в пути" : ORDER_STATUS_LABEL[activeOrder.status]}</small><h2>{formatOrderCategory(activeOrder)}</h2></div>{showTracking && <strong>24 мин</strong>}</header>
          {showTracking && <><div className="home-live-visit__map"><Image src="/maps/master-en-route.png" alt="Демонстрационный маршрут мастера к дому" fill sizes="(max-width: 850px) 100vw, 900px" /></div><p className="tracking-demo-note">Демо маршрута — live-геолокация в пилоте ещё не передаётся.</p></>}
          <footer><span>{formatRubles(activeOrder.totalPriceRubles)}</span><Link href={`/client/orders/${activeOrder.id}`}>Открыть заказ <ArrowRight size={16} /></Link></footer>
        </section>
      )}

      <section className="home-passport-summary" aria-label="Сводка по дому">
        <div><WalletCards size={20} /><span><small>Расходы в истории</small><strong>{formatRubles(total)}</strong></span></div>
        <div><ShieldCheck size={20} /><span><small>Активные гарантии</small><strong>{activeWarranties || "Нет"}</strong></span></div>
        <div><CalendarDays size={20} /><span><small>Следующий визит</small><strong>{activeOrder ? "По заказу" : "Не запланирован"}</strong></span></div>
      </section>

      <section className="home-care-hub" aria-labelledby="home-care-title">
        <header>
          <div><span>Уход за объектом</span><h2 id="home-care-title">План дома</h2></div>
          <p>Планируйте обслуживание, делайте сами или превращайте задачу в заказ мастеру.</p>
        </header>
        <div className="home-care-hub__grid">
          <Link href="/client/tasks">
            <span><ClipboardCheck size={21} /></span>
            <div><strong>План ухода</strong><small>{openTasks.length > 0 ? `${formatRussianCount(openTasks.length, "задача", "задачи", "задач")} требуют внимания` : "Новых задач нет"}</small></div>
            <ArrowRight size={18} />
          </Link>
          <Link href="/client/calendar">
            <span><CalendarDays size={21} /></span>
            <div><strong>Календарь</strong><small>{overdueTasks.length > 0 ? `${formatRussianCount(overdueTasks.length, "задача просрочена", "задачи просрочены", "задач просрочено")}` : nextTask?.desiredDate ? `Ближайшая задача ${new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(nextTask.desiredDate)}` : "Запланированных задач нет"}</small></div>
            <ArrowRight size={18} />
          </Link>
          <Link href="/client/subscriptions">
            <span><Repeat2 size={21} /></span>
            <div><strong>Регулярные работы</strong><small>Повторяющиеся визиты и обслуживание</small></div>
            <ArrowRight size={18} />
          </Link>
          <Link href="/client/addresses">
            <span><MapPinned size={21} /></span>
            <div><strong>Объекты и адреса</strong><small>{addresses.length > 0 ? formatRussianCount(addresses.length, "объект", "объекта", "объектов") : "Добавьте первый объект"}</small></div>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <WarrantyCenter warranties={warranties} />

      <section className="home-work-log">
        <header><div><span>Паспорт дома</span><h2>Журнал работ</h2></div><Link href="/client/orders?tab=COMPLETED">Все работы <ArrowRight size={15} /></Link></header>
        {recentOrders.length > 0 ? <ol>{recentOrders.slice(0, 5).map((order) => (
          <li key={order.id}>
            <span className="home-work-log__icon"><House size={18} /></span>
            <div><small>{new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(order.updatedAt)}</small><strong>{formatOrderCategory(order)}</strong><p>{ORDER_STATUS_LABEL[order.status]} · {formatRubles(order.totalPriceRubles)}</p></div>
            <Link href={`/client/orders/${order.id}`} aria-label={`Открыть работу ${formatOrderCategory(order)}`}><ArrowRight size={18} /></Link>
          </li>
        ))}</ol> : <div className="home-passport-empty"><House size={25} /><strong>История дома пока пуста</strong><p>Первая выполненная работа появится здесь автоматически.</p></div>}
      </section>
    </div>
  );
}
