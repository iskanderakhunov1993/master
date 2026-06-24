"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

export default function AddressHistoryPage() {
  const { addressId } = useParams<{ addressId: string }>();
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/history?addressId=${addressId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setOrders(res.data);
        else setError(res.error || "Ошибка загрузки");
      })
      .catch(() => setError("Ошибка сети"))
      .finally(() => setLoading(false));
  }, [addressId]);

  if (loading)
    return (
      <AppShell role="CLIENT">
        <p className="muted">Загрузка…</p>
      </AppShell>
    );

  if (error)
    return (
      <AppShell role="CLIENT">
        <p className="pill-red">{error}</p>
      </AppShell>
    );

  const addressTitle = orders[0]?.address?.title ?? "Адрес";

  return (
    <AppShell role="CLIENT">
      <div className="page-head">
        <div>
          <Link href="/client/history" className="muted" style={{ fontSize: 14 }}>
            ← Вся история
          </Link>
          <h1>{addressTitle}</h1>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">Нет завершённых заказов по этому адресу</div>
      ) : (
        <div className="request-list">
          {orders.map((o) => (
            <article key={o.id} className="card">
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
              {o.description && (
                <p style={{ margin: "4px 0", fontSize: 14 }}>{o.description}</p>
              )}
              <p className="muted" style={{ margin: "4px 0", fontSize: 14 }}>
                Мастер: {o.master.name} · ★{" "}
                {o.master.ratingAvg?.toFixed(1) ?? "—"}
              </p>
              <p className="muted" style={{ margin: "4px 0", fontSize: 14 }}>
                {fmtDate(o.completedAt)}
              </p>
              {o.warrantyUntil && (
                <span className="pill-green" style={{ fontSize: 12 }}>
                  Гарантия до {fmtDate(o.warrantyUntil)}
                </span>
              )}
              {o.notes && (
                <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
                  {o.notes}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
