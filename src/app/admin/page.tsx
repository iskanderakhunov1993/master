import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { adminStats } from "@/lib/mock-data";

export default function AdminPage() {
  return (
    <AppShell role="ADMIN">
      <div className="page-head"><div><h1>Админ-панель</h1><p className="muted">Пользователи, мастера, заявки и категории для модерации MVP.</p></div></div>
      <div className="stats-grid">
        <Link className="stat-card" href="/admin/users"><span className="muted">Пользователи</span><strong>{adminStats.users}</strong></Link>
        <Link className="stat-card" href="/admin/users"><span className="muted">Мастера</span><strong>{adminStats.masters}</strong></Link>
        <Link className="stat-card" href="/admin/requests"><span className="muted">Заявки</span><strong>{adminStats.requests}</strong></Link>
        <Link className="stat-card" href="/admin/categories"><span className="muted">Категории</span><strong>{adminStats.categories}</strong></Link>
      </div>
    </AppShell>
  );
}
