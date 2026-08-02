"use client";

import {
  ArrowLeft,
  BadgeRussianRuble,
  CalendarClock,
  MapPin,
  Pause,
  Play,
  Plus,
  Repeat2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";

import {
  createSubscriptionAction,
  setSubscriptionStatusAction,
} from "@/lib/subscriptions/actions";
import type {
  SubscriptionFrequency,
  SubscriptionInput,
  SubscriptionPageData,
} from "@/lib/subscriptions/types";
import { useDialogAccessibility } from "@/lib/ui/use-dialog-accessibility";

const FREQUENCY_LABEL: Record<SubscriptionFrequency, string> = {
  WEEKLY: "Раз в неделю",
  BIWEEKLY: "Раз в две недели",
  MONTHLY: "Раз в месяц",
};

const STATUS_LABEL = {
  ACTIVE: "Активна",
  PAUSED: "На паузе",
  CANCELLED: "Отменена",
} as const;

function toLocalInputValue(timestamp: number) {
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(timestamp - offset).toISOString().slice(0, 16);
}

function defaultFirstVisit() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return date.getTime();
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value) + " ₽";
}

function emptyForm(data: SubscriptionPageData): SubscriptionInput {
  const address = data.addresses.find((item) => item.isPrimary) ?? data.addresses[0];
  const area = data.serviceAreas.find((item) => item.city === address?.city);
  return {
    categoryId: "",
    subcategoryId: "",
    addressId: address?.id ?? "",
    serviceAreaId: area?.id ?? "",
    description: "",
    frequency: "MONTHLY",
    firstServiceAt: defaultFirstVisit(),
    priceRubles: 3000,
  };
}

