import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  CircleDollarSign,
  Clock3,
  MapPin,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Brand } from "./brand";
import { PublicHeader } from "./public-header";

const benefits = [
  {
    icon: BadgeCheck,
    title: "Прозрачные профили",
    text: "Вы видите историю, рейтинг и фактический статус подтверждения личности.",
    accent: "mint",
  },
  {
    icon: CircleDollarSign,
    title: "Цена заранее",
    text: "Вы предлагаете цену. Мастер принимает её или предлагает свою.",
    accent: "peach",
  },
  {
    icon: Clock3,
    title: "Отклики по задаче",
    text: "Подходящие мастера получают заказ и сами решают, готовы ли предложить условия.",
    accent: "blue",
  },
  {
    icon: UserCheck,
    title: "Вы знаете, кто приедет",
    text: "Вы сами выбираете конкретного мастера.",
    accent: "lilac",
  },
];

const steps = [
  "Создайте заказ",
  "Получите предложения",
  "Изучите профили",
  "Выберите мастера",
  "Мастер выполнит работу",
  "Оцените результат",
];

const masterBenefits = [
  "Без покупки лидов",
  "Прозрачные условия",
  "Можно принять цену клиента",
  "Можно предложить свою",
  "Собственная репутация",
  "История выполненных заказов",
];

const reviews = [
  {
    text: "Удобно, что я сначала увидела отзывы и цены, а уже потом выбрала мастера. Никаких неожиданных условий.",
    name: "Мария",
    detail: "Ремонт смесителя",
  },
  {
    text: "Получил три предложения за короткое время. Выбрал мастера с хорошей историей — всё сделал аккуратно.",
    name: "Алексей",
    detail: "Установка светильника",
  },
  {
    text: "Беру только те заказы, которые подходят по району и цене. Можно спокойно планировать рабочий день.",
    name: "Сергей",
    detail: "Мастер по бытовому ремонту",
  },
];

const faqs = [
  {
    question: "Как проверяются мастера?",
    answer:
      "Перед началом работы мастер заполняет профиль и проходит подтверждение личности. В профиле видны статус проверки, история заказов и отзывы клиентов.",
  },
  {
    question: "Кто устанавливает цену?",
    answer:
      "Вы указываете желаемую цену при создании заказа. Мастер может принять её или отправить встречное предложение — окончательное решение всегда за вами.",
  },
  {
    question: "Когда мастер увидит точный адрес?",
    answer:
      "До выбора мастер видит только примерный район. Точный адрес становится доступен только тому мастеру, которого вы назначили на заказ.",
  },
  {
    question: "Можно вызвать мастера срочно?",
    answer:
      "Да. Отметьте заказ как срочный, и его увидят подходящие мастера, которые сейчас находятся онлайн и работают в вашем районе.",
  },
  {
    question: "Как начать получать заказы?",
    answer:
      "Зарегистрируйтесь как мастер, заполните профиль, выберите категории и районы работы, затем пройдите подтверждение личности.",
  },
];

