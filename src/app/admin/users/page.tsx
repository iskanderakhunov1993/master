import { AppShell } from "@/components/AppShell";
import { demoUsers, masters } from "@/lib/mock-data";

export default function AdminUsersPage() {
  return (
    <AppShell role="ADMIN">
      <h1>Пользователи</h1>
      <div className="table-card">
        {[demoUsers.client, demoUsers.master, demoUsers.admin].map((user) => (
          <div className="table-row" key={user.id}>
            <strong>{user.name}</strong><span>{user.email}</span><span>{user.role}</span><button className="secondary-btn">Блокировать</button>
          </div>
        ))}
      </div>
      <h2 style={{ marginTop: 28 }}>Мастера</h2>
      <div className="table-card">
        {masters.map((master) => (
          <div className="table-row" key={master.id}>
            <strong>{master.name}</strong><span>{master.categories.join(", ")}</span><span>{master.rating}</span><button className="secondary-btn">Проверен</button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
