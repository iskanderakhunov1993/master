"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  ratingAvg: number;
  ratingCount: number;
  role: string;
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
        <div style={{ height: 250, background: "var(--card)", borderRadius: "var(--radius-md)" }} />
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

  return (
    <AppShell role="CLIENT">
      <div className="page-head"><h1>Профиль</h1></div>

      <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 32,
            fontWeight: 700,
          }}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
        <h2 style={{ margin: 0 }}>{user.name}</h2>
        <p className="muted">
          {user.ratingAvg ? user.ratingAvg.toFixed(1) : "—"} на основе {user.ratingCount} отзывов
        </p>
      </div>

      <div className="card" style={{ padding: 20, marginTop: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <span className="muted" style={{ fontSize: 13 }}>Email</span>
            <div style={{ fontSize: 16, marginTop: 4 }}>{user.email}</div>
          </div>
          {user.phone && (
            <div>
              <span className="muted" style={{ fontSize: 13 }}>Телефон</span>
              <div style={{ fontSize: 16, marginTop: 4 }}>{user.phone}</div>
            </div>
          )}
          <div>
            <span className="muted" style={{ fontSize: 13 }}>Роль</span>
            <div style={{ fontSize: 16, marginTop: 4 }}>
              {user.role === "CLIENT" ? "Клиент" : user.role}
            </div>
          </div>
        </div>
      </div>

      <button
        className="secondary-btn"
        onClick={handleLogout}
        disabled={loggingOut}
        style={{ width: "100%", marginTop: 24, opacity: loggingOut ? 0.6 : 1 }}
      >
        {loggingOut ? "Выход..." : "Выйти"}
      </button>
    </AppShell>
  );
}
