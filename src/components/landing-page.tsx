import { ArrowRight, Check, EyeOff, ReceiptText, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { PublicHeader } from "./public-header";

const facts = [
  { label: "Личность", value: "Мастер проходит подтверждение до первого заказа" },
  { label: "Цена", value: "Согласована до выезда, без доплат на месте" },
  { label: "Адрес", value: "Открывается только выбранному мастеру" },
];

const stages = [
  { title: "Опишите задачу", text: "Фото, район, время и ваша цена." },
  { title: "Получите отклики", text: "До трёх мастеров вашей категории и района." },
  { title: "Выберите мастера", text: "Профиль, рейтинг, история работ. Адрес откроется только ему." },
  { title: "Примите работу", text: "Подтвердите результат и оцените мастера." },
];

const terms = [
  {
    icon: ReceiptText,
    title: "Цену называете вы",
    text: "Вы ставите сумму. Мастер принимает или предлагает свою.",
    rows: [
      ["Ваша цена", "2 500 ₽"],
      ["Встречные", "до 3"],
      ["Доплаты на месте", "нет"],
    ],
  },
  {
    icon: EyeOff,
    title: "Адрес скрыт до выбора",
    text: "До выбора мастер видит только район.",
    rows: [
      ["До выбора", "район"],
      ["После выбора", "полный адрес"],
      ["Остальным мастерам", "закрыт"],
    ],
  },
  {
    icon: Star,
    title: "Отзыв только после заказа",
    text: "Оценку ставит тот, кто принял работу.",
    rows: [
      ["Источник оценки", "заказ"],
      ["Аноним", "нет"],
      ["Платное место", "нет"],
    ],
  },
];

const masterPoints = [
  "Заказы только по вашим категориям и районам",
  "Без покупки лидов и платного продвижения",
  "Принимайте цену клиента или предлагайте свою",
  "Выключайте приём заказов, когда не готовы",
];

const offers = [
  { name: "Илья Р.", initials: "ИР", rating: "4.9", sum: "2 500 ₽", picked: true },
  { name: "Виктор С.", initials: "ВС", rating: "4.8", sum: "2 800 ₽", picked: false },
  { name: "Денис М.", initials: "ДМ", rating: "4.9", sum: "3 000 ₽", picked: false },
];

export function LandingPage() {
  return (
    <div className="nz-page">
      <PublicHeader />

      <main>
        <section className="nz-hero">
          <div className="nz-wrap nz-hero__grid">
            <div>
              <span className="nz-field nz-hero__eyebrow">Бытовой ремонт по согласованной цене</span>
              <h1>
                Цена известна <em>до выезда</em>
              </h1>
              <p className="nz-hero__lead">
                Вы называете свою цену. Подходящие мастера отвечают своей. Вы выбираете, кто приедет — и только
                тогда он видит ваш адрес.
              </p>
              <div className="nz-hero__actions">
                <Link className="nz-btn nz-btn--primary" href="/register?role=CLIENT">
                  Создать заказ
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
                <Link className="nz-btn nz-btn--outline" href="/register?role=MASTER">
                  Работать мастером
                </Link>
              </div>

              <dl className="nz-facts">
                {facts.map(({ label, value }) => (
                  <div key={label}>
                    <dt className="nz-field">{label}</dt>
                    <dd style={{ margin: 0 }}>
                      <p>{value}</p>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="nz-ticket" role="img" aria-label="Пример наряд-заказа: течёт смеситель на Тверском, три предложения мастеров от 2 500 до 3 000 рублей, выбран Илья Р. за 2 500 рублей">
              <div className="nz-ticket__head">
                <span className="nz-field">Наряд-заказ</span>
                <span className="nz-ticket__no">№ 4417</span>
              </div>

              <div className="nz-ticket__body">
                <div className="nz-ticket__row nz-anim" style={{ animationDelay: "150ms" }}>
                  <span className="nz-field">Задача</span>
                  <b>
                    Течёт смеситель
                    <span>Кухня, соединение под раковиной</span>
                  </b>
                </div>
                <div className="nz-ticket__row nz-anim" style={{ animationDelay: "450ms" }}>
                  <span className="nz-field">Район</span>
                  <b>Тверской</b>
                </div>
                <div className="nz-ticket__row nz-anim" style={{ animationDelay: "750ms" }}>
                  <span className="nz-field">Когда</span>
                  <b>Сегодня, после 18:00</b>
                </div>
                <div className="nz-ticket__row nz-anim" style={{ animationDelay: "1050ms" }}>
                  <span className="nz-field">Ваша цена</span>
                  <b className="nz-ticket__price">2 500 ₽</b>
                </div>

                <div className="nz-ticket__rule nz-anim" style={{ animationDelay: "1300ms" }}>
                  <span className="nz-field">Предложения · 3</span>
                </div>

                {offers.map((offer, index) => (
                  <div
                    className={`nz-offer nz-anim${offer.picked ? " nz-offer--picked" : ""}`}
                    key={offer.name}
                    style={{ animationDelay: `${1450 + index * 260}ms` }}
                  >
                    <span className="nz-offer__avatar">{offer.initials}</span>
                    <span>
                      <span className="nz-offer__who">{offer.name}</span>
                      <span className="nz-offer__meta">
                        <Star size={11} fill="currentColor" aria-hidden="true" />
                        {offer.rating} · Личность подтверждена
                      </span>
                    </span>
                    <span className="nz-offer__sum">{offer.sum}</span>
                  </div>
                ))}
              </div>

              <div className="nz-ticket__stamp" aria-hidden="true">
                <b>ЦЕНА СОГЛАСОВАНА</b>
                <span>ДО ВЫЕЗДА МАСТЕРА</span>
              </div>
            </div>
          </div>
        </section>

        <section className="nz-section nz-section--card" id="how-it-works">
          <div className="nz-wrap">
            <div className="nz-section__head">
              <h2>Как это работает</h2>
            </div>
            <ol className="nz-stages">
              {stages.map(({ title, text }, index) => (
                <li key={title}>
                  <span className="nz-stages__no">{String(index + 1).padStart(2, "0")}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="nz-section" id="terms">
          <div className="nz-wrap">
            <div className="nz-section__head">
              <h2>Три правила</h2>
            </div>
            <div className="nz-terms">
              {terms.map(({ icon: Icon, title, text, rows }) => (
                <article className="nz-term" key={title}>
                  <span className="nz-term__icon">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <dl>
                    {rows.map(([label, value]) => (
                      <div key={label}>
                        <dt className="nz-field">{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="nz-section nz-masters" id="for-masters">
          <div className="nz-wrap nz-masters__grid">
            <div>
              <div className="nz-section__head" style={{ marginBottom: 34 }}>
                <span className="nz-field">Мастерам</span>
                <h2>Заказы по вашему району и цене</h2>
              </div>
              <ul className="nz-masters__list">
                {masterPoints.map((point) => (
                  <li key={point}>
                    <span aria-hidden="true">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
              <div className="nz-masters__cta">
                <Link className="nz-btn nz-btn--onsteel" href="/register?role=MASTER">
                  Начать работать
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div className="nz-masters__visual">
              <Image
                src="/illustrations/master-editorial.png"
                alt="Мастер разбирает заказ рядом с домом"
                width={1373}
                height={1146}
              />
            </div>
          </div>
        </section>

        <section className="nz-final">
          <div className="nz-wrap nz-final__inner">
            <div>
              <h2>Расскажите, что сломалось</h2>
              <p>Заказ займёт около минуты.</p>
            </div>
            <div className="nz-final__actions">
              <Link className="nz-btn nz-btn--onsteel" href="/register?role=CLIENT">
                Создать заказ
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="nz-btn nz-btn--onsteel-outline" href="/register?role=MASTER">
                Работать мастером
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="nz-footer">
        <div className="nz-wrap">
          <div className="nz-footer__grid">
            <div>
              <span className="nz-logo">
                <span className="nz-logo__mark" aria-hidden="true">
                  М
                </span>
                Мастер рядом
              </span>
              <p>Цена известна до выезда.</p>
            </div>
            <nav aria-label="О сервисе">
              <strong>Сервис</strong>
              <Link href="#how-it-works">Как это работает</Link>
              <Link href="#terms">Условия</Link>
              <Link href="#for-masters">Мастерам</Link>
            </nav>
            <nav aria-label="Разделы для пользователей">
              <strong>Пользователям</strong>
              <Link href="/register?role=CLIENT">Создать заказ</Link>
              <Link href="/register?role=MASTER">Работать мастером</Link>
              <Link href="/login">Войти</Link>
            </nav>
          </div>
          <div className="nz-footer__bottom">
            <span>© 2026 МАСТЕР РЯДОМ</span>
            <span>АДРЕС ОТКРЫВАЕТСЯ ТОЛЬКО ВЫБРАННОМУ МАСТЕРУ</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
