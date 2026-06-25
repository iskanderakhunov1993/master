import Link from "next/link";
import { Brand } from "@/components/Brand";
import {
  ArrowRight,
  Camera,
  Users,
  CheckCircle2,
  ShieldCheck,
  Ban,
  Handshake,
  Heart,
  Star,
  Clock,
  BadgeCheck,
  Zap,
  X,
  Check,
} from "lucide-react";

const categories = [
  { name: "Сантехника", icon: "🔧", desc: "Краны, трубы, унитазы, стиралки" },
  { name: "Электрика", icon: "⚡", desc: "Розетки, проводка, щитки, свет" },
  { name: "Сборка мебели", icon: "🪑", desc: "IKEA, шкафы, кухни, полки" },
  { name: "Бытовая техника", icon: "🧺", desc: "Стиралки, посудомойки, бойлеры" },
  { name: "Клининг", icon: "🧹", desc: "Уборка квартир, после ремонта" },
  { name: "Переезд", icon: "🚛", desc: "Грузчики, перевозка, упаковка" },
];

const advantages = [
  {
    icon: Ban,
    title: "0% комиссии",
    desc: "Мы не берём 25% как другие площадки. Клиент платит мастеру напрямую — ни рубля посреднику.",
    accent: "var(--accent)",
  },
  {
    icon: ShieldCheck,
    title: "Только проверенные мастера",
    desc: "Каждый мастер проходит верификацию: паспорт, статус самозанятого, подтверждённые навыки. Никаких случайных людей.",
    accent: "var(--accent)",
  },
  {
    icon: Handshake,
    title: "Без посредников",
    desc: "Вы общаетесь с мастером напрямую. Договариваетесь о цене, времени и деталях без третьих лиц.",
    accent: "var(--accent)",
  },
  {
    icon: Heart,
    title: "Сервис для людей",
    desc: "Мы не продаём лиды и не накручиваем цены. Мы строим платформу, где мастера зарабатывают репутацию, а клиенты получают честный сервис.",
    accent: "var(--accent)",
  },
];

const comparison = [
  { feature: "Комиссия с заказа", us: "0%", them: "15–25%" },
  { feature: "Верификация мастера", us: "Паспорт + документы", them: "Только телефон" },
  { feature: "Накрутка цен", us: "Нет", them: "Платформа добавляет %" },
  { feature: "Кто назначает цену", us: "Мастер напрямую", them: "Алгоритм площадки" },
  { feature: "Посредники", us: "Нет, прямой контакт", them: "Менеджеры, колл-центры" },
  { feature: "Рейтинг мастера", us: "Подтверждённые отзывы", them: "Можно накрутить" },
  { feature: "Портфолио", us: "Фото реальных работ", them: "Часто нет" },
  { feature: "Гарантия", us: "Мастер фиксирует срок", them: "Обычно нет" },
];

const steps = [
  {
    icon: Camera,
    num: "1",
    title: "Сфотографируйте проблему",
    desc: "Сделайте фото или видео — мастеру будет проще оценить работу и назвать честную цену.",
  },
  {
    icon: Users,
    num: "2",
    title: "Проверенные мастера откликаются",
    desc: "Верифицированные мастера рядом увидят заявку и предложат свою цену, сроки и гарантию.",
  },
  {
    icon: CheckCircle2,
    num: "3",
    title: "Выберите лучшего и оцените",
    desc: "Сравните рейтинг, портфолио и отзывы. После работы оставьте честный отзыв.",
  },
];

const stats = [
  { value: "0%", label: "комиссии с заказа", sub: "клиент платит мастеру напрямую" },
  { value: "3", label: "бесплатных отклика", sub: "для каждого нового мастера" },
  { value: "5 шагов", label: "верификация", sub: "паспорт, ИНН, фото, навыки" },
  { value: "30 дней", label: "гарантия на работу", sub: "мастер фиксирует условия" },
];

const testimonials = [
  {
    name: "Елена",
    role: "клиент",
    text: "Приехал быстро, цену не менял, всё аккуратно. Наконец-то сервис без накруток!",
    rating: 5,
  },
  {
    name: "Алексей",
    role: "мастер",
    text: "За 3 месяца собрал рейтинг 4.9 и стабильный поток заказов. Комиссия 0% — это реально.",
    rating: 5,
  },
  {
    name: "Михаил",
    role: "мастер",
    text: "На других площадках 25% уходило посреднику. Здесь я получаю всю сумму от клиента.",
    rating: 5,
  },
];

