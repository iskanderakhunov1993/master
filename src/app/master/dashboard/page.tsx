"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";

interface MeData {
  name: string;
  ratingAvg: number;
  ratingCount: number;
  masterProfile: {
    isVerified: boolean;
    freeResponsesLeft: number;
    guaranteeDays: number;
    subscription?: {
      plan: string;
      isActive: boolean;
      responsesLeft: number;
    };
    categories: { category: { name: string } }[];
  };
}

export default function MasterDashboardPage() {
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setMe(res.data);
        else setError(res.error || "Ошибка загрузки");
      })
      .catch(() => setError("Ошибка сети"))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <AppShell role="MASTER">
        <div className="page-head">
          <div className="skeleton" style={{ height: 32, width: 200 }} />
        </div>
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card skeleton" style={{ height: 80 }} />
          ))}
        </div>
      </AppShell>
    );

  if (error || !me)
    return (
      <AppShell role="MASTER">
        <div className="empty-state">
          <p style={{ color: "var(--red)" }}>{error || "Не удалось загрузить профиль"}</p>
        </div>
      </AppShell>
    );

  const mp = me.masterProfile;
  const totalResponses =
    mp.freeResponsesLeft + (mp.subscription?.responsesLeft ?? 0);
  const plan = mp.subscription?.plan ?? "Бесплатный";

  return (
    <AppShell role="MASTER">
      <div className="page-head">
        <div>
          <h1>Привет, {me.name}! 👋</h1>
          <p className="muted">Панель мастера</p>
        </div>
        <Link className="btn-primary" href="/master/requests">
          Смотреть заявки
        </Link>
      </div>

      {/* Verification status */}
      {mp.isVerified ? (
        <div className="card animate-fadeIn" style={{
          padding: "16px 20px",
          borderLeft: "3px solid var(--green)",
          marginBottom: 16,
        }}>
          <div className="flex items-center gap-2">
            <span className="pill-green">Верифицирован ✓</span>
            <span className="muted" style={{ fontSize: "0.85rem" }}>Ваш профиль подтверждён</span>
          </div>
        </div>
      ) : (
        <div className="card animate-fadeIn" style={{
          padding: "16px 20px",
          borderLeft: "3px solid var(--orange)",
          marginBottom: 16,
        }}>
          <h3 style={{ margin: "0 0 4px" }}>⚠️ Пройдите верификацию</h3>
          <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
            Верифицированные мастера получают больше заявок и доверие клиентов.
          </p>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <span className="muted">Рейтинг</span>
          <strong style={{ fontSize: "1.5rem" }}>
            ⭐ {me.ratingAvg?.toFixed(1) ?? "—"}
          </strong>
        </div>
        <div className="stat-card">
          <span className="muted">Выполнено</span>
          <strong style={{ fontSize: "1.5rem" }}>{me.ratingCount}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Откликов осталось</span>
          <strong style={{ fontSize: "1.5rem", color: totalResponses > 0 ? "var(--green)" : "var(--red)" }}>
            {totalResponses}
          </strong>
        </div>
        <div className="stat-card">
          <span className="muted">Тариф</span>
          <strong style={{ fontSize: "1.5rem" }}>{plan}</strong>
        </div>
      </div>

      {mp.categories.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 12 }}>Ваши категории</h3>
          <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
            {mp.categories.map((c, i) => (
              <span key={i} className="pill">
                {c.category.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