export function LandingPage() {
  return (
    <div className="landing-page">
      <PublicHeader />

      <main>
        <section className="hero">
          <div className="container hero__grid">
            <div className="hero__content">
              <div className="eyebrow">
                <Sparkles size={16} aria-hidden="true" />
                Надёжная помощь рядом
              </div>
              <h1>
                Нужен мастер?
                <span>Сравните условия и выберите сами</span>
              </h1>
              <p className="hero__lead">
                Опишите задачу, дождитесь откликов и выберите мастера по цене, профилю и истории работ.
              </p>
              <div className="hero__actions">
                <Link className="button button--primary button--large" href="/register?role=CLIENT">
                  Найти мастера
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <Link className="button button--secondary button--large" href="/register?role=MASTER">
                  Стать мастером
                </Link>
              </div>
              <ul className="hero__trust" aria-label="Преимущества сервиса">
                <li><ShieldCheck size={18} /> Проверка личности</li>
                <li><Star size={18} /> Профили и отзывы</li>
                <li><MapPin size={18} /> Мастера рядом</li>
              </ul>
            </div>

            <div className="hero__visual" aria-label="Клиент выбирает проверенного мастера">
              <div className="hero__visual-card">
                <Image
                  src="/illustrations/hero-editorial.png"
                  alt="Клиент выбирает бытовую услугу в приложении"
                  width={1373}
                  height={1146}
                  priority
                />
              </div>
              <div className="floating-card floating-card--top">
                <span className="floating-card__icon"><BadgeCheck size={18} /></span>
                <span><strong>Личность подтверждена</strong><small>Статус указан в профиле</small></span>
              </div>
              <div className="floating-card floating-card--bottom">
                <div className="avatar-stack" aria-hidden="true">
                  <span>АК</span><span>МП</span><span>СВ</span>
                </div>
                <span><strong>3 предложения</strong><small>Выберите подходящего</small></span>
              </div>
            </div>
          </div>
        </section>

        <section className="section section--white" id="benefits">
          <div className="container">
            <div className="section-heading section-heading--center">
              <span className="section-kicker">Главное — ваш выбор</span>
              <h2>Помощь без неприятных сюрпризов</h2>
              <p>Сравнивайте условия и выбирайте мастера, которому готовы доверить задачу.</p>
            </div>
            <div className="benefits-grid">
              {benefits.map(({ icon: Icon, title, text, accent }) => (
                <article className="benefit-card" key={title}>
                  <span className={`feature-icon feature-icon--${accent}`}><Icon size={25} /></span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section how" id="how-it-works">
          <div className="container">
            <div className="section-heading">
              <span className="section-kicker">Как это работает</span>
              <h2>От задачи до результата — шесть понятных шагов</h2>
            </div>
            <ol className="steps-grid">
              {steps.map((step, index) => (
                <li key={step}>
                  <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{step}</h3>
                    <p>{[
                      "Добавьте фото, описание, адрес и удобное время.",
                      "Подходящие мастера откликнутся на ваш заказ.",
                      "Сравните опыт, рейтинг, отзывы и условия.",
                      "Назначьте того, кто подходит именно вам.",
                      "Следите за статусом заказа в личном кабинете.",
                      "Подтвердите выполнение и оставьте честный отзыв.",
                    ][index]}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section section--white" id="for-clients">
          <div className="container client-promo">
            <div className="client-promo__panel">
              <span className="mini-badge"><CalendarClock size={16} /> Обычный или срочный заказ</span>
              <div className="client-promo__task">
                <span className="client-promo__task-icon"><Wrench size={24} /></span>
                <div><strong>Починить дверную ручку</strong><small>Сегодня · после 18:00</small></div>
                <span className="status-pill">Идёт поиск</span>
              </div>
              <div className="client-promo__offers">
                {["Илья Р.", "Виктор С.", "Денис М."].map((name, index) => (
                  <div key={name}>
                    <span className="offer-avatar">{name.slice(0, 1)}</span>
                    <span><strong>{name}</strong><small><Star size={12} fill="currentColor" /> {(4.9 - index * 0.1).toFixed(1)} · Проверен</small></span>
                    <b>{["2 500 ₽", "2 800 ₽", "3 000 ₽"][index]}</b>
                  </div>
                ))}
              </div>
            </div>
            <div className="client-promo__content">
              <span className="section-kicker">Для клиентов</span>
              <h2>Вы управляете заказом на каждом этапе</h2>
              <p>Опишите задачу один раз — дальше сравнивайте только подходящие предложения.</p>
              <ul className="check-list">
                <li><Check size={17} /> Точный адрес скрыт до выбора мастера</li>
                <li><Check size={17} /> Цена и условия видны до назначения</li>
                <li><Check size={17} /> Все статусы сохраняются в истории</li>
              </ul>
              <Link className="text-link" href="/register?role=CLIENT">
                Создать первый заказ <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>

        <section className="section masters" id="for-masters">
          <div className="container masters__grid">
            <div className="masters__content">
              <span className="section-kicker section-kicker--light">Для мастеров</span>
              <h2>Получайте подходящие заказы в своём районе</h2>
              <p>Выбирайте удобные задачи, заранее договаривайтесь о цене и развивайте собственную репутацию.</p>
              <ul className="masters__benefits">
                {masterBenefits.map((item) => (
                  <li key={item}><span><Check size={15} /></span>{item}</li>
                ))}
              </ul>
              <Link className="button button--light button--large" href="/register?role=MASTER">
                Стать мастером <ArrowRight size={18} />
              </Link>
            </div>
            <div className="masters__visual">
              <Image
                src="/illustrations/master-editorial.png"
                alt="Мастер получает подходящий заказ рядом с домом"
                width={1373}
                height={1146}
              />
            </div>
          </div>
        </section>

        <section className="section section--white" id="reviews">
          <div className="container">
            <div className="section-heading section-heading--center">
              <span className="section-kicker">Как будут выглядеть отзывы</span>
              <h2>Отзыв можно оставить только после заказа</h2>
              <p>Ниже — демонстрационные примеры интерфейса, а не отзывы реальных пользователей сервиса.</p>
            </div>
            <div className="reviews-grid">
              {reviews.map((review) => (
                <article className="review-card" key={review.name}>
                  <span className="review-card__demo-label">Демонстрационный пример</span>
                  <Quote size={25} aria-hidden="true" />
                  <p>«{review.text}»</p>
                  <div>
                    <span className="review-avatar">{review.name.slice(0, 1)}</span>
                    <span><strong>{review.name}</strong><small>{review.detail}</small></span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section faq" id="faq">
          <div className="container faq__grid">
            <div className="section-heading">
              <span className="section-kicker">FAQ</span>
              <h2>Частые вопросы</h2>
              <p>Не нашли ответ? Напишите нам — поможем разобраться.</p>
            </div>
            <div className="faq__list">
              {faqs.map((faq) => (
                <details key={faq.question}>
                  <summary>{faq.question}<span aria-hidden="true">+</span></summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="final-cta">
          <div className="container final-cta__inner">
            <div>
              <span className="section-kicker section-kicker--light">Опишите задачу</span>
              <h2>Расскажите, что нужно сделать</h2>
              <p>Добавьте фото, адрес, удобное время и желаемую цену.</p>
            </div>
            <div className="final-cta__actions">
              <Link className="button button--light button--large" href="/register?role=CLIENT">Найти мастера</Link>
              <Link className="button button--outline-light button--large" href="/register?role=MASTER">Стать мастером</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer__grid">
          <div><Brand inverse /><p>Надёжные бытовые мастера рядом с вами.</p></div>
          <nav aria-label="Навигация в подвале">
            <strong>Сервис</strong>
            <Link href="#how-it-works">Как это работает</Link>
            <Link href="#benefits">Преимущества</Link>
            <Link href="#faq">FAQ</Link>
          </nav>
          <nav aria-label="Разделы для пользователей">
            <strong>Пользователям</strong>
            <Link href="/register?role=CLIENT">Найти мастера</Link>
            <Link href="/register?role=MASTER">Стать мастером</Link>
            <Link href="/login">Войти</Link>
          </nav>
        </div>
        <div className="container footer__bottom"><span>© 2026 Мастер рядом</span><span>Помощь начинается с доверия</span></div>
      </footer>
    </div>
  );
}
