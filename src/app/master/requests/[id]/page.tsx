"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { CheckCircle2 } from "lucide-react";

interface RequestDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  budgetAmount: number;
  preferredTimeFrom: string | null;
  urgency: string;
  category: { name: string; icon?: string };
  address: { district: string; city: string };
  photos: { url: string }[];
  offers: { id: string; userId: string }[];
  client: { name: string; ratingAvg: number; ratingCount: number };
  distance?: string;
  createdAt?: string;
}

interface MeData {
  id: string;
  masterProfile: {
    freeResponsesLeft: number;
    subscription?: { responsesLeft: number; responsesTotal?: number };
  };
}

const GUARANTEE_OPTIONS = [7, 14, 30, 90] as const;
const PHOTO_PLACEHOLDERS = ["#e8f5e9", "#e3f2fd", "#fff3e0", "#fce4ec"];
const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n) + " ₽";

export default function MasterRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [price, setPrice] = useState("");
  const [comment, setComment] = useState("");
  const [guaranteeDays, setGuaranteeDays] = useState<number>(14);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [questionText, setQuestionText] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/requests/${id}`).then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ])
      .then(([reqRes, meRes]) => {
        if (reqRes.ok) setRequest(reqRes.data);
        else setError(reqRes.error || "Ошибка загрузки заявки");
        if (meRes.ok) setMe(meRes.data);
      })
      .catch(() => setError("Ошибка сети"))
      .finally(() => setLoading(false));
  }, [id]);

  const alreadyResponded =
    request && me
      ? request.offers.some((o) => o.userId === me.id)
      : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/requests/${id}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: Number(price),
          comment,
          guaranteeDays,
        }),
      });
      const data = await res.json();
      if (data.ok) setSubmitted(true);
      else setError(data.error || "Ошибка отправки");
    } catch {
      setError("Ошибка сети");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <AppShell role="MASTER">
        <div className="skeleton" style={{ height: 120, borderRadius: "var(--radius-md)", marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 300, borderRadius: "var(--radius-md)" }} />
      </AppShell>
    );

  if (error || !request)
    return (
      <AppShell role="MASTER">
        <div className="empty-state">
          <p style={{ color: "var(--red)" }}>{error || "Заявка не найдена"}</p>
        </div>
      </AppShell>
    );

  const freeLeft = me?.masterProfile.freeResponsesLeft ?? 0;
  const subLeft = me?.masterProfile.subscription?.responsesLeft ?? 0;
  const responsesLeft = freeLeft + subLeft;
  const hasSub = !!me?.masterProfile.subscription;
  const responsesMax = hasSub ? (me?.masterProfile.subscription?.responsesTotal ?? 30) : 3;
  const responsesUsed = hasSub ? subLeft : freeLeft;
  const clientReliable = (request.client.ratingCount ?? 0) > 3;

  const timeSince = request.createdAt
    ? (() => {
        const mins = Math.floor((Date.now() - new Date(request.createdAt).getTime()) / 60000);
        if (mins < 60) return `${mins} мин назад`;
        if (mins < 1440) return `${Math.floor(mins / 60)} ч назад`;
        return `${Math.floor(mins / 1440)} дн назад`;
      })()
    : null;

  return (
    <AppShell role="MASTER">
      <div className="page-head">
        <div>
          <Link href="/master/requests" className="muted" style={{ fontSize: "0.85rem" }}>
            ← Все заявки
          </Link>
          <h1 style={{ marginTop: 8, marginBottom: 0 }}>{request.title}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <span className="pill">{request.category.icon || "🔧"} {request.category.name}</span>
            {request.urgency === "URGENT" && <span className="pill-orange">Срочно</span>}
            {request.distance && <span className="pill">{request.distance}</span>}
            {timeSince && <span className="muted" style={{ fontSize: 13 }}>{timeSince}</span>}
          </div>
        </div>
      </div>

      {/* Budget - prominent */}
      <div className="card" style={{ padding: 20, marginBottom: 16, textAlign: "center" }}>
        <span className="muted" style={{ fontSize: 14 }}>Бюджет клиента</span>
        <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent)", marginTop: 4 }}>
          {fmt(request.budgetAmount)}
        </div>
      </div>

      {/* Photo gallery */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Фото</h3>
        <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
          {request.photos.length > 0 ? (
            request.photos.map((p, i) => (
              <img
                key={i}
                src={p.url}
                alt={`Фото ${i + 1}`}
                style={{
                  width: 140,
                  height: 140,
                  objectFit: "cover",
                  borderRadius: "var(--radius-sm)",
                  flexShrink: 0,
                }}
              />
            ))
          ) : (
            PHOTO_PLACEHOLDERS.map((color, i) => (
              <div
                key={i}
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: "var(--radius-sm)",
                  background: color,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.8rem",
                  color: "var(--muted)",
                }}
              >
                📷
              </div>
            ))
          )}
        </div>
      </div>

      {/* Description */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <p style={{ margin: 0 }}>{request.description}</p>
      </div>

      {/* Client info + details grid */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <article className="stat-card">
          <span className="muted" style={{ fontSize: 13 }}>Клиент</span>
          <div style={{ fontWeight: 600, marginTop: 4 }}>{request.client.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
            <span>⭐ {request.client.ratingAvg?.toFixed(1) ?? "—"}</span>
            <span className="muted" style={{ fontSize: 12 }}>({request.client.ratingCount ?? 0})</span>
          </div>
          {clientReliable && (
            <span className="pill-green" style={{ fontSize: 11, marginTop: 6, display: "inline-block" }}>Надёжный клиент</span>
          )}
        </article>
        <article className="stat-card">
          <span className="muted" style={{ fontSize: 13 }}>Район</span>
          <div style={{ fontWeight: 600, marginTop: 4 }}>{request.address?.district ?? "—"}</div>
          <span className="muted" style={{ fontSize: 12 }}>{request.address?.city}</span>
        </article>
        <article className="stat-card">
          <span className="muted" style={{ fontSize: 13 }}>Когда</span>
          <div style={{ fontWeight: 600, marginTop: 4 }}>{request.preferredTimeFrom || "Гибко"}</div>
        </article>
      </div>

      {/* Response form or success */}
      {alreadyResponded || submitted ? (
        <div className="card" style={{
          padding: 24,
          textAlign: "center",
          borderLeft: "3px solid var(--green)",
        }}>
          <CheckCircle2 size={32} style={{ color: "var(--green)", marginBottom: 8 }} />
          <p style={{ margin: 0, fontWeight: 600, fontSize: "1.1rem" }}>
            Вы уже откликнулись
          </p>
          <p className="muted" style={{ marginTop: 8 }}>
            Клиент увидит ваше предложение и свяжется с вами
          </p>
        </div>
      ) : (
        <form className="card" style={{ padding: 24 }} onSubmit={handleSubmit}>
          <h3 style={{ marginTop: 0, marginBottom: 4 }}>Откликнуться</h3>

          {/* Responses counter with progress bar */}
          <div style={{
            marginBottom: 20,
            padding: "12px 16px",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg-section)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
              <span className="muted">
                {hasSub ? "Откликов осталось" : "Бесплатных откликов"}
              </span>
              <strong style={{ color: responsesUsed > 0 ? "var(--green)" : "var(--red)" }}>
                {responsesUsed} из {responsesMax}
              </strong>
            </div>
            <div style={{
              marginTop: 6,
              height: 6,
              borderRadius: 3,
              background: "var(--line)",
              overflow: "hidden",
            }}>
              <div style={{
                width: `${(responsesUsed / responsesMax) * 100}%`,
                height: "100%",
                background: responsesUsed > 0 ? "var(--green)" : "var(--red)",
                borderRadius: 3,
                transition: "width .3s",
              }} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <label className="field">
              Ваша цена (₽)
              <input
                type="number"
                className="input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={String(request.budgetAmount)}
                required
              />
            </label>

            <label className="field">
              Комментарий
              <textarea
                className="input"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Расскажите клиенту о своём подходе..."
                rows={3}
              />
            </label>

            <div className="field">
              <span>Гарантия</span>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {GUARANTEE_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={guaranteeDays === d ? "chip chip-active" : "chip"}
                    onClick={() => setGuaranteeDays(d)}
                  >
                    {d} дней
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || responsesLeft <= 0}
              style={{ width: "100%", opacity: submitting || responsesLeft <= 0 ? 0.5 : 1 }}
            >
              {submitting ? "Отправка..." : "Откликнуться"}
            </button>

            <button
              type="button"
              className="btn-secondary"
              style={{ width: "100%" }}
              onClick={() => setShowQuestion(!showQuestion)}
            >
              Уточнить детали
            </button>

            {showQuestion && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea
                  className="input"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Задайте вопрос клиенту..."
                  rows={2}
                />
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={async () => {
                    if (!questionText.trim()) return;
                    try {
                      const res = await fetch(`/api/requests/${id}/messages`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ message: questionText }),
                      });
                      const json = await res.json();
                      if (json.ok) {
                        setQuestionText("");
                        setShowQuestion(false);
                        alert("Вопрос отправлен клиенту");
                      }
                    } catch {}
                  }}
                >
                  Отправить вопрос
                </button>
              </div>
            )}
          </div>
        </form>
      )}
    </AppShell>
  );
}
