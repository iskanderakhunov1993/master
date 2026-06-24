import Link from "next/link";
import { Brand } from "@/components/Brand";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Users,
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
  { icon: Camera, title: "Сфотографируйте", desc: "Сделайте фото проблемы и опишите задачу за 30 секунд" },
  { icon: Users, title: "Мастера откликаются", desc: "Получите предложения от проверенных мастеров рядом" },
  { icon: CheckCircle2, title: "Работа выполнена", desc: "Выберите лучшего мастера и задача решена" },
];

export default function HomePage() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <Brand size="default" />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/login" style={{ color: "var(--muted)", textDecoration: "none" }}>
            Войти
          </Link>
          <Link href="/register" className="nav-cta">
            Создать заявку <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      <section className="thumb-hero" style={{
        background: "linear-gradient(135deg, var(--bg) 0%, #0f1a35 50%, var(--bg) 100%)",
        padding: "100px 0 80px",
        textAlign: "center",
      }}>
        <div className="section">
          <h1 style={{ fontSize: "3.2rem", fontWeight: 800, lineHeight: 1.1, marginBottom: 16 }}>
            Мастер <span style={{ color: "var(--accent)" }}>рядом</span>
          </h1>
          <p className="lead" style={{ color: "var(--muted)", maxWidth: 480, margin: "0 auto 36px" }}>
            Сфоткай — починим. Найдите проверенного мастера для любой бытовой задачи за минуты.
          </p>
          <div className="hero-actions" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/register" className="primary-btn">
              Создать заявку <ArrowRight size={18} />
            </Link>
            <Link href="/register" className="secondary-btn">
              Я мастер
            </Link>
          </div>
        </div>
      </section>

      <section className="dark-section" style={{ padding: "80px 0" }}>
        <div className="section">
          <h2 style={{ textAlign: "center", marginBottom: 48, fontSize: "1.75rem" }}>
            Как это работает
          </h2>
          <div className="grid-3">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <div className="card" key={i} style={{ textAlign: "center", padding: 32 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    background: "var(--soft)", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    margin: "0 auto 16px", color: "var(--accent)",
                  }}>
                    <Icon size={28} />
                  </div>
                  <h3 style={{ marginBottom: 8 }}>{s.title}</h3>
                  <p className="muted">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section" style={{ padding: "80px 0" }}>
        <h2 style={{ textAlign: "center", marginBottom: 48, fontSize: "1.75rem" }}>
          Популярные категории
        </h2>
        <div className="grid-3">
          {categories.map((c) => (
            <Link
              href="/register"
              className="card"
              key={c.name}
              style={{ padding: 28, textAlign: "center", textDecoration: "none", color: "var(--text)" }}
            >
              <span style={{ fontSize: "2.5rem", display: "block", marginBottom: 12 }}>{c.icon}</span>
              <span style={{ fontWeight: 600 }}>{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="dark-section" style={{ padding: "60px 0" }}>
        <div className="section">
          <div className="stats-grid">
            <div className="stat-card">
              <span style={{ fontSize: "2rem", fontWeight: 700, color: "var(--accent)" }}>3</span>
              <span className="muted">бесплатных отклика</span>
            </div>
            <div className="stat-card">
              <span style={{ fontSize: "2rem", fontWeight: 700, color: "var(--green)" }}>0%</span>
              <span className="muted">комиссии</span>
            </div>
            <div className="stat-card">
              <span style={{ fontSize: "2rem", fontWeight: 700, color: "var(--orange)" }}>4.8 ⭐</span>
              <span className="muted">средний рейтинг</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ padding: "80px 0", textAlign: "center" }}>
        <h2 style={{ marginBottom: 16, fontSize: "1.75rem" }}>Готовы начать?</h2>
        <p className="muted" style={{ marginBottom: 32, maxWidth: 400, margin: "0 auto 32px" }}>
          Создайте заявку прямо сейчас — это бесплатно и займёт 30 секунд
        </p>
        <Link href="/register" className="primary-btn">
          Создать заявку <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
