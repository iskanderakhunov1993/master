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
  category: { name: string };
  address: { district: string; city: string };
  photos: { url: string }[];
  offers: { id: string; userId: string }[];
  client: { name: string; ratingAvg: number };
}

interface MeData {
  id: string;
  masterProfile: {
    freeResponsesLeft: number;
    subscription?: { responsesLeft: number };
  };
}

const GUARANTEE_OPTIONS = [7, 14, 30, 90] as const;
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

  const responsesLeft =
    (me?.masterProfile.freeResponsesLeft ?? 0) +
    (me?.masterProfile.subscription?.responsesLeft ?? 0);
  const freeLeft = me?.masterProfile.freeResponsesLeft ?? 0;

  return (
    <AppShell role="MASTER">
      <div className="page-head">
        <div>
          <Link href="/master/requests" className="muted" style={{ fontSize: "0.85rem" }}>
            ← Все заявки
          </Link>
          <h1 style={{ marginTop: 8 }}>{request.title}</h1>
          <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
            <span className="pill">{request.category.name}</span>
            <span className="pill-orange" style={{ fontSize: "0.85rem" }}>
              {request.urgency === "URGENT" ? "Срочно" : request.urgency}
            </span>
          </div>
        </div>
        <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent)" }}>
          {fmt(request.budgetAmount)}
        </div>
      </div>

      {/* Description */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <p style={{ margin: 0 }}>{request.description}</p>
      </div>

      {/* Info grid */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <article className="card" style={{ padding: 20 }}>
          <span className="muted" style={{ fontSize: "0.8rem" }}>Район</span>
          <div style={{ fontWeight: 600, marginTop: 4 }}>{request.address?.district ?? "—"}</div>
        </article>
        <article className="card" style={{ padding: 20 }}>
          <span className="muted" style={{ fontSize: "0.8rem" }}>Когда</span>
          <div style={{ fontWeight: 600, marginTop: 4 }}>{request.preferredTimeFrom || "Гибко"}</div>
        </article>
        <article className="card" style={{ padding: 20 }}>
          <span className="muted" style={{ fontSize: "0.8rem" }}>Клиент</span>
          <div style={{ fontWeight: 600, marginTop: 4 }}>
            {request.client.name} · ⭐ {request.client.ratingAvg?.toFixed(1) ?? "—"}
          </div>
        </article>
      </div>

      {/* Photos */}
      {request.photos.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Фото</h3>
          <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
            {request.photos.map((p, i) => (
              <img
                key={i}
                src={p.url}
                alt={`Фото ${i + 1}`}
                style={{
                  width: 120,
                  height: 120,
                  objectFit: "cover",
                  borderRadius: "var(--radius-sm)",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Response form or already responded */}
      {alreadyResponded || submitted ? (
        <div className="card animate-fadeIn" style={{
          padding: 24,
          textAlign: "center",
          borderLeft: "3px solid var(--green)",
        }}>
          <CheckCircle2 size={32} style={{ color: "var(--green)", marginBottom: 8 }} />
          <p style={{ margin: 0, fontWeight: 600, fontSize: "1.1rem" }}>
            Вы уже откликнулись ✓
          </p>
          <p className="muted" style={{ marginTop: 8 }}>
            Клиент увидит ваше предложение и свяжется с вами
          </p>
        </div>
      ) : (
        <form className="card" style={{ padding: 24 }} onSubmit={handleSubmit}>
          <h3 style={{ marginTop: 0, marginBottom: 4 }}>Откликнуться</h3>

          {/* Responses counter */}
          <div style={{
            marginBottom: 20,
            padding: "10px 16px",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg-section)",
          }}>
            <div className="flex justify-between items-center">
              <span className="muted" style={{ fontSize: "0.85rem" }}>
                Бесплатных откликов осталось
              </span>
              <strong style={{ color: freeLeft > 0 ? "var(--green)" : "var(--red)" }}>
                {freeLeft} из 3
              </strong>
            </div>
            <div style={{
              marginTop: 6,
              height: 4,
              borderRadius: 2,
              background: "var(--line)",
              overflow: "hidden",
            }}>
              <div style={{
                width: `${(freeLeft / 3) * 100}%`,
                height: "100%",
                background: freeLeft > 0 ? "var(--green)" : "var(--red)",
                borderRadius: 2,
                transition: "width .3s",
              }} />
            </div>
          </div>

          <div className="form-grid">
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
              <div className="flex gap-2" style={{ marginTop: 8, flexWrap: "wrap" }}>
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
              className="btn-primary w-full"
              disabled={submitting || responsesLeft <= 0}
              style={{ opacity: submitting || responsesLeft <= 0 ? 0.5 : 1 }}
            >
              {submitting ? "Отправка..." : "Откликнуться"}
            </button>
          </div>
        </form>
      )}
    </AppShell>
  );
}
