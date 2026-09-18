"use client";

import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Camera,
  Check,
  CheckCircle2,
  Clock3,
  ImagePlus,
  LoaderCircle,
  Map,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Send,
  ShieldCheck,
  Star,
  UserRound,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useRef, useState, useTransition } from "react";

import {
  advanceMasterOrderAction,
  cancelClientOrderAction,
  fileWarrantyClaimAction,
  proposeChangeOrderAction,
  reportMasterNoShowAction,
  respondToChangeOrderAction,
  respondToCompletionAction,
  sendOrderMessageAction,
  submitClientReviewAction,
  submitMasterReviewAction,
} from "@/lib/orders/actions";
import type { OrderDetails } from "@/lib/orders/details";
import { ALLOWED_ORDER_PHOTO_TYPES, validateOrderPhoto } from "@/lib/orders/media";
import { formatRubles, formatSchedule, ORDER_STATUS_LABEL } from "@/lib/orders/presentation";
import type { OrderStatus } from "@/lib/orders/types";
import type { OrderWarranty } from "@/lib/orders/warranty";
import type { WorkMediaStage, WorkPhoto } from "@/lib/orders/work-media";

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
  const beforePhotos = details.workPhotos.filter((photo) => photo.stage === "BEFORE");
  const afterPhotos = details.workPhotos.filter((photo) => photo.stage === "AFTER");
  const pendingChangeRequest = details.changeRequests.find((request) => request.status === "PENDING");
  const missingBeforePhoto = details.status === "MASTER_ARRIVED" && beforePhotos.length === 0;
  const missingAfterPhoto = details.status === "IN_PROGRESS" && afterPhotos.length === 0;
  const masterActionBlocked = audience === "MASTER"
    && ((masterAction?.status === "IN_PROGRESS" && missingBeforePhoto)
      || (masterAction?.status === "COMPLETED_BY_MASTER" && (missingAfterPhoto || Boolean(pendingChangeRequest))));
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
    if (!window.confirm("Отменить заказ? Восстановить его нельзя — потребуется создать новый. Отмена останется в истории.")) return;
    setError("");
    startTransition(async () => {
      const result = audience === "CLIENT"
        ? await cancelClientOrderAction(details.id)
        : await advanceMasterOrderAction({ orderId: details.id, toStatus: "CANCELLED_BY_MASTER" });
      if (!result.ok) setError(result.message ?? "Не удалось отменить заказ");
      else router.refresh();
    });
  }

  function reportNoShow() {
    if (!window.confirm("Мастер не приехал в назначенное время? Заказ будет отменён по вине мастера, это повлияет на его надёжность.")) return;
    setError("");
    startTransition(async () => {
      const result = await reportMasterNoShowAction(details.id);
      if (!result.ok) setError(result.message ?? "Не удалось зафиксировать неявку");
      else router.refresh();
    });
  }

  const canClientCancel = audience === "CLIENT" && ["MASTER_SELECTED", "MASTER_CONFIRMED"].includes(details.status);
  const canMasterCancel = audience === "MASTER" && ["MASTER_SELECTED", "MASTER_CONFIRMED", "MASTER_ON_THE_WAY", "MASTER_ARRIVED"].includes(details.status);
  // Mirrors NO_SHOW_MIN_OVERDUE_MS server-side — this only decides whether
  // to show the button; the server re-checks the same window regardless.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  const canReportNoShow = audience === "CLIENT"
    && ["MASTER_CONFIRMED", "MASTER_ON_THE_WAY"].includes(details.status)
    && details.scheduleKind !== "NOW"
    && Boolean(details.scheduledAt)
    && now > details.scheduledAt! + 60 * 60 * 1000;
  const showLiveTracking = audience === "CLIENT" && details.status === "MASTER_ON_THE_WAY" && Boolean(details.master);

  return (
    <div className="order-lifecycle-page">
      <Link className="selected-master-back" href={audience === "CLIENT" ? "/client/orders" : "/master/orders"}><ArrowLeft size={17} /> Все заказы</Link>
      {showLiveTracking ? (
        <LiveTrackingCard details={details} />
      ) : <section className="order-lifecycle-hero">
        <span><CheckCircle2 size={25} /></span><small>{audience === "CLIENT" ? "Активный заказ" : "Заказ клиента"}</small><h1>{statusCopy?.title ?? ORDER_STATUS_LABEL[details.status]}</h1><p>{statusCopy?.text}</p>
        <div className="order-next-step"><small>Что дальше</small><strong>{nextStepText}</strong></div>
        {audience === "MASTER" && masterAction && <button className="button button--primary button--large" type="button" onClick={advance} disabled={isPending || masterActionBlocked}>{isPending ? <><LoaderCircle className="spin" size={18} /> Обновляем…</> : masterAction.label}</button>}
        {audience === "MASTER" && missingBeforePhoto && <p className="order-gate-hint"><Camera size={15} /> Добавьте фото «до», чтобы начать работу</p>}
        {audience === "MASTER" && missingAfterPhoto && <p className="order-gate-hint"><Camera size={15} /> Добавьте фото «после», чтобы завершить работу</p>}
        {audience === "MASTER" && masterAction?.status === "COMPLETED_BY_MASTER" && pendingChangeRequest && <p className="order-gate-hint"><WalletCards size={15} /> Сначала дождитесь ответа клиента на изменение цены</p>}
        {audience === "CLIENT" && details.status === "COMPLETED_BY_MASTER" && <div className="order-completion-actions"><button className="button button--primary" type="button" onClick={() => respond(true)} disabled={isPending}>Да, всё выполнено</button><button className="button button--secondary" type="button" onClick={() => respond(false)} disabled={isPending}>Есть проблема</button></div>}
        {canReportNoShow && <button className="button button--secondary" type="button" onClick={reportNoShow} disabled={isPending}><AlertCircle size={17} /> Мастер не приехал</button>}
        {(canClientCancel || canMasterCancel) && <button className="button button--ghost is-danger" type="button" onClick={cancelOrder} disabled={isPending}><XCircle size={17} /> Отменить заказ</button>}
        {error && <p className="task-form-error" role="alert"><AlertCircle size={16} /> {error}</p>}
      </section>}

      {showLiveTracking && <LiveTrackingOverlay details={details} />}

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
          {(pendingChangeRequest || (audience === "MASTER" && ["MASTER_ARRIVED", "IN_PROGRESS"].includes(details.status))) && (
            <ChangeOrderCard orderId={details.id} audience={audience} pendingRequest={pendingChangeRequest} onDone={() => router.refresh()} />
          )}
          {(beforePhotos.length > 0 || afterPhotos.length > 0 || (audience === "MASTER" && (details.status === "MASTER_ARRIVED" || details.status === "IN_PROGRESS"))) && (
            <WorkEvidenceCard
              orderId={details.id}
              audience={audience}
              status={details.status}
              beforePhotos={beforePhotos}
              afterPhotos={afterPhotos}
              onUploaded={() => router.refresh()}
            />
          )}
          <section className="order-detail-card"><header><div><small>История статусов</small><h2>Как менялся заказ</h2></div></header><ol className="order-timeline">{details.history.map((entry) => <li key={entry.id}><span /><div><strong>{ORDER_STATUS_LABEL[entry.toStatus]}</strong><p>{new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(entry.createdAt)}{entry.actorName ? ` · ${entry.actorName}` : ""}</p>{entry.reason && <small>{entry.reason}</small>}</div></li>)}</ol></section>
          {audience === "CLIENT" && details.status === "COMPLETED" && !details.reviews.some((review) => review.reviewerRole === "CLIENT") && <ClientReviewForm orderId={details.id} />}
          {audience === "MASTER" && ["COMPLETED", "REVIEWED"].includes(details.status) && !details.reviews.some((review) => review.reviewerRole === "MASTER") && <MasterReviewForm orderId={details.id} clientName={details.client.name} />}
          {details.reviews.length > 0 && <section className="order-detail-card"><header><div><small>Отзывы</small><h2>Оценки по заказу</h2></div></header><div className="order-reviews">{details.reviews.map((review) => <article key={review.id}><div><strong>{review.reviewerName}</strong><span><Star size={14} fill="currentColor" /> {review.overallRating}</span></div>{review.comment && <p>{review.comment}</p>}</article>)}</div></section>}
          {audience === "CLIENT" && details.warranty && <WarrantyCard warranty={details.warranty} onFiled={() => router.refresh()} />}
        </main>
        <aside>
          {details.master && <section className="order-person-card"><div className="order-person-avatar">{details.master.avatarUrl ? <Image src={details.master.avatarUrl} alt={details.master.name} fill sizes="64px" unoptimized /> : <UserRound size={25} />}</div><div><small>Мастер</small><h2>{details.master.name}</h2><p>{details.master.specialization}</p><span><BadgeCheck size={14} /> Личность подтверждена</span>{details.master.rating && <b><Star size={14} fill="currentColor" /> {details.master.rating.toFixed(1)} · {details.master.reviewsCount} отзывов</b>}</div>{audience === "CLIENT" && <footer>{details.master.phone && <a href={`tel:${details.master.phone}`}><Phone size={16} /> Позвонить</a>}<Link href={`/masters/${details.master.id}`}>Профиль</Link></footer>}</section>}
          {audience === "MASTER" && <section className="order-person-card"><div className="order-person-avatar"><UserRound size={25} /></div><div><small>Клиент</small><h2>{details.client.name}</h2><p>{details.client.email}</p></div><footer><a href="#order-chat"><MessageCircle size={16} /> Написать</a></footer></section>}
          <section className="order-facts-card"><div><MapPin size={18} /><span><small>Адрес</small><strong>{details.city}, {details.street}, {details.house}{details.apartment ? `, кв. ${details.apartment}` : ""}</strong>{details.addressComment && <p>{details.addressComment}</p>}</span></div><div><Clock3 size={18} /><span><small>Когда</small><strong>{formatSchedule(details.scheduleKind, details.scheduledAt)}</strong>{details.etaMinutes && <p>Ориентир прибытия: {details.etaMinutes} минут</p>}</span></div><div><WalletCards size={18} /><span><small>Согласованная цена</small><strong>{formatRubles(details.agreedPriceRubles)}</strong></span></div></section>
          {details.master && <OrderChatCard orderId={details.id} messages={details.messages} audience={audience} onSent={() => router.refresh()} />}
        </aside>
      </div>
    </div>
  );
}

