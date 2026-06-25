"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface StepState {
  phone: boolean;
  passport: boolean;
  status: boolean;
  services: boolean;
  photo: boolean;
}

const STEP_LABELS = ["Телефон", "Паспорт", "Статус", "Услуги", "Фото"];
const RADIUS_OPTIONS = [5, 10, 15, 25];

export default function MasterVerificationPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [phone, setPhone] = useState("");
  const [hasPhone, setHasPhone] = useState(false);
  const [completed, setCompleted] = useState<StepState>({
    phone: false,
    passport: false,
    status: false,
    services: false,
    photo: false,
  });
  const [taxStatus, setTaxStatus] = useState<"self" | "ip" | "">("");
  const [taxDocUploaded, setTaxDocUploaded] = useState(false);
  const [passportUploaded, setPassportUploaded] = useState(false);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [workRadius, setWorkRadius] = useState(10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([meRes, catRes]) => {
        if (meRes.ok && meRes.data.phone) {
          setPhone(meRes.data.phone);
          setHasPhone(true);
          setCompleted((s) => ({ ...s, phone: true }));
        }
        if (catRes.ok) {
          setCategories(catRes.data ?? catRes);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stepKeys: (keyof StepState)[] = ["phone", "passport", "status", "services", "photo"];
  const completedCount = stepKeys.filter((k) => completed[k]).length;

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const completeStep = (key: keyof StepState) => {
    setCompleted((s) => ({ ...s, [key]: true }));
    const idx = stepKeys.indexOf(key);
    if (idx < 4) setCurrentStep(idx + 1);
  };

  if (loading) {
    return (
      <AppShell role="MASTER">
        <div className="page-head"><h1>Верификация</h1></div>
        <div className="skeleton" style={{ height: 400, borderRadius: "var(--radius-md)" }} />
      </AppShell>
    );
  }

  return (
    <AppShell role="MASTER">
      <div className="page-head"><h1>Верификация мастера</h1></div>

      {/* Step indicator */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
        {STEP_LABELS.map((label, i) => (
          <div
            key={i}
            onClick={() => setCurrentStep(i)}
            style={{
              flex: 1,
              textAlign: "center",
              cursor: "pointer",
              padding: "10px 4px",
              borderRadius: "var(--radius-sm)",
              background: completed[stepKeys[i]]
                ? "var(--accent-light)"
                : currentStep === i
                ? "var(--bg-soft)"
                : "transparent",
              border: currentStep === i ? "2px solid var(--accent)" : "2px solid transparent",
              transition: "all .2s",
            }}
          >
            <div style={{
              fontSize: 18,
              marginBottom: 4,
              color: completed[stepKeys[i]] ? "var(--green)" : "var(--muted)",
            }}>
              {completed[stepKeys[i]] ? "✅" : `${i + 1}`}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: currentStep === i ? "var(--text)" : "var(--muted)" }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* STEP 1: Phone */}
      {currentStep === 0 && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px" }}>Подтверждение телефона</h3>
          {completed.phone ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--green)", fontSize: 20 }}>✅</span>
              <span>Телефон подтверждён: {phone ? phone.replace(/(\d{3})\d{3}(\d{2})(\d{2})/, "+7-$1-***-**-$3") : "+7-***-***-**-**"}</span>
            </div>
          ) : (
            <div>
              <label className="field">
                Номер телефона
                <input
                  type="tel"
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 (900) 000-00-00"
                />
              </label>
              <button
                className="btn-primary"
                style={{ marginTop: 12 }}
                onClick={() => completeStep("phone")}
              >
                Отправить код
              </button>
            </div>
          )}
          {completed.phone && (
            <button className="btn-secondary" style={{ marginTop: 16 }} onClick={() => setCurrentStep(1)}>
              Далее →
            </button>
          )}
        </div>
      )}

      {/* STEP 2: Passport */}
      {currentStep === 1 && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px" }}>Фото паспорта</h3>
          <div
            className="upload-card"
            onClick={() => {
              setPassportUploaded(!passportUploaded);
              if (!passportUploaded) completeStep("passport");
            }}
            style={{
              padding: 32,
              textAlign: "center",
              cursor: "pointer",
              border: passportUploaded ? "2px solid var(--green)" : undefined,
            }}
          >
            {passportUploaded ? (
              <>
                <span style={{ fontSize: "2.5rem" }}>✅</span>
                <p style={{ margin: "8px 0 0", fontWeight: 600, color: "var(--green)" }}>Загружено</p>
              </>
            ) : (
              <>
                <span style={{ fontSize: "2.5rem" }}>📄</span>
                <p style={{ margin: "8px 0 0", fontWeight: 600 }}>Загрузить фото паспорта</p>
              </>
            )}
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
            Данные защищены и используются только для верификации
          </p>
          {completed.passport && (
            <button className="btn-secondary" style={{ marginTop: 16 }} onClick={() => setCurrentStep(2)}>
              Далее →
            </button>
          )}
        </div>
      )}

      {/* STEP 3: Tax Status */}
      {currentStep === 2 && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px" }}>Статус</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              className={taxStatus === "self" ? "chip chip-active" : "chip"}
              onClick={() => setTaxStatus("self")}
            >
              Самозанятый
            </button>
            <button
              className={taxStatus === "ip" ? "chip chip-active" : "chip"}
              onClick={() => setTaxStatus("ip")}
            >
              ИП
            </button>
          </div>
          {taxStatus && (
            <div
              className="upload-card"
              onClick={() => {
                setTaxDocUploaded(!taxDocUploaded);
                if (!taxDocUploaded) completeStep("status");
              }}
              style={{
                padding: 24,
                textAlign: "center",
                cursor: "pointer",
                border: taxDocUploaded ? "2px solid var(--green)" : undefined,
              }}
            >
              {taxDocUploaded ? (
                <>
                  <span style={{ fontSize: "2rem" }}>✅</span>
                  <p style={{ margin: "8px 0 0", fontWeight: 600, color: "var(--green)" }}>Документ загружен</p>
                </>
              ) : (
                <>
                  <span style={{ fontSize: "2rem" }}>📎</span>
                  <p style={{ margin: "8px 0 0", fontWeight: 600 }}>Загрузить ИНН или справку</p>
                </>
              )}
            </div>
          )}
          {completed.status && (
            <button className="btn-secondary" style={{ marginTop: 16 }} onClick={() => setCurrentStep(3)}>
              Далее →
            </button>
          )}
        </div>
      )}

      {/* STEP 4: Services & Districts */}
      {currentStep === 3 && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px" }}>Услуги и районы</h3>

          <div style={{ marginBottom: 20 }}>
            <span style={{ fontWeight: 600, fontSize: 14, display: "block", marginBottom: 8 }}>Категории услуг</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={selectedCategories.has(cat.id) ? "chip chip-active" : "chip"}
                  onClick={() => toggleCategory(cat.id)}
                >
                  {cat.icon || "🔧"} {cat.name}
                </button>
              ))}
              {categories.length === 0 && <span className="muted">Загрузка категорий...</span>}
            </div>
          </div>

          <label className="field" style={{ marginBottom: 12 }}>
            Город
            <input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Москва" />
          </label>

          <label className="field" style={{ marginBottom: 12 }}>
            Район
            <input className="input" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Аэропорт" />
          </label>

          <div style={{ marginBottom: 12 }}>
            <span style={{ fontWeight: 600, fontSize: 14, display: "block", marginBottom: 8 }}>Радиус работы</span>
            <div style={{ display: "flex", gap: 8 }}>
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  className={workRadius === r ? "chip chip-active" : "chip"}
                  onClick={() => setWorkRadius(r)}
                >
                  {r} км
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn-primary"
            style={{ marginTop: 12 }}
            onClick={() => {
              if (selectedCategories.size > 0) completeStep("services");
            }}
            disabled={selectedCategories.size === 0}
          >
            Сохранить
          </button>
        </div>
      )}

      {/* STEP 5: Profile Photo */}
      {currentStep === 4 && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px" }}>Фото профиля</h3>
          <div
            className="upload-card"
            onClick={() => {
              setPhotoUploaded(!photoUploaded);
              if (!photoUploaded) completeStep("photo");
            }}
            style={{
              padding: 40,
              textAlign: "center",
              cursor: "pointer",
              border: photoUploaded ? "2px solid var(--green)" : undefined,
            }}
          >
            {photoUploaded ? (
              <>
                <span style={{ fontSize: "3rem" }}>✅</span>
                <p style={{ margin: "8px 0 0", fontWeight: 600, color: "var(--green)" }}>Фото загружено</p>
              </>
            ) : (
              <>
                <span style={{ fontSize: "3rem" }}>📸</span>
                <p style={{ margin: "8px 0 0", fontWeight: 600 }}>Загрузить фото профиля</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM */}
      <div style={{ marginTop: 24 }}>
        <div style={{
          padding: "12px 16px",
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-soft)",
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 14 }}>
            <span className="muted">Прогресс верификации</span>
            <strong>{completedCount} из 5 шагов</strong>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "var(--line)", overflow: "hidden" }}>
            <div style={{
              width: `${(completedCount / 5) * 100}%`,
              height: "100%",
              background: "var(--green)",
              borderRadius: 3,
              transition: "width .3s",
            }} />
          </div>
        </div>

        <button
          className="btn-primary"
          style={{ width: "100%", opacity: completedCount < 5 ? 0.5 : 1 }}
          disabled={completedCount < 5}
          onClick={() => alert("Заявка отправлена на проверку!")}
        >
          Отправить на проверку
        </button>
        <p className="muted" style={{ textAlign: "center", fontSize: 13, marginTop: 8 }}>
          После проверки вы получите 3 бесплатных отклика
        </p>
      </div>
    </AppShell>
  );
}
