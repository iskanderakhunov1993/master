import { AppShell } from "@/components/AppShell";
import { RequestCard } from "@/components/RequestCard";
import { requests } from "@/lib/mock-data";

export default function MasterRequestsPage() {
  return (
    <AppShell role="MASTER">
      <div className="page-head"><div><h1>Доступные заявки</h1><p className="muted">Фильтр по категориям мастера и району.</p></div></div>
      <div className="request-list">
        {requests.map((request) => <RequestCard key={request.id} request={request} href={`/master/requests/${request.id}`} />)}
      </div>
    </AppShell>
  );
}