export default function HomePage() {
  return (
    <div className="landing">
      {/* ═══════════ NAV ═══════════ */}
      <nav className="landing-nav">
        <Brand size="default" />
        <div className="flex items-center gap-3">
          <Link href="/login" className="muted" style={{ fontSize: 15, fontWeight: 600 }}>
            Войти
          </Link>
          <Link href="/register" className="nav-cta">
            Создать заявку <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section className="hero" style={{ padding: "100px 0 80px", textAlign: "center" }}>
        <div className="section">
          <div
            className="pill"
            style={{ marginBottom: 24, display: "inline-flex", gap: 6, padding: "8px 18px", fontSize: 13 }}
          >
            <Zap size={14} /> Честный сервис без комиссий
          </div>

          <h1
            style={{
              fontSize: "clamp(2.2rem, 5.5vw, 3.8rem)",
              fontWeight: 850,
              lineHeight: 1.06,
              letterSpacing: "-0.04em",
              marginBottom: 24,
              maxWidth: 800,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Сфотографируй проблему —{" "}
            <span style={{ color: "var(--accent)" }}>проверенные мастера</span> рядом откликнутся
          </h1>

          <p
            className="lead"
            style={{ maxWidth: 580, margin: "0 auto 40px", fontSize: 18, lineHeight: 1.7 }}
          >
            Без комиссий, без посредников, без накруток.
            <br />
            Вы платите мастеру напрямую. Мы только соединяем.
          </p>

          <div className="flex items-center justify-center gap-3" style={{ flexWrap: "wrap" }}>
            <Link
              href="/register"
              className="btn-primary"
              style={{ padding: "16px 36px", fontSize: 16 }}
            >
              Создать заявку — бесплатно <ArrowRight size={18} />
            </Link>
            <Link href="/register?role=master" className="btn-secondary" style={{ padding: "16px 28px" }}>
              Я мастер
            </Link>
          </div>

          {/* Trust badges under hero */}
          <div
            className="flex items-center justify-center gap-4"
            style={{ marginTop: 32, flexWrap: "wrap" }}
          >
            <span className="muted flex items-center gap-2" style={{ fontSize: 13 }}>
              <ShieldCheck size={16} style={{ color: "var(--accent)" }} /> Проверенные мастера
            </span>
            <span className="muted flex items-center gap-2" style={{ fontSize: 13 }}>
              <Ban size={16} style={{ color: "var(--accent)" }} /> 0% комиссии
            </span>
            <span className="muted flex items-center gap-2" style={{ fontSize: 13 }}>
              <Star size={16} style={{ color: "var(--accent)" }} /> Реальные отзывы
            </span>
          </div>
        </div>
      </section>

      {/* ═══════════ WHY US — MAIN ADVANTAGES ═══════════ */}
      <section style={{ padding: "80px 0", background: "var(--bg-section)" }}>
        <div className="section">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2
              style={{
                fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                marginBottom: 12,
              }}
            >
              Почему мы, а не другие площадки?
            </h2>
            <p className="lead" style={{ maxWidth: 560, margin: "0 auto" }}>
              Мы создали сервис, который реально работает для людей — и для клиентов, и для мастеров.
            </p>
          </div>

          <div className="grid-2" style={{ gap: 24 }}>
            {advantages.map((a, i) => {
              const Icon = a.icon;
              return (
                <div
                  className="card"
                  key={i}
                  style={{ padding: 32, display: "flex", gap: 20, alignItems: "flex-start" }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      background: "var(--accent-light)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={24} style={{ color: "var(--accent)" }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{a.title}</h3>
                    <p className="muted" style={{ lineHeight: 1.65, margin: 0 }}>
                      {a.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ COMPARISON TABLE ═══════════ */}
      <section className="section" style={{ padding: "80px 0" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2
            style={{
              fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: 12,
            }}
          >
            Мастер рядом vs другие площадки
          </h2>
          <p className="lead" style={{ maxWidth: 500, margin: "0 auto" }}>
            Сравните сами — цифры говорят за себя
          </p>
        </div>

        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "var(--shadow)",
            background: "white",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              padding: "16px 24px",
              background: "var(--bg-soft)",
              borderBottom: "1px solid var(--line)",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            <span></span>
            <span style={{ textAlign: "center", color: "var(--accent)" }}>
              <BadgeCheck size={16} style={{ display: "inline", verticalAlign: -3 }} /> Мастер рядом
            </span>
            <span style={{ textAlign: "center", color: "var(--muted)" }}>Другие</span>
          </div>

          {/* Rows */}
          {comparison.map((row, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                padding: "14px 24px",
                borderBottom: i < comparison.length - 1 ? "1px solid var(--line)" : "none",
                fontSize: 14,
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: 600 }}>{row.feature}</span>
              <span
                style={{
                  textAlign: "center",
                  color: "var(--accent)",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Check size={16} /> {row.us}
              </span>
              <span
                style={{
                  textAlign: "center",
                  color: "var(--muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <X size={14} style={{ color: "var(--red)" }} /> {row.them}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section style={{ padding: "80px 0", background: "var(--bg-section)" }}>
        <div className="section">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2
              style={{
                fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                marginBottom: 12,
              }}
            >
              Как это работает
            </h2>
            <p className="lead" style={{ maxWidth: 480, margin: "0 auto" }}>
              Три шага — и мастер уже едет
            </p>
          </div>

          <div className="grid-3" style={{ gap: 24 }}>
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div className="card" key={s.num} style={{ textAlign: "center", padding: 36 }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 20px",
                      fontWeight: 900,
                      fontSize: 22,
                    }}
                  >
                    {s.num}
                  </div>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: "var(--accent-light)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 20px",
                      color: "var(--accent)",
                    }}
                  >
                    <Icon size={30} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{s.title}</h3>
                  <p className="muted" style={{ lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ STATS ═══════════ */}
      <section className="section" style={{ padding: "80px 0" }}>
        <div className="stats-grid" style={{ maxWidth: 900, margin: "0 auto" }}>
          {stats.map((s, i) => (
            <div className="stat-card" key={i} style={{ textAlign: "center", padding: 28 }}>
              <strong style={{ fontSize: 36, color: "var(--accent)", display: "block" }}>
                {s.value}
              </strong>
              <span style={{ fontWeight: 700, display: "block", marginTop: 4 }}>{s.label}</span>
              <span className="muted" style={{ fontSize: 13, marginTop: 4, display: "block" }}>
                {s.sub}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ CATEGORIES ═══════════ */}
      <section style={{ padding: "80px 0", background: "var(--bg-section)" }}>
        <div className="section">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2
              style={{
                fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                marginBottom: 12,
              }}
            >
              Категории услуг
            </h2>
            <p className="lead" style={{ maxWidth: 460, margin: "0 auto" }}>
              Начинаем с самых востребованных — масштабируем по мере роста
            </p>
          </div>
          <div className="grid-3" style={{ gap: 20 }}>
            {categories.map((c) => (
              <Link
                href="/register"
                className="card"
                key={c.name}
                style={{ padding: 28, display: "flex", gap: 16, alignItems: "center" }}
              >
                <span style={{ fontSize: 36 }}>{c.icon}</span>
                <div>
                  <span style={{ fontWeight: 700, display: "block", fontSize: 16 }}>{c.name}</span>
                  <span className="muted" style={{ fontSize: 13 }}>{c.desc}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <section className="section" style={{ padding: "80px 0" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2
            style={{
              fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: 12,
            }}
          >
            Отзывы пользователей
          </h2>
          <p className="lead" style={{ maxWidth: 400, margin: "0 auto" }}>
            Реальные отзывы от реальных людей
          </p>
        </div>

        <div className="grid-3" style={{ gap: 20 }}>
          {testimonials.map((t, i) => (
            <div className="card" key={i} style={{ padding: 28 }}>
              <div style={{ marginBottom: 12, color: "var(--orange)" }}>
                {"⭐".repeat(t.rating)}
              </div>
              <p style={{ lineHeight: 1.65, marginBottom: 16, fontSize: 15 }}>
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="avatar avatar-sm"
                  style={{
                    background: i === 0 ? "var(--violet)" : i === 1 ? "var(--accent)" : "var(--orange)",
                  }}
                >
                  {t.name[0]}
                </div>
                <div>
                  <strong style={{ fontSize: 14 }}>{t.name}</strong>
                  <span
                    className="muted"
                    style={{ display: "block", fontSize: 12, textTransform: "capitalize" }}
                  >
                    {t.role}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ FOR MASTERS CTA ═══════════ */}
      <section style={{ padding: "80px 0", background: "var(--bg-section)" }}>
        <div className="section">
          <div className="grid-2" style={{ gap: 40, alignItems: "center" }}>
            <div>
              <div className="pill pill-green" style={{ marginBottom: 16 }}>
                Для мастеров
              </div>
              <h2
                style={{
                  fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  marginBottom: 16,
                  lineHeight: 1.15,
                }}
              >
                Зарабатывайте без комиссий и посредников
              </h2>
              <p className="muted" style={{ lineHeight: 1.7, marginBottom: 24 }}>
                Пройдите верификацию, получите 3 бесплатных отклика и начните получать заказы.
                Вся оплата — напрямую от клиента. Собирайте рейтинг, портфолио и постоянных клиентов.
              </p>
              <div className="flex gap-3" style={{ flexWrap: "wrap" }}>
                <Link href="/register?role=master" className="btn-primary">
                  Стать мастером <ArrowRight size={16} />
                </Link>
              </div>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {[
                { icon: BadgeCheck, text: "Верификация за 5 минут" },
                { icon: Star, text: "Рейтинг и портфолио — ваш актив" },
                { icon: Clock, text: "Первый заказ уже сегодня" },
                { icon: ShieldCheck, text: "Гарантия повышает доверие клиентов" },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    className="card"
                    key={i}
                    style={{
                      padding: "16px 20px",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <Icon size={20} style={{ color: "var(--accent)", flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{item.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section style={{ padding: "100px 0", textAlign: "center" }}>
        <div className="section">
          <h2
            style={{
              fontSize: "clamp(1.8rem, 5vw, 2.8rem)",
              fontWeight: 850,
              letterSpacing: "-0.04em",
              marginBottom: 16,
              lineHeight: 1.1,
            }}
          >
            Честный сервис.{" "}
            <span style={{ color: "var(--accent)" }}>Без комиссий.</span>
            <br />
            Для людей.
          </h2>
          <p
            className="lead"
            style={{ maxWidth: 480, margin: "0 auto 36px", fontSize: 18 }}
          >
            Создайте заявку за 30 секунд — проверенные мастера рядом уже ждут
          </p>
          <div className="flex items-center justify-center gap-3" style={{ flexWrap: "wrap" }}>
            <Link
              href="/register"
              className="btn-primary"
              style={{ padding: "18px 40px", fontSize: 17 }}
            >
              Создать заявку — бесплатно <ArrowRight size={20} />
            </Link>
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 16 }}>
            Бесплатно для клиентов · 3 бесплатных отклика для мастеров
          </p>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer style={{ padding: "40px 0", borderTop: "1px solid var(--line)" }}>
        <div className="section">
          <div
            className="grid-3"
            style={{ gap: 32, fontSize: 14, marginBottom: 32 }}
          >
            <div>
              <Brand size="small" />
              <p className="muted" style={{ marginTop: 12, lineHeight: 1.6 }}>
                Сервис бытовых заявок.
                <br />
                Соединяем клиентов и мастеров без комиссий.
              </p>
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Клиентам</h4>
              <div style={{ display: "grid", gap: 8 }}>
                <Link href="/register" className="muted">
                  Создать заявку
                </Link>
                <Link href="/how-it-works" className="muted">
                  Как это работает
                </Link>
                <Link href="/register" className="muted">
                  Категории услуг
                </Link>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Мастерам</h4>
              <div style={{ display: "grid", gap: 8 }}>
                <Link href="/register?role=master" className="muted">
                  Стать мастером
                </Link>
                <Link href="/register?role=master" className="muted">
                  Верификация
                </Link>
                <Link href="/register?role=master" className="muted">
                  Тарифы
                </Link>
              </div>
            </div>
          </div>
          <div
            style={{
              borderTop: "1px solid var(--line)",
              paddingTop: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <p className="muted" style={{ fontSize: 13 }}>
              © 2026 Мастер рядом. Платформа соединяет клиентов и мастеров, не является исполнителем работ.
            </p>
            <div className="flex gap-3">
              <Link href="#" className="muted" style={{ fontSize: 13 }}>
                Политика конфиденциальности
              </Link>
              <Link href="#" className="muted" style={{ fontSize: 13 }}>
                Условия
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
