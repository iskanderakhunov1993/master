"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

interface SubscriptionData {
  freeResponsesLeft: number;
  subscription: {
    planName: string;
    responsesLeft: number;
    responsesTotal: number;
    startsAt: string;
    expiresAt: string;
    isActive: boolean;
  } | null;
}

const PLANS = [
  {
    key: "START",
    name: "Стартовая",
    price: 990,
    responses: 10,
    responsesLabel: "10 откликов в месяц",
    features: [
      "Профиль мастера",
      "Рейтинг и отзывы",
      "Портфолио",
      "Чат с клиентами",
    ],
    recommended: false,
    badge: null,
  },
  {
    key: "BASIC",
    name: "Базовая",
    price: 1990,
    responses: 20,
    responsesLabel: "20 откликов в месяц",
    features: [
      "Профиль мастера",
      "Рейтинг и отзывы",
      "Портфолио",
      "Чат с клиентами",
      "Приоритетные уведомления",
      "Гарантийные заказы",
    ],
    recommended: true,
    badge: "Популярный",
  },
  {
    key: "PREMIUM",
    name: "Премиум",
    price: 3990,
    responses: 999999,
    responsesLabel: "Безлимит откликов",
    features: [
      "Профиль мастера",
      "Рейтинг и отзывы",
      "Портфолио",
      "Чат с клиентами",
      "Приоритетные уведомления",
      "Гарантийные заказы",
      "Приоритет в выдаче",
      "Бейдж Pro",
      "Расширенная аналитика",
      "Несколько категорий",
    ],
    recommended: false,
    badge: "Максимум",
  },
];

const COMPARISON = [
  { feature: "Профиль мастера", start: true, basic: true, premium: true },
  { feature: "Рейтинг и отзывы", start: true, basic: true, premium: true },
  { feature: "Портфолио", start: true, basic: true, premium: true },
  { feature: "Чат с клиентами", start: true, basic: true, premium: true },
  { feature: "Приоритетные уведомления", start: false, basic: true, premium: true },
  { feature: "Гарантийные заказы", start: false, basic: true, premium: true },
  { feature: "Приоритет в выдаче", start: false, basic: false, premium: true },
  { feature: "Бейдж Pro", start: false, basic: false, premium: true },
  { feature: "Расширенная аналитика", start: false, basic: false, premium: true },
  { feature: "Несколько категорий", start: false, basic: false, premium: true },
];

const FAQ = [
  {
    q: "Что будет если отклики закончатся?",
    a: "Вы сможете видеть заявки, но не сможете откликаться до следующего месяца или смены плана.",
  },
  {
    q: "Можно ли сменить план?",
    a: "Да, в любой момент. Остаток откликов сгорает, новый план начинает действовать сразу.",
  },
  {
    q: "Как отменить подписку?",
    a: "В профиле → Подписка → Отменить. Доступ сохранится до конца оплаченного периода.",
  },
  {
    q: "Как работают бесплатные отклики?",
    a: "После верификации вы получаете 3 бесплатных отклика. Когда они закончатся, нужно оформить подписку.",
  },
];

const PLAN_LABELS: Record<string, string> = {
  START: "Стартовая",
  BASIC: "Базовая",
  PREMIUM: "Премиум",
};