function LiveTrackingCard({ details }: { details: OrderDetails }) {
  const eta = details.etaMinutes ?? 24;
  return (
    <section className="live-tracking-card" aria-labelledby="live-tracking-title">
      <header>
        <div><small>Активный заказ</small><h1 id="live-tracking-title">Мастер в пути</h1><p>{details.categoryName}{details.subcategoryName ? ` · ${details.subcategoryName}` : ""}</p></div>
        <strong><span>{eta}</span> мин</strong>
      </header>
      <a className="live-tracking-map" href="#live-tracking-map" aria-label="Открыть полноэкранную карту движения мастера">
        <Image src="/maps/master-en-route.png" alt="Маршрут выбранного мастера Александра до дома на Тверской, 18" fill sizes="(max-width: 850px) 100vw, 900px" priority />
        <span><Navigation size={16} /> Следить на карте</span>
      </a>
      <div className="live-tracking-master">
        <div className="order-person-avatar">{details.master?.avatarUrl ? <Image src={details.master.avatarUrl} alt={details.master.name} fill sizes="62px" unoptimized /> : <UserRound size={25} />}</div>
        <div><small>Ваш мастер</small><h2>{details.master?.name}</h2><p>{details.master?.specialization} · <Star size={13} fill="currentColor" /> {details.master?.rating?.toFixed(1) ?? "Новый"}</p></div>
        <div className="live-tracking-contact">
          <a href="#order-chat" aria-label="Написать мастеру"><MessageCircle size={20} /></a>
          {details.master?.phone && <a href={`tel:${details.master.phone}`} aria-label="Позвонить мастеру"><Phone size={20} /></a>}
        </div>
      </div>
      <dl className="live-tracking-facts">
        <div><dt>Согласованная цена</dt><dd>{formatRubles(details.agreedPriceRubles)}</dd></div>
        <div><dt>Ожидаем прибытие</dt><dd>через {eta} мин</dd></div>
      </dl>
      <div className="live-tracking-next"><span><Navigation size={18} /></span><div><small>Следующий этап</small><strong>По прибытии мастер добавит фото «до»</strong></div></div>
    </section>
  );
}

