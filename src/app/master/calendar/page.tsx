"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";

interface CalendarRequest {
  id: string;
  title: string;
  status: string;
  category: { name: string };
  address?: { district: string };
  budgetAmount: number;
  preferredTimeFrom: string | null;
  preferredDate?: string | null;
  createdAt: string;
}

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n) + " ₽";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function MasterCalendarPage() {
  const [requests, setRequests] = useState<CalendarRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const { today, tomorrow, week } = useMemo(() => {
    const now = startOfDay(new Date());
    const tom = new Date(now);
    tom.setDate(tom.getDate() + 1);
    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const getDate = (r: CalendarRequest) =>
      startOfDay(new Date(r.preferredDate || r.preferredTimeFrom || r.createdAt));

    const todayItems: CalendarRequest[] = [];
    const tomorrowItems: CalendarRequest[] = [];
    const weekItems: CalendarRequest[] = [];

    for (const r of requests) {
      const d = getDate(r);
      if (d.getTime() === now.getTime()) todayItems.push(r);
      else if (d.getTime() === tom.getTime()) tomorrowItems.push(r);
      else if (d > tom && d < endOfWeek) weekItems.push(r);
    }

    return { today: todayItems, tomorrow: tomorrowItems, week: weekItems };
  }, [requests]);

  if (loading)
    return (
      <AppShell role="MASTER">
        <p className="muted">Загрузка…</p>
      </AppShell>
    );

  if (error)
    return (
      <AppShell role="MASTER">
        <p className="pill-red">{error}</p>
      </AppShell>
    );

  const renderColumn = (title: string, items: CalendarRequest[]) => (
    <div className="card" style={{ flex: 1, minWidth: 220 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {items.length === 0 ? (
        <p className="muted">Свободно</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((r) => (
            <Link
              key={r.id}
              href={`/master/requests/${r.id}`}
              style={{
                display: "block",
                padding: "8px 12px",
                background: "var(--card2)",
                borderRadius: "var(--radius-sm)",
                textDecoration: "none",
                color: "var(--text)",
              }}
            >
              <span className="pill" style={{ fontSize: 11 }}>
                {r.category.name}
              </span>
              <p style={{ margin: "4px 0 0", fontWeight: 500 }}>{r.title}</p>
              <span className="muted" style={{ fontSize: 13 }}>
                {r.address?.district ?? "—"} · {fmt(r.budgetAmount)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <AppShell role="MASTER">
      <div className="page-head">
        <h1>Календарь</h1>
      </div>

      <div className="grid-3">
        {renderColumn("Сегодня", today)}
        {renderColumn("Завтра", tomorrow)}
        {renderColumn("На этой неделе", week)}
      </div>
    </AppShell>
  );
}
