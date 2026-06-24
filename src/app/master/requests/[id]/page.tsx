"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";

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
        <p className="muted">Загрузка…</p>
      </AppShell>
    );

  if (error || !request)
    return (
      <AppShell role="MASTER">
        <p className="pill-red">{error || "Заявка не найдена"}</p>
      </AppShell>
    );

  const responsesLeft =
    (me?.masterProfile.freeResponsesLeft ?? 0) +
    (me?.masterProfile.subscription?.responsesLeft ?? 0);

  return (
    <AppShell role="MASTER">
      <div className="page-head">
        <div>
          <Link href="/master/requests" className="muted" style={{ fontSize: 14 }}>
            ← Все заявки
          </Link>
          <h1>{request.title}</h1>
          <span className="pill">{request.category.name}</span>
        </div>
        <span className="pill-accent" style={{ fontSize: 18 }}>
          {fmt(request.budgetAmount)}
        </span>
      </div>

      <p style={{ marginBottom: 16 }}>{request.description}</p>

      <div className="grid-3">
        <article className="card">
          <h3>Район</h3>
          <p>{request.address?.district ?? "—"}</p>
        </article>
        <article className="card">
          <h3>Когда</h3>
          <p>{request.preferredTimeFrom || "Гибко"}</p>
        </article>
        <article className="card">
          <h3>Срочность</h3>
          <p>{request.urgency}</p>
        </article>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Клиент</h3>
        <p>
          {request.client.name} · ★{" "}
          {request.client.ratingAvg?.toFixed(1) ?? "—"}
        </p>
      </div>

      {request.photos.length > 0 && (
        <div className="section" style={{ marginTop: 16 }}>
          <h3>Фото</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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

      {alreadyResponded || submitted ? (
        <div
          className="card"
          style={{
            marginTop: 16,
            borderLeft: "3px solid var(--green)",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>Вы уже откликнулись</p>
        </div>
      ) : (
        <form
          className="card"
          style={{ marginTop: 16 }}
          onSubmit={handleSubmit}
        >
          <h3 style={{ marginTop: 0 }}>Откликнуться</h3>
          <p className="muted" style={{ fontSize: 13 }}>
            Осталось откликов: {responsesLeft}
          </p>

          <div className="form-grid">
            <label className="field">
              Ваша цена (₽)
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={String(request.budgetAmount)}
                required
              />
            </label>

            <label className="field">
              Комментарий
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Расскажите клиенту о своём подходе…"
                rows={3}
              />
            </label>

            <div className="field">
              <span>Гарантия</span>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                {GUARANTEE_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={
                      guaranteeDays === d ? "pill-accent" : "pill"
                    }
                    onClick={() => setGuaranteeDays(d)}
                  >
                    {d} дней
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="primary-btn"
              disabled={submitting || responsesLeft <= 0}
            >
              {submitting ? "Отправка…" : "Откликнуться"}
            </button>
          </div>
        </form>
      )}
    </AppShell>
  );
}