function LiveTrackingOverlay({ details }: { details: OrderDetails }) {
  const eta = details.etaMinutes ?? 24;
  return (
    <div className="tracking-overlay" id="live-tracking-map" role="dialog" aria-modal="true" aria-labelledby="tracking-overlay-title">
      <div className="tracking-overlay__map">
        <Image src="/maps/master-en-route.png" alt="Маршрут мастера до адреса клиента" fill sizes="100vw" priority />
      </div>
      <header><a href="#" aria-label="Закрыть карту"><X size={22} /></a><div><small>Заказ № {details.id === "demo-active-order" ? "MR-1048" : details.id.slice(-6).toUpperCase()}</small><h2 id="tracking-overlay-title">Мастер в пути</h2></div><strong>{eta} мин</strong></header>
      <section className="tracking-overlay__sheet">
        <span className="tracking-overlay__handle" />
        <div className="live-tracking-master">
          <div className="order-person-avatar">{details.master?.avatarUrl ? <Image src={details.master.avatarUrl} alt={details.master.name} fill sizes="64px" unoptimized /> : <UserRound size={25} />}</div>
          <div><small>Выбранный мастер</small><h2>{details.master?.name}</h2><p>{details.master?.specialization} · <Star size={13} fill="currentColor" /> {details.master?.rating?.toFixed(1) ?? "Новый"}</p></div>
          <div className="live-tracking-contact"><a href="#order-chat" aria-label="Написать мастеру"><MessageCircle size={20} /></a>{details.master?.phone && <a href={`tel:${details.master.phone}`} aria-label="Позвонить мастеру"><Phone size={20} /></a>}</div>
        </div>
        <dl className="live-tracking-facts"><div><dt>Адрес</dt><dd>{details.street}, {details.house}</dd></div><div><dt>Цена</dt><dd>{formatRubles(details.agreedPriceRubles)}</dd></div></dl>
        <a className="button button--primary tracking-overlay__close" href="#"><Map size={18} /> Вернуться к заказу</a>
      </section>
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

function ChangeOrderCard({
  orderId,
  audience,
  pendingRequest,
  onDone,
}: {
  orderId: string;
  audience: "CLIENT" | "MASTER";
  pendingRequest?: OrderDetails["changeRequests"][number];
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function propose(event: FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await proposeChangeOrderAction({ orderId, proposedPriceRubles: Number(price), reason });
      if (!result.ok) { setError(result.message ?? "Не удалось отправить запрос"); return; }
      setIsFormOpen(false);
      setPrice("");
      setReason("");
      onDone();
    });
  }

  function respond(accept: boolean) {
    if (!pendingRequest) return;
    setError("");
    startTransition(async () => {
      const result = await respondToChangeOrderAction({ orderId, requestId: pendingRequest.id, accept });
      if (!result.ok) setError(result.message ?? "Не удалось обработать ответ");
      else onDone();
    });
  }

  if (pendingRequest) {
    const diff = pendingRequest.proposedPriceRubles - pendingRequest.previousPriceRubles;
    return (
      <section className="order-detail-card order-change-card">
        <header><div><small>Изменение цены</small><h2>{audience === "CLIENT" ? "Мастер предлагает новую цену" : "Ждём ответа клиента"}</h2></div></header>
        <div className="order-change-amounts">
          <div><small>Было</small><strong>{formatRubles(pendingRequest.previousPriceRubles)}</strong></div>
          <ArrowLeft size={16} className="order-change-arrow" aria-hidden="true" />
          <div><small>Станет</small><strong>{formatRubles(pendingRequest.proposedPriceRubles)}</strong></div>
          <span className={`order-change-diff ${diff > 0 ? "is-up" : "is-down"}`}>{diff > 0 ? "+" : ""}{formatRubles(diff)}</span>
        </div>
        <p className="order-change-reason"><strong>Причина:</strong> {pendingRequest.reason}</p>
        {audience === "CLIENT" ? (
          <div className="order-completion-actions">
            <button className="button button--primary" type="button" onClick={() => respond(true)} disabled={isPending}>Принять новую цену</button>
            <button className="button button--secondary" type="button" onClick={() => respond(false)} disabled={isPending}>Отклонить</button>
          </div>
        ) : (
          <p className="field-hint">Работу нельзя завершить, пока клиент не ответит на этот запрос.</p>
        )}
        {error && <p className="task-form-error" role="alert"><AlertCircle size={16} /> {error}</p>}
      </section>
    );
  }

  return (
    <section className="order-detail-card order-change-card">
      <header><div><small>Изменение цены</small><h2>Нужна другая сумма?</h2></div>{!isFormOpen && <button className="button button--secondary" type="button" onClick={() => setIsFormOpen(true)}>Изменить стоимость</button>}</header>
      {isFormOpen && (
        <form onSubmit={propose} className="order-change-form">
          <label>Новая итоговая цена, ₽<input type="number" inputMode="numeric" min="500" max="1000000" step="100" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="3 500" required /></label>
          <label>Причина для клиента<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} placeholder="Например: нужен демонтаж старой плитки" required /></label>
          {error && <p className="task-form-error" role="alert"><AlertCircle size={16} /> {error}</p>}
          <div className="order-completion-actions">
            <button className="button button--primary" type="submit" disabled={isPending}>{isPending ? <><LoaderCircle className="spin" size={17} /> Отправляем…</> : "Отправить клиенту"}</button>
            <button className="button button--secondary" type="button" onClick={() => setIsFormOpen(false)} disabled={isPending}>Отмена</button>
          </div>
        </form>
      )}
    </section>
  );
}

