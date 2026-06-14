import {
  ArrowRight,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Dog,
  Dumbbell,
  FileCheck2,
  Hammer,
  HeartHandshake,
  Home,
  ImagePlus,
  LayoutDashboard,
  MapPin,
  Menu,
  MessageCircle,
  PackageCheck,
  Paperclip,
  Play,
  Plus,
  Rocket,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Timer,
  TrendingUp,
  UploadCloud,
  UserRoundCheck,
  UsersRound,
  Video,
  WalletCards,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import workResult from "./assets/faucet-result.jpg";

type OrderStatus = "Выполняется" | "Завершён" | "Ожидает мастера";

type Order = {
  id: string;
  title: string;
  category: string;
  price: string;
  date: string;
  address: string;
  status: OrderStatus;
  master?: string;
  icon: typeof Wrench;
  tone: string;
};

const navItems = [
  { label: "Главная", icon: LayoutDashboard },
  { label: "Мои заказы", icon: PackageCheck, count: 3 },
  { label: "Сообщения", icon: MessageCircle, count: 2 },
  { label: "Избранные мастера", icon: HeartHandshake },
  { label: "Профиль и рейтинг", icon: CircleUserRound },
  { label: "Настройки", icon: Settings },
];

const categories = [
  { title: "Сантехника", icon: Wrench, tone: "peach" },
  { title: "Мебель", icon: Hammer, tone: "yellow" },
  { title: "Помощь с питомцами", icon: Dog, tone: "blue" },
  { title: "Фитнес и здоровье", icon: Dumbbell, tone: "mint" },
  { title: "Помощь по дому", icon: Home, tone: "lilac" },
  { title: "Другое", icon: Plus, tone: "gray" },
];

const masters = [
  {
    name: "Алексей С.",
    specialty: "Сантехник",
    rating: "4.96",
    reviews: 128,
    price: "4 500 ₽",
    eta: "через 25 мин",
    tone: "avatar-blue",
  },
  {
    name: "Михаил Р.",
    specialty: "Мастер на час",
    rating: "4.89",
    reviews: 86,
    price: "5 000 ₽",
    eta: "сегодня к 18:00",
    tone: "avatar-orange",
  },
  {
    name: "Денис К.",
    specialty: "Сантехник",
    rating: "4.82",
    reviews: 64,
    price: "4 200 ₽",
    eta: "завтра утром",
    tone: "avatar-green",
  },
];

const initialOrders: Order[] = [
  {
    id: "MG-2408",
    title: "Установить кухонный кран",
    category: "Сантехника",
    price: "4 500 ₽",
    date: "Сегодня, 16:30",
    address: "Хамовники, ул. Ефремова, 12",
    status: "Выполняется",
    master: "Алексей С.",
    icon: Wrench,
    tone: "peach",
  },
  {
    id: "MG-2391",
    title: "Собрать книжный шкаф",
    category: "Мебель",
    price: "3 200 ₽",
    date: "8 июня, 12:00",
    address: "Арбат, Большой Афанасьевский пер., 5",
    status: "Завершён",
    master: "Илья Н.",
    icon: Hammer,
    tone: "yellow",
  },
];

const statusClass: Record<OrderStatus, string> = {
  Выполняется: "status-progress",
  Завершён: "status-done",
  "Ожидает мастера": "status-waiting",
};

const landingBenefits = [
  {
    icon: Zap,
    title: "Быстрый отклик",
    text: "Заказ сразу получают свободные мастера нужной категории рядом с вами.",
  },
  {
    icon: WalletCards,
    title: "Без комиссии",
    text: "Никаких процентов с заказа. Прозрачная подписка и цена, о которой вы договорились.",
  },
  {
    icon: MessageCircle,
    title: "Цена обсуждается",
    text: "Мастер может предложить другую сумму, а вы решаете в чате до принятия заказа.",
  },
  {
    icon: ShieldCheck,
    title: "Рейтинг с двух сторон",
    text: "Заказчик и мастер обязательно оценивают друг друга после завершения работы.",
  },
];

const landingSteps = [
  {
    number: "01",
    icon: Camera,
    title: "Покажите задачу",
    text: "Выберите направление, добавьте описание, фото или короткое видео.",
  },
  {
    number: "02",
    icon: MapPin,
    title: "Укажите условия",
    text: "Отметьте район, удобное время и цену, которую готовы предложить.",
  },
  {
    number: "03",
    icon: UserRoundCheck,
    title: "Выберите мастера",
    text: "Сравните рейтинг, скорость и предложение. Примите лучший отклик.",
  },
];

const teamRoles = [
  { initials: "ПР", role: "Продукт", text: "Сценарии, в которых заказ закрывается быстро и без лишних шагов.", tone: "team-coral" },
  { initials: "UX", role: "Дизайн", text: "Понятный интерфейс для пользователей и мастеров любого возраста.", tone: "team-blue" },
  { initials: "IT", role: "Разработка", text: "Надёжная платформа, геопоиск, чат и уведомления в реальном времени.", tone: "team-yellow" },
  { initials: "24", role: "Забота", text: "Проверка спорных ситуаций, безопасность и поддержка сообщества.", tone: "team-green" },
];

function Landing({ onOpenApp }: { onOpenApp: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <div className="landing">
      <header className="landing-nav">
        <button className="landing-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <span className="brand-mark"><Wrench size={21} /></span>
          <span>Мастер<b>GO</b></span>
        </button>
        <nav className={menuOpen ? "landing-links open" : "landing-links"} aria-label="Навигация лендинга">
          <button onClick={() => scrollTo("how")}>Как это работает</button>
          <button onClick={() => scrollTo("benefits")}>Преимущества</button>
          <button onClick={() => scrollTo("categories")}>Услуги</button>
          <button onClick={() => scrollTo("team")}>Команда</button>
        </nav>
        <div className="landing-nav-actions">
          <button className="landing-login" onClick={onOpenApp}>Войти</button>
          <button className="landing-demo-button" onClick={onOpenApp}>
            Открыть демо <ArrowRight size={16} />
          </button>
        </div>
        <button className="landing-menu" onClick={() => setMenuOpen((value) => !value)} aria-label="Открыть меню">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      <main>
        <section className="landing-hero">
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />
          <div className="hero-copy">
            <div className="hero-badge"><Sparkles size={15} /> Сервис быстрых услуг рядом</div>
            <h1>Нужный мастер.<br /><em>В нужный момент.</em></h1>
            <p className="hero-lead">
              Опишите задачу, предложите цену и получите отклики от проверенных
              специалистов поблизости. Без комиссии и долгого поиска.
            </p>
            <div className="hero-actions">
              <button className="landing-primary" onClick={onOpenApp}>
                Разместить заказ <ArrowRight size={18} />
              </button>
              <button className="landing-secondary" onClick={() => scrollTo("how")}>
                <span><Play size={14} fill="currentColor" /></span> Как это работает
              </button>
            </div>
            <div className="hero-proof">
              <div className="proof-avatars">
                <span>АС</span><span>МР</span><span>ДК</span><span>+18</span>
              </div>
              <p><strong>Свободные мастера уже рядом</strong><span>Вы выбираете по рейтингу и условиям</span></p>
            </div>
          </div>

          <div className="hero-product">
            <div className="hero-product-grid" />
            <div className="floating-chip chip-secure"><ShieldCheck size={17} /> Безопасная сделка</div>
            <div className="floating-chip chip-speed"><Timer size={17} /> Отклик за минуты</div>
            <article className="request-preview">
              <div className="request-preview-head">
                <div>
                  <span className="preview-kicker">Новый заказ</span>
                  <h3>Установить кухонный кран</h3>
                </div>
                <span className="preview-live"><i /> Идёт поиск</span>
              </div>
              <img src={workResult} alt="Пример задачи по установке кухонного крана" />
              <div className="request-facts">
                <span><MapPin size={15} /> Хамовники · 3,2 км</span>
                <span><Clock3 size={15} /> Сегодня</span>
              </div>
              <div className="request-price">
                <span>Цена заказчика</span>
                <strong>4 500 ₽</strong>
              </div>
              <div className="response-stack">
                <div className="response-row response-first">
                  <span className="avatar avatar-blue">АС</span>
                  <p><strong>Алексей С.</strong><small><Star size={11} fill="currentColor" /> 4.96 · через 25 мин</small></p>
                  <b>4 500 ₽</b>
                  <span className="response-check"><Check size={13} /></span>
                </div>
                <div className="response-row">
                  <span className="avatar avatar-orange">МР</span>
                  <p><strong>Михаил Р.</strong><small><Star size={11} fill="currentColor" /> 4.89 · сегодня</small></p>
                  <b>5 000 ₽</b>
                </div>
              </div>
              <button onClick={onOpenApp}>Выбрать мастера <ChevronRight size={16} /></button>
            </article>
            <div className="hero-message">
              <span className="avatar avatar-blue">АС</span>
              <p><strong>Алексей</strong><span>Могу быть через 25 минут</span></p>
              <MessageCircle size={18} />
            </div>
          </div>
        </section>

        <section className="landing-metrics" aria-label="Ключевые преимущества">
          <div><strong>0%</strong><span>комиссии с заказа</span></div>
          <div><strong>1</strong><span>понятная подписка</span></div>
          <div><strong>2</strong><span>стороны честного рейтинга</span></div>
          <div><strong>24/7</strong><span>заказы могут находить мастеров</span></div>
        </section>

        <section className="landing-section how-section" id="how">
          <div className="section-heading">
            <span className="section-label">Три простых шага</span>
            <h2>От проблемы до мастера<br />без десятков звонков</h2>
            <p>Весь путь заказа остаётся внутри сервиса: от фото задачи до итогового отзыва.</p>
          </div>
          <div className="steps-grid">
            {landingSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article className="landing-step" key={step.number}>
                  <span className="step-number">{step.number}</span>
                  <span className="step-icon"><Icon size={24} /></span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                  {index < landingSteps.length - 1 && <span className="step-arrow"><ArrowRight size={20} /></span>}
                </article>
              );
            })}
          </div>
        </section>

        <section className="benefits-section" id="benefits">
          <div className="benefits-inner">
            <div className="benefits-copy">
              <span className="section-label light">Почему МастерGO</span>
              <h2>Мы убрали всё,<br />что мешает договориться</h2>
              <p>
                Платформа зарабатывает на подписке, а не на вашем заказе.
                Поэтому нам выгодно, чтобы хороший мастер находился быстро,
                условия были прозрачны, а пользователи возвращались.
              </p>
              <button className="landing-primary light-button" onClick={onOpenApp}>
                Попробовать сервис <ArrowRight size={18} />
              </button>
            </div>
            <div className="benefits-grid">
              {landingBenefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <article key={benefit.title}>
                    <span><Icon size={22} /></span>
                    <h3>{benefit.title}</h3>
                    <p>{benefit.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="landing-section categories-section" id="categories">
          <div className="section-heading split-heading">
            <div>
              <span className="section-label">Помощь на каждый день</span>
              <h2>От срочного крана<br />до личной тренировки</h2>
            </div>
            <p>Начинаем с самых частых бытовых задач и постепенно расширяем направления вместе с сообществом.</p>
          </div>
          <div className="landing-category-grid">
            {categories.map((category, index) => {
              const Icon = category.icon;
              const examples = [
                "Краны, трубы, протечки",
                "Сборка и установка",
                "Выгул и присмотр",
                "Тренировки и восстановление",
                "Уборка и бытовые задачи",
                "Любая понятная задача",
              ];
              return (
                <button key={category.title} className={`landing-category ${category.tone}`} onClick={onOpenApp}>
                  <span><Icon size={25} /></span>
                  <h3>{category.title}</h3>
                  <p>{examples[index]}</p>
                  <i><ArrowRight size={16} /></i>
                </button>
              );
            })}
          </div>
        </section>

        <section className="trust-section">
          <div className="trust-visual">
            <div className="trust-orbit orbit-one" />
            <div className="trust-orbit orbit-two" />
            <span className="trust-shield"><ShieldCheck size={52} /></span>
            <span className="trust-badge badge-one"><BadgeCheck size={17} /> Проверка профиля</span>
            <span className="trust-badge badge-two"><Star size={17} fill="currentColor" /> Реальные отзывы</span>
            <span className="trust-badge badge-three"><FileCheck2 size={17} /> Фото результата</span>
          </div>
          <div className="trust-copy">
            <span className="section-label">Доверие встроено в продукт</span>
            <h2>Репутация важнее случайной скидки</h2>
            <p>
              После каждого заказа обе стороны оставляют обязательный отзыв.
              Мастер показывает результат «до и после», а история выполненных
              работ помогает выбрать специалиста осознанно.
            </p>
            <ul>
              <li><CheckCircle2 size={18} /> Проверка данных и специализации мастера</li>
              <li><CheckCircle2 size={18} /> Точный адрес открывается только после принятия</li>
              <li><CheckCircle2 size={18} /> Переписка и согласованные условия сохраняются</li>
              <li><CheckCircle2 size={18} /> Рейтинг есть и у мастера, и у заказчика</li>
            </ul>
          </div>
        </section>

        <section className="subscription-section">
          <div className="subscription-copy">
            <span className="section-label">Простая бизнес-модель</span>
            <h2>Подписка вместо комиссии</h2>
            <p>
              Вы заранее знаете стоимость сервиса. Мы не увеличиваем цену работы
              и не забираем процент у мастера.
            </p>
            <div className="subscription-points">
              <span><Check size={15} /> Неограниченные отклики</span>
              <span><Check size={15} /> Чат и история заказов</span>
              <span><Check size={15} /> Рейтинг и портфолио</span>
            </div>
          </div>
          <article className="price-card">
            <span className="price-card-label">Для старта</span>
            <div className="price-card-value"><strong>Пробный период</strong><span>для первых пользователей</span></div>
            <p>Проверяем ценность продукта вместе с пилотным сообществом.</p>
            <button onClick={onOpenApp}>Присоединиться к пилоту <ArrowRight size={17} /></button>
            <small>Условия подписки будут подтверждены перед публичным запуском.</small>
          </article>
        </section>

        <section className="landing-section team-section" id="team">
          <div className="section-heading">
            <span className="section-label">Команда продукта</span>
            <h2>Строим сервис вокруг<br />реальной человеческой помощи</h2>
            <p>
              Мы объединяем продуктовый подход, дизайн, технологии и заботу о пользователях.
              Сейчас команда создаёт MVP и готовит платформу к пилотному запуску.
            </p>
          </div>
          <div className="team-grid">
            {teamRoles.map((member) => (
              <article key={member.role}>
                <span className={member.tone}>{member.initials}</span>
                <h3>{member.role}</h3>
                <p>{member.text}</p>
              </article>
            ))}
          </div>
          <div className="team-note">
            <Rocket size={25} />
            <div>
              <strong>Мы в начале пути</strong>
              <p>Поэтому обратная связь первых заказчиков и мастеров напрямую влияет на продукт.</p>
            </div>
            <button onClick={onOpenApp}>Посмотреть MVP <ArrowRight size={16} /></button>
          </div>
        </section>

        <section className="landing-cta">
          <div className="cta-pattern" />
          <span className="cta-icon"><Wrench size={28} /></span>
          <h2>Задача появилась?<br />Мастер уже может быть рядом.</h2>
          <p>Разместите первый заказ и посмотрите, как работает МастерGO.</p>
          <div>
            <button className="landing-primary light-button" onClick={onOpenApp}>
              Открыть демо сервиса <ArrowRight size={18} />
            </button>
            <button className="cta-master-button" onClick={() => scrollTo("team")}>
              <BriefcaseBusiness size={17} /> Стать мастером
            </button>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <div className="landing-logo">
              <span className="brand-mark"><Wrench size={21} /></span>
              <span>Мастер<b>GO</b></span>
            </div>
            <p>Быстрый способ найти надёжную помощь рядом без комиссии.</p>
          </div>
          <div><strong>Продукт</strong><button onClick={() => scrollTo("how")}>Как это работает</button><button onClick={() => scrollTo("categories")}>Категории</button><button onClick={onOpenApp}>Демо кабинета</button></div>
          <div><strong>Доверие</strong><button onClick={() => scrollTo("benefits")}>Преимущества</button><button onClick={() => scrollTo("team")}>О команде</button><button onClick={() => scrollTo("benefits")}>Безопасность</button></div>
          <div><strong>Для связи</strong><span>Москва</span><span>Пилотная версия MVP</span><span>hello@mastergo.ru</span></div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 МастерGO. Концепт продукта.</span>
          <span>Сделано для быстрых и честных договорённостей.</span>
        </div>
      </footer>
    </div>
  );
}

