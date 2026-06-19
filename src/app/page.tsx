import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Camera, CheckCircle2, Clock3, ImagePlus, MapPin, MessageCircle, ShieldCheck, Star, Timer, WalletCards } from "lucide-react";
import { Brand } from "@/components/Brand";
import { categories, formatRub, masters } from "@/lib/mock-data";

const steps = [
  { icon: Camera, title: "Категория и фото", text: "Выберите тип работы и прикрепите фото проблемы." },
  { icon: MapPin, title: "Адрес и бюджет", text: "Укажите район, удобное время и желаемую цену." },
  { icon: MessageCircle, title: "Отклики рядом", text: "Мастера предлагают время и стоимость, вы выбираете лучшего." },
];

export default function HomePage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Brand />
        <nav>
          <Link href="/product">Продукт</Link>
          <Link href="/design">Дизайн-проект</Link>
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
            <span className="badge">Цифровой помощник для дома</span>
            <h1>Что нужно сделать дома?</h1>
            <p className="lead">
              Опишите проблему, добавьте фото и получите предложения от мастеров рядом.
              Без доски объявлений, долгого поиска и лишних действий.
            </p>
            <div className="hero-actions">
              <Link className="primary-btn" href="/product">Открыть продукт <ArrowRight size={18} /></Link>
              <Link className="secondary-btn" href="/master/requests">Я мастер</Link>
            </div>
            <div className="quick-flow" aria-label="Создание заявки менее чем за 30 секунд">
              {["Категория", "Фото", "Описание", "Адрес", "Бюджет", "Публикация"].map((item, index) => (
                <span key={item}><b>{index + 1}</b>{item}</span>
              ))}
            </div>
          </div>
          <div className="hero-card">
            <div className="work-preview">
              <div className="preview-top">
                <div>
                  <span className="pill">Сантехника</span>
                  <h3>Течёт кран на кухне</h3>
                </div>
                <span className="live">3 предложения</span>
              </div>
              <Image src="/uploads/faucet-result.jpg" width={900} height={520} alt="Установка кухонного крана" priority />
              <div className="preview-row">
                <span className="muted"><MapPin size={15} /> Хамовники</span>
                <span className="muted"><Clock3 size={15} /> Сегодня</span>
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
          <span className="badge">Минимум действий</span>
          <h2>Заявка быстрее, чем звонок мастеру</h2>
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
          <span className="badge badge-dark">Design System</span>
          <h2>Спокойный интерфейс без визуального шума</h2>
          <div className="grid-3">
            <article>
              <WalletCards size={34} />
              <h3>Чистая модель</h3>
              <p className="muted">Понятные условия, видимая цена и прозрачный выбор мастера.</p>
            </article>
            <article>
              <ShieldCheck size={34} />
              <h3>Доверие</h3>
              <p className="muted">Рейтинг, история работ, статусы и отзывы после каждого заказа.</p>
            </article>
            <article>
              <CheckCircle2 size={34} />
              <h3>Система на будущее</h3>
              <p className="muted">Готово для гарантий, документов мастера, push-уведомлений и оплат.</p>
            </article>
          </div>
        </section>

        <section className="section">
          <span className="badge">Категории</span>
          <h2>Популярные категории</h2>
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

        <section className="section">
          <span className="badge">UI Kit</span>
          <h2>Компоненты продукта</h2>
          <div className="ui-kit-grid">
            <article className="card">
              <h3>Button</h3>
              <div className="hero-actions"><Link className="primary-btn" href="/client/requests/new">Primary</Link><Link className="secondary-btn" href="/how-it-works">Secondary</Link></div>
            </article>
            <article className="card">
              <h3>Upload</h3>
              <div className="upload-card"><ImagePlus size={22} /> Добавить фото</div>
            </article>
            <article className="card">
              <h3>Status Badge</h3>
              <div className="hero-actions"><span className="status-badge success">Свободен сейчас</span><span className="status-badge warning">Срочно</span></div>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
