import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

import { PublicHeader } from "./public-header";

const clauses = [
  { n: "п. 1", label: "Предмет заказа", value: "Течёт смеситель", note: "Кухня, соединение под раковиной" },
  { n: "п. 2", label: "Исполнитель", value: "Илья Р.", note: "Личность подтверждена вручную, рейтинг 4.9" },
  {
    n: "п. 3",
    label: "Адрес",
    value: "Передаётся только после выбора",
    note: "До этого момента виден лишь район",
  },
  {
    n: "п. 4",
    label: "Сумма к оплате",
    value: "2 500 ₽",
    note: "Изменение возможно только с вашего согласия",
    price: true,
  },
];

const stages = [
  { title: "Опишите задачу", text: "Фото, район, время и ваша цена." },
  { title: "Получите отклики", text: "До трёх мастеров вашей категории и района." },
  { title: "Выберите мастера", text: "Профиль, рейтинг, история работ. Адрес откроется только ему." },
  { title: "Примите работу", text: "Подтвердите результат и оцените мастера." },
];

const terms = [
  {
    n: "ст. 1",
    title: "Цена фиксируется заранее.",
    text: "Мастер принимает вашу сумму или отвечает встречной до выезда, а не после.",
  },
  {
    n: "ст. 2",
    title: "Адрес получает только выбранный мастер.",
    text: "Остальные участники видят лишь район и категорию работ.",
  },
  {
    n: "ст. 3",
    title: "Отзыв ставится после закрытия заказа.",
    text: "Купить оценку или место в выдаче нельзя, только факт выполненной работы.",
  },
];

const trust = [
  "Личность мастера проверяет модератор до первого заказа",
  "Доплаты на месте не предусмотрены условиями сервиса",
  "История заказов и отзывов открыта в профиле мастера",
];

const masterPoints = [
  "Заказы только по вашим категориям и районам",
  "Без покупки лидов и платного продвижения",
  "Принимайте цену клиента или предлагайте свою",
  "Выключайте приём заказов, когда не готовы",
];

export function LandingPage() {
  return (
    <div className="ak-page">
      <PublicHeader />

      <main>
        <section className="ak-hero">
          <div className="ak-wrap">
            <h1>Цена в заказе, а не на словах</h1>
            <p className="ak-lead">
              Вы называете свою цену. Подходящие мастера отвечают своей. Вы выбираете, кто приедет, и только тогда он
              видит ваш адрес. На месте сумма не меняется без вашего согласия.
            </p>
            <div className="ak-actions">
              <Link className="ak-btn ak-btn--primary" href="/register?role=CLIENT">
                Создать заказ
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="ak-btn ak-btn--ghost" href="/register?role=MASTER">
                Работать мастером
              </Link>
            </div>

            <div className="ak-doc" role="img" aria-label="Пример заказа: течёт смеситель на Тверском, исполнитель Илья Р., сумма 2 500 рублей, заказчик подтвердил сумму">
              <div className="ak-doc__head">
                <div>
                  <h2>Заказ № 4417</h2>
                  <p>Пример · Тверской район</p>
                </div>
                <div className="ak-seal" aria-hidden="true">
                  <b>
                    ЛИЧНОСТЬ
                    <br />
                    ПРОВЕРЕНА
                  </b>
                </div>
              </div>
              <div className="ak-clauses">
                {clauses.map((clause) => (
                  <div className={`ak-clause${clause.price ? " ak-clause--price" : ""}`} key={clause.n}>
                    <span className="ak-clause__n">{clause.n}</span>
                    <span className="ak-clause__body">
                      <span className="ak-clause__label">{clause.label}</span>
                      <span className="ak-clause__value">{clause.value}</span>
                      <small>{clause.note}</small>
                    </span>
                  </div>
                ))}
              </div>
              <div className="ak-doc__sign">
                <div>
                  <span>ЗАКАЗЧИК</span>
                  <b className="ak-ok">Подтвердил сумму</b>
                </div>
                <div>
                  <span>МАСТЕР</span>
                  <b className="ak-wait">Ожидает приёмки работ</b>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="ak-section" id="how-it-works">
          <div className="ak-wrap">
            <h2>Как это работает</h2>
            <ol className="ak-list ak-list--steps">
              {stages.map(({ title, text }, index) => (
                <li key={title}>
                  <span className="ak-list__num">{String(index + 1).padStart(2, "0")}</span>
                  <p>
                    <b>{title}.</b> {text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="ak-section" id="terms">
          <div className="ak-wrap">
            <h2>Три условия, которые нельзя обойти</h2>
            <ul className="ak-list">
              {terms.map(({ n, title, text }) => (
                <li key={n}>
                  <span className="ak-list__num">{n}</span>
                  <p>
                    <b>{title}</b> {text}
                  </p>
                </li>
              ))}
            </ul>
            <ul className="ak-trust">
              {trust.map((item) => (
                <li key={item}>
                  <span aria-hidden="true">
                    <Check size={11} strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="ak-section" id="for-masters">
          <div className="ak-wrap">
            <h2>Мастерам</h2>
            <p className="ak-lead ak-lead--sm">Заказы по вашему району и цене, без покупки лидов и платного места в выдаче.</p>
            <ul className="ak-bullets">
              {masterPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <Link className="ak-btn ak-btn--ghost" href="/register?role=MASTER">
              Работать мастером
            </Link>
          </div>
        </section>

        <section className="ak-final">
          <div className="ak-wrap">
            <h2>Расскажите, что сломалось</h2>
            <p>Заказ займёт около минуты.</p>
            <div className="ak-actions">
              <Link className="ak-btn ak-btn--primary" href="/register?role=CLIENT">
                Создать заказ
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="ak-btn ak-btn--ghost" href="/register?role=MASTER">
                Работать мастером
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="ak-footer">
        <div className="ak-wrap ak-footer__grid">
          <span>МАСТЕР РЯДОМ · ЦЕНА ИЗВЕСТНА ДО ВЫЕЗДА</span>
          <nav aria-label="Разделы для пользователей">
            <Link href="/register?role=CLIENT">Создать заказ</Link>
            <Link href="/register?role=MASTER">Работать мастером</Link>
            <Link href="/login">Войти</Link>
          </nav>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
