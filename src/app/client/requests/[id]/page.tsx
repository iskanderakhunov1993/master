"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Send, Star } from "lucide-react";

interface MasterProfile {
  id: string;
  completedOrders?: number;
  avgResponseMinutes?: number;
}

interface MasterUser {
  id: string;
  name: string;
  avatarUrl?: string;
  ratingAvg: number;
  ratingCount: number;
  masterProfile?: MasterProfile;
}

interface Offer {
  id: string;
  price: number;
  comment: string;
  guaranteeDays: number;
  status: string;
  createdAt?: string;
  master: { id?: string; user: MasterUser };
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

const PHOTO_PLACEHOLDERS = ["#e8f5e9", "#e3f2fd", "#fff3e0", "#fce4ec"];

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
  const [masterConfirmed, setMasterConfirmed] = useState(false);
  const [masterRejected, setMasterRejected] = useState(false);
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
        <div className="skeleton" style={{ height: 120, borderRadius: "var(--radius-md)", marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 200, borderRadius: "var(--radius-md)" }} />
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
  const hasPhotos = request.photos && request.photos.length > 0;

  return (
    <AppShell role="CLIENT">
      {/* Header with status */}
      <div className="page-head">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span className={statusInfo.cls} style={{ fontSize: "0.9rem" }}>{statusInfo.label}</span>
            <span className="pill">{request.category.icon} {request.category.name}</span>
            {request.urgency === "URGENT" && <span className="pill-orange">Срочно</span>}
          </div>
          <h1 style={{ margin: 0 }}>{request.title}</h1>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <article className="stat-card">
          <span className="muted" style={{ fontSize: 13 }}>Бюджет</span>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: 4 }}>
            {request.budgetAmount != null ? `${request.budgetAmount.toLocaleString("ru-RU")} ₽` : "Не указан"}
          </div>
        </article>
        <article className="stat-card">
          <span className="muted" style={{ fontSize: 13 }}>Район</span>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: 4 }}>
            {request.address?.district || "Не указан"}
          </div>
        </article>
        <article className="stat-card">
          <span className="muted" style={{ fontSize: 13 }}>Когда</span>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: 4 }}>
            {request.preferredTimeFrom || "Гибко"}
          </div>
        </article>
      </div>

      {/* Description */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <p style={{ margin: 0 }}>{request.description}</p>
      </div>

      {/* Photos */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Фото</h3>
        <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
          {hasPhotos ? (
            request.photos!.map((photo, i) => (
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
            ))
          ) : (
            PHOTO_PLACEHOLDERS.map((color, i) => (
              <div
                key={i}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "var(--radius-sm)",
                  background: color,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                  color: "var(--muted)",
                }}
              >
                📷
              </div>
            ))
          )}
        </div>
      </div>

      {/* Offers — rich master mini-profiles */}
      {request.offers.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12 }}>
            Предложения мастеров
            <span className="pill" style={{ marginLeft: 8, fontSize: "0.8rem" }}>
              {request.offers.length}
            </span>
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {request.offers.map((offer) => {
              const master = offer.master.user;
              const masterProfileId = offer.master.id;
              const initials = master.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
              const orders = master.masterProfile?.completedOrders ?? master.ratingCount ?? 0;
              const responseTime = master.masterProfile?.avgResponseMinutes;
              const timeSince = offer.createdAt
                ? (() => {
                    const mins = Math.floor((Date.now() - new Date(offer.createdAt).getTime()) / 60000);
                    if (mins < 60) return `${mins} мин назад`;
                    if (mins < 1440) return `${Math.floor(mins / 60)} ч назад`;
                    return `${Math.floor(mins / 1440)} дн назад`;
                  })()
                : null;

              return (
                <article className="card" key={offer.id} style={{ padding: 20 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    {/* Avatar */}
                    <div className="avatar" style={{
                      width: 48,
                      height: 48,
                      fontSize: 18,
                      flexShrink: 0,
                    }}>
                      {initials}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Name + rating row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <h4 style={{ margin: 0, display: "inline" }}>{master.name}</h4>
                          <span className="muted" style={{ fontSize: 13, marginLeft: 8 }}>
                            ⭐ {master.ratingAvg?.toFixed(1) || "—"} ({master.ratingCount})
                          </span>
                        </div>
                        {/* Price */}
                        <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--accent)" }}>
                          {offer.price.toLocaleString("ru-RU")} ₽
                        </div>
                      </div>

                      {/* Stats row */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                        <span className="pill" style={{ fontSize: 12 }}>{orders} заказов</span>
                        {offer.guaranteeDays > 0 && (
                          <span className="pill-green" style={{ fontSize: 12 }}>Гарантия {offer.guaranteeDays} дн.</span>
                        )}
                        {responseTime && (
                          <span className="pill" style={{ fontSize: 12 }}>Ответ: {responseTime} мин</span>
                        )}
                        {timeSince && (
                          <span className="muted" style={{ fontSize: 12 }}>{timeSince}</span>
                        )}
                      </div>

                      {/* Comment */}
                      {offer.comment && (
                        <p className="muted" style={{ margin: "8px 0 0", fontSize: 14 }}>{offer.comment}</p>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                        {offer.status === "PENDING" && (
                          <button className="btn-primary btn-sm" onClick={() => acceptOffer(offer.id)}>
                            Выбрать мастера
                          </button>
                        )}
                        {masterProfileId && (
                          <Link href={`/masters/${masterProfileId}`} className="btn-secondary btn-sm">
                            Профиль
                          </Link>
                        )}
                        <button className="btn-secondary btn-sm" onClick={() => {
                          const el = document.querySelector(".chat-box");
                          el?.scrollIntoView({ behavior: "smooth" });
                        }}>
                          Написать
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {request.offers.length === 0 && request.status === "PUBLISHED" && (
        <div className="card" style={{ padding: 24, textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>⏳</div>
          <h3 style={{ margin: "0 0 4px" }}>Ожидаем предложения</h3>
          <p className="muted" style={{ margin: 0 }}>Мастера увидят вашу заявку и предложат свою цену</p>
        </div>
      )}

      {/* Master meeting card — shown when master is assigned */}
      {request.status === "ASSIGNED" || request.status === "IN_PROGRESS" ? (() => {
        const acceptedOffer = request.offers.find((o) => o.status === "ACCEPTED");
        if (!acceptedOffer) return null;
        const master = acceptedOffer.master.user;
        const initials = master.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
        const orders = master.masterProfile?.completedOrders ?? master.ratingCount ?? 0;

        return (
          <div className="card" style={{ padding: 24, marginBottom: 16, border: "2px solid var(--accent)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 20 }}>🚗</span>
              <h3 style={{ margin: 0 }}>
                {masterConfirmed ? "Мастер на месте ✅" : masterRejected ? "Заказ приостановлен" : "Мастер едет к вам"}
              </h3>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
              <div className="avatar" style={{ width: 56, height: 56, fontSize: 20, flexShrink: 0 }}>
                {initials}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{master.name}</div>
                <div className="muted" style={{ fontSize: 14 }}>
                  ⭐ {master.ratingAvg?.toFixed(1) || "—"} · {orders} заказов
                </div>
                <span className="pill-green" style={{ fontSize: 12, marginTop: 4, display: "inline-block" }}>✅ Проверен</span>
              </div>
            </div>

            {masterRejected ? (
              <div style={{
                padding: 16,
                background: "#fce4ec",
                borderRadius: "var(--radius-sm)",
                textAlign: "center",
                color: "var(--red)",
                fontWeight: 600,
              }}>
                Заказ приостановлен. Мы свяжемся с вами.
              </div>
            ) : masterConfirmed ? (
              <div style={{
                padding: 16,
                background: "#e8f5e9",
                borderRadius: "var(--radius-sm)",
                textAlign: "center",
                color: "var(--green)",
                fontWeight: 600,
              }}>
                Мастер на месте. Работа началась!
              </div>
            ) : (
              <>
                <p className="muted" style={{ margin: "0 0 16px", fontSize: 14 }}>
                  Убедитесь, что перед вами этот человек
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => setMasterConfirmed(true)}
                  >
                    ✅ Да, впустил мастера
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      if (confirm("Вы уверены? Заказ будет приостановлен.")) {
                        setMasterRejected(true);
                      }
                    }}
                  >
                    ❌ Это не тот человек
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })() : null}

      {/* Chat */}
      <section className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Чат</h3>
        <div className="chat-box">
          {request.messages.length === 0 && (
            <p className="muted" style={{ padding: 24, textAlign: "center" }}>
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
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
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
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ marginBottom: 16 }}>Оставить отзыв</h3>
          <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
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
            className="btn-primary"
            onClick={submitReview}
            disabled={submittingReview}
            style={{ width: "100%", marginTop: 12, opacity: submittingReview ? 0.6 : 1 }}
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
