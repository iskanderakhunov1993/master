import { AppShell } from "@/components/AppShell";
import { repairHistory } from "@/lib/mock-data";

export default async function AddressHistoryPage() {
  return (
    <AppShell role="CLIENT">
      <h1>История по адресу</h1>
      <div className="request-list">
        {repairHistory.map((item) => (
          <article className="card" key={item.id}>
            <span className="pill">{item.category}</span>
            <h3>{item.title}</h3>
            <p>{item.notes}</p>
            <p className="muted">Мастер: {item.master}. Гарантия до {item.warrantyUntil}</p>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
