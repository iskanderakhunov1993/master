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

  const roles: { value: Role; label: string; desc: string; Icon: typeof User; emoji: string }[] = [
    { value: "CLIENT", label: "Клиент", desc: "Нужно найти мастера", Icon: User, emoji: "👤" },
    { value: "MASTER", label: "Мастер", desc: "Хочу получать заказы", Icon: Wrench, emoji: "🔧" },
  ];

  return (
    <div className="landing flex flex-col" style={{ minHeight: "100vh", background: "var(--bg-soft)" }}>
      <header className="landing-nav">
        <Brand size="default" />
      </header>

      <main className="section flex items-center justify-center" style={{ flex: 1, padding: "40px 16px" }}>
        <div className="card animate-fadeIn" style={{ width: "100%", maxWidth: 480, padding: 32 }}>
          <div className="text-center" style={{ marginBottom: 24 }}>
            <h2 style={{ marginBottom: 8, fontSize: "1.5rem" }}>Регистрация</h2>
            <p className="muted">Создайте аккаунт и начните за 30 секунд</p>
          </div>

          {error && (
            <div style={{
              background: "var(--accent-light)",
              color: "var(--red)",
              padding: "10px 14px",
              borderRadius: 8,
              marginBottom: 16,
              fontSize: "0.9rem",
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex gap-3">
              {roles.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className="card"
                  style={{
                    flex: 1,
                    padding: 20,
                    textAlign: "center",
                    cursor: "pointer",
                    border: role === r.value
                      ? "2px solid var(--accent)"
                      : "2px solid transparent",
                    background: role === r.value
                      ? "var(--accent-light)"
                      : undefined,
                    transition: "all .2s",
                  }}
                >
                  <div style={{ fontSize: "1.75rem", marginBottom: 8 }}>{r.emoji}</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
                  <div className="muted" style={{ fontSize: "0.8rem" }}>{r.desc}</div>
                </button>
              ))}
            </div>

            <label className="field">
              <span className="muted" style={{ fontSize: "0.85rem" }}>Имя</span>
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
              <span className="muted" style={{ fontSize: "0.85rem" }}>Email</span>
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
              <span className="muted" style={{ fontSize: "0.85rem" }}>Телефон</span>
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
              <span className="muted" style={{ fontSize: "0.85rem" }}>Пароль</span>
              <input
                type="password"
                className="input"
                required
                placeholder="Минимум 6 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <button type="submit" className="btn-primary w-full" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? <><Loader2 size={18} className="spin" /> Регистрация...</> : "Создать аккаунт"}
            </button>
          </form>

          <p className="muted text-center" style={{ marginTop: 20, fontSize: "0.9rem" }}>
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
