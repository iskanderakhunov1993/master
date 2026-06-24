"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { Loader2 } from "lucide-react";

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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!json.ok) {
        setError(json.error || "Ошибка входа");
        setLoading(false);
        return;
      }

      const role: string = json.data.role;
      if (role === "ADMIN") router.push("/admin");
      else if (role === "MASTER") router.push("/master/dashboard");
      else router.push("/client/dashboard");
    } catch {
      setError("Не удалось подключиться к серверу");
      setLoading(false);
    }
  }

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
            maxWidth: 420,
            background: "var(--card)",
            borderRadius: 16,
            padding: 32,
            border: "1px solid var(--line)",
          }}
        >
          <h2 style={{ marginBottom: 8, fontSize: "1.5rem" }}>Вход</h2>
          <p className="muted" style={{ marginBottom: 24 }}>
            Войдите, чтобы продолжить работу
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
              <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Пароль</span>
              <input
                type="password"
                required
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
            </label>

            <button type="submit" className="primary-btn" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? <><Loader2 size={18} className="spin" /> Вход...</> : "Войти"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 20, fontSize: "0.9rem", color: "var(--muted)" }}>
            Нет аккаунта?{" "}
            <Link href="/register" style={{ color: "var(--accent)" }}>
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
