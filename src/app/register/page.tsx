"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { Loader2, User, Wrench } from "lucide-react";

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

  const roles: { value: Role; label: string; desc: string; emoji: string }[] = [
    { value: "CLIENT", label: "Клиент", desc: "Нужно найти мастера", emoji: "👤" },
    { value: "MASTER", label: "Мастер", desc: "Хочу получать заказы", emoji: "🔧" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "20px 24px" }}>
        <Brand size="default" />
      </header>

      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
        <div style={{ width: "100%", maxWidth: 440 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 8 }}>Регистрация</h1>
          <p className="muted" style={{ marginBottom: 28 }}>Создайте аккаунт и начните за 30 секунд</p>

          {error && (
            <div style={{
              background: "#fef2f2",
              color: "var(--red)",
              padding: "12px 16px",
              borderRadius: 12,
              marginBottom: 16,
              fontSize: 14,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Role selection as uber-option */}
            <div style={{ display: "flex", gap: 12 }}>
              {roles.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className="uber-option"
                  style={{
                    flex: 1,
                    padding: 20,
                    textAlign: "center",
                    cursor: "pointer",
                    background: role === r.value ? "#000" : "var(--soft, #f2f2f2)",
                    color: role === r.value ? "#fff" : "var(--text)",
                    border: "none",
                    borderRadius: 16,
                    transition: "all .2s",
                  }}
                >
                  <div style={{ fontSize: "1.75rem", marginBottom: 8 }}>{r.emoji}</div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{r.label}</div>
                  <div style={{ fontSize: 13, opacity: 0.7 }}>{r.desc}</div>
                </button>
              ))}
            </div>

            <label className="field">
              <span className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Имя</span>
              <input
                type="text"
                className="input"
                required
                placeholder="Александр"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label className="field">
              <span className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Email</span>
              <input
                type="email"
                className="input"
                required
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="field">
              <span className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Телефон</span>
              <input
                type="tel"
                className="input"
                required
                placeholder="+7 900 000-00-00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>

            <label className="field">
              <span className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Пароль</span>
              <input
                type="password"
                className="input"
                required
                placeholder="Минимум 6 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", marginTop: 8, minHeight: 52 }}>
              {loading ? <><Loader2 size={18} className="spin" /> Регистрация...</> : "Создать аккаунт"}
            </button>
          </form>

          <p className="muted" style={{ marginTop: 24, fontSize: 14, textAlign: "center" }}>
            Уже есть аккаунт?{" "}
            <Link href="/login" style={{ color: "#000", fontWeight: 600 }}>
              Войти
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
