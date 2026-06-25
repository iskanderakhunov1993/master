"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import NotificationSettings from "@/components/NotificationSettings";

interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  ratingAvg: number;
  ratingCount: number;
  role: string;
  createdAt?: string;
  _count?: { requests?: number };
  addresses?: { id: string; name?: string; city?: string; district?: string; street?: string }[];
}

export default function ClientProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((json) => {
        if (!json.ok) throw new Error(json.error || "Ошибка загрузки профиля");
        setUser(json.data);
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch {
      router.push("/");
    }
  }

  if (loading) {
    return (
      <AppShell role="CLIENT">
        <div className="page-head"><h1>Профиль</h1></div>
        <div className="skeleton" style={{ height: 200, borderRadius: "var(--radius-md)" }} />
        <div className="skeleton" style={{ height: 100, borderRadius: "var(--radius-md)", marginTop: 16 }} />
      </AppShell>
    );
  }

  if (error || !user) {
    return (
      <AppShell role="CLIENT">
        <div className="empty-state">
          <p style={{ color: "var(--red)" }}>{error || "Не удалось загрузить профиль"}</p>
        </div>
      </AppShell>
    );
  }

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const ordersCount = user._count?.requests ?? 0;
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
    : "июня 2026";
  const addresses = user.addresses ?? [];

  return (
    <AppShell role="CLIENT">
      <div className="page-head"><h1>Профиль</h1></div>

      {/* HEADER */}
      <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div className="avatar-lg">{initials}</div>
        <h2 style={{ margin: 0 }}>{user.name}</h2>
        <p className="muted" style={{ margin: 0 }}>{user.email}</p>
        {user.phone && <p className="muted" style={{ margin: 0 }}>{user.phone}</p>}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: "1.1rem" }}>⭐</span>
          <strong>{user.ratingAvg ? user.ratingAvg.toFixed(1) : "—"}</strong>
          <span className="muted">({user.ratingCount} отзывов)</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>
          <span className="pill">На платформе с {memberSince}</span>
          <span className="pill">{ordersCount} заказов</span>
        </div>
      </div>

      {/* STATS */}
      <div className="stats-grid" style={{ marginTop: 16 }}>
        <div className="stat-card">
          <span className="muted" style={{ fontSize: 13 }}>Заказов</span>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{ordersCount}</div>
        </div>
        <div className="stat-card">
          <span className="muted" style={{ fontSize: 13 }}>Рейтинг</span>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>⭐ {user.ratingAvg ? user.ratingAvg.toFixed(1) : "—"}</div>
        </div>
        <div className="stat-card">
          <span className="muted" style={{ fontSize: 13 }}>Отзывов</span>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{user.ratingCount}</div>
        </div>
        <div className="stat-card">
          <span className="muted" style={{ fontSize: 13 }}>Адресов</span>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{addresses.length || 1}</div>
        </div>
      </div>

      {/* ADDRESSES */}
      <div className="card" style={{ padding: 20, marginTop: 16 }}>
        <h3 className="section-title" style={{ fontSize: 20, marginBottom: 16 }}>Мои адреса</h3>
        {addresses.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {addresses.map((addr) => (
              <div key={addr.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: "1.2rem" }}>🏠</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{addr.name || "Дом"}</div>
                  <span className="muted" style={{ fontSize: 14 }}>
                    {[addr.city, addr.district, addr.street].filter(Boolean).join(", ") || "Адрес не указан"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: "1.2rem" }}>🏠</span>
            <div>
              <div style={{ fontWeight: 600 }}>Дом</div>
              <span className="muted" style={{ fontSize: 14 }}>Адрес не добавлен</span>
            </div>
          </div>
        )}
      </div>

      {/* REVIEWS */}
      <div className="card" style={{ padding: 20, marginTop: 16 }}>
        <h3 className="section-title" style={{ fontSize: 20, marginBottom: 16 }}>Отзывы мастеров</h3>
        <div className="empty-state" style={{ padding: 24 }}>
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>💬</div>
          <p className="muted" style={{ margin: 0 }}>Отзывы появятся после первых заказов</p>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      <div style={{ marginTop: 16 }}>
        <NotificationSettings />
      </div>

      {/* ACTIONS */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
        <button className="btn-secondary" disabled style={{ width: "100%", opacity: 0.6 }}>
          Редактировать профиль
        </button>
        <button
          className="btn-secondary"
          onClick={handleLogout}
          disabled={loggingOut}
          style={{ width: "100%", opacity: loggingOut ? 0.6 : 1, color: "var(--red)" }}
        >
          {loggingOut ? "Выход..." : "Выйти"}
        </button>
      </div>
    </AppShell>
  );
}
