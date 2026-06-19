"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  Plus,
  Send,
  ShieldCheck,
  Star,
  UserRoundCheck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Brand } from "./Brand";
import { categories, formatRub } from "@/lib/mock-data";

type Role = "client" | "master";
type OrderStatus = "published" | "assigned" | "in_progress" | "completed" | "declined";

type Order = {
  id: string;
  title: string;
  category: string;
  price: number;
  address: string;
  district: string;
  time: string;
  description: string;
  status: OrderStatus;
  photo: boolean;
  master?: string;
  offers: number;
};

const statusLabel: Record<OrderStatus, string> = {
  published: "Ищем мастера",
  assigned: "Мастер выбран",
  in_progress: "В работе",
  completed: "Завершено",
  declined: "Отклонено",
};

const initialOrders: Order[] = [
  {
    id: "HF-1042",
    title: "Поменять кран на кухне",
    category: "Сантехника",
    price: 1500,
    address: "ул. Ефремова, 12",
    district: "Хамовники",
    time: "Сегодня до 20:00",
    description: "Кран куплен, нужно снять старый и поставить новый.",
    status: "published",
    photo: true,
    offers: 0,
  },
];

export function ProductPrototype() {
  const [role, setRole] = useState<Role>("client");
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [showCreate, setShowCreate] = useState(false);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const [chatText, setChatText] = useState("");
  const [messages, setMessages] = useState([
    { mine: false, text: "Здравствуйте! Готов приехать через 35 минут." },
    { mine: true, text: "Отлично, кран уже куплен." },
  ]);
  const [form, setForm] = useState({
    title: "Поменять кран на кухне",
    category: "Сантехника",
    price: "1500",
    address: "ул. Ефремова, 12",
    district: "Хамовники",
    time: "Сегодня до 20:00",
    description: "Кран куплен, нужно снять старый и поставить новый.",
  });

  const activeOrders = useMemo(() => orders.filter((order) => order.status !== "completed"), [orders]);
  const history = useMemo(() => orders.filter((order) => order.status === "completed"), [orders]);
  const selectedChatOrder = orders.find((order) => order.id === chatOrderId);

  function createOrder() {
    const next: Order = {
      id: `HF-${Math.floor(2000 + Math.random() * 7000)}`,
      title: form.title,
      category: form.category,
      price: Number(form.price) || 0,
      address: form.address,
      district: form.district,
      time: form.time,
      description: form.description,
      status: "published",
      photo: true,
      offers: 0,
    };
    setOrders((current) => [next, ...current]);
    setShowCreate(false);
    setRole("client");
  }

  function acceptOrder(orderId: string) {
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? { ...order, status: "assigned", master: "Алексей Соколов", offers: order.offers + 1 }
          : order,
      ),
    );
    setChatOrderId(orderId);
  }

  function declineOrder(orderId: string) {
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, status: "declined" } : order,
      ),
    );
  }

  function startWork(orderId: string) {
    setOrders((current) =>
      current.map((order) => (order.id === orderId ? { ...order, status: "in_progress" } : order)),
    );
  }

  function completeOrder(orderId: string) {
    setOrders((current) =>
      current.map((order) => (order.id === orderId ? { ...order, status: "completed" } : order)),
    );
    setChatOrderId(null);
  }

  function sendMessage() {
    if (!chatText.trim()) return;
    setMessages((current) => [...current, { mine: role === "client", text: chatText.trim() }]);
    setChatText("");
  }

  return (
    <div className="product-shell">
      <header className="product-topbar">
        <Brand />
        <div className="product-role-switch" aria-label="Выбор роли">
          <button className={role === "client" ? "active" : ""} onClick={() => setRole("client")}>Клиент</button>
          <button className={role === "master" ? "active" : ""} onClick={() => setRole("master")}>Мастер</button>
        </div>
        <Link className="secondary-btn" href="/"><ArrowLeft size={16} /> На сайт</Link>
      </header>

      <main className="product-main">
        {role === "client" ? (
          <>
            <section className="product-hero-card">
              <div>
                <span className="badge">Кабинет клиента</span>
                <h1>Что нужно сделать дома?</h1>
                <p className="muted">Создайте понятную заявку за 30 секунд: задача, фото, адрес, бюджет.</p>
              </div>
              <button className="primary-btn" onClick={() => setShowCreate(true)}>
                <Plus size={18} /> Вызвать мастера
              </button>
            </section>

            <section className="product-grid">
              <div className="product-column">
                <div className="section-title-row">
                  <h2>Мои заявки</h2>
                  <span>{activeOrders.length}</span>
                </div>
                <div className="request-list">
                  {activeOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      actions={
                        <>
                          {order.status === "assigned" && <button className="secondary-btn" onClick={() => startWork(order.id)}>Мастер в пути</button>}
                          {order.status === "in_progress" && <button className="primary-btn" onClick={() => completeOrder(order.id)}>Завершить</button>}
                          {order.status !== "published" && order.status !== "declined" && (
                            <button className="secondary-btn" onClick={() => setChatOrderId(order.id)}><MessageCircle size={16} /> Чат</button>
                          )}
                        </>
                      }
                    />
                  ))}
                </div>
              </div>

              <aside className="product-column">
                <div className="section-title-row">
                  <h2>История квартиры</h2>
                  <span>{history.length}</span>
                </div>
                {history.length ? history.map((order) => (
                  <article className="history-card" key={order.id}>
                    <span className="status-badge success">Завершено</span>
                    <h3>{order.title}</h3>
                    <p>{order.master} · {formatRub(order.price)}</p>
                    <small>Гарантия и фото результата появятся в следующей версии.</small>
                  </article>
                )) : (
                  <article className="empty-state">
                    <ShieldCheck size={24} />
                    <h3>История начнёт копиться после первого завершённого заказа</h3>
                    <p>Здесь будут работы, мастера, стоимость, гарантия и заметки по квартире.</p>
                  </article>
                )}
              </aside>
            </section>
          </>
        ) : (
          <>
            <section className="product-hero-card">
              <div>
                <span className="badge">Кабинет мастера</span>
                <h1>Новые заявки рядом</h1>
                <p className="muted">Видны только релевантные задачи по категории, району и доступности.</p>
              </div>
              <span className="status-badge success">Свободен сейчас</span>
            </section>

            <section className="product-grid">
              <div className="product-column wide">
                <div className="section-title-row">
                  <h2>Лента заявок</h2>
                  <span>{orders.filter((order) => order.status === "published").length}</span>
                </div>
                <div className="request-list">
                  {orders.filter((order) => order.status === "published").map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      actions={
                        <>
                          <button className="primary-btn" onClick={() => acceptOrder(order.id)}>Принять</button>
                          <button className="secondary-btn" onClick={() => declineOrder(order.id)}>Отказаться</button>
                        </>
                      }
                    />
                  ))}
                  {!orders.some((order) => order.status === "published") && (
                    <article className="empty-state">
                      <CheckCircle2 size={24} />
                      <h3>Новых заявок пока нет</h3>
                      <p>Когда клиент создаст заявку по вашей категории, она появится здесь.</p>
                    </article>
                  )}
                </div>
              </div>

              <aside className="master-profile-card">
                <div className="master-avatar">А</div>
                <h3>Алексей Соколов</h3>
                <p>Сантехника · Бытовая техника · Хамовники</p>
                <div className="master-stats">
                  <span><Star size={15} fill="currentColor" /> 4.96</span>
                  <span>128 заказов</span>
                </div>
                <div className="portfolio-strip">
                  <div />
                  <div />
                  <div />
                </div>
                <small>Портфолио работ копится после каждого завершённого заказа.</small>
              </aside>
            </section>
          </>
        )}
      </main>

      {showCreate && (
        <div className="product-modal-backdrop" onMouseDown={() => setShowCreate(false)}>
          <section className="product-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowCreate(false)}><X size={18} /></button>
            <span className="badge">Новая заявка</span>
            <h2>Вызвать мастера</h2>
            <div className="quick-flow compact">
              {["Категория", "Фото", "Описание", "Адрес", "Бюджет"].map((item, index) => <span key={item}><b>{index + 1}</b>{item}</span>)}
            </div>
            <div className="form-grid">
              <label className="field">Что нужно сделать?<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
              <label className="field">Категория<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((category) => <option key={category.slug}>{category.name}</option>)}</select></label>
              <label className="field">Описание<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
              <div className="upload-card"><Camera size={20} /> Фото добавлено</div>
              <div className="two-col">
                <label className="field">Район<input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></label>
                <label className="field">Адрес<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
              </div>
              <div className="two-col">
                <label className="field">Когда<input value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></label>
                <label className="field">Бюджет<input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
              </div>
              <button className="primary-btn" onClick={createOrder}>Опубликовать заявку</button>
            </div>
          </section>
        </div>
      )}

      {selectedChatOrder && (
        <aside className="product-chat">
          <header>
            <div>
              <span className="badge">{selectedChatOrder.id}</span>
              <h3>{selectedChatOrder.title}</h3>
            </div>
            <button className="modal-close" onClick={() => setChatOrderId(null)}><X size={18} /></button>
          </header>
          <div className="chat-box">
            {messages.map((message, index) => (
              <div className={message.mine ? "message mine" : "message"} key={`${message.text}-${index}`}>
                {message.text}
              </div>
            ))}
          </div>
          <footer>
            <input value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="Сообщение" onKeyDown={(e) => e.key === "Enter" && sendMessage()} />
            <button className="primary-btn" onClick={sendMessage}><Send size={16} /></button>
          </footer>
        </aside>
      )}
    </div>
  );
}

function OrderCard({ order, actions }: { order: Order; actions: React.ReactNode }) {
  return (
    <article className="product-order-card">
      <div className="order-photo">
        {order.photo ? <Camera size={22} /> : null}
      </div>
      <div className="order-content">
        <div className="order-title-row">
          <span className="pill">{order.category}</span>
          <span className={`status-badge ${order.status === "completed" ? "success" : order.status === "declined" ? "danger" : "warning"}`}>
            {statusLabel[order.status]}
          </span>
        </div>
        <h3>{order.title}</h3>
        <p>{order.description}</p>
        <div className="request-meta">
          <span><MapPin size={15} /> {order.district}</span>
          <span><Clock3 size={15} /> {order.time}</span>
          <span><UserRoundCheck size={15} /> Клиент подтверждён</span>
        </div>
      </div>
      <div className="order-side">
        <strong>{formatRub(order.price)}</strong>
        <small>{order.address}</small>
        <div className="order-actions">{actions}</div>
      </div>
    </article>
  );
}
