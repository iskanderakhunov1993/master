import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Brand } from "@/components/Brand";

const items = [
  "Клиент создаёт заявку с фото, описанием, адресом, срочностью и бюджетом.",
  "Мастера по нужной категории видят заявку и отправляют предложение.",
  "Клиент выбирает мастера, после чего открывается чат.",
  "После завершения обе стороны оставляют отзыв.",
  "Работа сохраняется в истории ремонта квартиры.",
];

export default function HowItWorksPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Brand />
        <Link className="nav-cta" href="/product">Создать заявку</Link>
      </header>
      <main className="section">
        <span className="badge">Как работает</span>
        <h2>Простая механика без лишней CRM</h2>
        <div className="grid-3">
          {items.map((item, index) => (
            <article className="card" key={item}>
              <span className="card-icon">{index + 1}</span>
              <p>{item}</p>
            </article>
          ))}
        </div>
        <Link className="primary-btn" href="/product">Открыть MVP <ArrowRight size={18} /></Link>
      </main>
    </div>
  );
}