function WorkEvidenceCard({
  orderId,
  audience,
  status,
  beforePhotos,
  afterPhotos,
  onUploaded,
}: {
  orderId: string;
  audience: "CLIENT" | "MASTER";
  status: OrderStatus;
  beforePhotos: WorkPhoto[];
  afterPhotos: WorkPhoto[];
  onUploaded: () => void;
}) {
  const [isUploading, setIsUploading] = useState<WorkMediaStage | null>(null);
  const [error, setError] = useState("");
  const canUploadBefore = audience === "MASTER" && status === "MASTER_ARRIVED";
  const canUploadAfter = audience === "MASTER" && status === "IN_PROGRESS";

  async function upload(stage: WorkMediaStage, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const validationError = validateOrderPhoto({ mimeType: file.type, byteSize: file.size });
    if (validationError) { setError(validationError.message); return; }
    setError("");
    setIsUploading(stage);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch(`/api/master/orders/${orderId}/work-media?stage=${stage}`, { method: "POST", body: formData });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Не удалось загрузить фотографию");
      onUploaded();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить фотографию");
    } finally {
      setIsUploading(null);
    }
  }

  return (
    <section className="order-detail-card">
      <header><div><small>Доказательство работы</small><h2>Фото до и после</h2></div></header>
      <div className="work-evidence-grid">
        <WorkEvidenceStage stage="BEFORE" label="До" photos={beforePhotos} canUpload={canUploadBefore} isUploading={isUploading} onUpload={upload} />
        <WorkEvidenceStage stage="AFTER" label="После" photos={afterPhotos} canUpload={canUploadAfter} isUploading={isUploading} onUpload={upload} />
      </div>
      {error && <p className="task-form-error" role="alert"><AlertCircle size={16} /> {error}</p>}
    </section>
  );
}

