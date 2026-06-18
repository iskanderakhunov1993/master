import { AppShell } from "@/components/AppShell";
import { requests } from "@/lib/mock-data";

export default function AdminRequestsPage() {
  return (
    <AppShell role="ADMIN">
      <h1>Заявки</h1>
      <div className="table-card">
        {requests.map((request) => (
          <div className="table-row" key={request.id}>
            <strong>{request.title}</strong><span>{request.category}</span><span>{request.status}</span><button className="secondary-btn">Модерация</button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
