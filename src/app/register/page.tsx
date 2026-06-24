"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { Loader2, User, Wrench } from "lucide-react";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "var(--card)",
  color: "var(--text)",
  border: "1px solid var(--line)",
  borderRadius: 10,
  fontSize: "0.95rem",
  outline: "none",
};

type Role = "CLIENT" | "MASTER";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("CLIENT");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phone, role }),
      });

      const json = await res.json();

      if (!json.ok) {
        setError(json.error || "Ошибка регистрации");
        setLoading(false);
        return;
      }

      if (role === "MASTER") router.push("/master/dashboard");
      else router.push("/client/dashboard");
    } catch {
      setError("Не удалось подключиться к серверу");
      setLoading(false);
    }
  }

  const roleCard = (value: Role, label: string, desc: string, Icon: typeof User) => (
    <button
      type="button"
      onClick={() => setRole(value)}
      style={{
        flex: 1,
        padding: 20,
        background: role === value ? "var(--card2)" : "var(--card)",
        border: role === value ? "2px solid var(--accent)" : "2px solid var(--line)",
        borderRadius: 12,
        cursor: "pointer",
        textAlign: "center",
        color: "var(--text)",
        transition: "all .15s",
      }}
    >
      <Icon size={28} style={{ color: role === value ? "var(--accent)" : "var(--muted)", marginBottom: 8 }} />
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{desc}</div>
    </button>
  );

  return (
    <div className="landing" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="landing-nav">
        <Brand size="default" />
      </header>

      <main
        className="section"
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 16px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            background: "var(--card)",
            borderRadius: 16,
            padding: 32,
            border: "1px solid var(--line)",
          }}
        >
          <h2 style={{ marginBottom: 8, fontSize: "1.5rem" }}>Регистрация</h2>
          <p className="muted" style={{ marginBottom: 24 }}>
            Создайте аккаунт и начните за 30 секунд
          </p>

          {error && (
            <div
              style={{
                background: "rgba(239,68,68,.12)",
                color: "var(--red)",
                padding: "10px 14px",
                borderRadius: 8,
                marginBottom: 16,
                fontSize: "0.9rem",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 12 }}>
              {roleCard("CLIENT", "Клиент", "Ищу мастера", User)}
              {roleCard("MASTER", "Мастер", "Ищу заказы", Wrench)}
            </div>

            <label className="field" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Имя</span>
              <input
                type="text"
                required
                placeholder="Александр"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
            </label>

            <label className="field" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Email</span>
              <input
                type="email"
                required
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
            </label>

            <label className="field" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Телефон</span>
              <input
                type="tel"
                required
                placeholder="+7 999 000 00 00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
              />
            </label>

            <label className="field" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Пароль</span>
              <input
                type="password"
                required
                placeholder="Минимум 6 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
            </label>

            <button type="submit" className="primary-btn" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? <><Loader2 size={18} className="spin" /> Регистрация...</> : "Создать аккаунт"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 20, fontSize: "0.9rem", color: "var(--muted)" }}>
            Уже есть аккаунт?{" "}
            <Link href="/login" style={{ color: "var(--accent)" }}>
              Войти
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
