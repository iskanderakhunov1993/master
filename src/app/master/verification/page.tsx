"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import AppShell from "@/components/AppShell";

interface Category {
  id: string;
  name: string;
  icon?: string;
  group?: string;
}

interface StepState {
  phone: boolean;
  passport: boolean;
  status: boolean;
  services: boolean;
  photo: boolean;
}

const STEP_LABELS = ["Телефон", "Селфи с паспортом", "Документы", "Категории", "Фото"];
const STEP_KEYS: (keyof StepState)[] = ["phone", "passport", "status", "services", "photo"];
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

  // Verification code state
  const [verificationCode, setVerificationCode] = useState("");
  const [codeExpiresAt, setCodeExpiresAt] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [codeExpired, setCodeExpired] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch verification code
  const fetchCode = useCallback(async () => {
    setCodeLoading(true);
    setCodeExpired(false);
    try {
      const res = await fetch("/api/auth/verification-code");
      const json = await res.json();
      if (json.ok) {
        setVerificationCode(json.data.code);
        const expires = new Date(json.data.expiresAt).getTime();
        setCodeExpiresAt(expires);
        setSecondsLeft(Math.max(0, Math.floor((expires - Date.now()) / 1000)));
      }
    } catch {
      // ignore
    } finally {
      setCodeLoading(false);
    }
  }, []);

  // Timer effect
  useEffect(() => {
    if (codeExpiresAt <= 0) return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((codeExpiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        setCodeExpired(true);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [codeExpiresAt]);

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

    // Fetch initial verification code
    fetchCode();
  }, [fetchCode]);

  const completedCount = STEP_KEYS.filter((k) => completed[k]).length;

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
    const idx = STEP_KEYS.indexOf(key);
    if (idx < 4) setCurrentStep(idx + 1);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // Group categories by group field
  const groupedCategories = categories.reduce<Record<string, Category[]>>((acc, cat) => {
    const group = cat.group || "Другое";
    if (!acc[group]) acc[group] = [];
    acc[group].push(cat);
    return acc;
  }, {});

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
              background: completed[STEP_KEYS[i]]
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
              color: completed[STEP_KEYS[i]] ? "var(--green)" : "var(--muted)",
            }}>
              {completed[STEP_KEYS[i]] ? "✅" : `${i + 1}`}
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
                Отправить SMS
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

      {/* STEP 2: Selfie with passport + code */}
      {currentStep === 1 && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px" }}>Селфи с паспортом и кодом</h3>

          {/* Verification code display */}
          <div style={{
            background: "var(--bg-soft)",
            borderRadius: "var(--radius-md)",
            padding: 24,
            textAlign: "center",
            marginBottom: 20,
            border: "2px solid var(--accent)",
          }}>
            <div className="muted" style={{ fontSize: 14, marginBottom: 8 }}>Ваш код верификации</div>
            {codeLoading ? (
              <div className="muted" style={{ fontSize: 18, padding: "12px 0" }}>Загрузка...</div>
            ) : codeExpired ? (
              <div>
                <div style={{ fontSize: 18, color: "var(--red)", fontWeight: 600, marginBottom: 12 }}>Код истёк</div>
                <button className="btn-primary" onClick={fetchCode}>Получить новый код</button>
              </div>
            ) : (
              <>
                <div style={{
                  fontSize: "2.5rem",
                  fontWeight: 700,
                  fontFamily: "monospace",
                  letterSpacing: "0.3em",
                  color: "var(--accent)",
                  margin: "8px 0",
                }}>
                  {verificationCode.split("").join(" ")}
                </div>
                <div style={{
                  fontSize: 16,
                  marginTop: 12,
                  color: secondsLeft < 30 ? "var(--red)" : "var(--muted)",
                  fontWeight: secondsLeft < 30 ? 600 : 400,
                }}>
                  ⏱ Осталось: {formatTimer(secondsLeft)}
                </div>
                <button
                  className="btn-secondary"
                  style={{ marginTop: 12, fontSize: 14 }}
                  onClick={fetchCode}
                >
                  🔄 Получить новый код
                </button>
              </>
            )}
          </div>

          {/* Instructions */}
          <div style={{
            background: "var(--bg-soft)",
            borderRadius: "var(--radius-md)",
            padding: 20,
            marginBottom: 20,
          }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>📸 Как сделать фото:</div>
            <ol style={{ margin: "0 0 16px", paddingLeft: 20, lineHeight: 1.8 }}>
              <li>Возьмите паспорт (разворот со страницей с фото)</li>
              <li>Напишите код на листе бумаги</li>
              <li>Сделайте селфи, держа паспорт и листок с кодом</li>
            </ol>

            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>✅ Требования:</div>
            <ul style={{ margin: "0 0 16px", paddingLeft: 20, lineHeight: 1.8, listStyle: "disc" }}>
              <li>Лицо полностью видно, без очков и масок</li>
              <li>Паспорт раскрыт на странице с фото</li>
              <li>Код написан разборчиво на бумаге</li>
              <li>Хорошее освещение — без теней на лице</li>
              <li>Чёткое фото — не размытое</li>
              <li>Данные паспорта актуальны</li>
            </ul>

            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8, color: "var(--red)" }}>❌ Не принимаем:</div>
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8, listStyle: "disc", color: "var(--muted)" }}>
              <li>Фото экрана вместо паспорта</li>
              <li>Отредактированные фото</li>
              <li>Просроченный паспорт</li>
            </ul>
          </div>

          {/* Visual example */}
          <div style={{
            background: "var(--bg-soft)",
            borderRadius: "var(--radius-md)",
            padding: 20,
            marginBottom: 20,
            border: "1px dashed var(--line)",
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, textAlign: "center" }}>
              ПРИМЕР ПРАВИЛЬНОГО ФОТО
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{
                width: 80, height: 80, borderRadius: "var(--radius-sm)",
                background: "#e8f5e9", display: "flex", alignItems: "center",
                justifyContent: "center", flexDirection: "column", fontSize: 12,
              }}>
                <span style={{ fontSize: 28 }}>😊</span>
                <span className="muted">лицо</span>
              </div>
              <div style={{
                width: 80, height: 80, borderRadius: "var(--radius-sm)",
                background: "#e3f2fd", display: "flex", alignItems: "center",
                justifyContent: "center", flexDirection: "column", fontSize: 12,
              }}>
                <span style={{ fontSize: 28 }}>📄</span>
                <span className="muted">паспорт</span>
              </div>
              <div style={{
                width: 80, height: 80, borderRadius: "var(--radius-sm)",
                background: "#fff3e0", display: "flex", alignItems: "center",
                justifyContent: "center", flexDirection: "column", fontSize: 12,
                fontFamily: "monospace", fontWeight: 700,
              }}>
                <span style={{ fontSize: 16, color: "var(--accent)" }}>{verificationCode || "482917"}</span>
                <span className="muted" style={{ fontSize: 12 }}>код</span>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", fontSize: 13 }}>
              <span>✅ Лицо видно</span>
              <span>✅ Паспорт читаем</span>
              <span>✅ Код разборчив</span>
              <span>✅ Хорошее освещение</span>
            </div>
          </div>

          {/* Upload area */}
          <div
            className="upload-card"
            onClick={() => {
              setPassportUploaded(!passportUploaded);
              if (!passportUploaded) completeStep("passport");
            }}
            style={{
              padding: 40,
              textAlign: "center",
              cursor: "pointer",
              border: passportUploaded ? "2px solid var(--green)" : undefined,
            }}
          >
            {passportUploaded ? (
              <>
                <span style={{ fontSize: "2.5rem" }}>✅</span>
                <p style={{ margin: "8px 0 0", fontWeight: 600, color: "var(--green)" }}>Фото загружено</p>
              </>
            ) : (
              <>
                <span style={{ fontSize: "2.5rem" }}>📸</span>
                <p style={{ margin: "8px 0 0", fontWeight: 600 }}>Загрузить селфи с паспортом и кодом</p>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>Нажмите для загрузки</p>
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

      {/* STEP 3: Tax Status / Documents */}
      {currentStep === 2 && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px" }}>Документы (самозанятый / ИП)</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <div
              onClick={() => setTaxStatus("self")}
              className="card"
              style={{
                flex: 1,
                padding: 20,
                textAlign: "center",
                cursor: "pointer",
                border: taxStatus === "self" ? "2px solid var(--accent)" : "2px solid var(--line)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
              <div style={{ fontWeight: 600 }}>Самозанятый</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Справка о постановке на учёт</div>
            </div>
            <div
              onClick={() => setTaxStatus("ip")}
              className="card"
              style={{
                flex: 1,
                padding: 20,
                textAlign: "center",
                cursor: "pointer",
                border: taxStatus === "ip" ? "2px solid var(--accent)" : "2px solid var(--line)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>🏢</div>
              <div style={{ fontWeight: 600 }}>ИП</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Выписка из ЕГРИП</div>
            </div>
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
                  <p style={{ margin: "8px 0 0", fontWeight: 600 }}>
                    Загрузить {taxStatus === "self" ? "справку о самозанятости" : "выписку из ЕГРИП"}
                  </p>
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

      {/* STEP 4: Categories & Districts */}
      {currentStep === 3 && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px" }}>Категории и районы</h3>

          <div style={{ marginBottom: 20 }}>
            <span className="section-title" style={{ display: "block", marginBottom: 8 }}>Категории услуг</span>
            {Object.keys(groupedCategories).length > 0 ? (
              Object.entries(groupedCategories).map(([group, cats]) => (
                <div key={group} style={{ marginBottom: 12 }}>
                  <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: "uppercase" }}>
                    {group}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {cats.map((cat) => (
                      <button
                        key={cat.id}
                        className={selectedCategories.has(cat.id) ? "chip chip-active" : "chip"}
                        onClick={() => toggleCategory(cat.id)}
                      >
                        {cat.icon || "🔧"} {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <span className="muted">Загрузка категорий...</span>
            )}
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
          <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
            Это фото увидят клиенты. Используйте качественное фото, не селфи с паспортом.
          </p>
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
            <strong>{completedCount} из 5 шагов завершено</strong>
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
          После проверки модератором вы получите бейдж «Проверен» и 3 бесплатных отклика
        </p>
      </div>
    </AppShell>
  );
}
