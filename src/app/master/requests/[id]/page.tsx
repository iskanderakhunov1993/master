import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { formatRub, requests } from "@/lib/mock-data";

export default async function MasterRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = requests.find((item) => item.id === id) ?? requests[0];

  return (
    <AppShell role="MASTER">
      <div className="page-head">
        <div>
          <span className="pill">{request.category}</span>
          <h1>{request.title}</h1>
          <p className="muted">{request.description}</p>
        </div>
        <strong>{formatRub(request.budgetAmount)}</strong>
      </div>
      <div className="grid-3">
        <article className="card"><h3>Район</h3><p>{request.district}</p></article>
        <article className="card"><h3>Когда</h3><p>{request.preferredTime}</p></article>
        <article className="card"><h3>Срочность</h3><p>{request.urgency}</p></article>
      </div>
      <section className="card" style={{ marginTop: 18 }}>
        <h3>Откликнуться</h3>
        <form className="form-grid">
          <div className="two-col">
            <label className="field">Цена<input defaultValue={request.budgetAmount} /></label>
            <label className="field">Время<input defaultValue="Сегодня 16:30–18:30" /></label>
          </div>
          <label className="field">Комментарий<textarea defaultValue="Буду через 25 минут, расходники возьму с собой." /></label>
          <Link className="primary-btn" href="/master/orders">Отправить предложение</Link>
        </form>
      </section>
    </AppShell>
  );
}
