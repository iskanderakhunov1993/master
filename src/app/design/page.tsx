import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  CheckCircle2,
  Clock3,
  ImagePlus,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Star,
  UserRoundCheck,
} from "lucide-react";
import { Brand } from "@/components/Brand";
import { categories, formatRub, masters } from "@/lib/mock-data";

const principles = [
  {
    title: "Не искать мастера",
    text: "Пользователь приходит решить бытовую проблему. Интерфейс не спрашивает лишнего и ведёт к заявке.",
  },
  {
    title: "30 секунд до публикации",
    text: "Категория, фото, описание, адрес, бюджет. Всё остальное можно уточнить после отклика.",
  },
  {
    title: "Доверие без давления",
    text: "У мастера публичное портфолио и отзывы. У клиента мягкие сигналы надёжности без публичного рейтинга.",
  },
];

const colors = [
  ["Primary", "#2563EB"],
  ["Hover", "#1D4ED8"],
  ["Success", "#22C55E"],
  ["Warning", "#F59E0B"],
  ["Danger", "#EF4444"],
  ["Background", "#F8FAFC"],
  ["Card", "#FFFFFF"],
  ["Border", "#E5E7EB"],
  ["Text", "#0F172A"],
  ["Secondary", "#64748B"],
];

const typeScale = [
  ["Display", "40–72", "Hero, главный вопрос"],
  ["Heading", "32–48", "Разделы и страницы"],
  ["Section", "24", "Карточки и группы"],
  ["Title", "20", "Карточки заявок"],
  ["Body", "16", "Основной текст"],
  ["Caption", "14", "Метаданные"],
  ["Small", "12", "Бейджи"],
];

const requestSteps = ["Категория", "Фото", "Описание", "Адрес", "Бюджет", "Опубликовать"];

