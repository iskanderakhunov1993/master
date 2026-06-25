"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { Camera, CheckCircle2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon: string;
  slug: string;
}

const URGENCY_OPTIONS = [
  { label: "Срочно", value: "URGENT" },
  { label: "Сегодня", value: "NORMAL" },
  { label: "Завтра", value: "NORMAL" },
  { label: "Не срочно", value: "NORMAL" },
];

const BUDGET_OPTIONS = [
  { label: "Жду цену мастера", value: "REQUEST_PRICE", amount: 0 },
  { label: "до 3 000 ₽", value: "FIXED", amount: 3000 },
  { label: "до 5 000 ₽", value: "FIXED", amount: 5000 },
  { label: "Диагностика", value: "FIXED", amount: 500 },
];

const STEP_LABELS = ["Категория", "Описание", "Бюджет"];

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
  const [urgency, setUrgency] = useState("NORMAL");
  const [hasPhoto, setHasPhoto] = useState(false);
  const [budgetIdx, setBudgetIdx] = useState(0);
  const [district, setDistrict] = useState("");
  const [addressText, setAddressText] = useState("");

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
        addressId: "placeholder",
        district,
        street: addressText,
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

  if (loading) {
    return (
      <AppShell role="CLIENT">
        <div className="page-head"><h1>Новая заявка</h1></div>
        <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
      </AppShell>
    );
  }

  return (
    <AppShell role="CLIENT">
      <div className="page-head"><h1>Новая заявка</h1></div>

      {/* Step indicator with circles */}
      <div className="flex items-center justify-center" style={{ marginBottom: 32, gap: 0 }}>
        {STEP_LABELS.map((label, i) => (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center" style={{ minWidth: 72 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 14,
                  background: i <= step ? "#000" : "var(--soft, #f2f2f2)",
                  color: i <= step ? "#fff" : "var(--muted)",
                  transition: "all .3s",
                }}
              >
                {i < step ? <CheckCircle2 size={18} /> : i + 1}
              </div>
              <span
                style={{
                  fontSize: 12,
                  marginTop: 6,
                  color: i === step ? "#000" : "var(--muted)",
                  fontWeight: i === step ? 700 : 400,
                }}
              >
                {label}
              </span>
            </div>
            {i < 2 && (
              <div
                style={{
                  width: 48,
                  height: 2,
                  background: i < step ? "#000" : "var(--soft, #f2f2f2)",
                  marginBottom: 20,
                  transition: "background .3s",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div style={{
          color: "var(--red)",
          background: "#fef2f2",
          padding: 12,
          borderRadius: 12,
          marginBottom: 16,
          fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {/* Step 0: Category — uber-option cards with colored icon circles */}
      {step === 0 && (
        <div className="animate-fadeIn">
          <h2 style={{ marginBottom: 16, fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em" }}>Выберите категорию</h2>
          <div className="grid-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className="uber-option"
                style={{
                  cursor: "pointer",
                  textAlign: "center",
                  padding: 24,
                  border: categoryId === cat.id ? "2px solid #000" : "2px solid transparent",
                  background: categoryId === cat.id ? "#000" : "var(--soft, #f2f2f2)",
                  color: categoryId === cat.id ? "#fff" : "var(--text)",
                  borderRadius: 16,
                  transition: "all .2s",
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: categoryId === cat.id ? "rgba(255,255,255,0.15)" : "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24, margin: "0 auto 10px",
                }}>
                  {cat.icon}
                </div>
                <div style={{ fontWeight: 700 }}>{cat.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Description + urgency */}
      {step === 1 && (
        <div className="animate-fadeIn">
          <div
            onClick={() => setHasPhoto(!hasPhoto)}
            style={{
              cursor: "pointer",
              textAlign: "center",
              padding: 32,
              marginBottom: 24,
              border: hasPhoto ? "2px solid #000" : "2px dashed var(--line)",
              borderRadius: 16,
              background: hasPhoto ? "var(--soft, #f2f2f2)" : "transparent",
              transition: "all .2s",
            }}
          >
            <Camera size={32} style={{ color: "var(--muted)", marginBottom: 8 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {hasPhoto ? "Фото добавлено" : "Добавить фото или видео"}
            </div>
            <span className="muted" style={{ fontSize: 13 }}>
              до 10 фото или видео до 30 секунд
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label className="field">
              Заголовок
              <input
                type="text"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Починить кран"
              />
            </label>
            <label className="field">
              Описание
              <textarea
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Опишите задачу подробнее..."
                rows={4}
              />
            </label>
          </div>

          <h3 style={{ margin: "24px 0 12px", fontSize: 18, fontWeight: 800 }}>Когда нужно?</h3>
          <div className="quick-tags">
            {URGENCY_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                className={urgency === opt.value ? "chip chip-active" : "chip"}
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
        <div className="animate-fadeIn">
          <h3 style={{ marginBottom: 12, fontSize: 18, fontWeight: 800 }}>Бюджет</h3>
          <div className="quick-tags" style={{ marginBottom: 32 }}>
            {BUDGET_OPTIONS.map((opt, i) => (
              <button
                key={i}
                type="button"
                className={budgetIdx === i ? "chip chip-active" : "chip"}
                onClick={() => setBudgetIdx(i)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <h3 style={{ marginBottom: 12, fontSize: 18, fontWeight: 800 }}>Адрес</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label className="field">
                Район
                <input
                  type="text"
                  className="input"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Центральный"
                />
              </label>
              <label className="field">
                Улица и дом
                <input
                  type="text"
                  className="input"
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  placeholder="ул. Пушкина, д. 10"
                />
              </label>
            </div>
          </div>

          <div style={{
            marginTop: 16,
            padding: "12px 16px",
            borderRadius: 12,
            background: "var(--soft, #f2f2f2)",
            fontSize: 14,
            color: "var(--green)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>🔒</span> Точный адрес увидит только выбранный мастер
          </div>
        </div>
      )}

      {/* Navigation — CTA at bottom */}
      <div className="flex justify-between" style={{ marginTop: 32, gap: 12 }}>
        {step > 0 ? (
          <button type="button" className="btn-secondary" onClick={() => setStep(step - 1)}>
            Назад
          </button>
        ) : (
          <div />
        )}
        {step < 2 ? (
          <button
            type="button"
            className="btn-primary"
            disabled={!canNext}
            onClick={() => setStep(step + 1)}
            style={{ opacity: canNext ? 1 : 0.5 }}
          >
            Далее
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary"
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
