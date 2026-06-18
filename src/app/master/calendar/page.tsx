import { AppShell } from "@/components/AppShell";

export default function MasterCalendarPage() {
  return (
    <AppShell role="MASTER">
      <h1>Календарь</h1>
      <div className="grid-3">
        {["Сегодня", "Завтра", "Выходные"].map((day) => (
          <article className="card" key={day}><h3>{day}</h3><p className="muted">Свободен: 10:00–20:00</p></article>
        ))}
      </div>
    </AppShell>
  );
}
