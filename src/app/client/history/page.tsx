import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { addresses, repairHistory, formatRub } from "@/lib/mock-data";

export default function ClientHistoryPage() {
  return (
    <AppShell role="CLIENT">
      <div className="page-head"><div><h1>История ремонтов</h1><p className="muted">Цифровой паспорт квартиры для будущего развития продукта.</p></div></div>
      <div className="request-list">
        {repairHistory.map((item) => (
          <Link className="request-card" href={`/client/history/${item.addressId}`} key={item.id}>
            <div><span className="pill">{item.category}</span><h3>{item.title}</h3><p>{item.notes}</p></div>
            <strong>{formatRub(item.finalPrice)}</strong>
          </Link>
        ))}
      </div>
      <section className="card" style={{ marginTop: 18 }}>
        <h3>Адреса</h3>
        {addresses.map((address) => <p key={address.id}>{address.title}: {address.city}, {address.street}, {address.house}</p>)}
      </section>
    </AppShell>
  );
}
