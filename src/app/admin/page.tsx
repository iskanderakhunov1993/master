"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutGrid, Users, ClipboardList, Layers } from "lucide-react";
import AppShell from "@/components/AppShell";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [categoriesCount, setCategoriesCount] = useState(0);
  const [requestsTotal, setRequestsTotal] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const [catRes, reqRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/requests"),
        ]);
        const catJson = await catRes.json();
        const reqJson = await reqRes.json();
        if (catJson.ok) setCategoriesCount(catJson.data.length);
        if (reqJson.ok) setRequestsTotal(reqJson.data.total ?? reqJson.data.requests?.length ?? 0);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <AppShell role="ADMIN">
      <div className="page-head">
        <div>
          <h1><LayoutGrid size={22} /> Панель администратора</h1>
          <p className="muted">Управление пользователями, заявками и категориями.</p>
        </div>
      </div>

      {loading ? (
        <section className="empty-state">
          <p>Загрузка данных...</p>
        </section>
      ) : (
        <div className="stats-grid">
          <Link href="/admin/users" className="stat-card">
            <Users size={22} />
            <span className="muted">Пользователи</span>
            <strong>&mdash;</strong>
          </Link>
          <Link href="/admin/requests" className="stat-card">
            <ClipboardList size={22} />
            <span className="muted">Заявки</span>
            <strong>{requestsTotal}</strong>
          </Link>
          <Link href="/admin/categories" className="stat-card">
            <Layers size={22} />
            <span className="muted">Категории</span>
            <strong>{categoriesCount}</strong>
          </Link>
        </div>
      )}
    </AppShell>
  );
}
