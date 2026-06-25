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
  ChevronRight,
} from "lucide-react";

const categoryGroups = [
  {
    group: "Инженерные системы",
    icon: "🔌",
    items: [
      { name: "Сантехника", icon: "🔧", desc: "Засоры, смесители, унитазы, бойлеры" },
      { name: "Электрика", icon: "⚡", desc: "Розетки, проводка, щитки, светильники" },
      { name: "Климат", icon: "❄️", desc: "Установка и чистка кондиционеров" },
    ],
  },
  {
    group: "Ремонт и обустройство",
    icon: "🛠",
    items: [
      { name: "Муж на час", icon: "🔨", desc: "Полки, зеркала, карнизы, мелкий ремонт" },
      { name: "Отделочные работы", icon: "🎨", desc: "Обои, ламинат, плитка, покраска" },
      { name: "Сборка мебели", icon: "🪑", desc: "IKEA, шкафы, кухни, кровати" },
    ],
  },
  {
    group: "Ремонт техники",
    icon: "📺",
    items: [
      { name: "Бытовая техника", icon: "🧺", desc: "Стиралки, холодильники, посудомойки" },
      { name: "Электроника", icon: "📱", desc: "Смартфоны, ноутбуки, чистка ПК" },
    ],
  },
  {
    group: "Клининг",
    icon: "🧹",
    items: [
      { name: "Уборка", icon: "🧹", desc: "Генеральная уборка, мытьё окон, после ремонта" },
      { name: "Химчистка мебели", icon: "🛋️", desc: "Диваны, матрасы, кресла, ковры на дому" },
    ],
  },
  {
    group: "Грузоперевозки",
    icon: "📦",
    items: [
      { name: "Переезды", icon: "📦", desc: "Квартирные, офисные, грузчики, упаковка" },
    ],
  },
];

