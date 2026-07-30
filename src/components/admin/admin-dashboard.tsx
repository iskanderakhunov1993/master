import { Activity, AlertTriangle, ArrowRight, BadgeCheck, ClipboardList, Clock3, Repeat2, ShieldBan, UsersRound, Wrench } from "lucide-react";
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
          <Link className="admin-attention-row" href="/admin/complaints"><AlertTriangle /><span><strong>Жалобы, споры и гарантии</strong><small>Открытые обращения по выполненным работам</small></span><b>{data.openComplaints}</b><ArrowRight /></Link>
        </section>
        <section className="admin-panel">
          <header><div><span>Доступ</span><h2>Заблокированные аккаунты</h2></div><ShieldBan /></header>
          <div className="admin-blocked-summary"><strong>{data.blockedUsers}</strong><p>Активные сессии заблокированных пользователей отозваны. Их действия и вход запрещены сервером.</p><Link href="/admin/users">Открыть пользователей <ArrowRight size={16} /></Link></div>
        </section>
      </div>
      <PilotFunnel data={data.pilot} />
    </div>
  );
}

function PilotFunnel({ data }: { data: AdminDashboardData["pilot"] }) {
  const funnel = [
    { label: "Опубликованы", value: data.publishedOrders },
    { label: "Получили отклик", value: data.ordersWithOffers },
    { label: "Выбран мастер", value: data.selectedOrders },
    { label: "Подтверждены", value: data.completedOrders },
  ];
  const base = Math.max(1, data.publishedOrders);
  return <section className="admin-pilot-analytics">
    <header><div><span>Аналитика пилота</span><h2>Путь заказа до результата</h2><p>Только подтверждённые доменные события — без адресов, сообщений и координат.</p></div><Activity size={26} /></header>
    <div className="pilot-funnel">{funnel.map((stage) => <article key={stage.label}><div><span>{stage.label}</span><strong>{stage.value}</strong></div><div className="pilot-funnel__bar"><i style={{ width: `${Math.max(stage.value > 0 ? 8 : 0, Math.min(100, stage.value / base * 100))}%` }} /></div><small>{Math.round(stage.value / base * 100)}% от опубликованных</small></article>)}</div>
    <div className="pilot-metrics">
      <div><Clock3 /><span><small>Первый отклик</small><strong>{data.averageFirstOfferMinutes === null ? "Нет данных" : `${Math.round(data.averageFirstOfferMinutes)} мин`}</strong></span></div>
      <div><Repeat2 /><span><small>Повторные клиенты</small><strong>{data.repeatClients}</strong></span></div>
      <div><AlertTriangle /><span><small>Споры</small><strong>{data.disputes}</strong></span></div>
      <div><ClipboardList /><span><small>Изменения цены</small><strong>{data.changeOrders}</strong></span></div>
      <div><BadgeCheck /><span><small>Полный комплект фото</small><strong>{data.evidenceReadyOrders}</strong></span></div>
    </div>
  </section>;
}