function WorkEvidenceStage({
  stage,
  label,
  photos,
  canUpload,
  isUploading,
  onUpload,
}: {
  stage: WorkMediaStage;
  label: string;
  photos: WorkPhoto[];
  canUpload: boolean;
  isUploading: WorkMediaStage | null;
  onUpload: (stage: WorkMediaStage, event: ChangeEvent<HTMLInputElement>) => void;
}) {
  if (photos.length === 0 && !canUpload) return null;
  return (
    <div className="work-evidence-stage">
      <small>{label}</small>
      {photos.length > 0 && <div className="order-detail-photos">{photos.map((photo) => <Image key={photo.id} src={photo.url} alt={`Фото «${label.toLowerCase()}»`} width={150} height={110} unoptimized />)}</div>}
      {canUpload && photos.length < 5 && (
        <label className="work-evidence-add">
          <input type="file" accept={ALLOWED_ORDER_PHOTO_TYPES.join(",")} onChange={(event) => onUpload(stage, event)} disabled={isUploading !== null} />
          {isUploading === stage ? <LoaderCircle className="spin" size={16} /> : <ImagePlus size={16} />}
          {photos.length === 0 ? "Добавить обязательное фото" : "Добавить ещё"}
        </label>
      )}
    </div>
  );
}

function OrderChatCard({
  orderId,
  messages,
  audience,
  onSent,
}: {
  orderId: string;
  messages: OrderDetails["messages"];
  audience: "CLIENT" | "MASTER";
  onSent: () => void;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setError("");
    startTransition(async () => {
      const result = await sendOrderMessageAction(orderId, trimmed);
      if (!result.ok) { setError(result.message ?? "Не удалось отправить сообщение"); return; }
      setBody("");
      onSent();
    });
  }

  return (
    <section className="order-chat-card" id="order-chat">
      <header><small><MessageCircle size={13} /> Чат заказа</small><h2>Сообщения</h2></header>
      <div className="order-chat-list" ref={listRef}>
        {messages.length === 0 && <p className="order-chat-empty">Договоритесь о деталях здесь — переписка останется в заказе.</p>}
        {messages.map((message) => {
          const isOwn = message.senderRole === audience;
          return (
            <div className={`order-chat-message${isOwn ? " is-own" : ""}`} key={message.id}>
              <span className="order-chat-message__meta">{isOwn ? "Вы" : message.senderName} · {new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(message.createdAt)}</span>
              <p>{message.body}</p>
            </div>
          );
        })}
      </div>
      <form className="order-chat-form" onSubmit={submit}>
        <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} rows={2} placeholder="Написать сообщение…" disabled={isPending} />
        <button className="button button--primary" type="submit" aria-label="Отправить" disabled={isPending || !body.trim()}>
          {isPending ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}
        </button>
      </form>
      {error && <p className="task-form-error" role="alert"><AlertCircle size={16} /> {error}</p>}
    </section>
  );
}

