"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { Loader2 } from "lucide-react";

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
    <div className="landing flex flex-col" style={{ minHeight: "100vh", background: "var(--bg-soft)" }}>
      <header className="landing-nav">
        <Brand size="default" />
      </header>

      <main className="section flex items-center justify-center" style={{ flex: 1, padding: "40px 16px" }}>
        <div className="card animate-fadeIn" style={{ width: "100%", maxWidth: 420, padding: 32 }}>
          <div className="text-center" style={{ marginBottom: 24 }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>👋</div>
            <h2 style={{ marginBottom: 8, fontSize: "1.5rem" }}>Вход</h2>
            <p className="muted">Войдите, чтобы продолжить работу</p>
          </div>

          {error && (
            <div style={{
              padding: "10px 14px",
              borderRadius: 8,
              marginBottom: 16,
              fontSize: "0.9rem",
              background: "var(--accent-light)",
              color: "var(--red)",
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
              <span className="muted" style={{ fontSize: "0.85rem" }}>Пароль</span>
              <input
                type="password"
                className="input"
                required
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <button type="submit" className="btn-primary w-full" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? <><Loader2 size={18} className="spin" /> Вход...</> : "Войти"}
            </button>
          </form>

          <p className="muted text-center" style={{ marginTop: 20, fontSize: "0.9rem" }}>
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
