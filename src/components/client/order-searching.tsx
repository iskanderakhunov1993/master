"use client";

import { AlertCircle, ArrowLeft, Check, Clock3, LoaderCircle, MapPin, RefreshCw, Search, ShieldCheck, WalletCards, WifiOff, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { cancelClientOrderAction, refreshOrderSearchAction } from "@/lib/orders/actions";
import { formatOrderCategory, formatRubles, formatSchedule, ORDER_STATUS_LABEL } from "@/lib/orders/presentation";
import type { OrderSummary } from "@/lib/orders/types";

export function OrderSearching({ order, matchedMasters = 0 }: { order: OrderSummary; matchedMasters?: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState("");
  const [urgentWithoutResponse, setUrgentWithoutResponse] = useState(false);
  const hasOffers = order.status === "OFFERS_RECEIVED";

  useEffect(() => {
    const updateConnection = () => setIsOffline(!navigator.onLine);
    const updateSearchAge = () => setUrgentWithoutResponse(
      order.orderType === "URGENT" && !hasOffers && Boolean(order.submittedAt && Date.now() - order.submittedAt > 2 * 60_000),
    );
    updateConnection();
    updateSearchAge();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    const interval = window.setInterval(() => { updateSearchAge(); if (navigator.onLine) router.refresh(); }, 10_000);
    return () => { window.removeEventListener("online", updateConnection); window.removeEventListener("offline", updateConnection); window.clearInterval(interval); };
  }, [hasOffers, order.orderType, order.submittedAt, router]);

  function retry() {
    setError("");
    startTransition(async () => {
      const result = await refreshOrderSearchAction(order.id);
      if (!result.ok) setError(result.message ?? "Не удалось обновить поиск");
      else router.refresh();
    });
  }

  function cancel() {
    if (!window.confirm("Отменить этот заказ? Мастера больше не смогут отправлять предложения.")) return;
    setError("");
    startTransition(async () => {
      const result = await cancelClientOrderAction(order.id);
      if (!result.ok) { setError(result.message ?? "Не удалось отменить заказ"); return; }
      router.push(`/client/orders/${order.id}`);
      router.refresh();
    });
  }

  const title = hasOffers
    ? ORDER_STATUS_LABEL[order.status]
    : matchedMasters === 0
      ? "Сейчас нет доступных мастеров"
      : urgentWithoutResponse
        ? "Пока нет откликов на срочный заказ"
        : "Ищем подходящих мастеров";
  return (
    <div className="order-search-page">
      <Link className="order-search-page__back" href="/client"><ArrowLeft size={17} /> На главную</Link>
      <section className="order-search-hero">
        <div className="search-animation" aria-hidden="true"><span /><span /><span /><Search size={29} /></div>
        <span className="order-status-badge">{ORDER_STATUS_LABEL[order.status]}</span>
        <h1>{title}</h1>
        <p>{hasOffers ? "Мастера уже начали откликаться. Здесь появятся до трёх актуальных предложений." : matchedMasters === 0 ? "Мы продолжим проверять новых мастеров. Можно закрыть страницу — заказ и поиск сохранятся." : urgentWithoutResponse ? "Заказ остаётся активным. Обновите поиск или измените условия позднее из кабинета." : "Подходящие мастера получили заказ. Можно закрыть страницу — статус сохранится в кабинете."}</p>
        <div className="order-search-actions"><button className="button button--secondary" type="button" onClick={retry} disabled={isPending || isOffline}>{isPending ? <LoaderCircle className="spin" /> : <RefreshCw />} Обновить поиск</button><button className="button button--ghost is-danger" type="button" onClick={cancel} disabled={isPending}><X /> Отменить заказ</button></div>
      </section>
      {isOffline && <div className="master-alert master-alert--error" role="status"><WifiOff /><div><strong>Нет соединения</strong><p>Поиск продолжается на сервере. Данные обновятся после восстановления сети.</p></div></div>}
      {error && <div className="master-alert master-alert--error" role="alert"><AlertCircle /> {error}</div>}
      <section className="order-search-summary">
        <div className="order-search-summary__heading"><div><span>Ваш заказ</span><h2>{formatOrderCategory(order)}</h2></div><strong>{formatRubles(order.totalPriceRubles)}</strong></div>
        <p>{order.description}</p>
        <div className="order-search-facts">
          <div><Clock3 size={18} /><span><small>Когда</small><strong>{formatSchedule(order.scheduleKind, order.scheduledAt)}</strong></span></div>
          <div><MapPin size={18} /><span><small>Адрес</small><strong>{order.street}, {order.house}</strong></span></div>
          <div><WalletCards size={18} /><span><small>Тип</small><strong>{order.orderType === "URGENT" ? "Срочный" : "Обычный"}</strong></span></div>
        </div>
      </section>
      <div className="order-search-notice"><ShieldCheck size={21} /><div><strong>Полный адрес скрыт</strong><p>До вашего выбора мастера исполнители увидят только город и примерный район.</p></div></div>
      <ol className="search-timeline"><li className="is-done"><span><Check size={14} /></span>Заказ опубликован</li><li className={hasOffers ? "is-done" : "is-active"}><span>{hasOffers ? <Check size={14} /> : null}</span>Ищем доступных мастеров</li><li className={hasOffers ? "is-active" : ""}><span />Получите предложения</li><li><span />Выберите мастера</li></ol>
    </div>
  );
}