export default function SubscriptionPage() {
  const router = useRouter();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setData(res.data);
        else setError(res.error || "Ошибка загрузки");
      })
      .catch(() => setError("Ошибка сети"))
      .finally(() => setLoading(false));
  }, []);

  const handleActivate = async (planKey: string) => {
    setActivating(planKey);
    setError("");
    try {
      const res = await fetch("/api/subscription/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planName: planKey }),
      });
      const json = await res.json();
      if (json.ok) {
        // Refresh data
        const subRes = await fetch("/api/subscription");
        const subJson = await subRes.json();
        if (subJson.ok) setData(subJson.data);
      } else {
        setError(json.error || "Ошибка активации");
      }
    } catch {
      setError("Ошибка сети");
    } finally {
      setActivating(null);
    }
  };

  if (loading) {
    return (
      <AppShell role="MASTER">
        <div className="page-head">
          <h1>Подписка</h1>
          <p className="muted">Выберите план и получайте заказы</p>
        </div>
        <div className="grid-3" style={{ marginTop: 24 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 360, borderRadius: "var(--radius-md)" }} />
          ))}
        </div>
      </AppShell>
    );
  }

  if (error && !data) {
    return (
      <AppShell role="MASTER">
        <p style={{ color: "var(--red)" }}>{error}</p>
      </AppShell>
    );
  }

  const sub = data?.subscription;
  const freeLeft = data?.freeResponsesLeft ?? 0;
  const currentPlan = sub?.planName;
  const isPremium = currentPlan === "PREMIUM";

  return (
    <AppShell role="MASTER">
      <div className="page-head">
        <div>
          <h1>Подписка</h1>
          <p className="muted">Выберите план и получайте заказы</p>
        </div>
      </div>

      {/* Current status */}
      {sub?.isActive ? (
        <div className="card" style={{ padding: 20, marginBottom: 24, borderLeft: "3px solid var(--green)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <strong style={{ fontSize: 18 }}>Ваш план: {PLAN_LABELS[sub.planName] || sub.planName}</strong>
            <span className="pill-green">Активна</span>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
              <span className="muted">Откликов</span>
              <strong>
                {isPremium ? "Безлимит ∞" : `${sub.responsesLeft} из ${sub.responsesTotal}`}
              </strong>
            </div>
            {!isPremium && (
              <div style={{ height: 6, borderRadius: 3, background: "var(--line)", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${(sub.responsesLeft / sub.responsesTotal) * 100}%`,
                    height: "100%",
                    background: sub.responsesLeft > 0 ? "var(--green)" : "var(--red)",
                    borderRadius: 3,
                    transition: "width .3s",
                  }}
                />
              </div>
            )}
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Активна до {new Date(sub.expiresAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 20, marginBottom: 24, borderLeft: "3px solid var(--orange)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>⚡</span>
            <strong style={{ fontSize: 18 }}>3 бесплатных отклика</strong>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
              <span className="muted">Использовано</span>
              <strong>{3 - freeLeft} из 3</strong>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "var(--line)", overflow: "hidden" }}>
              <div
                style={{
                  width: `${((3 - freeLeft) / 3) * 100}%`,
                  height: "100%",
                  background: freeLeft > 0 ? "var(--green)" : "var(--red)",
                  borderRadius: 3,
                  transition: "width .3s",
                }}
              />
            </div>
          </div>
          {freeLeft === 0 && (
            <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--orange)" }}>
              Бесплатные отклики закончились. Оформите подписку, чтобы продолжить.
            </p>
          )}
        </div>
      )}

      {error && <p style={{ color: "var(--red)", marginBottom: 16 }}>{error}</p>}

      {/* Plan cards */}
      <div className="grid-3" style={{ marginBottom: 32 }}>
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.key && sub?.isActive;
          return (
            <div
              key={plan.key}
              className="card"
              style={{
                padding: 24,
                display: "flex",
                flexDirection: "column",
                position: "relative",
                border: plan.recommended ? "2px solid var(--accent)" : undefined,
                boxShadow: plan.recommended ? "0 8px 32px rgba(0,200,150,0.12)" : undefined,
              }}
            >
              {plan.badge && (
                <div
                  style={{
                    position: "absolute",
                    top: -12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "var(--accent)",
                    color: "#fff",
                    padding: "4px 16px",
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {plan.badge}
                </div>
              )}

              <h3 style={{ margin: "8px 0 4px", fontSize: 22, fontWeight: 700 }}>{plan.name}</h3>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>
                {plan.price.toLocaleString("ru-RU")} ₽
                <span style={{ fontSize: 15, fontWeight: 400, color: "var(--muted)" }}>/мес</span>
              </div>

              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16, marginTop: 4 }}>
                {plan.responses === 999999 ? (
                  <span style={{ color: "var(--accent)" }}>Безлимит откликов</span>
                ) : (
                  plan.responsesLabel
                )}
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {plan.features.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                    <span style={{ color: "var(--green)", flexShrink: 0 }}>✓</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {isCurrent ? (
                <button className="btn-secondary" disabled style={{ width: "100%", opacity: 0.6 }}>
                  Текущий план
                </button>
              ) : (
                <button
                  className={plan.recommended ? "btn-primary" : "btn-secondary"}
                  style={{ width: "100%" }}
                  disabled={activating !== null}
                  onClick={() => handleActivate(plan.key)}
                >
                  {activating === plan.key ? "Активация..." : "Выбрать"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Feature comparison */}
      <div style={{ marginBottom: 32 }}>
        <h2 className="section-title" style={{ marginBottom: 16 }}>Сравнение планов</h2>
        <div className="card" style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>Возможность</th>
                <th style={{ textAlign: "center", padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>Стартовая</th>
                <th style={{ textAlign: "center", padding: "12px 16px", borderBottom: "1px solid var(--line)", color: "var(--accent)", fontWeight: 700 }}>Базовая</th>
                <th style={{ textAlign: "center", padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>Премиум</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", fontWeight: 600 }}>Откликов в месяц</td>
                <td style={{ textAlign: "center", padding: "10px 16px", borderBottom: "1px solid var(--line)" }}>10</td>
                <td style={{ textAlign: "center", padding: "10px 16px", borderBottom: "1px solid var(--line)", fontWeight: 600 }}>20</td>
                <td style={{ textAlign: "center", padding: "10px 16px", borderBottom: "1px solid var(--line)" }}>∞</td>
              </tr>
              {COMPARISON.map((row) => (
                <tr key={row.feature}>
                  <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)" }}>{row.feature}</td>
                  <td style={{ textAlign: "center", padding: "10px 16px", borderBottom: "1px solid var(--line)" }}>
                    {row.start ? <span style={{ color: "var(--green)" }}>✓</span> : <span style={{ color: "var(--muted)" }}>—</span>}
                  </td>
                  <td style={{ textAlign: "center", padding: "10px 16px", borderBottom: "1px solid var(--line)" }}>
                    {row.basic ? <span style={{ color: "var(--green)" }}>✓</span> : <span style={{ color: "var(--muted)" }}>—</span>}
                  </td>
                  <td style={{ textAlign: "center", padding: "10px 16px", borderBottom: "1px solid var(--line)" }}>
                    {row.premium ? <span style={{ color: "var(--green)" }}>✓</span> : <span style={{ color: "var(--muted)" }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ marginBottom: 32 }}>
        <h2 className="section-title" style={{ marginBottom: 16 }}>Частые вопросы</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FAQ.map((item, i) => (
            <div key={i} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--text)",
                  textAlign: "left",
                }}
              >
                {item.q}
                <span style={{ fontSize: 18, transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
                  ▾
                </span>
              </button>
              {openFaq === i && (
                <div style={{ padding: "0 20px 16px", fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
