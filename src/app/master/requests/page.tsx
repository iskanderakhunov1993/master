"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";

interface ApiRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  category: { name: string; icon?: string };
  address?: { district: string };
  budgetAmount: number;
  preferredTimeFrom: string | null;
  urgency: string;
  distance?: string;
  createdAt?: string;
  client?: { ratingAvg: number; ratingCount: number };
  _count: { offers: number };
}

type Filter = "all" | "urgent" | "today";

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n) + " ₽";

const PHOTO_COLORS = ["#e8f5e9", "#e3f2fd", "#fff3e0", "#fce4ec", "#f3e5f5"];

export default function MasterRequestsPage() {
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    fetch("/api/requests")
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setRequests(res.data.requests ?? res.data);
        else setError(res.error || "Ошибка загрузки");
      })
      .catch(() => setError("Ошибка сети"))
      .finally(() => setLoading(false));
  }, []);

  const skip = useCallback((id: string) => {
    setHidden((prev) => new Set(prev).add(id));
  }, []);

  if (loading)
    return (
      <AppShell role="MASTER">
        <div className="page-head"><h1>Заявки рядом</h1></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 180, borderRadius: "var(--radius-md)" }} />
          ))}
        </div>
      </AppShell>
    );

  if (error)
    return (
      <AppShell role="MASTER">
        <div className="empty-state">
          <p style={{ color: "var(--red)" }}>{error}</p>
        </div>
      </AppShell>
    );

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  let visible = requests.filter((r) => !hidden.has(r.id));
  if (filter === "urgent") visible = visible.filter((r) => r.urgency === "URGENT");
  if (filter === "today") visible = visible.filter((r) => r.createdAt?.slice(0, 10) === todayStr || r.preferredTimeFrom?.includes("сегодня"));

  return (
    <AppShell role="MASTER">
      <div className="page-head">
        <h1>
          Заявки рядом
          {visible.length > 0 && (
            <span className="pill" style={{ marginLeft: 12, fontSize: "0.85rem", verticalAlign: "middle" }}>
              {visible.length}
            </span>
          )}
        </h1>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {([
          { key: "all", label: "Все" },
          { key: "urgent", label: "Срочные" },
          { key: "today", label: "Сегодня" },
        ] as { key: Filter; label: string }[]).map((f) => (
          <button
            key={f.key}
            className={filter === f.key ? "chip chip-active" : "chip"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>📋</div>
          <h3 style={{ marginBottom: 8 }}>Нет новых заявок рядом</h3>
          <p className="muted">Загляните позже — новые заявки появляются каждый день</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {visible.map((r, idx) => {
            const timeSince = r.createdAt
              ? (() => {
                  const mins = Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 60000);
                  if (mins < 60) return `${mins} мин назад`;
                  if (mins < 1440) return `${Math.floor(mins / 60)} ч назад`;
                  return `${Math.floor(mins / 1440)} дн назад`;
                })()
              : null;

            return (
              <article key={r.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "flex" }}>
                  {/* Photo placeholder */}
                  <div style={{
                    width: 100,
                    minHeight: 140,
                    background: PHOTO_COLORS[idx % PHOTO_COLORS.length],
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.8rem",
                    flexShrink: 0,
                  }}>
                    📷
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, padding: 16, minWidth: 0 }}>
                    {/* Top row: category + distance */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                      <span className="pill" style={{ fontSize: 12 }}>
                        {r.category.icon || "🔧"} {r.category.name}
                      </span>
                      {r.distance && <span className="pill" style={{ fontSize: 12 }}>{r.distance}</span>}
                      {r.urgency === "URGENT" && <span className="pill-orange" style={{ fontSize: 12 }}>Срочно</span>}
                    </div>

                    {/* Title */}
                    <Link href={`/master/requests/${r.id}`} style={{ textDecoration: "none" }}>
                      <h4 style={{ margin: "0 0 4px", fontSize: 16 }}>{r.title}</h4>
                    </Link>

                    {/* Description (2 lines) */}
                    <p className="muted" style={{
                      margin: "0 0 8px",
                      fontSize: 13,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}>
                      {r.description}
                    </p>

                    {/* Budget + time + client rating */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent)" }}>
                        {fmt(r.budgetAmount)}
                      </span>
                      {timeSince && <span className="muted" style={{ fontSize: 12 }}>{timeSince}</span>}
                      {r.client && (
                        <span className="muted" style={{ fontSize: 12 }}>
                          Клиент: ⭐ {r.client.ratingAvg?.toFixed(1) ?? "—"}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <Link className="btn-primary btn-sm" href={`/master/requests/${r.id}`}>
                        Откликнуться
                      </Link>
                      <button
                        className="btn-secondary btn-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          skip(r.id);
                        }}
                      >
                        Пропустить
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
