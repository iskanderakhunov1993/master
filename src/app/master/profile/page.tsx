"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function MasterProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

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

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch {
      setError("Ошибка при выходе");
      setLoggingOut(false);
    }
  };

  if (loading)
    return (
      <AppShell role="MASTER">
        <p className="muted">Загрузка…</p>
      </AppShell>
    );

  if (error || !me)
    return (
      <AppShell role="MASTER">
        <p style={{ color: "var(--red)" }}>{error || "Не удалось загрузить профиль"}</p>
      </AppShell>
    );

  const mp = me.masterProfile;
  const plan = mp.subscription?.plan ?? "Бесплатный";
  const subActive = mp.subscription?.isActive ?? false;

  return (
    <AppShell role="MASTER">
      <div className="page-head">
        <h1>Профиль мастера</h1>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>{me.name}</h2>
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <span>★ {me.ratingAvg?.toFixed(1) ?? "—"}</span>
          <span className="muted">{me.ratingCount} отзывов</span>
          <span className="muted">Гарантия {mp.guaranteeDays} дней</span>
        </div>
        {mp.isVerified ? (
          <span className="pill-green">Верифицирован</span>
        ) : (
          <span className="pill-orange">Не верифицирован</span>
        )}
      </div>

      {mp.categories.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 12 }}>Категории</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {mp.categories.map((c, i) => (
              <span key={i} className="pill">
                {c.category.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 16, padding: 20 }}>
        <h3 style={{ marginTop: 0 }}>Подписка</h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div>
            <span className="muted">Тариф:</span> {plan}
          </div>
          <div>
            <span className="muted">Статус:</span>{" "}
            {subActive ? (
              <span className="pill-green">Активна</span>
            ) : (
              <span className="pill-red">Неактивна</span>
            )}
          </div>
          <div>
            <span className="muted">Откликов осталось:</span>{" "}
            {mp.freeResponsesLeft + (mp.subscription?.responsesLeft ?? 0)}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16, padding: 20 }}>
        <h3 style={{ marginTop: 0 }}>Портфолио</h3>
        <p className="muted">
          Портфолио появится после первых заказов
        </p>
      </div>

      <button
        className="btn-secondary"
        style={{ marginTop: 24, width: "100%" }}
        onClick={handleLogout}
        disabled={loggingOut}
      >
        {loggingOut ? "Выход…" : "Выйти из аккаунта"}
      </button>
    </AppShell>
  );
}
