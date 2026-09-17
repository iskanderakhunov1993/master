"use client";

import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  PackageSearch,
  ShieldCheck,
  Star,
  ToggleLeft,
  Wrench,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { setMasterOnlineAction } from "@/lib/masters/actions";
import { confirmMasterSelectionAction } from "@/lib/marketplace/actions";
import { formatRating, formatReviewCount, VERIFICATION_LABEL } from "@/lib/masters/presentation";
import type { MasterDashboardData, MasterOrderCard } from "@/lib/masters/types";
import { formatRubles, formatSchedule } from "@/lib/orders/presentation";

export function MasterDashboard({ data }: { data: MasterDashboardData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOnline, setIsOnline] = useState(data.profile.isOnline);
  const [error, setError] = useState("");
  const reliability = data.profile.statistics.reliability;

  useEffect(() => {
    if (!isOnline) return;
    const refreshInterval = window.setInterval(() => router.refresh(), 15_000);
    return () => window.clearInterval(refreshInterval);
  }, [isOnline, router]);

  function togglePresence() {
    const nextOnline = !isOnline;
    setError("");
    startTransition(async () => {
      const result = await setMasterOnlineAction(nextOnline);
      if (!result.ok) {
        setError(result.message ?? "Не удалось изменить статус");
        return;
      }
      setIsOnline(nextOnline);
      router.refresh();
    });
  }

  return (
    <div className="master-dashboard">
      <header className="master-dashboard__heading">
        <div><span>Кабинет мастера</span><h1>Здравствуйте, {data.profile.name.split(" ")[0]}</h1><p>Управляйте доступностью и ближайшими выездами в одном месте.</p></div>
        <Link className="button button--secondary" href="/master/profile">Мой профиль <ArrowRight size={16} /></Link>
      </header>

      <section className={`master-presence ${isOnline ? "is-online" : "is-offline"}`}>
        <div className="master-presence__state">
          <span>{isOnline ? <Zap size={25} /> : <ToggleLeft size={25} />}</span>
          <div>
            <small>Приём заказов</small>
            <h2>{isOnline ? "Приём заказов включён" : "Приём заказов выключен"}</h2>
            <p>{isOnline
              ? "Вам приходят заказы по выбранным категориям и районам."
              : "Новые заказы вам не приходят. Включите приём, когда будете готовы выехать."}</p>
          </div>
        </div>
        <button className="master-presence-toggle" type="button" aria-pressed={isOnline} onClick={togglePresence} disabled={isPending}>
          <span><b /></span>
          {isPending ? <LoaderCircle className="spin" size={18} /> : isOnline ? "Выключить приём" : "Включить приём"}
        </button>
      </section>

      {error && <div className="master-alert master-alert--error" role="alert"><AlertCircle size={18} /> {error}</div>}
      {data.profile.verificationStatus !== "VERIFIED" && (
        <div className="master-alert"><ShieldCheck size={19} /><div><strong>{VERIFICATION_LABEL[data.profile.verificationStatus]}</strong><p>Принимать заказы можно будет после ручной проверки администратором.</p></div><Link href="/master/onboarding?step=2">Открыть проверку</Link></div>
      )}

      <section className="master-stat-grid" aria-label="Статистика мастера">
        <article><span><BriefcaseBusiness size={21} /></span><div><small>Выполнено заказов</small><strong>{data.profile.statistics.completedJobs}</strong></div></article>
        <article><span><Star size={21} /></span><div><small>Рейтинг</small><strong>{formatRating(data.profile.statistics.rating)}</strong><b>{formatReviewCount(data.profile.statistics.reviewsCount)}</b></div></article>
        <article><span><BadgeCheck size={21} /></span><div><small>Надёжность</small><strong>{reliability.score === null ? "—" : `${reliability.score}%`}</strong><b>{reliability.label}</b></div></article>
      </section>

      <div className="master-dashboard-grid">
        <section className="master-panel master-panel--available">
          <PanelHeading eyebrow="Лента" title="Новые доступные заказы" href="/master/orders/new" />
          {!isOnline ? (
            <MasterEmpty icon={PackageSearch} title="Включите приём заказов" text="После этого здесь появятся заказы по вашим категориям и районам." />
          ) : data.availableOrders.length === 0 ? (
            <MasterEmpty icon={CheckCircle2} title="Новых заказов пока нет" text="Оставьте приём включённым — лента обновится, когда появится подходящий заказ." />
          ) : (
            <div className="master-order-feed">{data.availableOrders.map((order) => <MasterOrderCardView order={order} key={order.id} />)}</div>
          )}
        </section>

        <section className="master-panel">
          <PanelHeading eyebrow="Сейчас" title="Активный заказ" href="/master/orders" />
          {data.activeOrder ? <MasterOrderCardView order={data.activeOrder} active /> : <MasterEmpty icon={Wrench} title="Нет активного заказа" text="Выбранный клиентом заказ появится здесь вместе с точным адресом." />}
        </section>

        <section className="master-panel">
          <PanelHeading eyebrow="Расписание" title="Ближайшие заказы" href="/master/calendar" />
          {data.upcomingOrders.length === 0 ? (
            <MasterEmpty icon={CalendarDays} title="Выездов пока нет" text="Запланированные заказы появятся здесь по дате и времени." />
          ) : (
            <div className="master-upcoming-list">{data.upcomingOrders.map((order) => <MasterOrderCardView order={order} compact key={order.id} />)}</div>
          )}
        </section>
      </div>
    </div>
  );
}