const advantages = [
  {
    icon: Ban,
    title: "0% комиссии",
    desc: "Мы не берём 25% как другие площадки. Клиент платит мастеру напрямую — ни рубля посреднику.",
    bg: "var(--primary-light)",
    color: "var(--primary)",
  },
  {
    icon: ShieldCheck,
    title: "Только проверенные мастера",
    desc: "Каждый мастер проходит верификацию: паспорт, статус самозанятого, подтверждённые навыки.",
    bg: "var(--green-light)",
    color: "var(--green)",
  },
  {
    icon: Handshake,
    title: "Без посредников",
    desc: "Вы общаетесь с мастером напрямую. Договариваетесь о цене, времени и деталях без третьих лиц.",
    bg: "var(--blue-light)",
    color: "var(--blue)",
  },
  {
    icon: Heart,
    title: "Сервис для людей",
    desc: "Мы не продаём лиды и не накручиваем цены. Мы строим платформу, где мастера зарабатывают репутацию.",
    bg: "var(--pink-light)",
    color: "var(--pink)",
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
          <Link href="/login" style={{ fontSize: 15, fontWeight: 600, color: "var(--sub)" }}>
            Войти
          </Link>
          <Link href="/register" className="nav-cta">
            Создать заявку
          </Link>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section style={{ padding: "120px 0 80px", textAlign: "center" }}>
        <div className="section">
          <h1
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4rem)",
              fontWeight: 900,
              letterSpacing: "-0.05em",
              lineHeight: 1.05,
              marginBottom: 24,
              maxWidth: 800,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Сфотографируй проблему.
            <br />
            <span style={{ color: "var(--primary)" }}>Мастер уже рядом.</span>
          </h1>

          <p
            className="lead"
            style={{ maxWidth: 480, margin: "0 auto 40px", fontSize: 18, lineHeight: 1.7 }}
          >
            Без комиссий. Без посредников. Вы платите мастеру напрямую.
          </p>

          <div className="flex items-center justify-center gap-3" style={{ flexWrap: "wrap" }}>
            <Link
              href="/register"
              className="btn-primary"
              style={{ padding: "18px 40px", width: "auto" }}
            >
              Создать заявку <ArrowRight size={18} />
            </Link>
            <Link
              href="/register?role=master"
              className="btn-secondary"
              style={{ padding: "18px 32px" }}
            >
              Я мастер
            </Link>
          </div>

          {/* Trust badges */}
          <div
            className="flex items-center justify-center gap-4"
            style={{ marginTop: 32, flexWrap: "wrap" }}
          >
            <span className="flex items-center gap-2" style={{ fontSize: 13, color: "var(--sub)" }}>
              <ShieldCheck size={16} style={{ color: "var(--primary)" }} /> Проверенные мастера
            </span>
            <span className="flex items-center gap-2" style={{ fontSize: 13, color: "var(--sub)" }}>
              <Ban size={16} style={{ color: "var(--primary)" }} /> 0% комиссии
            </span>
            <span className="flex items-center gap-2" style={{ fontSize: 13, color: "var(--sub)" }}>
              <Star size={16} style={{ color: "var(--primary)" }} /> Реальные отзывы
            </span>
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section className="dark-section" style={{ padding: "80px 0" }}>
        <div className="section">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2
              style={{
                fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                marginBottom: 12,
              }}
            >
              Как это работает
            </h2>
            <p className="lead" style={{ maxWidth: 480, margin: "0 auto" }}>
              Три шага — и мастер уже едет
            </p>
          </div>

          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div className="uber-row" key={s.num} style={{ padding: "20px 0", gap: 16 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: "var(--black)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    {s.num}
                  </div>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: "var(--primary-light)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={22} style={{ color: "var(--primary)" }} />
                  </div>
                  <div className="info" style={{ flex: 1 }}>
                    <div className="main" style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
                      {s.title}
                    </div>
                    <div className="meta" style={{ fontSize: 14, color: "var(--sub)", lineHeight: 1.5 }}>
                      {s.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ ADVANTAGES ═══════════ */}
      <section style={{ padding: "80px 0" }}>
        <div className="section">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2
              style={{
                fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                marginBottom: 12,
              }}
            >
              Почему мы, а не другие площадки?
            </h2>
            <p className="lead" style={{ maxWidth: 560, margin: "0 auto" }}>
              Мы создали сервис, который реально работает для людей
            </p>
          </div>

          <div className="grid-2" style={{ gap: 20 }}>
            {advantages.map((a, i) => {
              const Icon = a.icon;
              return (
                <div
                  className="card"
                  key={i}
                  style={{ padding: 28, display: "flex", gap: 16, alignItems: "flex-start" }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: a.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={22} style={{ color: a.color }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>
                      {a.title}
                    </h3>
                    <p style={{ color: "var(--sub)", lineHeight: 1.6, margin: 0, fontSize: 15 }}>
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
      <section className="dark-section" style={{ padding: "80px 0" }}>
        <div className="section">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2
              style={{
                fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
                fontWeight: 800,
                letterSpacing: "-0.04em",
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
              borderRadius: 16,
              overflow: "hidden",
              background: "white",
              boxShadow: "0 1px 2px rgba(0,0,0,.04), 0 2px 8px rgba(0,0,0,.04)",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                padding: "14px 24px",
                background: "var(--soft)",
                borderBottom: "1px solid var(--line)",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              <span></span>
              <span style={{ textAlign: "center", color: "var(--primary)" }}>
                <BadgeCheck size={16} style={{ display: "inline", verticalAlign: -3 }} /> Мастер рядом
              </span>
              <span style={{ textAlign: "center", color: "var(--hint)" }}>Другие</span>
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
                    color: "var(--green)",
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
                    color: "var(--hint)",
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
        </div>
      </section>

      {/* ═══════════ CATEGORIES ═══════════ */}
      <section style={{ padding: "80px 0" }}>
        <div className="section">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2
              style={{
                fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                marginBottom: 12,
              }}
            >
              Категории услуг
            </h2>
            <p className="lead" style={{ maxWidth: 500, margin: "0 auto" }}>
              11 категорий — от сантехники до переездов
            </p>
          </div>

          {categoryGroups.map((g) => (
            <div key={g.group} style={{ marginBottom: 32 }}>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  marginBottom: 14,
                  letterSpacing: "-0.02em",
                }}
              >
                {g.icon} {g.group}
              </h3>
              <div className="grid-3" style={{ gap: 12 }}>
                {g.items.map((c) => (
                  <Link
                    href="/register"
                    key={c.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "16px 20px",
                      borderRadius: 16,
                      background: "var(--soft)",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span style={{ fontSize: 28, flexShrink: 0 }}>{c.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 700, display: "block", fontSize: 15 }}>{c.name}</span>
                      <span style={{ fontSize: 13, color: "var(--sub)", lineHeight: 1.4 }}>{c.desc}</span>
                    </div>
                    <ChevronRight size={18} style={{ color: "var(--hint)", flexShrink: 0 }} />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ STATS ═══════════ */}
      <section className="dark-section" style={{ padding: "80px 0" }}>
        <div className="section">
          <div className="stats-grid" style={{ maxWidth: 900, margin: "0 auto" }}>
            {stats.map((s, i) => (
              <div className="stat-card" key={i} style={{ padding: 28 }}>
                <strong style={{ fontSize: 36, color: "var(--black)", display: "block" }}>
                  {s.value}
                </strong>
                <span style={{ fontWeight: 700, display: "block", marginTop: 4, color: "var(--text)" }}>
                  {s.label}
                </span>
                <span style={{ fontSize: 13, marginTop: 4, display: "block", color: "var(--sub)" }}>
                  {s.sub}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <section style={{ padding: "80px 0" }}>
        <div className="section">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2
              style={{
                fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
                fontWeight: 800,
                letterSpacing: "-0.04em",
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
                      background:
                        i === 0
                          ? "var(--primary)"
                          : i === 1
                            ? "var(--green)"
                            : "var(--orange)",
                    }}
                  >
                    {t.name[0]}
                  </div>
                  <div>
                    <strong style={{ fontSize: 14 }}>{t.name}</strong>
                    <span
                      style={{
                        display: "block",
                        fontSize: 12,
                        textTransform: "capitalize",
                        color: "var(--sub)",
                      }}
                    >
                      {t.role}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FOR MASTERS CTA ═══════════ */}
      <section className="dark-section" style={{ padding: "80px 0" }}>
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
                  letterSpacing: "-0.04em",
                  marginBottom: 16,
                  lineHeight: 1.15,
                }}
              >
                Зарабатывайте без комиссий и посредников
              </h2>
              <p style={{ color: "var(--sub)", lineHeight: 1.7, marginBottom: 24 }}>
                Пройдите верификацию, получите 3 бесплатных отклика и начните получать заказы.
                Вся оплата — напрямую от клиента.
              </p>
              <Link
                href="/register?role=master"
                className="btn-primary"
                style={{ width: "auto", padding: "18px 36px" }}
              >
                Стать мастером <ArrowRight size={16} />
              </Link>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                { icon: BadgeCheck, text: "Верификация за 5 минут" },
                { icon: Star, text: "Рейтинг и портфолио — ваш актив" },
                { icon: Clock, text: "Первый заказ уже сегодня" },
                { icon: ShieldCheck, text: "Гарантия повышает доверие клиентов" },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    className="uber-row"
                    key={i}
                    style={{ padding: "14px 0", borderBottom: i < 3 ? "1px solid var(--line)" : "none" }}
                  >
                    <div
                      className="ico"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "var(--primary-light)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={18} style={{ color: "var(--primary)" }} />
                    </div>
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
              fontSize: "clamp(1.8rem, 5vw, 3rem)",
              fontWeight: 900,
              letterSpacing: "-0.05em",
              marginBottom: 16,
              lineHeight: 1.1,
            }}
          >
            Честный сервис.{" "}
            <span style={{ color: "var(--primary)" }}>Без комиссий.</span>
            <br />
            Для людей.
          </h2>
          <p
            className="lead"
            style={{ maxWidth: 480, margin: "0 auto 36px", fontSize: 18 }}
          >
            Создайте заявку за 30 секунд — проверенные мастера рядом уже ждут
          </p>
          <Link
            href="/register"
            className="btn-primary"
            style={{ padding: "18px 40px", fontSize: 17, width: "auto" }}
          >
            Создать заявку — бесплатно <ArrowRight size={20} />
          </Link>
          <p style={{ fontSize: 13, marginTop: 16, color: "var(--sub)" }}>
            Бесплатно для клиентов. 3 бесплатных отклика для мастеров.
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
              <p style={{ marginTop: 12, lineHeight: 1.6, color: "var(--sub)" }}>
                Сервис бытовых заявок.
                <br />
                Соединяем клиентов и мастеров без комиссий.
              </p>
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Клиентам</h4>
              <div style={{ display: "grid", gap: 8 }}>
                <Link href="/register" style={{ color: "var(--sub)" }}>
                  Создать заявку
                </Link>
                <Link href="/how-it-works" style={{ color: "var(--sub)" }}>
                  Как это работает
                </Link>
                <Link href="/register" style={{ color: "var(--sub)" }}>
                  Категории услуг
                </Link>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Мастерам</h4>
              <div style={{ display: "grid", gap: 8 }}>
                <Link href="/register?role=master" style={{ color: "var(--sub)" }}>
                  Стать мастером
                </Link>
                <Link href="/register?role=master" style={{ color: "var(--sub)" }}>
                  Верификация
                </Link>
                <Link href="/register?role=master" style={{ color: "var(--sub)" }}>
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
            <p style={{ fontSize: 13, color: "var(--sub)" }}>
              © 2026 Мастер рядом. Платформа соединяет клиентов и мастеров, не является исполнителем работ.
            </p>
            <div className="flex gap-3">
              <Link href="#" style={{ fontSize: 13, color: "var(--sub)" }}>
                Политика конфиденциальности
              </Link>
              <Link href="#" style={{ fontSize: 13, color: "var(--sub)" }}>
                Условия
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
