import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequestCard } from "@/components/RequestCard";
import { demoUsers, repairHistory, requests } from "@/lib/mock-data";

export default function ClientDashboardPage() {
  return (
    <AppShell role="CLIENT">
      <div className="page-head">
        <div>
          <h1>Добрый день, {demoUsers.client.name}</h1>
          <p className="muted">Создайте заявку, сравните отклики и сохраните историю ремонта квартиры.</p>
        </div>
        <Link className="primary-btn" href="/client/requests/new"><Plus size={18} /> Создать заявку</Link>
      </div>
      <div className="stats-grid">
        <div className="stat-card"><span className="muted">Активные заявки</span><strong>2</strong></div>
        <div className="stat-card"><span className="muted">Отклики</span><strong>4</strong></div>
        <div className="stat-card"><span className="muted">Рейтинг</span><strong>{demoUsers.client.ratingAvg}</strong></div>
        <div className="stat-card"><span className="muted">История</span><strong>{repairHistory.length}</strong></div>
      </div>
      <section className="request-list">
        {requests.map((request) => (
          <RequestCard key={request.id} request={request} href={`/client/requests/${request.id}`} />
        ))}
      </section>
    </AppShell>
  );
}
