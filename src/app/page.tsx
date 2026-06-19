import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  WalletCards,
} from "lucide-react";
import { Brand } from "@/components/Brand";
import { categories, formatRub, masters } from "@/lib/mock-data";

const popularProjects = [
  { title: "Сантехника", text: "Краны, сифоны, протечки, установка техники", price: 1500 },
  { title: "Сборка мебели", text: "Шкафы, кухни, комоды, рабочие места", price: 2500 },
  { title: "Электрика", text: "Розетки, светильники, автоматы, диагностика", price: 1800 },
  { title: "Выгул собак", text: "Быстрая помощь рядом с домом", price: 900 },
  { title: "Фитнес-тренер", text: "Тренировка дома или на площадке", price: 3000 },
  { title: "Уборка", text: "Поддерживающая, генеральная, после ремонта", price: 3500 },
];

const trustStats = [
  { value: "30 сек", label: "на создание заявки" },
  { value: "0%", label: "комиссии с заказа" },
  { value: "4.9", label: "цель по рейтингу мастеров" },
  { value: "24/7", label: "быстрые заявки рядом" },
];

const steps = [
  { icon: Camera, title: "Опишите задачу", text: "Категория, фото, адрес, время и желаемая цена в одном простом сценарии." },
  { icon: MessageCircle, title: "Получите отклики", text: "Мастер принимает условия или предлагает цену в чате, а вы решаете без давления." },
  { icon: CheckCircle2, title: "Закройте работу", text: "После выполнения остаются отзывы, рейтинг и история работ по дому." },
];

export default function HomePage() {
  return (
    <div className="landing thumb-landing">
      <header className="landing-nav thumb-nav">
        <Brand />
        <nav>
          <Link href="#projects">Услуги</Link>
          <Link href="#how">Как работает</Link>
          <Link href="#pros">Для мастеров</Link>
          <Link href="/login">Войти</Link>
        </nav>
        <Link className="nav-cta" href="/product">
          Создать заявку <ArrowRight size={16} />
        </Link>
      </header>

      <main>
        <section className="thumb-hero">
          <span className="badge"><Sparkles size={14} /> Быстрая помощь по дому</span>
          <h1>Найдите мастера рядом для любой задачи</h1>
          <p className="lead">
            Сантехник, сборщик мебели, выгул собаки или тренер. Опишите задачу,
            поставьте цену и отправьте заявку мастерам в вашем районе.
          </p>

          <div className="search-panel" aria-label="Быстрый поиск услуги">
            <label>
              <Search size={20} />
              <input placeholder="Что нужно сделать? Например: установить кран" defaultValue="" />
            </label>
            <label>
              <MapPin size={20} />
              <input placeholder="Город, район или адрес" defaultValue="Москва, Хамовники" />
            </label>
            <Link className="primary-btn" href="/product">Найти мастера</Link>
          </div>

          <div className="quick-services">
            {["Сантехник", "Электрик", "Сборка шкафа", "Уборка", "Выгул собак", "Фитнес"].map((service) => (
              <Link href="/product" key={service}>{service}</Link>
            ))}
          </div>
        </section>

        <section className="thumb-showcase">
          <div className="showcase-card main">
            <Image src="/uploads/faucet-result.jpg" width={900} height={520} alt="Мастер устанавливает кухонный кран" priority />
            <div>
              <span className="pill">Популярно сегодня</span>
              <h2>Поменять кран на кухне</h2>
              <p>3 мастера рядом готовы приехать сегодня. Клиент видит цену, рейтинг и комментарий до принятия.</p>
            </div>
          </div>
          <div className="showcase-stack">
            {masters.map((master) => (
              <article key={master.id}>
                <div className="master-avatar">{master.name[0]}</div>
                <div>
                  <strong>{master.name}</strong>
                  <span><Star size={13} fill="currentColor" /> {master.rating} · {master.completed} работ</span>
                </div>
                <b>{formatRub(master.price)}</b>
              </article>
            ))}
          </div>
        </section>

        <section className="section thumb-stats" aria-label="Ключевые преимущества">
          {trustStats.map((stat) => (
            <article key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </article>
          ))}
        </section>

        <section className="section" id="projects">
          <div className="section-heading-row">
            <div>
              <span className="badge">Популярные проекты</span>
              <h2>Выберите задачу и отправьте заявку</h2>
            </div>
            <Link className="secondary-btn" href="/product">Все категории <ArrowRight size={16} /></Link>
          </div>
          <div className="project-grid">
            {popularProjects.map((project) => (
              <Link className="project-card" href="/product" key={project.title}>
                <span>{project.title}</span>
                <p>{project.text}</p>
                <strong>от {formatRub(project.price)}</strong>
              </Link>
            ))}
          </div>
        </section>

        <section className="dark-section" id="how">
          <span className="badge badge-dark">Как это работает</span>
          <h2>Не каталог мастеров, а быстрый сценарий заказа</h2>
          <div className="grid-3">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <article key={step.title}>
                  <Icon size={34} />
                  <h3>{step.title}</h3>
                  <p className="muted">{step.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="section split-section" id="pros">
          <div>
            <span className="badge">Для мастеров</span>
            <h2>Платная подписка вместо комиссии с каждого заказа</h2>
            <p className="lead">
              Мастер получает релевантные заявки рядом, портфолио выполненных работ,
              рейтинг и отзывы. Мы не забираем процент с заказа, поэтому мотивация прозрачная.
            </p>
            <div className="hero-actions">
              <Link className="primary-btn" href="/product">Посмотреть кабинет мастера</Link>
              <Link className="secondary-btn" href="/register">Стать мастером</Link>
            </div>
          </div>
          <div className="pro-benefits">
            <article><Timer size={22} /><strong>Быстрый отклик</strong><span>Первый согласившийся мастер забирает заказ.</span></article>
            <article><WalletCards size={22} /><strong>Своя цена</strong><span>Можно принять бюджет или предложить условия в чате.</span></article>
            <article><ShieldCheck size={22} /><strong>Репутация</strong><span>Портфолио, рейтинг и отзывы копятся после каждой работы.</span></article>
          </div>
        </section>

        <section className="section">
          <span className="badge">Категории</span>
          <h2>Сервис закрывает бытовые и персональные задачи</h2>
          <div className="grid-3">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Link className="card" href="/product" key={category.slug}>
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
