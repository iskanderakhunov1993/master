import Link from "next/link";
import { ToggleRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequestCard } from "@/components/RequestCard";
import { demoUsers, masters, requests } from "@/lib/mock-data";

export default function MasterDashboardPage() {
  const master = masters[0];
  return (
    <AppShell role="MASTER">
      <div className="page-head">
        <div>
          <h1>{demoUsers.master.name}</h1>
          <p className="muted">Профиль мастера, лента заявок и быстрый отклик.</p>
        </div>
        <Link className="primary-btn" href="/master/requests">Смотреть заказы</Link>
      </div>
      <div className="stats-grid">
        <div className="stat-card"><span className="muted">Рейтинг</span><strong>{master.rating}</strong></div>
        <div className="stat-card"><span className="muted">Выполнено</span><strong>{master.completed}</strong></div>
        <div className="stat-card"><span className="muted">Радиус</span><strong>8 км</strong></div>
        <div className="stat-card"><span className="muted">Статус</span><strong><ToggleRight /> On</strong></div>
      </div>
      <section className="request-list">
        {requests.map((request) => <RequestCard key={request.id} request={request} href={`/master/requests/${request.id}`} />)}
      </section>
    </AppShell>
  );
}
