import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requests } from "@/lib/mock-data";

export default function MasterOrdersPage() {
  return (
    <AppShell role="MASTER">
      <div className="page-head"><div><h1>Мои работы</h1><p className="muted">Принятые, выполняемые и завершённые заказы.</p></div></div>
      <div className="request-list">
        {requests.map((request) => (
          <Link href={`/master/requests/${request.id}`} className="request-card" key={request.id}>
            <div><span className="pill">{request.status}</span><h3>{request.title}</h3><p>{request.address}</p></div>
            <strong>{request.preferredTime}</strong>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
