"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import NotificationSettings from "@/components/NotificationSettings";

interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  price?: number;
  isVerified?: boolean;
  category?: { name: string };
}

interface ReviewItem {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  reviewer: { name: string };
  subRatings?: { quality?: number; communication?: number; punctuality?: number };
}

interface MeData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  ratingAvg: number;
  ratingCount: number;
  createdAt?: string;
  masterProfile: {
    id: string;
    bio?: string;
    experienceYears?: number;
    city?: string;
    district?: string;
    workRadius?: number;
    isVerified: boolean;
    freeResponsesLeft: number;
    guaranteeDays: number;
    avgResponseMinutes?: number;
    completedOrders?: number;
    cancellationRate?: number;
    warrantyClaims?: number;
    warrantyTotal?: number;
    portfolio?: PortfolioItem[];
    reviews?: ReviewItem[];
    subscription?: {
      plan: string;
      isActive: boolean;
      responsesLeft: number;
      responsesTotal?: number;
      expiresAt?: string;
    };
    categories: { category: { name: string; icon?: string } }[];
  };
}

const CATEGORY_ICONS: Record<string, string> = {
  "Сантехника": "🔧",
  "Электрика": "⚡",
  "Ремонт": "🛠",
  "Уборка": "🧹",
  "Мебель": "🪑",
  "Покраска": "🎨",
};

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
        <div className="page-head"><h1>Профиль мастера</h1></div>
        <div className="skeleton" style={{ height: 220, borderRadius: "var(--radius-md)" }} />
        <div className="stats-grid" style={{ marginTop: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: "var(--radius-md)" }} />
          ))}
        </div>
      </AppShell>
    );

  if (error || !me)
    return (
      <AppShell role="MASTER">
        <p style={{ color: "var(--red)" }}>{error || "Не удалось загрузить профиль"}</p>
      </AppShell>
    );

  const mp = me.masterProfile;
  const initials = me.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const sub = mp.subscription;
  const totalResponses = sub?.responsesTotal ?? 30;
  const responsesLeft = sub ? sub.responsesLeft : mp.freeResponsesLeft;
  const responsesMax = sub ? totalResponses : 3;
  const portfolio = mp.portfolio ?? [];
  const reviews = mp.reviews ?? [];
  const completedOrders = mp.completedOrders ?? me.ratingCount ?? 0;
  const avgResponse = mp.avgResponseMinutes ?? 7;

  return (
    <AppShell role="MASTER">
      <div className="page-head"><h1>Профиль мастера</h1></div>

      {/* HEADER */}
      <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div className="avatar-lg">{initials}</div>
        <h2 style={{ margin: 0 }}>{me.name}</h2>

        {/* Category pills */}
        {mp.categories.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {mp.categories.map((c, i) => (
              <span key={i} className="pill">
                {CATEGORY_ICONS[c.category.name] || "🔧"} {c.category.name}
              </span>
            ))}
          </div>
        )}

        {/* Verification badge */}
        {mp.isVerified ? (
          <span className="pill-green">✅ Проверен</span>
        ) : (
          <Link href="/master/verification" style={{ textDecoration: "none" }}>
            <span className="pill-orange">⚠️ Не верифицирован — пройти проверку →</span>
          </Link>
        )}

        {/* Bio */}
        {mp.bio && <p style={{ margin: 0, textAlign: "center", maxWidth: 500 }}>{mp.bio}</p>}

        {/* Info line */}
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          {mp.experienceYears ? `Опыт: ${mp.experienceYears} лет` : ""}
          {mp.city ? ` · ${mp.city}${mp.district ? `, ${mp.district}` : ""}` : ""}
          {mp.workRadius ? ` · Радиус ${mp.workRadius} км` : ""}
        </p>
      </div>

      {/* STATS */}
      <div className="stats-grid" style={{ marginTop: 16 }}>
        <div className="stat-card">
          <span className="muted" style={{ fontSize: 13 }}>Рейтинг</span>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>⭐ {me.ratingAvg?.toFixed(1) ?? "—"}</div>
        </div>
        <div className="stat-card">
          <span className="muted" style={{ fontSize: 13 }}>Заказов</span>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{completedOrders}</div>
        </div>
        <div className="stat-card">
          <span className="muted" style={{ fontSize: 13 }}>Гарантия</span>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{mp.guaranteeDays} дней</div>
        </div>
        <div className="stat-card">
          <span className="muted" style={{ fontSize: 13 }}>Ответ</span>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{avgResponse} мин</div>
        </div>
      </div>

      {/* SUBSCRIPTION */}
      <div className="card" style={{ padding: 20, marginTop: 16 }}>
        <h3 className="section-title" style={{ fontSize: 20, marginBottom: 16 }}>Подписка</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontWeight: 600 }}>
            {sub ? (
              <>
                {sub.plan === "START" ? "Стартовая" : sub.plan === "BASIC" ? "Базовая" : sub.plan === "PREMIUM" ? "Премиум" : sub.plan}
                <span className="muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: 14 }}>
                  {sub.plan === "START" ? "990 ₽/мес" : sub.plan === "BASIC" ? "1 990 ₽/мес" : sub.plan === "PREMIUM" ? "3 990 ₽/мес" : ""}
                </span>
              </>
            ) : "Бесплатный"}
          </span>
          {sub?.isActive ? (
            <span className="pill-green">Активна</span>
          ) : (
            <span className="pill-orange">Неактивна</span>
          )}
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
            <span className="muted">{sub ? "Откликов осталось" : "Бесплатных откликов"}</span>
            <strong>
              {sub?.plan === "PREMIUM" ? "Безлимит ∞" : `${responsesLeft} из ${responsesMax}`}
            </strong>
          </div>
          {sub?.plan !== "PREMIUM" && (
            <div style={{ height: 6, borderRadius: 3, background: "var(--line)", overflow: "hidden" }}>
              <div style={{
                width: `${(responsesLeft / responsesMax) * 100}%`,
                height: "100%",
                background: responsesLeft > 0 ? "var(--green)" : "var(--red)",
                borderRadius: 3,
                transition: "width .3s",
              }} />
            </div>
          )}
        </div>
        {sub?.expiresAt && (
          <p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>
            Действует до {new Date(sub.expiresAt).toLocaleDateString("ru-RU")}
          </p>
        )}
        <Link
          href="/master/subscription"
          className={sub ? "btn-secondary" : "btn-primary"}
          style={{ width: "100%", marginTop: 12, textAlign: "center", display: "block" }}
        >
          {sub ? "Управить подпиской" : "Оформить подписку"}
        </Link>
      </div>

      {/* PORTFOLIO */}
      <div style={{ marginTop: 24 }}>
        <h3 className="section-title" style={{ fontSize: 20, marginBottom: 16 }}>Портфолио</h3>
        {portfolio.length > 0 ? (
          <div className="grid-2">
            {portfolio.map((item) => (
              <div key={item.id} className="card" style={{ padding: 16 }}>
                <h4 style={{ margin: "0 0 6px" }}>{item.title}</h4>
                {item.description && (
                  <p className="muted" style={{ margin: "0 0 8px", fontSize: 14 }}>{item.description}</p>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {item.category && <span className="pill" style={{ fontSize: 12 }}>{item.category.name}</span>}
                  {item.price != null && (
                    <span style={{ fontWeight: 600, color: "var(--accent)" }}>
                      {item.price.toLocaleString("ru-RU")} ₽
                    </span>
                  )}
                  {item.isVerified && <span className="pill-green" style={{ fontSize: 12 }}>Подтверждено ✅</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: 24, textAlign: "center" }}>
            <div className="upload-card" style={{ marginBottom: 12 }}>
              <span style={{ fontSize: "2rem" }}>📷</span>
              <p className="muted" style={{ margin: "8px 0 0" }}>Добавьте свои работы</p>
            </div>
          </div>
        )}
        <button className="btn-secondary" style={{ width: "100%", marginTop: 12 }} disabled>
          Добавить работу
        </button>
      </div>

      {/* REVIEWS */}
      <div style={{ marginTop: 24 }}>
        <h3 className="section-title" style={{ fontSize: 20, marginBottom: 16 }}>Отзывы</h3>
        {reviews.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {reviews.map((rev) => (
              <div key={rev.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div className="avatar" style={{ width: 36, height: 36, fontSize: 14 }}>
                    {rev.reviewer.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{rev.reviewer.name}</div>
                    <span className="muted" style={{ fontSize: 13 }}>
                      {new Date(rev.createdAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                  <span style={{ color: "var(--orange)" }}>
                    {"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}
                  </span>
                </div>
                {rev.comment && <p style={{ margin: 0, fontSize: 14 }}>{rev.comment}</p>}
                {rev.subRatings && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    {rev.subRatings.quality != null && <span className="pill" style={{ fontSize: 11 }}>Качество: {rev.subRatings.quality}</span>}
                    {rev.subRatings.communication != null && <span className="pill" style={{ fontSize: 11 }}>Общение: {rev.subRatings.communication}</span>}
                    {rev.subRatings.punctuality != null && <span className="pill" style={{ fontSize: 11 }}>Пунктуальность: {rev.subRatings.punctuality}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>💬</div>
            <p className="muted" style={{ margin: 0 }}>Отзывы появятся после первых заказов</p>
          </div>
        )}
      </div>

      {/* QUALITY METRICS */}
      <div className="card" style={{ padding: 20, marginTop: 24 }}>
        <h3 className="section-title" style={{ fontSize: 20, marginBottom: 16 }}>Показатели качества</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="muted">Отмены</span>
            <strong>{mp.cancellationRate ?? 1}%</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="muted">Гарантийные обращения</span>
            <strong>{mp.warrantyClaims ?? 2} из {mp.warrantyTotal ?? 87}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="muted">Средний ответ</span>
            <strong>{avgResponse} минут</strong>
          </div>
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
        {mp.id && (
          <Link href={`/masters/${mp.id}`} className="btn-secondary" style={{ width: "100%", textAlign: "center" }}>
            Смотреть как клиент
          </Link>
        )}
        <button
          className="btn-secondary"
          onClick={handleLogout}
          disabled={loggingOut}
          style={{ width: "100%", opacity: loggingOut ? 0.6 : 1, color: "var(--red)" }}
        >
          {loggingOut ? "Выход..." : "Выйти из аккаунта"}
        </button>
      </div>
    </AppShell>
  );
}
