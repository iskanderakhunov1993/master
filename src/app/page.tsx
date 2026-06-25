import Link from "next/link";
import { Brand } from "@/components/Brand";
import {
  ArrowRight,
  Camera,
  Users,
  CheckCircle2,
} from "lucide-react";

const categories = [
  { name: "Сантехника", icon: "🔧" },
  { name: "Электрика", icon: "⚡" },
  { name: "Сборка мебели", icon: "🪑" },
  { name: "Муж на час", icon: "🔨" },
  { name: "Двери и замки", icon: "🔑" },
  { name: "Бытовая техника", icon: "🔌" },
];

const steps = [
  {
    icon: Camera,
    num: "1",
    title: "Сфотографируйте",
    desc: "Сделайте фото проблемы и опишите задачу за 30 секунд",
  },
  {
    icon: Users,
    num: "2",
    title: "Мастера откликаются",
    desc: "Получите предложения от проверенных мастеров рядом",
  },
  {
    icon: CheckCircle2,
    num: "3",
    title: "Работа выполнена",
    desc: "Выберите лучшего мастера и задача решена",
  },
];

export default function HomePage() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <Brand size="default" />
        <div className="flex items-center gap-3">
          <Link href="/login" className="muted">
            Войти
          </Link>
          <Link href="/register" className="nav-cta">
            Создать заявку <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero" style={{ padding: "120px 0 100px", textAlign: "center" }}>
        <div className="section">
          <div className="pill" style={{ marginBottom: 20, display: "inline-block" }}>
            Сервис бытовых заявок
          </div>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 800, lineHeight: 1.1, marginBottom: 20 }}>
            Сфотографируй проблему —
            <br />
            <span style={{ color: "var(--accent)" }}>мастера рядом откликнутся</span>
          </h1>
          <p className="lead" style={{ maxWidth: 520, margin: "0 auto 40px" }}>
            Клиент создаёт заявку по фото за 30 секунд. Проверенные мастера видят
            её и предлагают цену. Без комиссий — платите мастеру напрямую.
          </p>
          <div className="flex items-center justify-center gap-3" style={{ flexWrap: "wrap" }}>
            <Link href="/register" className="btn-primary">
              Создать заявку <ArrowRight size={18} />
            </Link>
            <Link href="/register" className="btn-secondary">
              Я мастер
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section" style={{ padding: "80px 0" }}>
        <h2 className="section-title" style={{ textAlign: "center", fontSize: "1.75rem", marginBottom: 48 }}>
          Как это работает
        </h2>
        <div className="grid-3">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div className="card animate-fadeIn" key={s.num} style={{ textAlign: "center", padding: 32 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    fontWeight: 800,
                    fontSize: "1.25rem",
                  }}
                >
                  {s.num}
                </div>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "var(--accent-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    color: "var(--accent)",
                  }}
                >
                  <Icon size={28} />
                </div>
                <h3 style={{ marginBottom: 8 }}>{s.title}</h3>
                <p className="muted">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CATEGORIES */}
      <section style={{ padding: "80px 0", background: "var(--bg-section)" }}>
        <div className="section">
          <h2 className="section-title" style={{ textAlign: "center", fontSize: "1.75rem", marginBottom: 48 }}>
            Популярные категории
          </h2>
          <div className="grid-3">
            {categories.map((c) => (
              <Link
                href="/register"
                className="card"
                key={c.name}
                style={{ padding: 28, textAlign: "center" }}
              >
                <span style={{ fontSize: "2.5rem", display: "block", marginBottom: 12 }}>
                  {c.icon}
                </span>
                <span style={{ fontWeight: 600 }}>{c.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="section" style={{ padding: "60px 0" }}>
        <div className="stats-grid" style={{ maxWidth: 700, margin: "0 auto" }}>
          <div className="stat-card" style={{ textAlign: "center" }}>
            <strong style={{ fontSize: "2rem", color: "var(--accent)" }}>3</strong>
            <span className="muted">бесплатных отклика</span>
          </div>
          <div className="stat-card" style={{ textAlign: "center" }}>
            <strong style={{ fontSize: "2rem", color: "var(--green)" }}>0%</strong>
            <span className="muted">комиссии</span>
          </div>
          <div className="stat-card" style={{ textAlign: "center" }}>
            <strong style={{ fontSize: "2rem", color: "var(--orange)" }}>4.8 ⭐</strong>
            <span className="muted">средний рейтинг</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 0", textAlign: "center", background: "var(--bg-section)" }}>
        <div className="section">
          <h2 style={{ fontSize: "1.75rem", marginBottom: 16 }}>Готовы начать?</h2>
          <p className="lead" style={{ maxWidth: 400, margin: "0 auto 32px" }}>
            Создайте заявку прямо сейчас — это бесплатно
          </p>
          <Link href="/register" className="btn-primary">
            Создать заявку <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer style={{ padding: 24, borderTop: "1px solid var(--line)", textAlign: "center" }}>
        <p className="muted" style={{ fontSize: 13 }}>
          © 2026 Мастер рядом — сервис бытовых заявок
        </p>
      </footer>
    </div>
  );
}