function WarrantyCard({ warranty, onFiled }: { warranty: OrderWarranty; onFiled: () => void }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await fileWarrantyClaimAction({ warrantyId: warranty.id, description });
      if (!result.ok) { setError(result.message ?? "Не удалось отправить обращение"); return; }
      setDone(true);
      onFiled();
    });
  }

  return (
    <section className="order-detail-card">
      <header><div><small><ShieldCheck size={13} /> Гарантия мастера</small><h2>{warranty.isActive ? `Действует ещё ${warranty.daysRemaining} дн.` : "Гарантия истекла"}</h2></div></header>
      <p>Гарантию на эту работу предоставляет мастер — платформа фиксирует срок ({warranty.durationDays} дн. с {new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(warranty.startedAt)}) и помогает открыть обращение.</p>
      {warranty.claimComplaintId || done ? (
        <p className="task-form-success"><Check size={16} /> Обращение открыто и передано администратору.</p>
      ) : warranty.isActive ? (
        isFormOpen ? (
          <form className="order-change-form" onSubmit={submit}>
            <label>
              Что случилось?
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={3} placeholder="Опишите проблему — например, снова протекает то же соединение" required minLength={10} />
            </label>
            {error && <p className="task-form-error" role="alert"><AlertCircle size={16} /> {error}</p>}
            <div className="order-completion-actions">
              <button className="button button--primary" type="submit" disabled={isPending}>{isPending ? <LoaderCircle className="spin" size={17} /> : "Отправить обращение"}</button>
              <button className="button button--secondary" type="button" onClick={() => setIsFormOpen(false)} disabled={isPending}>Отмена</button>
            </div>
          </form>
        ) : (
          <button className="button button--secondary" type="button" onClick={() => setIsFormOpen(true)}>Сообщить о проблеме по гарантии</button>
        )
      ) : null}
    </section>
  );
}
