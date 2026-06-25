"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import RequestCard from "@/components/RequestCard";
import { ClipboardList, MessageSquare, Star } from "lucide-react";

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
  avatarUrl?: string;
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
          <div className="skeleton" style={{ height: 32, width: 200 }} />
        </div>
        <div className="stats-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="stat-card skeleton" style={{ height: 80 }} />
          ))}
        </div>
        <div className="request-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 120, marginBottom: 12, borderRadius: 16 }} />
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
  const initials = user?.name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <AppShell role="CLIENT">
      <div className="page-head">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: "#000", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 18, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <h1 style={{ margin: 0 }}>Привет, {user?.name}!</h1>
          </div>
        </div>
        <Link className="btn-primary" href="/client/requests/new">Создать заявку</Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <ClipboardList size={16} style={{ color: "var(--muted)" }} />
            <span className="muted" style={{ fontSize: 13 }}>Активные заявки</span>
          </div>
          <strong style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em" }}>{activeRequests.length}</strong>
        </div>
        <div className="stat-card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <MessageSquare size={16} style={{ color: "var(--muted)" }} />
            <span className="muted" style={{ fontSize: 13 }}>Всего откликов</span>
          </div>
          <strong style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em" }}>{totalOffers}</strong>
        </div>
        <div className="stat-card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Star size={16} style={{ color: "var(--muted)" }} />
            <span className="muted" style={{ fontSize: 13 }}>Рейтинг</span>
          </div>
          <strong style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em" }}>{user?.ratingAvg ? user.ratingAvg.toFixed(1) : "—"}</strong>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="empty-state animate-fadeIn" style={{ padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <h3 style={{ marginBottom: 8, fontSize: 20, fontWeight: 800 }}>У вас пока нет заявок</h3>
          <p className="muted" style={{ marginBottom: 24 }}>
            Создайте первую заявку и найдите мастера за минуты
          </p>
          <Link className="btn-primary" href="/client/requests/new">Создать первую заявку</Link>
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
