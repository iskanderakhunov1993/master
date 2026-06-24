"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import RequestCard from "@/components/RequestCard";

interface Category {
  name: string;
  icon: string;
}

interface Address {
  district?: string;
}

interface Request {
  id: string;
  title: string;
  description: string;
  status: "PUBLISHED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  category: Category;
  address?: Address;
  budgetAmount?: number;
  preferredTimeFrom?: string;
  urgency?: string;
  _count: { offers: number };
}

interface User {
  name: string;
  ratingAvg: number;
}

const STATUS_MAP: Record<string, string> = {
  PUBLISHED: "new",
  ASSIGNED: "in_progress",
  IN_PROGRESS: "in_progress",
  COMPLETED: "done",
  CANCELLED: "cancelled",
};

export default function ClientDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [meRes, reqRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/requests"),
        ]);
        const meJson = await meRes.json();
        const reqJson = await reqRes.json();

        if (!meJson.ok) throw new Error(meJson.error || "Ошибка загрузки профиля");
        if (!reqJson.ok) throw new Error(reqJson.error || "Ошибка загрузки заявок");

        setUser(meJson.data);
        setRequests(reqJson.data.requests);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <AppShell role="CLIENT">
        <div className="page-head">
          <div
            style={{
              height: 32,
              width: 200,
              borderRadius: "var(--radius-sm)",
              background: "var(--card2)",
            }}
          />
        </div>
        <div className="stats-grid">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="stat-card"
              style={{ height: 80, background: "var(--card)", borderRadius: "var(--radius-md)" }}
            />
          ))}
        </div>
        <div className="request-list">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 120,
                background: "var(--card)",
                borderRadius: "var(--radius-md)",
                marginBottom: 12,
              }}
            />
          ))}
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell role="CLIENT">
        <div className="empty-state">
          <p style={{ color: "var(--red)" }}>{error}</p>
        </div>
      </AppShell>
    );
  }

  const activeRequests = requests.filter(
    (r) => r.status !== "COMPLETED" && r.status !== "CANCELLED"
  );
  const totalOffers = requests.reduce((sum, r) => sum + (r._count?.offers || 0), 0);

  return (
    <AppShell role="CLIENT">
      <div className="page-head">
        <div>
          <h1>Привет, {user?.name}!</h1>
        </div>
        <Link className="primary-btn" href="/client/requests/new">Создать заявку</Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="muted">Активные заявки</span>
          <strong>{activeRequests.length}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Всего откликов</span>
          <strong>{totalOffers}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Рейтинг</span>
          <strong>{user?.ratingAvg ? user.ratingAvg.toFixed(1) : "—"}</strong>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="empty-state">
          <p className="muted" style={{ marginBottom: 16 }}>
            У вас пока нет заявок
          </p>
          <Link className="primary-btn" href="/client/requests/new">Создать первую заявку</Link>
        </div>
      ) : (
        <section className="request-list">
          {requests.map((r) => (
            <RequestCard
              key={r.id}
              href={`/client/requests/${r.id}`}
              request={{
                id: r.id,
                title: r.title,
                category: r.category.name,
                categoryIcon: r.category.icon,
                budgetAmount: r.budgetAmount ?? 0,
                status: STATUS_MAP[r.status] || r.status.toLowerCase(),
                district: r.address?.district ?? "",
                preferredTime: r.preferredTimeFrom || "Не указано",
                description: r.description,
                urgency: r.urgency,
              }}
            />
          ))}
        </section>
      )}
    </AppShell>
  );
}
