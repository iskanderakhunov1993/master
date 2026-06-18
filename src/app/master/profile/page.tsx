import { AppShell } from "@/components/AppShell";
import { masters } from "@/lib/mock-data";

export default function MasterProfilePage() {
  const master = masters[0];
  return (
    <AppShell role="MASTER">
      <h1>Профиль мастера</h1>
      <div className="card">
        <h3>{master.name}</h3>
        <p className="muted">{master.categories.join(", ")} · {master.district}</p>
        <p>Рейтинг {master.rating}, выполнено {master.completed} заказов.</p>
      </div>
    </AppShell>
  );
}
