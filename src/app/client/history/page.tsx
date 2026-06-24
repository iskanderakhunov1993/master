"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";

interface HistoryOrder {
  id: string;
  title: string;
  description: string;
  finalPrice: number;
  completedAt: string;
  warrantyUntil: string | null;
  notes: string | null;
  category: { name: string };
  address: { id: string; title: string; city: string; district: string };
  client: { name: string };
  master: { name: string; ratingAvg: number };
}

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n) + " ₽";
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function ClientHistoryPage() {
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setOrders(res.data);
        else setError(res.error || "Ошибка загрузки");
      })
      .catch(() => setError("Ошибка сети"))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <AppShell role="CLIENT">
        <p className="muted">Загрузка истории…</p>
      </AppShell>
    );

  if (error)
    return (
      <AppShell role="CLIENT">
        <p className="pill-red">{error}</p>
      </AppShell>
    );

  const grouped = orders.reduce<
    Record<string, { address: HistoryOrder["address"]; items: HistoryOrder[] }>
  >((acc, o) => {
    const key = o.address.id;
    if (!acc[key]) acc[key] = { address: o.address, items: [] };
    acc[key].items.push(o);
    return acc;
  }, {});

  const groups = Object.values(grouped);
  const multipleAddresses = groups.length > 1;

  const renderOrder = (o: HistoryOrder) => (
    <Link
      key={o.id}
      href={`/client/history/${o.address.id}`}
      className="card"
      style={{ display: "block", textDecoration: "none", color: "var(--text)" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <h3 style={{ margin: 0 }}>{o.title}</h3>
        <span className="pill-accent">{fmt(o.finalPrice)}</span>
      </div>
      <p className="muted" style={{ margin: "4px 0" }}>
        {o.category.name}
      </p>
      <p className="muted" style={{ margin: "4px 0", fontSize: 14 }}>
        Мастер: {o.master.name} · ★ {o.master.ratingAvg?.toFixed(1) ?? "—"}
      </p>
      <p className="muted" style={{ margin: "4px 0", fontSize: 14 }}>
        {fmtDate(o.completedAt)}
      </p>
      {o.warrantyUntil && (
        <span className="pill-green" style={{ fontSize: 12 }}>
          Гарантия до {fmtDate(o.warrantyUntil)}
        </span>
      )}
    </Link>
  );

  return (
    <AppShell role="CLIENT">
      <div className="page-head">
        <h1>История заказов</h1>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">У вас пока нет завершённых заказов</div>
      ) : multipleAddresses ? (
        groups.map((g) => (
          <div key={g.address.id} className="section">
            <h2 style={{ marginBottom: 12 }}>{g.address.title}</h2>
            <div className="request-list">{g.items.map(renderOrder)}</div>
          </div>
        ))
      ) : (
        <div className="request-list">{orders.map(renderOrder)}</div>
      )}
    </AppShell>
  );
}
