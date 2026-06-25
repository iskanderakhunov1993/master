"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { Send, Star } from "lucide-react";

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

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  PUBLISHED: { label: "Опубликована", cls: "pill" },
  ASSIGNED: { label: "Назначена", cls: "pill-orange" },
  IN_PROGRESS: { label: "В работе", cls: "pill-orange" },
  COMPLETED: { label: "Завершена", cls: "pill-green" },
  CANCELLED: { label: "Отменена", cls: "pill" },
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
        <div className="skeleton" style={{ height: 300, borderRadius: "var(--radius-md)" }} />
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

  const statusInfo = STATUS_LABELS[request.status] || { label: request.status, cls: "pill" };
  const hasMyReview = request.reviews.some((r) => r.reviewer.id === currentUserId);
  const showReviewForm = request.status === "COMPLETED" && !hasMyReview;

  return (
    <AppShell role="CLIENT">
      {/* Header */}
      <div className="page-head">
        <div>
          <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
            <span className={statusInfo.cls}>{statusInfo.label}</span>
            <span className="pill">{request.category.icon} {request.category.name}</span>
          </div>
          <h1>{request.title}</h1>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <article className="card" style={{ padding: 20 }}>
          <span className="muted" style={{ fontSize: "0.8rem" }}>Бюджет</span>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: 4 }}>
            {request.budgetAmount != null ? `${request.budgetAmount.toLocaleString("ru-RU")} ₽` : "Не указан"}
          </div>
        </article>
        <article className="card" style={{ padding: 20 }}>
          <span className="muted" style={{ fontSize: "0.8rem" }}>Район</span>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: 4 }}>
            {request.address?.district || "Не указан"}
          </div>
        </article>
        <article className="card" style={{ padding: 20 }}>
          <span className="muted" style={{ fontSize: "0.8rem" }}>Когда</span>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: 4 }}>
            {request.preferredTimeFrom || "Гибко"}
          </div>
        </article>
      </div>

      {/* Description */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <p style={{ margin: 0 }}>{request.description}</p>
        {request.urgency && (
          <div className="request-meta" style={{ marginTop: 12 }}>
            <span className="pill-orange" style={{ fontSize: "0.8rem" }}>
              {request.urgency === "URGENT" ? "Срочно" : request.urgency}
            </span>
          </div>
        )}
      </div>

      {/* Photos */}
      {request.photos && request.photos.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Фото</h3>
          <div className="flex gap-2" style={{ overflowX: "auto" }}>
            {request.photos.map((photo, i) => (
              <div
                key={i}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "var(--radius-sm)",
                  background: `url(${photo.url}) center/cover`,
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Offers */}
      {request.offers.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12 }}>
            Предложения мастеров
            <span className="pill" style={{ marginLeft: 8, fontSize: "0.8rem" }}>
              {request.offers.length}
            </span>
          </h3>
          <div className="request-list">
            {request.offers.map((offer) => {
              const master = offer.master.user;
              return (
                <article className="card" key={offer.id} style={{ padding: 20, marginBottom: 12 }}>
                  <div className="flex gap-3" style={{ alignItems: "flex-start" }}>
                    <div className="avatar avatar-md" style={{
                      background: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 18,
                      flexShrink: 0,
                    }}>
                      {master.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="flex justify-between items-center">
                        <h4 style={{ margin: 0 }}>{master.name}</h4>
                        <span className="muted" style={{ fontSize: "0.85rem" }}>
                          ⭐ {master.ratingAvg?.toFixed(1) || "—"} ({master.ratingCount})
                        </span>
                      </div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: 4, color: "var(--accent)" }}>
                        {offer.price.toLocaleString("ru-RU")} ₽
                      </div>
                      {offer.guaranteeDays > 0 && (
                        <span className="pill-green" style={{ fontSize: "0.75rem", marginTop: 8, display: "inline-block" }}>
                          Гарантия {offer.guaranteeDays} дн.
                        </span>
                      )}
                      {offer.comment && (
                        <p className="muted" style={{ margin: "8px 0 0", fontSize: "0.9rem" }}>
                          {offer.comment}
                        </p>
                      )}
                      {offer.status === "PENDING" && (
                        <button
                          className="btn-primary"
                          style={{ marginTop: 12 }}
                          onClick={() => acceptOffer(offer.id)}
                        >
                          Выбрать мастера
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Chat */}
      <section className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Чат</h3>
        <div className="chat-box">
          {request.messages.length === 0 && (
            <p className="muted text-center" style={{ padding: 24 }}>
              Нет сообщений
            </p>
          )}
          {request.messages.map((msg) => (
            <div
              key={msg.id}
              className={msg.sender.id === currentUserId ? "message mine" : "message"}
            >
              <div className="muted" style={{ fontSize: "0.75rem", marginBottom: 4 }}>
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
        <div className="flex gap-2" style={{ marginTop: 12 }}>
          <input
            type="text"
            className="input"
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Написать сообщение..."
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={sendMessage}
            disabled={sendingMsg || !msgText.trim()}
            style={{ opacity: sendingMsg || !msgText.trim() ? 0.5 : 1, padding: "0 16px" }}
          >
            <Send size={18} />
          </button>
        </div>
      </section>

      {/* Review form */}
      {showReviewForm && (
        <div className="card animate-fadeIn" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ marginBottom: 16 }}>Оставить отзыв</h3>
          <div className="flex gap-2" style={{ marginBottom: 16 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setReviewRating(n)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  color: n <= reviewRating ? "var(--orange)" : "var(--line)",
                  fontSize: "1.5rem",
                }}
              >
                <Star size={28} fill={n <= reviewRating ? "var(--orange)" : "none"} />
              </button>
            ))}
          </div>
          <label className="field">
            Комментарий
            <textarea
              className="input"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Расскажите о работе мастера..."
              rows={3}
            />
          </label>
          <button
            type="button"
            className="btn-primary w-full"
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
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Отзывы</h3>
          {request.reviews.map((rev) => (
            <div key={rev.id} className="card" style={{ padding: 16, marginBottom: 8 }}>
              <div className="flex justify-between items-center">
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
