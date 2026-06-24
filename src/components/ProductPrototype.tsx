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
  Timer,
  UserRoundCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Brand } from "./Brand";
import { categories, formatRub } from "@/lib/mock-data";
import type { MvpMessage, MvpOrder, MvpOrderStatus, MvpReview, MvpRole, MvpState } from "@/lib/mvp-types";

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

const statusLabel: Record<MvpOrderStatus, string> = {
  published: "Ищем мастера",
  assigned: "Мастер выбран",
  in_progress: "В работе",
  awaiting_review: "Ждём отзывы",
  completed: "Завершено",
  declined: "Отклонено",
};

const emptyState: MvpState = {
  orders: [],
  messages: [],
  reviews: [],
};

export function ProductPrototype() {
  const [role, setRole] = useState<MvpRole>("client");
  const [state, setState] = useState<MvpState>(emptyState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const [chatText, setChatText] = useState("");
  const [reviewForm, setReviewForm] = useState({
    rating: "5",
    comment: "",
    paymentConfirmed: false,
  });
  const [form, setForm] = useState({
    title: "Поменять кран на кухне",
    category: "Сантехника",
    price: "1500",
    address: "ул. Ефремова, 12",
    district: "Хамовники",
    time: "Сегодня до 20:00",
    description: "Кран куплен, нужно снять старый и поставить новый.",
  });

  const loadState = useCallback(async () => {
    const response = await fetch("/api/mvp/state", { cache: "no-store" });
    const payload = (await response.json()) as ApiResponse<MvpState>;
    if (!payload.ok) throw new Error(payload.error);
    setState(payload.data);
    setError("");
  }, []);

  useEffect(() => {
    loadState()
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [loadState]);

  const orders = state.orders;
  const activeOrders = useMemo(() => orders.filter((order) => order.status !== "completed"), [orders]);
  const history = useMemo(() => orders.filter((order) => order.status === "completed"), [orders]);
  const selectedChatOrder = orders.find((order) => order.id === chatOrderId);
  const selectedReviewOrder = orders.find((order) => order.id === reviewOrderId);
  const chatMessages = state.messages.filter((message) => message.orderId === chatOrderId);
  const calendarOrders = useMemo(
    () => orders.filter((order) => order.status === "assigned" || order.status === "in_progress" || order.status === "awaiting_review" || order.status === "completed"),
    [orders],
  );

  function reviewFor(orderId: string, reviewerRole: MvpRole) {
    return state.reviews.find((review) => review.orderId === orderId && review.reviewerRole === reviewerRole);
  }

  function openReview(orderId: string) {
    setReviewOrderId(orderId);
    setReviewForm({ rating: "5", comment: "", paymentConfirmed: false });
  }

  async function mutate<T>(url: string, body?: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : "{}",
    });
    const payload = (await response.json()) as ApiResponse<T>;
    if (!payload.ok) {
      setError(payload.error);
      return null;
    }
    await loadState();
    return payload.data;
  }

  async function createOrder() {
    const order = await mutate<MvpOrder>("/api/mvp/orders", {
      ...form,
      price: Number(form.price) || 0,
    });
    if (!order) return;

    setShowCreate(false);
    setRole("client");
    setChatOrderId(order.id);
  }

  async function acceptOrder(orderId: string) {
    const order = await mutate<MvpOrder>(`/api/mvp/orders/${orderId}/accept`);
    if (order) setChatOrderId(orderId);
  }

  async function proposePrice(order: MvpOrder) {
    const nextPrice = Math.max(100, Math.round(order.price * 1.2));
    const updatedOrder = await mutate<MvpOrder>(`/api/mvp/orders/${order.id}/accept`, { price: nextPrice });
    if (updatedOrder) setChatOrderId(order.id);
  }

  async function declineOrder(orderId: string, reason = "Не подходит по условиям") {
    await mutate<MvpOrder>(`/api/mvp/orders/${orderId}/decline`, { reason });
  }

  async function startWork(orderId: string) {
    await mutate<MvpOrder>(`/api/mvp/orders/${orderId}/start`);
  }

  async function completeOrder(orderId: string) {
    const order = await mutate<MvpOrder>(`/api/mvp/orders/${orderId}/complete`);
    if (order) {
      setChatOrderId(null);
      openReview(orderId);
    }
  }

  async function submitReview() {
    if (!selectedReviewOrder) return;
    const response = await mutate<{ review: MvpReview; state: MvpState }>(`/api/mvp/orders/${selectedReviewOrder.id}/review`, {
      role,
      rating: Number(reviewForm.rating),
      comment: reviewForm.comment,
      paymentConfirmed: role === "client" ? reviewForm.paymentConfirmed : undefined,
    });
    if (!response) return;
    setReviewOrderId(null);
    setReviewForm({ rating: "5", comment: "", paymentConfirmed: false });
  }

  async function sendMessage() {
    if (!chatText.trim() || !chatOrderId) return;
    const sent = await mutate<MvpMessage>(`/api/mvp/orders/${chatOrderId}/messages`, {
      role,
      text: chatText.trim(),
    });
    if (sent) setChatText("");
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
        {error && <div className="product-alert">{error}</div>}
        {isLoading ? (
          <section className="empty-state">
            <Clock3 size={24} />
            <h3>Загружаем заявки</h3>
            <p>Поднимаем рабочее состояние MVP.</p>
          </section>
        ) : role === "client" ? (
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
                          {order.status === "awaiting_review" && !reviewFor(order.id, "client") && (
                            <button className="primary-btn" onClick={() => openReview(order.id)}>Подтвердить оплату и отзыв</button>
                          )}
                          {order.status === "awaiting_review" && reviewFor(order.id, "client") && (
                            <small>Ваш отзыв принят. Ждём отзыв мастера.</small>
                          )}
                          {order.status !== "published" && order.status !== "declined" && (
                            <button className="secondary-btn" onClick={() => setChatOrderId(order.id)}><MessageCircle size={16} /> Чат</button>
                          )}
                          {order.status === "declined" && <small>{order.declineReason}</small>}
                        </>
                      }
                    />
                  ))}
                  {!activeOrders.length && (
                    <article className="empty-state">
                      <Plus size={24} />
                      <h3>Создайте первую заявку</h3>
                      <p>Мастера рядом увидят задачу и смогут быстро принять заказ.</p>
                    </article>
                  )}
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
                    <ReviewSummary orderId={order.id} reviews={state.reviews} />
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
                <p className="muted">Видны релевантные задачи по категории, району и доступности.</p>
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
                          <button className="secondary-btn" onClick={() => proposePrice(order)}>Своя цена</button>
                          <button className="secondary-btn" onClick={() => declineOrder(order.id, "Не успеваю по времени")}>Отказаться</button>
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

                <div className="section-title-row product-subtitle-row">
                  <h2>Мой календарь работ</h2>
                  <span>{calendarOrders.length}</span>
                </div>
                <div className="timeline-list">
                  {calendarOrders.map((order) => (
                    <article className="timeline-card" key={order.id}>
                      <span className={order.status === "completed" ? "timeline-dot success" : "timeline-dot"} />
                      <div>
                        <strong>{order.time}</strong>
                        <p>{order.title} · {statusLabel[order.status]}</p>
                        {order.status === "awaiting_review" && !reviewFor(order.id, "master") && (
                          <button className="secondary-btn compact-btn" onClick={() => openReview(order.id)}>Оценить клиента</button>
                        )}
                        {order.status === "awaiting_review" && reviewFor(order.id, "master") && (
                          <small>Ваш отзыв принят. Ждём клиента.</small>
                        )}
                        {order.status === "completed" && <ReviewSummary orderId={order.id} reviews={state.reviews} />}
                      </div>
                    </article>
                  ))}
                  {!calendarOrders.length && (
                    <article className="empty-state">
                      <Timer size={24} />
                      <h3>Календарь появится после принятого заказа</h3>
                      <p>Тут будет история как в GitHub: даты, статусы, выполненные работы и отзывы.</p>
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

      {selectedReviewOrder && (
        <div className="product-modal-backdrop" onMouseDown={() => setReviewOrderId(null)}>
          <section className="product-modal review-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setReviewOrderId(null)}><X size={18} /></button>
            <span className="badge">Обязательное закрытие</span>
            <h2>{role === "client" ? "Подтвердите оплату и оцените мастера" : "Оцените клиента"}</h2>
            <p className="muted">
              Заказ попадёт в финальную историю только после отзывов обеих сторон. Это защищает качество мастеров и клиентов.
            </p>
            <article className="review-order-card">
              <strong>{selectedReviewOrder.title}</strong>
              <span>{formatRub(selectedReviewOrder.price)} · {selectedReviewOrder.time}</span>
            </article>
            <div className="form-grid">
              {role === "client" && (
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={reviewForm.paymentConfirmed}
                    onChange={(event) => setReviewForm({ ...reviewForm, paymentConfirmed: event.target.checked })}
                  />
                  Я подтверждаю, что оплатил мастеру самостоятельно вне сервиса
                </label>
              )}
              <label className="field">Оценка
                <select value={reviewForm.rating} onChange={(event) => setReviewForm({ ...reviewForm, rating: event.target.value })}>
                  {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} из 5</option>)}
                </select>
              </label>
              <label className="field">Комментарий обязателен
                <textarea
                  value={reviewForm.comment}
                  onChange={(event) => setReviewForm({ ...reviewForm, comment: event.target.value })}
                  placeholder={role === "client" ? "Например: мастер приехал вовремя, всё сделал аккуратно" : "Например: клиент был на связи, условия совпали с заявкой"}
                />
              </label>
              <button className="primary-btn" onClick={submitReview}>Сохранить отзыв</button>
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
            {chatMessages.map((message) => (
              <div className={message.role === role ? "message mine" : "message"} key={message.id}>
                {message.text}
              </div>
            ))}
            {!chatMessages.length && <div className="message">Чат откроется после первого сообщения.</div>}
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

function OrderCard({ order, actions }: { order: MvpOrder; actions: ReactNode }) {
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

function ReviewSummary({ orderId, reviews }: { orderId: string; reviews: MvpReview[] }) {
  const clientReview = reviews.find((review) => review.orderId === orderId && review.reviewerRole === "client");
  const masterReview = reviews.find((review) => review.orderId === orderId && review.reviewerRole === "master");

  return (
    <div className="review-summary">
      {clientReview && (
        <p><Star size={14} fill="currentColor" /> Клиент мастеру: {clientReview.rating}/5 — {clientReview.comment}</p>
      )}
      {masterReview && (
        <p><Star size={14} fill="currentColor" /> Мастер клиенту: {masterReview.rating}/5 — {masterReview.comment}</p>
      )}
      {clientReview?.paymentConfirmed && <small>Оплата подтверждена клиентом самостоятельно.</small>}
    </div>
  );
}

export default ProductPrototype;
