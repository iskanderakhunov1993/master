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
        <p className="muted">Загрузка…</p>
      </AppShell>
    );

  if (error || !me)
    return (
      <AppShell role="MASTER">
        <p className="pill-red">{error || "Не удалось загрузить профиль"}</p>
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
          <h1>Привет, {me.name}!</h1>
          <p className="muted">Вы мастер</p>
        </div>
        <Link className="primary-btn" href="/master/requests">
          Смотреть заявки
        </Link>
      </div>

      {mp.isVerified ? (
        <div className="card" style={{ borderLeft: "3px solid var(--green)" }}>
          <span className="pill-green">Верифицирован</span>
        </div>
      ) : (
        <div
          className="card"
          style={{
            borderLeft: "3px solid var(--orange)",
            background: "var(--card2)",
          }}
        >
          <h3 style={{ margin: "0 0 4px" }}>Пройдите верификацию</h3>
          <p className="muted" style={{ margin: 0 }}>
            Верифицированные мастера получают больше заявок и доверие клиентов.
          </p>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <span className="muted">Рейтинг</span>
          <strong>★ {me.ratingAvg?.toFixed(1) ?? "—"}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Выполнено</span>
          <strong>{me.ratingCount}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Откликов осталось</span>
          <strong>{totalResponses}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Тариф</span>
          <strong>{plan}</strong>
        </div>
      </div>

      {mp.categories.length > 0 && (
        <div className="section">
          <h3>Ваши категории</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
