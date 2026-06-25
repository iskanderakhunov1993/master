"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";

interface Order {
  id: string;
  title: string;
  status: string;
  category: { name: string };
  address?: { district: string };
  budgetAmount: number;
  preferredTimeFrom: string | null;
}

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n) + " ₽";

const statusLabel: Record<string, string> = {
  ASSIGNED: "Назначен",
  IN_PROGRESS: "В работе",
  PUBLISHED: "Опубликован",
  COMPLETED: "Завершён",
};

export default function MasterOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/requests")
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) {
          const list: Order[] = res.data.requests ?? res.data;
          setOrders(list.filter((o) => o.status !== "PUBLISHED"));
        } else {
          setError(res.error || "Ошибка загрузки");
        }
      })
      .catch(() => setError("Ошибка сети"))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <AppShell role="MASTER">
        <p className="muted">Загрузка…</p>
      </AppShell>
    );

  if (error)
    return (
      <AppShell role="MASTER">
        <p style={{ color: "var(--red)" }}>{error}</p>
      </AppShell>
    );

  return (
    <AppShell role="MASTER">
      <div className="page-head">
        <h1>Мои работы</h1>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          <p>У вас пока нет активных заказов</p>
          <Link className="btn-primary" href="/master/requests">
            Смотреть заявки
          </Link>
        </div>
      ) : (
        <div className="request-list">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/master/requests/${o.id}`}
              className="request-card"
              style={{ textDecoration: "none" }}
            >
              <div>
                <span className="pill">{o.category.name}</span>
                <span
                  className={
                    o.status === "IN_PROGRESS" ? "pill-orange" : "pill-green"
                  }
                  style={{ marginLeft: 6 }}
                >
                  {statusLabel[o.status] ?? o.status}
                </span>
                <h3>{o.title}</h3>
                <p className="muted">
                  {o.address?.district ?? "—"} ·{" "}
                  {o.preferredTimeFrom || "Гибко"}
                </p>
              </div>
              <strong>{fmt(o.budgetAmount)}</strong>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
