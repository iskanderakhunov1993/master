import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Camera, CheckCircle2, MapPin, MessageCircle, ShieldCheck, Sparkles, Star, Timer, WalletCards } from "lucide-react";
import { Brand } from "@/components/Brand";
import { categories, formatRub, masters } from "@/lib/mock-data";

const steps = [
  { icon: Camera, title: "Покажите задачу", text: "Описание, фото, район, время и бюджет в одной заявке." },
  { icon: Timer, title: "Получите отклики", text: "Мастера по категории видят заявку и предлагают цену/время." },
  { icon: MessageCircle, title: "Выберите и договоритесь", text: "Чат открывается после выбора мастера, условия сохраняются." },
];

export default function HomePage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Brand />
        <nav>
          <Link href="/how-it-works">Как работает</Link>
          <Link href="/client/dashboard">Клиент</Link>
          <Link href="/master/dashboard">Мастер</Link>
          <Link href="/admin">Админ</Link>
        </nav>
        <Link className="nav-cta" href="/client/requests/new">
          Создать заявку <ArrowRight size={16} />
        </Link>
      </header>

      <main>
        <section className="hero">
          <div>
            <span className="badge"><Sparkles size={15} /> MVP маркетплейса мастеров</span>
            <h1>Нужный мастер.<br /><em>В нужный момент.</em></h1>
            <p className="lead">
              HomeFix / МастерGO помогает быстро найти сантехника, электрика,
              сборщика мебели или мастера на час. Клиент публикует заявку,
              мастера предлагают условия, после работы обе стороны оставляют отзыв.
            </p>
            <div className="hero-actions">
              <Link className="primary-btn" href="/client/requests/new">Создать заявку <ArrowRight size={18} /></Link>
              <Link className="secondary-btn" href="/master/requests">Смотреть заказы</Link>
            </div>
          </div>
          <div className="hero-card">
            <div className="work-preview">
              <div className="preview-top">
                <div>
                  <span className="pill">Сантехника</span>
                  <h3>Течёт кран на кухне</h3>
                </div>
                <span className="live">Есть отклики</span>
              </div>
              <Image src="/uploads/faucet-result.jpg" width={900} height={520} alt="Установка кухонного крана" priority />
              <div className="preview-row">
                <span className="muted"><MapPin size={15} /> Хамовники</span>
                <strong>{formatRub(4500)}</strong>
              </div>
              <div className="offer-mini">
                {masters.map((master) => (
                  <article key={master.id}>
                    <span>{master.name}</span>
                    <span><Star size={13} fill="currentColor" /> {master.rating}</span>
                    <strong>{formatRub(master.price)}</strong>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <span className="badge">Что закрывает MVP</span>
          <h2>Полный путь заявки</h2>
          <div className="grid-3">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <article className="card" key={step.title}>
                  <span className="card-icon"><Icon size={24} /></span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="dark-section">
          <div className="grid-3">
            <article>
              <WalletCards size={34} />
              <h3>Без высокой комиссии</h3>
              <p className="muted">MVP оставляет возможность подписки для мастеров и оплаты внутри сервиса позже.</p>
            </article>
            <article>
              <ShieldCheck size={34} />
              <h3>Доверие и модерация</h3>
              <p className="muted">Отзывы, рейтинг, проверка мастеров и админ-панель для развития безопасности.</p>
            </article>
            <article>
              <CheckCircle2 size={34} />
              <h3>История квартиры</h3>
              <p className="muted">После завершения работа сохраняется в истории ремонта по адресу.</p>
            </article>
          </div>
        </section>

        <section className="section">
          <span className="badge">Категории</span>
          <h2>Самые частые бытовые задачи</h2>
          <div className="grid-3">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Link className="card" href="/master/requests" key={category.slug}>
                  <span className="card-icon"><Icon size={24} /></span>
                  <h3>{category.name}</h3>
                  <p>{category.count} мастеров готовы получать заявки в этой категории.</p>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
