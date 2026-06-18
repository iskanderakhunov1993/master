import { AppShell } from "@/components/AppShell";
import { demoUsers } from "@/lib/mock-data";

export default function ClientProfilePage() {
  return (
    <AppShell role="CLIENT">
      <h1>Профиль клиента</h1>
      <div className="card">
        <h3>{demoUsers.client.name}</h3>
        <p>{demoUsers.client.email}</p>
        <p className="muted">Рейтинг: {demoUsers.client.ratingAvg} на основе {demoUsers.client.ratingCount} отзывов.</p>
      </div>
    </AppShell>
  );
}