function DashboardApp({ onBackToSite }: { onBackToSite: () => void }) {
  const [activeNav, setActiveNav] = useState("Главная");
  const [showComposer, setShowComposer] = useState(false);
  const [composerStep, setComposerStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("Сантехника");
  const [taskTitle, setTaskTitle] = useState("Установить кухонный кран");
  const [taskPrice, setTaskPrice] = useState("4500");
  const [taskAddress, setTaskAddress] = useState("Москва, Хамовники, ул. Ефремова, 12");
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [showResponses, setShowResponses] = useState(false);
  const [acceptedMaster, setAcceptedMaster] = useState<string | null>("Алексей С.");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState("");
  const [messages, setMessages] = useState([
    { mine: false, text: "Добрый день! Буду у вас примерно через 25 минут." },
    { mine: true, text: "Отлично, домофон 47. Напишите, когда подойдёте." },
  ]);
  const [toast, setToast] = useState("");
  const [orders, setOrders] = useState(initialOrders);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);

  const firstName = "Александр";
  const activeOrder = orders[0];

  const progress = useMemo(() => {
    if (composerStep === 1) return 33;
    if (composerStep === 2) return 66;
    return 100;
  }, [composerStep]);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function openComposer(category?: string) {
    if (category) setSelectedCategory(category);
    setComposerStep(1);
    setBroadcastSent(false);
    setShowResponses(false);
    setShowComposer(true);
  }

  function sendBroadcast() {
    setBroadcastSent(true);
    setShowResponses(false);
    window.setTimeout(() => setShowResponses(true), 900);
    const newOrder: Order = {
      id: `MG-${Math.floor(2500 + Math.random() * 400)}`,
      title: taskTitle || "Новая задача",
      category: selectedCategory,
      price: `${Number(taskPrice || 0).toLocaleString("ru-RU")} ₽`,
      date: "Сегодня, как можно скорее",
      address: taskAddress,
      status: "Ожидает мастера",
      icon: categories.find((item) => item.title === selectedCategory)?.icon || Sparkles,
      tone: categories.find((item) => item.title === selectedCategory)?.tone || "gray",
    };
    setOrders((current) => [newOrder, ...current]);
  }

  function acceptMaster(name: string, price: string) {
    setAcceptedMaster(name);
    setOrders((current) =>
      current.map((order, index) =>
        index === 0
          ? { ...order, master: name, price, status: "Выполняется" }
          : order,
      ),
    );
    setShowComposer(false);
    flash(`${name} принял заказ. Контакты открыты.`);
  }

  function sendMessage() {
    const value = chatText.trim();
    if (!value) return;
    setMessages((current) => [...current, { mine: true, text: value }]);
    setChatText("");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={onBackToSite}>
          <span className="brand-mark"><Wrench size={21} /></span>
          <span>Мастер<span>GO</span></span>
        </button>

        <nav className="sidebar-nav" aria-label="Основная навигация">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className={activeNav === item.label ? "nav-item active" : "nav-item"}
                onClick={() => {
                  setActiveNav(item.label);
                  if (item.label === "Сообщения") setChatOpen(true);
                }}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {item.count && <small>{item.count}</small>}
              </button>
            );
          })}
        </nav>

        <div className="subscription-card">
          <span className="subscription-icon"><ShieldCheck size={18} /></span>
          <div>
            <strong>Подписка активна</strong>
            <p>Без комиссии до 24 июля</p>
          </div>
          <button onClick={() => flash("Управление подпиской откроется в следующей версии.")}>
            Управлять
          </button>
        </div>

        <div className="sidebar-user">
          <div className="avatar avatar-main">А</div>
          <div>
            <strong>Александр</strong>
            <span><Star size={13} fill="currentColor" /> 4.9 · 12 отзывов</span>
          </div>
          <ChevronDown size={16} />
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark"><Wrench size={18} /></span>
            <b>МастерGO</b>
          </div>
          <div className="topbar-search">
            <Search size={18} />
            <input placeholder="Найти заказ, мастера или сообщение" />
          </div>
          <div className="topbar-actions">
            <button className="location-button">
              <MapPin size={17} />
              Москва
              <ChevronDown size={14} />
            </button>
            <button className="icon-button" aria-label="Уведомления">
              <Bell size={19} />
              <span className="notification-dot" />
            </button>
            <button className="profile-button">
              <span className="avatar avatar-small">А</span>
              <span>Александр</span>
              <ChevronDown size={14} />
            </button>
          </div>
        </header>

        <div className="content">
          <section className="welcome-row">
            <div>
              <p className="eyebrow">Личный кабинет</p>
              <h1>Добрый день, {firstName}!</h1>
              <p>Кого позовём на помощь сегодня?</p>
            </div>
            <button className="primary-action" onClick={() => openComposer()}>
              <Plus size={20} /> Создать заказ
            </button>
          </section>

          <section className="category-grid" aria-label="Категории услуг">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  className={`category-card ${category.tone}`}
                  key={category.title}
                  onClick={() => openComposer(category.title)}
                >
                  <span className="category-icon"><Icon size={24} strokeWidth={1.8} /></span>
                  <span>{category.title}</span>
                  <small>Найти мастера</small>
                </button>
              );
            })}
          </section>

          <section className="dashboard-grid">
            <div className="panel orders-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">История и статусы</p>
                  <h2>Мои заказы</h2>
                </div>
                <button className="text-button" onClick={() => setActiveNav("Мои заказы")}>
                  Смотреть все
                </button>
              </div>

              <div className="order-list">
                {orders.slice(0, 3).map((order) => {
                  const Icon = order.icon;
                  return (
                    <article className="order-card" key={order.id}>
                      <div className={`order-icon ${order.tone}`}><Icon size={22} /></div>
                      <div className="order-body">
                        <div className="order-topline">
                          <div>
                            <span className="order-id">{order.id}</span>
                            <h3>{order.title}</h3>
                          </div>
                          <span className={`status ${statusClass[order.status]}`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="order-meta">
                          <span><CalendarDays size={14} /> {order.date}</span>
                          <span><MapPin size={14} /> {order.address}</span>
                          {order.master && <span><UserRoundCheck size={14} /> {order.master}</span>}
                        </div>
                      </div>
                      <strong className="order-price">{order.price}</strong>
                    </article>
                  );
                })}
              </div>
            </div>

            <aside className="panel active-order">
              <div className="panel-heading compact">
                <div>
                  <p className="eyebrow">Прямо сейчас</p>
                  <h2>Активный заказ</h2>
                </div>
                <span className="live-dot">В работе</span>
              </div>
              <img src={workResult} alt="Установленный кухонный кран" />
              <h3>{activeOrder.title}</h3>
              <p className="muted">{activeOrder.address}</p>
              <div className="master-strip">
                <div className="avatar avatar-blue">АС</div>
                <div>
                  <strong>{acceptedMaster || "Алексей С."}</strong>
                  <span><Star size={13} fill="currentColor" /> 4.96 · Сантехник</span>
                </div>
                <span className="eta"><Clock3 size={13} /> 18 мин</span>
              </div>
              <div className="order-progress">
                <span className="done"><Check size={13} /></span>
                <i />
                <span className="done"><Check size={13} /></span>
                <i />
                <span>3</span>
              </div>
              <div className="progress-labels">
                <small>Принят</small>
                <small>Мастер в пути</small>
                <small>Готово</small>
              </div>
              <div className="active-actions">
                <button className="secondary-action" onClick={() => setChatOpen(true)}>
                  <MessageCircle size={17} /> Написать
                </button>
                <button className="ghost-action" onClick={() => setReviewOpen(true)}>
                  Завершить
                </button>
              </div>
            </aside>
          </section>

          <section className="trust-row">
            <div>
              <span><WalletCards size={19} /></span>
              <p><strong>0% комиссии</strong>Вы платите только за подписку</p>
            </div>
            <div>
              <span><ShieldCheck size={19} /></span>
              <p><strong>Проверенные мастера</strong>Документы и реальные отзывы</p>
            </div>
            <div>
              <span><FileCheck2 size={19} /></span>
              <p><strong>Честный рейтинг</strong>Отзыв обязателен с обеих сторон</p>
            </div>
          </section>
        </div>
      </main>

      {showComposer && (
        <div className="modal-backdrop" onMouseDown={() => setShowComposer(false)}>
          <section className="composer" onMouseDown={(event) => event.stopPropagation()}>
            <header className="composer-header">
              <div>
                <p className="eyebrow">Новый заказ · шаг {composerStep} из 3</p>
                <h2>{broadcastSent ? "Ищем мастера рядом" : "Опишите задачу"}</h2>
              </div>
              <button className="icon-button" onClick={() => setShowComposer(false)}><X size={20} /></button>
            </header>
            <div className="step-line"><span style={{ width: `${progress}%` }} /></div>

            {!broadcastSent && composerStep === 1 && (
              <div className="composer-content">
                <label>
                  Категория
                  <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
                    {categories.map((category) => <option key={category.title}>{category.title}</option>)}
                  </select>
                </label>
                <label>
                  Что нужно сделать?
                  <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} />
                </label>
                <label>
                  Подробности
                  <textarea defaultValue="Нужно снять старый кран и установить новый. Кран уже куплен, расходники обсудим с мастером." />
                </label>
                <div className="upload-zone">
                  <UploadCloud size={26} />
                  <div><strong>Добавьте фото или видео</strong><span>Так мастер быстрее оценит задачу</span></div>
                  <button><ImagePlus size={16} /> Выбрать</button>
                </div>
              </div>
            )}

            {!broadcastSent && composerStep === 2 && (
              <div className="composer-content">
                <div className="map-card">
                  <div className="map-grid" />
                  <div className="map-road road-one" />
                  <div className="map-road road-two" />
                  <div className="map-road road-three" />
                  <span className="map-pin"><MapPin size={22} fill="currentColor" /></span>
                  <span className="map-label">Хамовники</span>
                </div>
                <label>
                  Адрес
                  <input value={taskAddress} onChange={(event) => setTaskAddress(event.target.value)} />
                </label>
                <div className="field-row">
                  <label>
                    Когда
                    <select defaultValue="Как можно скорее">
                      <option>Как можно скорее</option>
                      <option>Сегодня вечером</option>
                      <option>Выбрать дату</option>
                    </select>
                  </label>
                  <label>
                    Точный адрес виден
                    <select defaultValue="После принятия заказа">
                      <option>После принятия заказа</option>
                      <option>Сразу в рассылке</option>
                    </select>
                  </label>
                </div>
              </div>
            )}

            {!broadcastSent && composerStep === 3 && (
              <div className="composer-content">
                <label>
                  Ваша цена
                  <div className="price-input">
                    <input value={taskPrice} onChange={(event) => setTaskPrice(event.target.value)} inputMode="numeric" />
                    <span>₽</span>
                  </div>
                </label>
                <div className="price-hint">
                  <Sparkles size={18} />
                  <div>
                    <strong>Обычно за такую работу предлагают 3 800–5 200 ₽</strong>
                    <p>Мастера смогут предложить другую цену в чате.</p>
                  </div>
                </div>
                <div className="broadcast-summary">
                  <div><Wrench size={17} /><span><small>Категория</small>{selectedCategory}</span></div>
                  <div><MapPin size={17} /><span><small>Район</small>Хамовники · 3,2 км</span></div>
                  <div><UsersRound size={17} /><span><small>Получат заказ</small>18 свободных мастеров</span></div>
                </div>
              </div>
            )}

            {broadcastSent && (
              <div className="response-state">
                {!showResponses ? (
                  <div className="searching">
                    <span className="radar"><Send size={25} /></span>
                    <h3>Рассылка отправлена 18 мастерам</h3>
                    <p>Первые отклики обычно приходят за 2–5 минут.</p>
                    <div className="search-dots"><i /><i /><i /></div>
                  </div>
                ) : (
                  <>
                    <div className="response-title">
                      <div><CheckCircle2 size={20} /><span><strong>3 мастера готовы помочь</strong><small>Выберите подходящие условия</small></span></div>
                      <span className="response-time">за 1 мин 12 сек</span>
                    </div>
                    <div className="masters-list">
                      {masters.map((master, index) => (
                        <article className={index === 0 ? "master-response best" : "master-response"} key={master.name}>
                          {index === 0 && <span className="best-label">Лучший отклик</span>}
                          <div className={`avatar ${master.tone}`}>{master.name.split(" ").map((part) => part[0]).join("")}</div>
                          <div className="master-info">
                            <h3>{master.name}</h3>
                            <p>{master.specialty} · <Star size={13} fill="currentColor" /> {master.rating} ({master.reviews})</p>
                            <span><Clock3 size={13} /> {master.eta}</span>
                          </div>
                          <strong>{master.price}</strong>
                          <div className="master-actions">
                            <button className="chat-mini" onClick={() => setChatOpen(true)}><MessageCircle size={16} /></button>
                            <button className="accept-button" onClick={() => acceptMaster(master.name, master.price)}>Принять</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {!broadcastSent && (
              <footer className="composer-footer">
                <button className="ghost-action" disabled={composerStep === 1} onClick={() => setComposerStep((step) => Math.max(1, step - 1))}>
                  Назад
                </button>
                {composerStep < 3 ? (
                  <button className="primary-action" onClick={() => setComposerStep((step) => Math.min(3, step + 1))}>
                    Продолжить
                  </button>
                ) : (
                  <button className="primary-action send-order" onClick={sendBroadcast}>
                    <Send size={18} /> Разослать мастерам
                  </button>
                )}
              </footer>
            )}
          </section>
        </div>
      )}

      {chatOpen && (
        <aside className="chat-drawer">
          <header>
            <div className="avatar avatar-blue">АС</div>
            <div>
              <strong>Алексей С.</strong>
              <span><i /> в сети · заказ MG-2408</span>
            </div>
            <button className="icon-button" onClick={() => setChatOpen(false)}><X size={19} /></button>
          </header>
          <div className="chat-order">
            <Wrench size={17} />
            <div><strong>Установить кухонный кран</strong><span>4 500 ₽ · сегодня</span></div>
          </div>
          <div className="chat-messages">
            <div className="chat-date">Сегодня</div>
            {messages.map((message, index) => (
              <div className={message.mine ? "message mine" : "message"} key={`${message.text}-${index}`}>
                {message.text}
                <small>{message.mine ? "15:42 · ✓✓" : "15:38"}</small>
              </div>
            ))}
          </div>
          <div className="chat-compose">
            <button><Paperclip size={19} /></button>
            <input
              value={chatText}
              onChange={(event) => setChatText(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && sendMessage()}
              placeholder="Напишите сообщение…"
            />
            <button className="chat-send" onClick={sendMessage}><Send size={18} /></button>
          </div>
        </aside>
      )}

      {reviewOpen && (
        <div className="modal-backdrop" onMouseDown={() => setReviewOpen(false)}>
          <section className="review-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="close-corner" onClick={() => setReviewOpen(false)}><X size={19} /></button>
            <span className="review-icon"><CheckCircle2 size={28} /></span>
            <p className="eyebrow">Заказ выполнен</p>
            <h2>Как всё прошло?</h2>
            <p>Отзыв обязателен для обеих сторон и формирует честный рейтинг.</p>
            <div className="stars">
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} onClick={() => setRating(value)}>
                  <Star size={30} fill={value <= rating ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
            <textarea placeholder="Расскажите о качестве работы и пунктуальности мастера…" />
            <div className="review-upload">
              <button><Camera size={17} /> Фото «после»</button>
              <button><Video size={17} /> Видео результата</button>
            </div>
            <button
              className="primary-action wide"
              onClick={() => {
                setReviewOpen(false);
                setOrders((current) => current.map((order, index) => index === 0 ? { ...order, status: "Завершён" } : order));
                flash(`Спасибо! Оценка ${rating} опубликована.`);
              }}
            >
              Опубликовать отзыв
            </button>
          </section>
        </div>
      )}

      {toast && <div className="toast"><CheckCircle2 size={18} /> {toast}</div>}
    </div>
  );
}

function App() {
  const [view, setView] = useState<"landing" | "app">("landing");

  if (view === "app") {
    return <DashboardApp onBackToSite={() => setView("landing")} />;
  }

  return <Landing onOpenApp={() => setView("app")} />;
}

export default App;
