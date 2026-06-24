"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import AppShell from "@/components/AppShell";

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json();
        if (json.ok) setCurrentUser(json.data);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const rolePill = (role: string) => {
    switch (role) {
      case "ADMIN": return "pill-red";
      case "MASTER": return "pill-violet";
      default: return "pill-accent";
    }
  };

  return (
    <AppShell role="ADMIN">
      <div className="page-head">
        <div>
          <h1><Users size={22} /> Пользователи</h1>
          <p className="muted">Список зарегистрированных пользователей системы.</p>
        </div>
      </div>

      {loading ? (
        <section className="empty-state">
          <p>Загрузка пользователей...</p>
        </section>
      ) : (
        <div className="table-card">
          <div className="table-row" style={{ opacity: 0.6 }}>
            <strong>Имя</strong>
            <span>Email</span>
            <span>Роль</span>
            <span>Действия</span>
          </div>
          {currentUser ? (
            <div className="table-row">
              <strong>{currentUser.name}</strong>
              <span>{currentUser.email}</span>
              <span className={`pill ${rolePill(currentUser.role)}`}>{currentUser.role}</span>
              <button className="secondary-btn" disabled>Текущий</button>
            </div>
          ) : (
            <div className="table-row">
              <span className="muted" style={{ gridColumn: "1 / -1" }}>
                Нет данных о пользователях. API /api/users пока не реализован.
              </span>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
