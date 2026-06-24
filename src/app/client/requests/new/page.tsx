"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

interface Category {
  id: string;
  name: string;
  icon: string;
  slug: string;
}

const URGENCY_OPTIONS = [
  { label: "Срочно", value: "URGENT" },
  { label: "Сегодня", value: "TODAY" },
  { label: "Завтра", value: "TOMORROW" },
  { label: "Выбрать дату", value: "SCHEDULED" },
];

const BUDGET_OPTIONS = [
  { label: "Жду цену мастера", value: "REQUEST_PRICE", amount: 0 },
  { label: "до 3 000₽", value: "FIXED", amount: 3000 },
  { label: "до 5 000₽", value: "FIXED", amount: 5000 },
  { label: "Диагностика", value: "FIXED", amount: 500 },
];

export default function NewRequestPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("TODAY");
  const [hasPhoto, setHasPhoto] = useState(false);
  const [budgetIdx, setBudgetIdx] = useState(0);
  const [district, setDistrict] = useState("");
  const [addressText, setAddressText] = useState("");
  const [addressId, setAddressId] = useState("");

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setCategories(json.data);
        else setError(json.error || "Ошибка загрузки категорий");
      })
      .catch(() => setError("Ошибка сети"))
      .finally(() => setLoading(false));
  }, []);

  const canNext =
    (step === 0 && categoryId) ||
    (step === 1 && title && description) ||
    step === 2;

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const budget = BUDGET_OPTIONS[budgetIdx];
      const body: Record<string, unknown> = {
        title,
        description,
        categoryId,
        addressId: addressId || "placeholder",
        budgetType: budget.value === "REQUEST_PRICE" ? "REQUEST_PRICE" : "FIXED",
        urgency,
      };
      if (budget.value !== "REQUEST_PRICE") {
        body.budgetAmount = budget.amount;
      }

      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Ошибка создания заявки");
      router.push("/client/dashboard");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const stepIndicator = (
    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
      {[0, 1, 2].map((s) => (
        <div
          key={s}
          style={{
            width: s === step ? 32 : 10,
            height: 10,
            borderRadius: 5,
            background: s === step ? "var(--accent)" : "var(--card2)",
            transition: "all 0.3s",
          }}
        />
      ))}
    </div>
  );

  if (loading) {
    return (
      <AppShell role="CLIENT">
        <div className="page-head"><h1>Новая заявка</h1></div>
        <div style={{ height: 200, background: "var(--card)", borderRadius: "var(--radius-md)" }} />
      </AppShell>
    );
  }

  return (
    <AppShell role="CLIENT">
      <div className="page-head"><h1>Новая заявка</h1></div>

      {stepIndicator}

      {error && (
        <div style={{
          color: "var(--red)",
          background: "var(--card)",
          padding: 12,
          borderRadius: "var(--radius-sm)",
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Step 0: Category */}
      {step === 0 && (
        <div className="section">
          <h2 style={{ marginBottom: 16 }}>Выберите категорию</h2>
          <div className="grid-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="card"
                onClick={() => setCategoryId(cat.id)}
                style={{
                  cursor: "pointer",
                  textAlign: "center",
                  padding: 20,
                  border: categoryId === cat.id
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                  transition: "border 0.2s",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>{cat.icon}</div>
                <div>{cat.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Description + urgency */}
      {step === 1 && (
        <div className="section">
          <div
            className="upload-card"
            onClick={() => setHasPhoto(!hasPhoto)}
            style={{
              cursor: "pointer",
              textAlign: "center",
              padding: 32,
              marginBottom: 16,
              border: hasPhoto ? "2px solid var(--accent)" : "2px dashed var(--line)",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>&#x1F4F7;</div>
            <span className="muted">
              {hasPhoto ? "Фото добавлено" : "Нажмите, чтобы добавить фото"}
            </span>
          </div>

          <div className="form-grid">
            <label className="field">
              Заголовок
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Починить кран"
              />
            </label>
            <label className="field">
              Описание
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Опишите задачу подробнее..."
                rows={4}
              />
            </label>
          </div>

          <h3 style={{ margin: "20px 0 12px" }}>Когда нужно?</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {URGENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={urgency === opt.value ? "primary-btn" : "dark-btn"}
                onClick={() => setUrgency(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Budget + Location */}
      {step === 2 && (
        <div className="section">
          <h3 style={{ marginBottom: 12 }}>Бюджет</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
            {BUDGET_OPTIONS.map((opt, i) => (
              <button
                key={i}
                type="button"
                className={budgetIdx === i ? "primary-btn" : "dark-btn"}
                onClick={() => setBudgetIdx(i)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <h3 style={{ marginBottom: 12 }}>Адрес</h3>
          <div className="form-grid">
            <div className="two-col">
              <label className="field">
                Район
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Центральный"
                />
              </label>
              <label className="field">
                Улица и дом
                <input
                  type="text"
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  placeholder="ул. Пушкина, д. 10"
                />
              </label>
            </div>
            <label className="field">
              ID адреса (из базы)
              <input
                type="text"
                value={addressId}
                onChange={(e) => setAddressId(e.target.value)}
                placeholder="Введите существующий ID адреса"
              />
              <span className="muted" style={{ fontSize: 12 }}>
                Необходим существующий ID адреса из базы данных
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, gap: 12 }}>
        {step > 0 ? (
          <button type="button" className="secondary-btn" onClick={() => setStep(step - 1)}>
            Назад
          </button>
        ) : (
          <div />
        )}
        {step < 2 ? (
          <button
            type="button"
            className="primary-btn"
            disabled={!canNext}
            onClick={() => setStep(step + 1)}
            style={{ opacity: canNext ? 1 : 0.5 }}
          >
            Далее
          </button>
        ) : (
          <button
            type="button"
            className="primary-btn"
            onClick={handleSubmit}
            disabled={submitting}
            style={{ opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? "Публикация..." : "Опубликовать заявку"}
          </button>
        )}
      </div>
    </AppShell>
  );
}
