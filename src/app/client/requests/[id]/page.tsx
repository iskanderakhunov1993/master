"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";

interface MasterUser {
  id: string;
  name: string;
  avatarUrl?: string;
  ratingAvg: number;
  ratingCount: number;
}

interface Offer {
  id: string;
  price: number;
  comment: string;
  guaranteeDays: number;
  status: string;
  master: { user: MasterUser };
}

interface Message {
  id: string;
  message: string;
  createdAt: string;
  sender: { id: string; name: string };
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewer: { id: string; name: string };
  reviewee: { id: string; name: string };
}

interface RequestDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  budgetAmount?: number;
  budgetType?: string;
  urgency?: string;
  preferredTimeFrom?: string;
  category: { name: string; icon: string };
  address?: { district?: string; street?: string };
  photos?: { url: string }[];
  offers: Offer[];
  messages: Message[];
  reviews: Review[];
  client?: { id: string };
}

const STATUS_LABELS: Record<string, string> = {
  PUBLISHED: "Опубликована",
  ASSIGNED: "Назначена",
  IN_PROGRESS: "В работе",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена",
};

export default function ClientRequestPage() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msgText, setMsgText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  async function loadData() {
    try {
      const [reqRes, meRes] = await Promise.all([
        fetch(`/api/requests/${id}`),
        fetch("/api/auth/me"),
      ]);
      const reqJson = await reqRes.json();
      const meJson = await meRes.json();

      if (!reqJson.ok) throw new Error(reqJson.error || "Ошибка загрузки заявки");
      if (meJson.ok) setCurrentUserId(meJson.data.id);
      setRequest(reqJson.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [request?.messages]);

  async function acceptOffer(offerId: string) {
    try {
      const res = await fetch(`/api/offers/${offerId}/accept`, { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Ошибка");
      await loadData();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function sendMessage() {
    if (!msgText.trim()) return;
    setSendingMsg(true);
    try {
      const res = await fetch(`/api/requests/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msgText }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Ошибка отправки");
      setMsgText("");
      await loadData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSendingMsg(false);
    }
  }

  async function submitReview() {
    setSubmittingReview(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repairRequestId: id,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Ошибка");
      setReviewComment("");
      await loadData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmittingReview(false);
    }
  }

  if (loading) {
    return (
      <AppShell role="CLIENT">
        <div style={{ height: 300, background: "var(--card)", borderRadius: "var(--radius-md)" }} />
      </AppShell>
    );
  }

  if (error || !request) {
    return (
      <AppShell role="CLIENT">
        <div className="empty-state">
          <p style={{ color: "var(--red)" }}>{error || "Заявка не найдена"}</p>
        </div>
      </AppShell>
    );
  }

  const hasMyReview = request.reviews.some((r) => r.reviewer.id === currentUserId);
  const showReviewForm = request.status === "COMPLETED" && !hasMyReview;

  return (
    <AppShell role="CLIENT">
      {/* Header */}
      <div className="page-head">
        <div>
          <h1>{request.title}</h1>
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
            <span className="pill">{request.category.icon} {request.category.name}</span>
            <span className="badge">{STATUS_LABELS[request.status] || request.status}</span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="grid-3">
        <article className="card">
          <h3>Бюджет</h3>
          <p>{request.budgetAmount != null ? `${request.budgetAmount.toLocaleString("ru-RU")} ₽` : "Не указан"}</p>
        </article>
        <article className="card">
          <h3>Район</h3>
          <p>{request.address?.district || "Не указан"}</p>
        </article>
        <article className="card">
          <h3>Время</h3>
          <p>{request.preferredTimeFrom || "Не указано"}</p>
        </article>
      </div>

      <div className="card" style={{ padding: 20, marginTop: 16 }}>
        <p>{request.description}</p>
        {request.urgency && (
          <div className="request-meta" style={{ marginTop: 12 }}>
            <span>Срочность: {request.urgency}</span>
          </div>
        )}
      </div>

      {/* Photos */}
      {request.photos && request.photos.length > 0 && (
        <div className="section" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Фото</h3>
          <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
            {request.photos.map((photo, i) => (
              <div
                key={i}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "var(--radius-sm)",
                  background: "var(--card2)",
                  flexShrink: 0,
                  backgroundImage: `url(${photo.url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Offers */}
      {request.offers.length > 0 && (
        <section className="section" style={{ marginTop: 16 }}>
          <span className="badge" style={{ marginBottom: 12, display: "inline-block" }}>
            Предложения мастеров ({request.offers.length})
          </span>
          <div className="request-list">
            {request.offers.map((offer) => {
              const master = offer.master.user;
              return (
                <article className="request-card" key={offer.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {master.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h3 style={{ margin: 0 }}>{master.name}</h3>
                      <span className="muted" style={{ fontSize: 14 }}>
                        {master.ratingAvg?.toFixed(1) || "—"} ({master.ratingCount})
                      </span>
                    </div>
                    <strong style={{ fontSize: 20 }}>
                      {offer.price.toLocaleString("ru-RU")} ₽
                    </strong>
                    {offer.guaranteeDays > 0 && (
                      <div className="muted" style={{ fontSize: 13 }}>
                        Гарантия: {offer.guaranteeDays} дн.
                      </div>
                    )}
                    {offer.comment && (
                      <p className="muted" style={{ margin: "8px 0 0", fontSize: 14 }}>
                        {offer.comment}
                      </p>
                    )}
                    {offer.status === "PENDING" && (
                      <button
                        className="primary-btn"
                        style={{ marginTop: 12 }}
                        onClick={() => acceptOffer(offer.id)}
                      >
                        Выбрать
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Chat */}
      <section className="card" style={{ marginTop: 16 }}>
        <h3>Чат</h3>
        <div className="chat-box">
          {request.messages.length === 0 && (
            <p className="muted" style={{ textAlign: "center", padding: 24 }}>
              Нет сообщений
            </p>
          )}
          {request.messages.map((msg) => (
            <div
              key={msg.id}
              className={msg.sender.id === currentUserId ? "message mine" : "message"}
            >
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
                {msg.sender.name} &middot;{" "}
                {new Date(msg.createdAt).toLocaleString("ru-RU", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div>{msg.message}</div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="two-col" style={{ marginTop: 16 }}>
          <input
            type="text"
            className="field"
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Сообщение"
          />
          <button
            type="button"
            className="dark-btn"
            onClick={sendMessage}
            disabled={sendingMsg || !msgText.trim()}
            style={{ opacity: sendingMsg || !msgText.trim() ? 0.5 : 1 }}
          >
            {sendingMsg ? "..." : "Отправить"}
          </button>
        </div>
      </section>

      {/* Review form */}
      {showReviewForm && (
        <div className="card" style={{ padding: 20, marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Оставить отзыв</h3>
          <div className="form-grid">
            <label className="field">
              Оценка
              <select
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Комментарий
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Расскажите о работе мастера..."
                rows={3}
              />
            </label>
          </div>
          <button
            type="button"
            className="primary-btn"
            onClick={submitReview}
            disabled={submittingReview}
            style={{ marginTop: 12, opacity: submittingReview ? 0.6 : 1 }}
          >
            {submittingReview ? "Отправка..." : "Отправить отзыв"}
          </button>
        </div>
      )}

      {/* Existing reviews */}
      {request.reviews.length > 0 && (
        <div className="section" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Отзывы</h3>
          {request.reviews.map((rev) => (
            <div key={rev.id} className="card" style={{ padding: 16, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{rev.reviewer.name}</strong>
                <span style={{ color: "var(--orange)" }}>
                  {"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}
                </span>
              </div>
              {rev.comment && <p className="muted" style={{ marginTop: 8 }}>{rev.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
