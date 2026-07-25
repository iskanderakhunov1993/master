import { AlertTriangle, ArrowRight, BadgeCheck, ClipboardList, ShieldBan, UsersRound, Wrench } from "lucide-react";
import Link from "next/link";

import type { SessionUser } from "@/lib/auth/types";
import type { AdminDashboardData } from "@/lib/admin/types";

export function AdminDashboard({ user, data }: { user: SessionUser; data: AdminDashboardData }) {
  const attention = data.pendingVerifications + data.openComplaints;
  return (
    <div className="admin-page">
      <header className="dashboard-hero">
        <div><span>Панель управления</span><h1>Состояние сервиса</h1><p>Здравствуйте, {user.name.split(" ")[0]}. Здесь собраны ключевые очереди и сигналы, требующие внимания.</p></div>
      </header>
      <div className="admin-stat-grid">
        <Link href="/admin/users"><span><UsersRound /></span><small>Пользователи</small><strong>{data.totalUsers}</strong></Link>
        <Link href="/admin/masters"><span><Wrench /></span><small>Мастера</small><strong>{data.masters}</strong></Link>
        <Link href="/admin/orders"><span><ClipboardList /></span><small>Активные заказы</small><strong>{data.activeOrders}</strong></Link>
        <Link href="/admin/verifications"><span><BadgeCheck /></span><small>На проверке</small><strong>{data.pendingVerifications}</strong></Link>
      </div>
      <div className="admin-overview-grid">
        <section className="admin-panel">
          <header><div><span>Контроль</span><h2>Требуют внимания</h2></div><b className={attention > 0 ? "is-warning" : ""}>{attention}</b></header>
          <Link className="admin-attention-row" href="/admin/verifications"><BadgeCheck /><span><strong>Проверка личности</strong><small>Заявки мастеров со статусом PENDING</small></span><b>{data.pendingVerifications}</b><ArrowRight /></Link>
          <Link className="admin-attention-row" href="/admin/complaints"><AlertTriangle /><span><strong>Жалобы и споры</strong><small>Открытые обращения по заказам</small></span><b>{data.openComplaints}</b><ArrowRight /></Link>
        </section>
        <section className="admin-panel">
          <header><div><span>Доступ</span><h2>Заблокированные аккаунты</h2></div><ShieldBan /></header>
          <div className="admin-blocked-summary"><strong>{data.blockedUsers}</strong><p>Активные сессии заблокированных пользователей отозваны. Их действия и вход запрещены сервером.</p><Link href="/admin/users">Открыть пользователей <ArrowRight size={16} /></Link></div>
        </section>
      </div>
    </div>
  );
}