export function SubscriptionManager({ data }: { data: SubscriptionPageData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<SubscriptionInput>(() => emptyForm(data));
  const [minimumFirstVisit] = useState(() => Date.now() + 30 * 60 * 1000);
  const [error, setError] = useState("");
  const dialogRef = useDialogAccessibility<HTMLElement>(isOpen, closeDialog, !isPending);

  const category = data.categories.find((item) => item.id === form.categoryId);
  const address = data.addresses.find((item) => item.id === form.addressId);
  const availableAreas = useMemo(
    () => data.serviceAreas.filter((item) => !address || item.city === address.city),
    [address, data.serviceAreas],
  );

  function openDialog() {
    setForm(emptyForm(data));
    setError("");
    setIsOpen(true);
  }

  function closeDialog() {
    if (isPending) return;
    setIsOpen(false);
    setError("");
  }

  function selectAddress(addressId: string) {
    const nextAddress = data.addresses.find((item) => item.id === addressId);
    const nextArea = data.serviceAreas.find((item) => item.city === nextAddress?.city);
    setForm((current) => ({ ...current, addressId, serviceAreaId: nextArea?.id ?? "" }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createSubscriptionAction(form);
      if (!result.ok) {
        setError(result.message ?? "Не удалось оформить подписку");
        return;
      }
      setIsOpen(false);
      router.refresh();
    });
  }

  function changeStatus(subscriptionId: string, status: "ACTIVE" | "PAUSED" | "CANCELLED") {
    if (status === "CANCELLED" && !window.confirm("Отменить подписку? Уже созданный заказ останется активным.")) return;
    setError("");
    startTransition(async () => {
      const result = await setSubscriptionStatusAction(subscriptionId, status);
      if (!result.ok) setError(result.message ?? "Не удалось изменить подписку");
      router.refresh();
    });
  }

  return (
    <div className="subscriptions-page">
      <header className="client-page-heading">
        <div>
          <Link className="home-subsection-back" href="/client/home"><ArrowLeft size={15} /> Мой дом</Link>
          <span>План ухода</span>
          <h1>Регулярные работы</h1>
          <p>Настройте периодичность один раз — следующие выезды будут создаваться автоматически.</p>
        </div>
        <button className="button button--primary" type="button" onClick={openDialog} disabled={data.addresses.length === 0}>
          <Plus size={18} /> Оформить подписку
        </button>
      </header>

      <section className="subscription-note" aria-label="Как работает подписка">
        <Repeat2 size={22} />
        <div>
          <strong>Без автоматических списаний</strong>
          <p>Цена фиксируется для каждого цикла, а мастер по-прежнему может принять её или предложить свою.</p>
        </div>
      </section>

      {error && <div className="client-alert client-alert--error" role="alert">{error}</div>}

      {data.addresses.length === 0 ? (
        <section className="client-empty-card">
          <span><MapPin size={29} /></span>
          <h2>Сначала добавьте адрес</h2>
          <p>Для регулярной работы нужен сохранённый адрес и район обслуживания.</p>
          <Link className="button button--primary" href="/client/addresses">Добавить адрес</Link>
        </section>
      ) : data.subscriptions.length === 0 ? (
        <section className="client-empty-card">
          <span><Repeat2 size={29} /></span>
          <h2>Подписок пока нет</h2>
          <p>Подходит для регулярного мелкого ремонта, обслуживания сантехники и других повторяющихся работ.</p>
          <button className="button button--primary" type="button" onClick={openDialog}><Plus size={17} /> Оформить подписку</button>
        </section>
      ) : (
        <div className="subscription-grid">
          {data.subscriptions.map((subscription) => (
            <article className={`subscription-card subscription-card--${subscription.status.toLowerCase()}`} key={subscription.id}>
              <div className="subscription-card__top">
                <span className="subscription-card__icon"><Repeat2 size={21} /></span>
                <span className={`subscription-status subscription-status--${subscription.status.toLowerCase()}`}>
                  {STATUS_LABEL[subscription.status]}
                </span>
              </div>
              <div className="subscription-card__title">
                <small>{subscription.subcategoryName || subscription.categoryName}</small>
                <h2>{subscription.categoryName}</h2>
                <p>{subscription.description}</p>
              </div>
              <dl className="subscription-facts">
                <div><dt><CalendarClock size={16} /> Периодичность</dt><dd>{FREQUENCY_LABEL[subscription.frequency]}</dd></div>
                <div><dt><MapPin size={16} /> Адрес</dt><dd>{subscription.address.street}, {subscription.address.house}</dd></div>
                <div><dt><BadgeRussianRuble size={16} /> Цена клиента</dt><dd>{formatPrice(subscription.priceRubles)}</dd></div>
              </dl>
              <div className="subscription-next">
                <small>{subscription.status === "ACTIVE" ? "Ближайший выезд" : "Последняя запланированная дата"}</small>
                <strong>{formatDate(subscription.nextServiceAt)}</strong>
                <span>Цикл №{subscription.currentCycle || 1}</span>
              </div>
              <div className="subscription-card__actions">
                {subscription.currentOrderId && (
                  <Link className="button button--secondary button--small" href={`/client/orders/${subscription.currentOrderId}`}>
                    Текущий заказ
                  </Link>
                )}
                {subscription.status === "ACTIVE" && (
                  <button className="button button--ghost button--small" type="button" disabled={isPending} onClick={() => changeStatus(subscription.id, "PAUSED")}>
                    <Pause size={15} /> Пауза
                  </button>
                )}
                {subscription.status === "PAUSED" && (
                  <button className="button button--ghost button--small" type="button" disabled={isPending} onClick={() => changeStatus(subscription.id, "ACTIVE")}>
                    <Play size={15} /> Возобновить
                  </button>
                )}
                {subscription.status !== "CANCELLED" && (
                  <button className="subscription-cancel" type="button" disabled={isPending} onClick={() => changeStatus(subscription.id, "CANCELLED")}>
                    Отменить
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="subscription-dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isPending) closeDialog();
        }}>
          <section className="subscription-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="subscription-dialog-title" tabIndex={-1}>
            <header>
              <div><span>Новая подписка</span><h2 id="subscription-dialog-title">Настройте регулярную работу</h2></div>
              <button type="button" onClick={closeDialog} aria-label="Закрыть"><X size={20} /></button>
            </header>
            <form onSubmit={submit}>
              <label>Категория
                <select required value={form.categoryId} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value, subcategoryId: "" }))}>
                  <option value="">Выберите категорию</option>
                  {data.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>Подкатегория
                <select value={form.subcategoryId} disabled={!category?.subcategories.length} onChange={(event) => setForm((current) => ({ ...current, subcategoryId: event.target.value }))}>
                  <option value="">Без подкатегории</option>
                  {category?.subcategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label className="subscription-dialog__wide">Что нужно делать регулярно?
                <textarea required rows={4} maxLength={1000} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Например, проверять соединения и менять фильтры под мойкой" />
              </label>
              <label>Адрес
                <select required value={form.addressId} onChange={(event) => selectAddress(event.target.value)}>
                  {data.addresses.map((item) => <option key={item.id} value={item.id}>{item.street}, {item.house}</option>)}
                </select>
              </label>
              <label>Район
                <select required value={form.serviceAreaId} onChange={(event) => setForm((current) => ({ ...current, serviceAreaId: event.target.value }))}>
                  <option value="">Выберите район</option>
                  {availableAreas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>Периодичность
                <select value={form.frequency} onChange={(event) => setForm((current) => ({ ...current, frequency: event.target.value as SubscriptionFrequency }))}>
                  {Object.entries(FREQUENCY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label>Первый выезд
                <input type="datetime-local" required min={toLocalInputValue(minimumFirstVisit)} value={toLocalInputValue(form.firstServiceAt)} onChange={(event) => setForm((current) => ({ ...current, firstServiceAt: new Date(event.target.value).getTime() }))} />
              </label>
              <label className="subscription-price-field">Цена за один выезд
                <span><input type="number" min={500} max={1_000_000} step={100} required value={form.priceRubles} onChange={(event) => setForm((current) => ({ ...current, priceRubles: Number(event.target.value) }))} /><b>₽</b></span>
              </label>
              <div className="subscription-dialog__summary">
                <Repeat2 size={18} />
                <p>Первый заказ появится сразу. После завершения сервис автоматически создаст следующий на выбранную дату.</p>
              </div>
              {error && <div className="form-error subscription-dialog__wide" role="alert">{error}</div>}
              <footer className="subscription-dialog__wide">
                <button className="button button--secondary" type="button" onClick={closeDialog}>Отмена</button>
                <button className="button button--primary" type="submit" disabled={isPending}>{isPending ? "Оформляем…" : "Оформить подписку"}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
