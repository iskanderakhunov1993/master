"use client";

import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  Star,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, useTransition } from "react";

import {
  advanceMasterOrderAction,
  cancelClientOrderAction,
  respondToCompletionAction,
  submitClientReviewAction,
  submitMasterReviewAction,
} from "@/lib/orders/actions";
import type { OrderDetails } from "@/lib/orders/details";
import { formatRubles, formatSchedule, ORDER_STATUS_LABEL } from "@/lib/orders/presentation";
import type { OrderStatus } from "@/lib/orders/types";

const activeStatuses: OrderStatus[] = [
  "MASTER_SELECTED",
  "MASTER_CONFIRMED",
  "MASTER_ON_THE_WAY",
  "MASTER_ARRIVED",
  "IN_PROGRESS",
  "COMPLETED_BY_MASTER",
];

const clientStatusCopy: Partial<Record<OrderStatus, { title: string; text: string }>> = {
  MASTER_SELECTED: { title: "Мастер выбран", text: "Ждём подтверждения мастера." },
  MASTER_CONFIRMED: { title: "Мастер подтвердил заказ", text: "Мастер готовится к выезду." },
  MASTER_ON_THE_WAY: { title: "Мастер едет", text: "Ожидайте мастера по указанному адресу." },
  MASTER_ARRIVED: { title: "Мастер на месте", text: "Мастер сообщил о прибытии." },
  IN_PROGRESS: { title: "Работа выполняется", text: "Мастер приступил к задаче." },
  COMPLETED_BY_MASTER: { title: "Мастер отметил работу выполненной", text: "Подтвердите результат или сообщите о проблеме." },
  COMPLETED: { title: "Работа выполнена", text: "Оставьте отзыв — это поможет другим клиентам." },
  REVIEWED: { title: "Спасибо за отзыв", text: "Заказ завершён и сохранён в истории." },
  DISPUTED: { title: "Проблема зафиксирована", text: "Заказ отмечен как спорный. Детали сохранены для разбора." },
  CANCELLED_BY_CLIENT: { title: "Заказ отменён", text: "Отмена выполнена клиентом." },
  CANCELLED_BY_MASTER: { title: "Заказ отменён мастером", text: "Детали заказа сохранены в истории." },
};

const masterNextAction: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  MASTER_SELECTED: { status: "MASTER_CONFIRMED", label: "Подтвердить заказ" },
  MASTER_CONFIRMED: { status: "MASTER_ON_THE_WAY", label: "Еду" },
  MASTER_ON_THE_WAY: { status: "MASTER_ARRIVED", label: "Я на месте" },
  MASTER_ARRIVED: { status: "IN_PROGRESS", label: "Начать работу" },
  IN_PROGRESS: { status: "COMPLETED_BY_MASTER", label: "Работа выполнена" },
};

const orderJourney: Array<{ status: OrderStatus; label: string }> = [
  { status: "MASTER_SELECTED", label: "Мастер выбран" },
  { status: "MASTER_CONFIRMED", label: "Подтверждён" },
  { status: "MASTER_ON_THE_WAY", label: "Едет" },
  { status: "MASTER_ARRIVED", label: "На месте" },
  { status: "IN_PROGRESS", label: "Работа выполняется" },
  { status: "COMPLETED_BY_MASTER", label: "Ожидает подтверждения" },
  { status: "COMPLETED", label: "Завершён" },
  { status: "REVIEWED", label: "Отзыв оставлен" },
];

