import Link from "next/link";
import { Check, Star } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { formatRub, messages, offers, requests } from "@/lib/mock-data";

export default async function ClientRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = requests.find((item) => item.id === id) ?? requests[0];
  const requestOffers = offers.filter((offer) => offer.requestId === request.id);

  return (
    <AppShell role="CLIENT">
      <div className="page-head">
        <div>
          <span className="pill">{request.status}</span>
          <h1>{request.title}</h1>
          <p className="muted">{request.description}</p>
        </div>
        <Link className="primary-btn" href="/client/history">Завершить и сохранить</Link>
      </div>
      <div className="grid-3">
        <article className="card"><h3>Адрес</h3><p>{request.address}</p></article>
        <article className="card"><h3>Время</h3><p>{request.preferredTime}</p></article>
        <article className="card"><h3>Бюджет</h3><p>{formatRub(request.budgetAmount)}</p></article>
      </div>
      <section className="section" style={{ width: "100%", padding: "34px 0" }}>
        <span className="badge">Отклики мастеров</span>
        <div className="request-list">
          {requestOffers.map((offer) => (
            <article className="request-card" key={offer.id}>
              <div>
                <h3>{offer.master.name}</h3>
                <p className="muted">{offer.comment}</p>
                <div className="request-meta"><span><Star size={15} fill="currentColor" /> {offer.master.rating}</span><span>{offer.time}</span></div>
              </div>
              <div><strong>{formatRub(offer.price)}</strong><br /><Link className="secondary-btn" href={`/client/requests/${request.id}`}>{offer.status === "ACCEPTED" ? "Выбран" : "Выбрать"}</Link></div>
            </article>
          ))}
        </div>
      </section>
      <section className="card">
        <h3>Чат</h3>
        <div className="chat-box">
          {messages.map((message) => <div className={message.mine ? "message mine" : "message"} key={message.id}>{message.text}<br /><small>{message.time}</small></div>)}
        </div>
        <form className="two-col" style={{ marginTop: 16 }}>
          <input className="field" placeholder="Сообщение" />
          <button className="dark-btn" type="button"><Check size={16} /> Отправить</button>
        </form>
      </section>
    </AppShell>
  );
}
