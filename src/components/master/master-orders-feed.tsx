"use client";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  Navigation,
  PackageSearch,
  ShieldCheck,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { createMasterOfferAction, skipMatchedOrderAction } from "@/lib/marketplace/actions";
import type { MatchedOrder } from "@/lib/marketplace/types";
import { useDialogAccessibility } from "@/lib/ui/use-dialog-accessibility";
import { formatRubles, formatSchedule } from "@/lib/orders/presentation";

type FeedTab = "ALL" | "NEW" | "NEARBY" | "URGENT";
type OfferMode = "ACCEPT" | "COUNTER";

const tabs: Array<{ id: FeedTab; label: string }> = [
  { id: "ALL", label: "Все" },
  { id: "NEW", label: "Новые" },
  { id: "NEARBY", label: "Рядом" },
  { id: "URGENT", label: "Срочные" },
];

export function MasterOrdersFeed({
  orders,
  isOnline,
}: {
  orders: MatchedOrder[];
  isOnline: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<FeedTab>("ALL");
  const [hiddenOrderIds, setHiddenOrderIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<{ order: MatchedOrder; mode: OfferMode } | null>(null);
  const [pageError, setPageError] = useState("");
  const [isPending, startTransition] = useTransition();

  const visibleOrders = useMemo(() => orders
    .filter((order) => !hiddenOrderIds.includes(order.orderId))
    .filter((order) => {
      if (tab === "NEW") return order.matchStatus === "NEW";
      if (tab === "NEARBY") return order.approximateDistanceKm <= 5;
      if (tab === "URGENT") return order.orderType === "URGENT";
      return true;
    }), [hiddenOrderIds, orders, tab]);

  function skip(orderId: string) {
    setPageError("");
    startTransition(async () => {
      const result = await skipMatchedOrderAction(orderId);
      if (!result.ok) {
        setPageError(result.message ?? "Не удалось пропустить заказ");
        return;
      }
      setHiddenOrderIds((current) => [...current, orderId]);
      router.refresh();
    });
  }

  return (
    <div className="master-feed-page marketplace-feed">
      <header className="client-page-heading">
        <div>
          <span>Кабинет мастера</span>
          <h1>Новые заказы</h1>
          <p>Подходящие задачи по вашим категориям и районам. Точный адрес и данные клиента скрыты до выбора мастера.</p>
        </div>
        <Link className="button button--secondary" href="/master">На главную <ArrowRight size={16} /></Link>
      </header>

      {!isOnline ? (
        <section className="client-empty-card">
          <span><PackageSearch size={29} /></span>
          <h2>Приём заказов выключен</h2>
          <p>Включите приём заказов на главной, чтобы получать подходящие заказы.</p>
          <Link className="button button--primary" href="/master">Управлять статусом</Link>
        </section>
      ) : (
        <>
          <div className="marketplace-tabs" role="tablist" aria-label="Фильтр заказов">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={tab === item.id ? "is-active" : ""}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="marketplace-privacy-note">
            <ShieldCheck size={18} />
            <span>До выбора исполнителя доступен только район и примерное расстояние.</span>
          </div>

          {pageError && <p className="marketplace-page-error" role="alert"><AlertCircle size={16} /> {pageError}</p>}

          {visibleOrders.length === 0 ? (
            <section className="client-empty-card">
              <span><CheckCircle2 size={29} /></span>
              <h2>{orders.length ? "В этой вкладке пока пусто" : "Подходящих заказов пока нет"}</h2>
              <p>Новые заказы появятся здесь автоматически — по вашим категориям и районам.</p>
            </section>
          ) : (
            <div className="marketplace-order-list">
              {visibleOrders.map((order) => (
                <article className="marketplace-order-card" key={order.orderId}>
                  {order.photos.length > 0 && (
                    <div className="marketplace-order-photos">
                      {order.photos.slice(0, 3).map((photo, index) => (
                        <Image
                          key={photo.id}
                          src={photo.url}
                          alt={`Фото задачи ${index + 1}`}
                          width={240}
                          height={164}
                          unoptimized
                        />
                      ))}
                    </div>
                  )}
                  <div className="marketplace-order-card__body">
                    <div className="marketplace-order-card__eyebrow">
                      <span>{order.categoryName}{order.subcategoryName ? ` · ${order.subcategoryName}` : ""}</span>
                      {order.orderType === "URGENT" && <b><Zap size={14} /> Срочный</b>}
                    </div>
                    <h2>{order.description}</h2>
                    <div className="marketplace-order-meta">
                      <span><MapPin size={16} /> {order.serviceAreaName}</span>
                      <span><Navigation size={16} /> ≈ {order.approximateDistanceKm.toLocaleString("ru-RU")} км</span>
                      <span><Clock3 size={16} /> {formatSchedule(order.scheduleKind, order.scheduledAt)}</span>
                    </div>
                    <div className="marketplace-order-price">
                      <span>Цена клиента</span>
                      <strong>{formatRubles(order.clientPriceRubles)}</strong>
                    </div>
                    <div className="marketplace-order-actions">
                      <button className="button button--primary" type="button" onClick={() => setSelected({ order, mode: "ACCEPT" })} disabled={isPending}>
                        Принять
                      </button>
                      <button className="button button--secondary" type="button" onClick={() => setSelected({ order, mode: "COUNTER" })} disabled={isPending}>
                        <WalletCards size={17} /> Предложить цену
                      </button>
                      <button className="marketplace-skip" type="button" onClick={() => skip(order.orderId)} disabled={isPending}>
                        {isPending ? <LoaderCircle className="spin" size={16} /> : null} Пропустить
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {selected && (
        <OfferDialog
          order={selected.order}
          mode={selected.mode}
          onClose={() => setSelected(null)}
          onSuccess={() => {
            setHiddenOrderIds((current) => [...current, selected.order.orderId]);
            setSelected(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function OfferDialog({
  order,
  mode,
  onClose,
  onSuccess,
}: {
  order: MatchedOrder;
  mode: OfferMode;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [price, setPrice] = useState(mode === "ACCEPT" ? String(order.clientPriceRubles) : String(Math.ceil(order.clientPriceRubles * 1.2 / 100) * 100));
  const [etaMinutes, setEtaMinutes] = useState("35");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const dialogRef = useDialogAccessibility<HTMLElement>(true, onClose, !isPending);

  function submit() {
    setError("");
    startTransition(async () => {
      const result = await createMasterOfferAction({
        orderId: order.orderId,
        proposedPriceRubles: mode === "COUNTER" ? Number(price) : undefined,
        etaMinutes: Number(etaMinutes),
        comment,
        acceptClientPrice: mode === "ACCEPT",
      });
      if (!result.ok) {
        setError(result.message ?? "Не удалось отправить предложение");
        return;
      }
      onSuccess();
    });
  }

  return (
    <div className="marketplace-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isPending) onClose();
    }}>
      <section className="marketplace-offer-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="offer-title" tabIndex={-1}>
        <button className="marketplace-modal-close" type="button" onClick={onClose} aria-label="Закрыть" disabled={isPending}><X size={19} /></button>
        <span className="marketplace-modal-icon"><WalletCards size={23} /></span>
        <h2 id="offer-title">{mode === "ACCEPT" ? "Принять цену клиента" : "Предложить свою цену"}</h2>
        <p>{order.categoryName} · {order.serviceAreaName}</p>

        <div className="marketplace-client-price"><span>Цена клиента</span><strong>{formatRubles(order.clientPriceRubles)}</strong></div>

        {mode === "COUNTER" && (
          <label className="marketplace-offer-field">
            <span>Ваша цена</span>
            <div><input type="number" min="500" max="1000000" step="100" inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value)} autoFocus /><b>₽</b></div>
          </label>
        )}

        <fieldset className="marketplace-eta-field">
          <legend>Смогу приехать</legend>
          <div>{[20, 35, 60].map((minutes) => <button className={etaMinutes === String(minutes) ? "is-selected" : ""} type="button" key={minutes} onClick={() => setEtaMinutes(String(minutes))}>через {minutes} мин</button>)}</div>
          <label>Другое время, минут<input type="number" min="5" max="240" value={etaMinutes} onChange={(event) => setEtaMinutes(event.target.value)} /></label>
        </fieldset>

        <label className="marketplace-comment-field">Комментарий <small>необязательно</small><textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={500} rows={3} placeholder="Например: привезу нужные материалы" /></label>

        {error && <p className="marketplace-modal-error" role="alert"><AlertCircle size={16} /> {error}</p>}
        <button className="button button--primary button--large marketplace-submit-offer" type="button" onClick={submit} disabled={isPending}>
          {isPending ? <><LoaderCircle className="spin" size={18} /> Отправляем…</> : mode === "ACCEPT" ? "Принять и отправить" : "Отправить предложение"}
        </button>
        <small className="marketplace-offer-expiry">Предложение действует ограниченное время.</small>
      </section>
    </div>
  );
}