export function OrderLifecycleDetails({ details, audience }: { details: OrderDetails; audience: "CLIENT" | "MASTER" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const statusCopy = audience === "CLIENT"
    ? clientStatusCopy[details.status]
    : { title: ORDER_STATUS_LABEL[details.status], text: "Следующий этап доступен после выполнения текущего действия." };
  const masterAction = masterNextAction[details.status];
  const journeyIndex = orderJourney.findIndex((entry) => entry.status === details.status);
  const isJourneyStatus = journeyIndex >= 0;
  const nextJourneyStep = isJourneyStatus ? orderJourney[journeyIndex + 1] : null;
  const nextStepText = audience === "MASTER"
    ? masterAction
      ? `Сейчас ваше действие: ${masterAction.label}.`
      : details.status === "COMPLETED"
        ? "Работа подтверждена клиентом. Можно оставить отзыв о заказе."
        : "Дальнейших действий по этому заказу нет."
    : details.status === "COMPLETED_BY_MASTER"
      ? "Сейчас ваше действие: подтвердите результат или сообщите о проблеме."
      : nextJourneyStep
        ? `Следующий этап: ${nextJourneyStep.label.toLowerCase()}.`
        : details.status === "COMPLETED"
          ? "Оставьте отзыв, чтобы завершить заказ."
          : "Дальнейших действий по этому заказу нет.";

  useEffect(() => {
    if (!activeStatuses.includes(details.status)) return;
    const interval = window.setInterval(() => router.refresh(), 10_000);
    return () => window.clearInterval(interval);
  }, [details.status, router]);

  function advance() {
    if (!masterAction) return;
    setError("");
    startTransition(async () => {
      const result = await advanceMasterOrderAction({ orderId: details.id, toStatus: masterAction.status as "MASTER_CONFIRMED" | "MASTER_ON_THE_WAY" | "MASTER_ARRIVED" | "IN_PROGRESS" | "COMPLETED_BY_MASTER" });
      if (!result.ok) setError(result.message ?? "Не удалось обновить заказ");
      else router.refresh();
    });
  }

  function respond(completed: boolean) {
    setError("");
    startTransition(async () => {
      const result = await respondToCompletionAction(details.id, completed);
      if (!result.ok) setError(result.message ?? "Не удалось обновить заказ");
      else router.refresh();
    });
  }

  function cancelOrder() {
    const actor = audience === "CLIENT" ? "клиентом" : "мастером";
    if (!window.confirm(`Отменить заказ ${actor}? Это действие будет сохранено в истории.`)) return;
    setError("");
    startTransition(async () => {
      const result = audience === "CLIENT"
        ? await cancelClientOrderAction(details.id)
        : await advanceMasterOrderAction({ orderId: details.id, toStatus: "CANCELLED_BY_MASTER" });
      if (!result.ok) setError(result.message ?? "Не удалось отменить заказ");
      else router.refresh();
    });
  }

  const canClientCancel = audience === "CLIENT" && ["MASTER_SELECTED", "MASTER_CONFIRMED"].includes(details.status);
  const canMasterCancel = audience === "MASTER" && ["MASTER_SELECTED", "MASTER_CONFIRMED", "MASTER_ON_THE_WAY", "MASTER_ARRIVED"].includes(details.status);

  return (
    <div className="order-lifecycle-page">
      <Link className="selected-master-back" href={audience === "CLIENT" ? "/client/orders" : "/master/orders"}><ArrowLeft size={17} /> Все заказы</Link>
      <section className="order-lifecycle-hero">
        <span><CheckCircle2 size={25} /></span><small>{audience === "CLIENT" ? "Активный заказ" : "Заказ клиента"}</small><h1>{statusCopy?.title ?? ORDER_STATUS_LABEL[details.status]}</h1><p>{statusCopy?.text}</p>
        <div className="order-next-step"><small>Что дальше</small><strong>{nextStepText}</strong></div>
        {audience === "MASTER" && masterAction && <button className="button button--primary button--large" type="button" onClick={advance} disabled={isPending}>{isPending ? <><LoaderCircle className="spin" size={18} /> Обновляем…</> : masterAction.label}</button>}
        {audience === "CLIENT" && details.status === "COMPLETED_BY_MASTER" && <div className="order-completion-actions"><button className="button button--primary" type="button" onClick={() => respond(true)} disabled={isPending}>Да, всё выполнено</button><button className="button button--secondary" type="button" onClick={() => respond(false)} disabled={isPending}>Есть проблема</button></div>}
        {(canClientCancel || canMasterCancel) && <button className="button button--ghost is-danger" type="button" onClick={cancelOrder} disabled={isPending}><XCircle size={17} /> Отменить заказ</button>}
        {error && <p className="task-form-error" role="alert"><AlertCircle size={16} /> {error}</p>}
      </section>

      {isJourneyStatus && (
        <section className="order-progress-card" aria-label="Ход заказа">
          <div><small>Ход заказа</small><strong>{journeyIndex + 1} из {orderJourney.length} этапов</strong></div>
          <ol>
            {orderJourney.map((entry, index) => (
              <li className={index < journeyIndex ? "is-complete" : index === journeyIndex ? "is-current" : ""} key={entry.status}>
                <span>{index < journeyIndex ? <CheckCircle2 size={13} /> : index + 1}</span>
                <strong>{entry.label}</strong>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="order-lifecycle-grid">
        <main>
          <section className="order-detail-card"><header><div><small>Задача</small><h2>{details.categoryName}{details.subcategoryName ? ` · ${details.subcategoryName}` : ""}</h2></div><strong>{formatRubles(details.agreedPriceRubles)}</strong></header><p>{details.description}</p>{details.photos.length > 0 && <div className="order-detail-photos">{details.photos.map((photo) => <Image key={photo.id} src={photo.url} alt={photo.fileName} width={150} height={110} unoptimized />)}</div>}</section>
          <section className="order-detail-card"><header><div><small>История статусов</small><h2>Как менялся заказ</h2></div></header><ol className="order-timeline">{details.history.map((entry) => <li key={entry.id}><span /><div><strong>{ORDER_STATUS_LABEL[entry.toStatus]}</strong><p>{new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(entry.createdAt)}{entry.actorName ? ` · ${entry.actorName}` : ""}</p>{entry.reason && <small>{entry.reason}</small>}</div></li>)}</ol></section>
          {audience === "CLIENT" && details.status === "COMPLETED" && !details.reviews.some((review) => review.reviewerRole === "CLIENT") && <ClientReviewForm orderId={details.id} />}
          {audience === "MASTER" && ["COMPLETED", "REVIEWED"].includes(details.status) && !details.reviews.some((review) => review.reviewerRole === "MASTER") && <MasterReviewForm orderId={details.id} clientName={details.client.name} />}
          {details.reviews.length > 0 && <section className="order-detail-card"><header><div><small>Отзывы</small><h2>Оценки по заказу</h2></div></header><div className="order-reviews">{details.reviews.map((review) => <article key={review.id}><div><strong>{review.reviewerName}</strong><span><Star size={14} fill="currentColor" /> {review.overallRating}</span></div>{review.comment && <p>{review.comment}</p>}</article>)}</div></section>}
        </main>
        <aside>
          {details.master && <section className="order-person-card"><div className="order-person-avatar">{details.master.avatarUrl ? <Image src={details.master.avatarUrl} alt={details.master.name} fill sizes="64px" unoptimized /> : <UserRound size={25} />}</div><div><small>Мастер</small><h2>{details.master.name}</h2><p>{details.master.specialization}</p><span><BadgeCheck size={14} /> Личность подтверждена</span>{details.master.rating && <b><Star size={14} fill="currentColor" /> {details.master.rating.toFixed(1)} · {details.master.reviewsCount} отзывов</b>}</div>{audience === "CLIENT" && <footer>{details.master.phone && <a href={`tel:${details.master.phone}`}><Phone size={16} /> Позвонить</a>}<Link href={`/masters/${details.master.id}`}>Профиль</Link></footer>}</section>}
          {audience === "MASTER" && <section className="order-person-card"><div className="order-person-avatar"><UserRound size={25} /></div><div><small>Клиент</small><h2>{details.client.name}</h2><p>{details.client.email}</p></div><footer><a href={`mailto:${details.client.email}`}><Mail size={16} /> Написать</a></footer></section>}
          <section className="order-facts-card"><div><MapPin size={18} /><span><small>Адрес</small><strong>{details.city}, {details.street}, {details.house}{details.apartment ? `, кв. ${details.apartment}` : ""}</strong>{details.addressComment && <p>{details.addressComment}</p>}</span></div><div><Clock3 size={18} /><span><small>Когда</small><strong>{formatSchedule(details.scheduleKind, details.scheduledAt)}</strong>{details.etaMinutes && <p>Ориентир прибытия: {details.etaMinutes} минут</p>}</span></div><div><WalletCards size={18} /><span><small>Согласованная цена</small><strong>{formatRubles(details.agreedPriceRubles)}</strong></span></div></section>
        </aside>
      </div>
    </div>
  );
}

function RatingButtons({ value, onChange, label }: { value: number; onChange: (value: number) => void; label: string }) {
  return <fieldset className="review-rating"><legend>{label}</legend><div>{[1, 2, 3, 4, 5].map((rating) => <button className={rating <= value ? "is-active" : ""} type="button" onClick={() => onChange(rating)} key={rating} aria-label={`${label}: ${rating}`}><Star size={19} fill={rating <= value ? "currentColor" : "none"} /></button>)}</div></fieldset>;
}

function ClientReviewForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [ratings, setRatings] = useState({ overallRating: 5, qualityRating: 5, punctualityRating: 5, communicationRating: 5, agreementRating: 5 });
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setError(""); const result = await submitClientReviewAction({ orderId, ...ratings, comment }); if (!result.ok) setError(result.message ?? "Не удалось отправить отзыв"); else router.refresh(); setSaving(false); }
  return <form className="order-detail-card order-review-form" onSubmit={submit}><header><div><small>Завершение</small><h2>Оцените мастера</h2></div></header><RatingButtons label="Общая оценка" value={ratings.overallRating} onChange={(value) => setRatings((current) => ({ ...current, overallRating: value }))} /><div className="review-rating-grid"><RatingButtons label="Качество" value={ratings.qualityRating} onChange={(value) => setRatings((current) => ({ ...current, qualityRating: value }))} /><RatingButtons label="Пунктуальность" value={ratings.punctualityRating} onChange={(value) => setRatings((current) => ({ ...current, punctualityRating: value }))} /><RatingButtons label="Общение" value={ratings.communicationRating} onChange={(value) => setRatings((current) => ({ ...current, communicationRating: value }))} /><RatingButtons label="Договорённости" value={ratings.agreementRating} onChange={(value) => setRatings((current) => ({ ...current, agreementRating: value }))} /></div><label>Комментарий <small>необязательно</small><textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows={4} /></label>{error && <p className="task-form-error"><AlertCircle size={16} /> {error}</p>}<button className="button button--primary" type="submit" disabled={saving}>{saving && <LoaderCircle className="spin" size={17} />} Отправить отзыв</button></form>;
}

function MasterReviewForm({ orderId, clientName }: { orderId: string; clientName: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5); const [comment, setComment] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); const result = await submitMasterReviewAction({ orderId, overallRating: rating, comment }); if (!result.ok) setError(result.message ?? "Не удалось отправить отзыв"); else router.refresh(); setSaving(false); }
  return <form className="order-detail-card order-review-form" onSubmit={submit}><header><div><small>Отзыв о клиенте</small><h2>Как прошла работа с {clientName.split(" ")[0]}?</h2></div></header><RatingButtons label="Общая оценка" value={rating} onChange={setRating} /><label>Комментарий <small>необязательно</small><textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows={3} /></label>{error && <p className="task-form-error"><AlertCircle size={16} /> {error}</p>}<button className="button button--primary" type="submit" disabled={saving}>Оставить отзыв</button></form>;
}