function PanelHeading({ eyebrow, title, href }: { eyebrow: string; title: string; href: string }) {
  return <div className="master-panel__heading"><div><span>{eyebrow}</span><h2>{title}</h2></div><Link href={href}>Открыть <ArrowRight size={15} /></Link></div>;
}

function MasterEmpty({ icon: Icon, title, text }: { icon: typeof PackageSearch; title: string; text: string }) {
  return <div className="master-empty"><span><Icon size={24} /></span><div><strong>{title}</strong><p>{text}</p></div></div>;
}

function MasterOrderCardView({ order, active = false, compact = false }: { order: MasterOrderCard; active?: boolean; compact?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const address = `${order.locationLabel}${order.apartment ? `, кв. ${order.apartment}` : ""}`;

  function confirmSelection() {
    setError("");
    startTransition(async () => {
      const result = await confirmMasterSelectionAction(order.id);
      if (!result.ok) {
        setError(result.message ?? "Не удалось подтвердить заказ");
        return;
      }
      router.refresh();
    });
  }

  return (
    <article className={`master-order-card ${active ? "is-active" : ""} ${compact ? "is-compact" : ""}`}>
      <div className="master-order-card__top">
        <span>{order.categoryName}{order.subcategoryName ? ` · ${order.subcategoryName}` : ""}</span>
        <strong>{formatRubles(order.totalPriceRubles)}</strong>
      </div>
      {!compact && <p>{order.description}</p>}
      <div className="master-order-card__facts">
        <span><Clock3 size={15} /> {formatSchedule(order.scheduleKind, order.scheduledAt)}</span>
        <span><MapPin size={15} /> {address}</span>
        {order.orderType === "URGENT" && <b><Zap size={14} /> Срочный</b>}
      </div>
      {active && order.addressComment && <small className="master-order-address-note">Комментарий к адресу: {order.addressComment}</small>}
      {active && order.status === "MASTER_SELECTED" && (
        <div className="master-selection-confirm">
          <p><CheckCircle2 size={16} /> Клиент выбрал вас. Точный адрес уже открыт.</p>
          <button className="button button--primary" type="button" onClick={confirmSelection} disabled={isPending}>
            {isPending ? <><LoaderCircle className="spin" size={17} /> Подтверждаем…</> : "Подтвердить заказ"}
          </button>
        </div>
      )}
      {active && order.status === "MASTER_CONFIRMED" && <div className="master-selection-confirm is-confirmed"><p><CheckCircle2 size={16} /> Заказ подтверждён. Можно согласовать выезд.</p></div>}
      {active && order.status !== "MASTER_SELECTED" && (
        <Link className="button button--secondary master-order-open" href={`/master/orders/${order.id}`}>
          Открыть заказ <ArrowRight size={16} />
        </Link>
      )}
      {error && <small className="master-order-error" role="alert">{error}</small>}
    </article>
  );
}