export default function DesignPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Brand />
        <nav>
          <Link href="/">Главная</Link>
          <Link href="/client/requests/new">Заявка</Link>
          <Link href="/master/requests">Мастер</Link>
        </nav>
        <Link className="nav-cta" href="/client/requests/new">
          Создать заявку <ArrowRight size={16} />
        </Link>
      </header>

      <main>
        <section className="design-hero">
          <div>
            <span className="badge">Design Project · HomeFix</span>
            <h1>Сервис, который не заставляет думать.</h1>
            <p className="lead">
              Дизайн-концепция для MVP маркетплейса бытовых услуг: спокойная,
              чистая, mobile-first система, где клиент создаёт заявку за 30 секунд,
              а мастер видит только релевантные заказы.
            </p>
            <div className="hero-actions">
              <Link className="primary-btn" href="/client/requests/new">Открыть сценарий клиента</Link>
              <Link className="secondary-btn" href="/master/requests">Сценарий мастера</Link>
            </div>
          </div>
          <div className="design-phone">
            <div className="phone-shell">
              <div className="phone-top" />
              <span className="badge">Что нужно сделать дома?</span>
              <div className="phone-input">Поменять кран на кухне</div>
              <div className="upload-card"><ImagePlus size={20} /> Добавить фото</div>
              <div className="phone-row"><span>Бюджет</span><strong>{formatRub(1500)}</strong></div>
              <div className="phone-row"><span>Адрес</span><strong>Хамовники</strong></div>
              <Link className="primary-btn" href="/client/requests/new">Опубликовать</Link>
            </div>
          </div>
        </section>

        <section className="section">
          <span className="badge">Moodboard</span>
          <h2>Воздух, доверие, скорость</h2>
          <div className="moodboard-grid">
            <article><strong>Apple</strong><span>крупная типографика, ясное действие</span></article>
            <article><strong>Airbnb</strong><span>тёплое доверие через карточки и людей</span></article>
            <article><strong>Linear</strong><span>чистая структура, быстрые состояния</span></article>
            <article><strong>Stripe</strong><span>системность, точность, аккуратные детали</span></article>
          </div>
        </section>

        <section className="section">
          <span className="badge">Product Principles</span>
          <h2>Что оставляем в продукте</h2>
          <div className="grid-3">
            {principles.map((item) => (
              <article className="card" key={item.title}>
                <span className="card-icon"><CheckCircle2 size={24} /></span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <span className="badge">Color System</span>
          <h2>Спокойная палитра без визуального шума</h2>
          <div className="color-grid">
            {colors.map(([name, value]) => (
              <article className="color-card" key={name}>
                <span style={{ backgroundColor: value }} />
                <strong>{name}</strong>
                <code>{value}</code>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <span className="badge">Typography</span>
          <h2>Inter, крупно и спокойно</h2>
          <div className="type-table">
            {typeScale.map(([name, size, usage]) => (
              <div className="type-row" key={name}>
                <strong>{name}</strong>
                <span>{size}px</span>
                <p>{usage}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="dark-section">
          <span className="badge badge-dark">Wireframes</span>
          <h2>Минимальный путь клиента и мастера</h2>
          <div className="wireframe-grid">
            <article className="wireframe">
              <span>Client</span>
              <h3>Вызвать мастера</h3>
              <div className="wire-line wide" />
              <div className="wire-line" />
              <div className="wire-row">
                <div />
                <div />
              </div>
              <div className="wire-button" />
            </article>
            <article className="wireframe">
              <span>Master</span>
              <h3>Новая заявка</h3>
              <div className="wire-card" />
              <div className="wire-card" />
              <div className="wire-actions"><i /><i /></div>
            </article>
            <article className="wireframe">
              <span>Order</span>
              <h3>Чат и статус</h3>
              <div className="wire-chat left" />
              <div className="wire-chat right" />
              <div className="wire-button" />
            </article>
          </div>
        </section>

        <section className="section">
          <span className="badge">High-Fidelity Flow</span>
          <h2>Заявка за 30 секунд</h2>
          <div className="flow-strip">
            {requestSteps.map((step, index) => (
              <article key={step}>
                <b>{index + 1}</b>
                <span>{step}</span>
              </article>
            ))}
          </div>
          <div className="hifi-grid">
            <article className="hifi-card">
              <span className="badge">Клиент</span>
              <h3>Поменять кран</h3>
              <p>Фото, адрес, бюджет 1500 ₽, срочно сегодня.</p>
              <div className="request-meta">
                <span><Camera size={15} /> 2 фото</span>
                <span><MapPin size={15} /> Хамовники</span>
                <span><Clock3 size={15} /> Сегодня</span>
              </div>
              <Link className="primary-btn" href="/client/requests/new">Вызвать мастера</Link>
            </article>
            <article className="hifi-card">
              <span className="badge">Мастер</span>
              <h3>Карточка заявки</h3>
              <p>Мастер видит только важное: что, где, когда, фото, цена, клиент подтверждён.</p>
              <div className="master-mini">
                <span><UserRoundCheck size={18} /> Клиент подтверждён</span>
                <span><ShieldCheck size={18} /> Без отмен</span>
              </div>
              <div className="hero-actions">
                <Link className="primary-btn" href="/master/requests/req-1">Принять</Link>
                <button className="secondary-btn">Отказаться</button>
              </div>
            </article>
          </div>
        </section>

        <section className="section">
          <span className="badge">Master Card</span>
          <h2>Доверие через портфолио</h2>
          <div className="master-card-grid">
            {masters.map((master) => (
              <article className="master-card" key={master.id}>
                <div className="master-avatar">{master.name.slice(0, 1)}</div>
                <div>
                  <h3>{master.name}</h3>
                  <p>{master.categories.join(" · ")}</p>
                </div>
                <div className="master-stats">
                  <span><Star size={15} fill="currentColor" /> {master.rating}</span>
                  <span>{master.completed} заказов</span>
                  <span className="status-badge success">Свободен сейчас</span>
                </div>
                <strong>{formatRub(master.price)}</strong>
                <Link className="primary-btn" href="/client/requests/req-1">Выбрать мастера</Link>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <span className="badge">UI Kit</span>
          <h2>Базовые компоненты MVP</h2>
          <div className="ui-kit-grid">
            <article className="card"><h3>Button</h3><div className="hero-actions"><button className="primary-btn">Primary</button><button className="secondary-btn">Secondary</button></div></article>
            <article className="card"><h3>Badge</h3><div className="hero-actions"><span className="status-badge success">Success</span><span className="status-badge warning">Warning</span></div></article>
            <article className="card"><h3>Chat Bubble</h3><div className="chat-box"><div className="message">Буду через 25 минут.</div><div className="message mine">Жду вас.</div></div></article>
          </div>
        </section>

        <section className="section">
          <span className="badge">Information Architecture</span>
          <h2>Что строим дальше</h2>
          <div className="ia-grid">
            <article><strong>Public</strong><span>/ · /login · /register · /design</span></article>
            <article><strong>Client</strong><span>dashboard · new request · order · history</span></article>
            <article><strong>Master</strong><span>dashboard · requests · jobs · profile</span></article>
            <article><strong>Trust</strong><span>reviews · portfolio · soft client signals</span></article>
          </div>
        </section>
      </main>
    </div>
  );
}
