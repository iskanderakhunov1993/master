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
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "20px 24px" }}>
        <Brand size="default" />
      </header>

      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 8 }}>Вход</h1>
          <p className="muted" style={{ marginBottom: 28 }}>Войдите, чтобы продолжить работу</p>

          {error && (
            <div style={{
              padding: "12px 16px",
              borderRadius: 12,
              marginBottom: 16,
              fontSize: 14,
              background: "#fef2f2",
              color: "var(--red)",
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
              <span className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Пароль</span>
              <input
                type="password"
                className="input"
                required
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", marginTop: 8, minHeight: 52 }}>
              {loading ? <><Loader2 size={18} className="spin" /> Вход...</> : "Войти"}
            </button>
          </form>

          <p className="muted" style={{ marginTop: 24, fontSize: 14, textAlign: "center" }}>
            Нет аккаунта?{" "}
            <Link href="/register" style={{ color: "#000", fontWeight: 600 }}>
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
