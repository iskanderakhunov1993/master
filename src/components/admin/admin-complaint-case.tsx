"use client";

import { AlertCircle, ArrowLeft, Check, LoaderCircle, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import { claimComplaintAction, resolveComplaintAction } from "@/lib/admin/actions";
import type { AdminComplaintCase } from "@/lib/admin/types";
import { formatRubles } from "@/lib/orders/presentation";
import type { OrderChangeRequest } from "@/lib/orders/change-requests";
import type { WorkPhoto } from "@/lib/orders/work-media";

const date = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" });
const statusLabel = { OPEN: "Открыта", IN_REVIEW: "На рассмотрении", RESOLVED: "Решена", REJECTED: "Отклонена" };

export function AdminComplaintCase({
  complaint,
  beforePhotos,
  afterPhotos,
  changeRequests,
}: {
  complaint: AdminComplaintCase;
  beforePhotos: WorkPhoto[];
  afterPhotos: WorkPhoto[];
  changeRequests: OrderChangeRequest[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [resolution, setResolution] = useState("");
  const [error, setError] = useState("");
  const isOpen = complaint.status === "OPEN" || complaint.status === "IN_REVIEW";

  function claim() {
    setError("");
    startTransition(async () => {
      const result = await claimComplaintAction(complaint.id);
      if (!result.ok) setError(result.message ?? "Не удалось выполнить действие");
      else router.refresh();
    });
  }

  function submit(event: FormEvent, decision: "RESOLVED" | "REJECTED") {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await resolveComplaintAction({ complaintId: complaint.id, decision, resolution });
      if (!result.ok) setError(result.message ?? "Не удалось сохранить решение");
      else router.refresh();
    });
  }

  return (
    <div className="admin-page">
      <Link className="selected-master-back" href="/admin/complaints"><ArrowLeft size={17} /> Все обращения</Link>
      <header className="client-page-heading">
        <div>
          <span>{complaint.kind === "DISPUTE" ? "Спор по заказу" : "Жалоба"} · {date.format(complaint.createdAt)}</span>
          <h1>{complaint.subject}</h1>
          <p>Заказ #{complaint.orderId.slice(0, 8)} · {complaint.order.categoryName}</p>
        </div>
        <span className={`admin-status is-${complaint.status.toLowerCase()}`}>{statusLabel[complaint.status]}</span>
      </header>

      <div className="admin-case-grid">
        <main>
          <section className="order-detail-card">
            <header><div><small>Обращение</small><h2>{complaint.reporterName} сообщает</h2></div></header>
            <p>{complaint.description}</p>
          </section>

          <section className="order-detail-card">
            <header><div><small>Заказ</small><h2>{complaint.order.description || complaint.order.categoryName}</h2></div><strong>{formatRubles(complaint.order.priceRubles)}</strong></header>
            <dl className="admin-case-facts">
              <div><dt>Клиент</dt><dd>{complaint.order.client.name} · {complaint.order.client.email}</dd></div>
              <div><dt>Мастер</dt><dd>{complaint.order.master ? `${complaint.order.master.name} · ${complaint.order.master.email}` : "Не назначен"}</dd></div>
            </dl>
          </section>

          {(beforePhotos.length > 0 || afterPhotos.length > 0) && (
            <section className="order-detail-card">
              <header><div><small>Доказательство работы</small><h2>Фото до и после</h2></div></header>
              <div className="work-evidence-grid">
                <div className="work-evidence-stage"><small>До</small>{beforePhotos.length > 0 ? <div className="order-detail-photos">{beforePhotos.map((photo) => <Image key={photo.id} src={photo.url} alt="Фото «до»" width={150} height={110} unoptimized />)}</div> : <p className="order-chat-empty">Не загружено</p>}</div>
                <div className="work-evidence-stage"><small>После</small>{afterPhotos.length > 0 ? <div className="order-detail-photos">{afterPhotos.map((photo) => <Image key={photo.id} src={photo.url} alt="Фото «после»" width={150} height={110} unoptimized />)}</div> : <p className="order-chat-empty">Не загружено</p>}</div>
              </div>
            </section>
          )}

          {changeRequests.length > 0 && (
            <section className="order-detail-card">
              <header><div><small>Изменения цены</small><h2>История запросов</h2></div></header>
              <ol className="order-timeline">
                {changeRequests.map((request) => (
                  <li key={request.id}>
                    <span />
                    <div>
                      <strong>{formatRubles(request.previousPriceRubles)} → {formatRubles(request.proposedPriceRubles)} · {request.status === "PENDING" ? "Ожидает" : request.status === "ACCEPTED" ? "Принято" : request.status === "REJECTED" ? "Отклонено" : "Отменено"}</strong>
                      <p>{date.format(request.createdAt)}</p>
                      <small>{request.reason}</small>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {isOpen ? (
            <form className="order-detail-card order-review-form" onSubmit={(event) => submit(event, "RESOLVED")}>
              <header><div><small>Решение</small><h2>Закрыть обращение</h2></div></header>
              {complaint.status === "OPEN" && (
                <button className="button button--secondary" type="button" onClick={claim} disabled={isPending}>Взять в работу</button>
              )}
              <label>
                Решение и комментарий
                <textarea value={resolution} onChange={(event) => setResolution(event.target.value)} maxLength={1000} rows={4} placeholder="Опишите, что установлено и какое решение принято" required minLength={10} />
              </label>
              {error && <p className="task-form-error" role="alert"><AlertCircle size={16} /> {error}</p>}
              <div className="order-completion-actions">
                <button className="button button--primary" type="submit" disabled={isPending}>{isPending ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />} Решить в пользу обращения</button>
                <button className="button button--secondary" type="button" onClick={(event) => submit(event, "REJECTED")} disabled={isPending}><X size={17} /> Отклонить</button>
              </div>
            </form>
          ) : (
            <section className="order-detail-card">
              <header><div><small>Решение</small><h2>{complaint.resolvedByName ? `Закрыто · ${complaint.resolvedByName}` : "Закрыто"}</h2></div></header>
              <p>{complaint.resolution || "Комментарий не оставлен."}</p>
              {complaint.resolvedAt && <p className="field-hint">{date.format(complaint.resolvedAt)}</p>}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
