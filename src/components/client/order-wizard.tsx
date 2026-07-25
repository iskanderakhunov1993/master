"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  Clock3,
  Hammer,
  ImagePlus,
  Info,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  WalletCards,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useMemo, useState, useTransition } from "react";

import type { ClientAddressInput } from "@/lib/addresses/types";
import {
  saveOrderAddressAction,
  saveOrderCategoryAction,
  saveOrderDescriptionAction,
  saveOrderPhotoStepAction,
  saveOrderPriceAction,
  saveOrderScheduleAction,
  saveOrderTypeAction,
  setOrderDraftStepAction,
  submitOrderAction,
  type OrderAddressInput,
} from "@/lib/orders/actions";
import {
  ALLOWED_ORDER_PHOTO_TYPES,
  MAX_ORDER_PHOTOS,
  validateOrderPhoto,
} from "@/lib/orders/media";
import { formatRubles } from "@/lib/orders/presentation";
import type {
  OrderPhoto,
  OrderType,
  OrderWizardData,
  ScheduleKind,
} from "@/lib/orders/types";

const steps = ["Фото", "Описание", "Категория", "Адрес", "Когда", "Тип заказа", "Цена", "Проверка"];

const stages = [
  { title: "Опишите задачу", hint: "Фото · описание · категория", lastStep: 3 },
  { title: "Выберите время", hint: "Адрес · когда", lastStep: 5 },
  { title: "Согласуйте условия", hint: "Срочность · цена", lastStep: 7 },
  { title: "Проверьте заказ", hint: "Перед поиском мастеров", lastStep: 8 },
];

const nextLabels = ["Далее: описание", "Далее: категория", "Далее: адрес", "Далее: время", "Далее: условия", "Далее: цена", "Проверить заказ"];

const categoryImages: Record<string, string> = {
  plumbing: "/illustrations/categories/plumbing.png",
  electrical: "/illustrations/categories/electrical.png",
  "furniture-assembly": "/illustrations/categories/furniture-assembly.png",
  installation: "/illustrations/categories/installation.png",
  "small-repair": "/illustrations/categories/small-repair.png",
  other: "/illustrations/categories/other.png",
};

type PendingPhoto = {
  key: string;
  url: string;
  name: string;
};

function toDateInput(timestamp: number | null) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toTimeInput(timestamp: number | null) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function todayInput() {
  return toDateInput(Date.now());
}

function tomorrowInput() {
  return toDateInput(Date.now() + 24 * 60 * 60 * 1000);
}

function nextHourInput() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return toTimeInput(date.getTime());
}

function parseDateTime(date: string, time: string) {
  if (!date || !time) return null;
  const timestamp = new Date(`${date}T${time}:00`).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatMultiplier(multiplier: number) {
  return Number.isInteger(multiplier) ? String(multiplier) : multiplier.toFixed(2).replace(/0+$/, "");
}

export function OrderWizard({ data }: { data: OrderWizardData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(Math.min(8, Math.max(1, data.draft.currentStep)));
  const [error, setError] = useState("");
  const [photos, setPhotos] = useState<OrderPhoto[]>(data.draft.photos);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [description, setDescription] = useState(data.draft.description);
  const [categoryId, setCategoryId] = useState(data.draft.categoryId);
  const [subcategoryId, setSubcategoryId] = useState(data.draft.subcategoryId);
  const initialSavedAddressId = data.draft.addressId || data.addresses.find((address) => address.isPrimary)?.id || data.addresses[0]?.id || "";
  const [addressMode, setAddressMode] = useState<"saved" | "new">(initialSavedAddressId ? "saved" : "new");
  const [savedAddressId, setSavedAddressId] = useState(initialSavedAddressId);
  const [serviceAreaId, setServiceAreaId] = useState(data.draft.serviceAreaId || data.serviceAreas[0]?.id || "");
  const [newAddress, setNewAddress] = useState<ClientAddressInput>({
    city: data.draft.address.city,
    street: data.draft.address.street,
    house: data.draft.address.house,
    apartment: data.draft.address.apartment,
    comment: data.draft.address.comment,
  });
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const [scheduleKind, setScheduleKind] = useState<ScheduleKind>(data.draft.scheduleKind || "NOW");
  const [todayDate] = useState(() => todayInput());
  const [todayTime, setTodayTime] = useState(() => data.draft.scheduleKind === "TODAY" ? toTimeInput(data.draft.scheduledAt) : nextHourInput());
  const [customDate, setCustomDate] = useState(() => data.draft.scheduleKind === "CUSTOM" ? toDateInput(data.draft.scheduledAt) : tomorrowInput());
  const [customTime, setCustomTime] = useState(data.draft.scheduleKind === "CUSTOM" ? toTimeInput(data.draft.scheduledAt) : "10:00");
  const [orderType, setOrderType] = useState<OrderType>(data.draft.orderType);
  const [basePrice, setBasePrice] = useState(data.draft.basePriceRubles ? String(data.draft.basePriceRubles) : "");

  const selectedCategory = data.categories.find((category) => category.id === categoryId);
  const selectedSubcategory = selectedCategory?.subcategories.find((subcategory) => subcategory.id === subcategoryId);
  const selectedSavedAddress = data.addresses.find((address) => address.id === savedAddressId);
  const multiplier = orderType === "URGENT" ? data.urgencyMultiplier : 1;
  const numericBasePrice = Number(basePrice) || 0;
  const totalPrice = Math.round(numericBasePrice * multiplier);
  const progress = (step / steps.length) * 100;
  const currentStageIndex = stages.findIndex((stage) => step <= stage.lastStep);
  const currentStage = stages[currentStageIndex] ?? stages.at(-1)!;

  const scheduledAt = useMemo(() => {
    if (scheduleKind === "NOW") return null;
    if (scheduleKind === "TODAY") return parseDateTime(todayDate, todayTime);
    return parseDateTime(customDate, customTime);
  }, [customDate, customTime, scheduleKind, todayDate, todayTime]);

  function updateAddressField(field: keyof ClientAddressInput, value: string) {
    setNewAddress((current) => ({ ...current, [field]: value }));
  }

  async function uploadFile(file: File, replaceId?: string) {
    const validationError = validateOrderPhoto({ mimeType: file.type, byteSize: file.size });
    if (validationError) throw new Error(validationError.message);

    const formData = new FormData();
    formData.set("file", file);
    const endpoint = `/api/client/orders/${data.draft.id}/media${replaceId ? `?replace=${replaceId}` : ""}`;
    const response = await fetch(endpoint, { method: "POST", body: formData });
    const payload = await response.json() as { photo?: OrderPhoto; message?: string };
    if (!response.ok || !payload.photo) throw new Error(payload.message ?? "Не удалось загрузить фотографию");
    return payload.photo;
  }

  async function handlePhotoSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selectedFiles.length === 0) return;
    if (photos.length + pendingPhotos.length + selectedFiles.length > MAX_ORDER_PHOTOS) {
      setError("Можно добавить не больше 5 фотографий");
      return;
    }

    setError("");
    setIsUploading(true);
    const previews = selectedFiles.map((file) => ({ key: crypto.randomUUID(), url: URL.createObjectURL(file), name: file.name }));
    setPendingPhotos((current) => [...current, ...previews]);

    for (let index = 0; index < selectedFiles.length; index += 1) {
      try {
        const uploaded = await uploadFile(selectedFiles[index]);
        setPhotos((current) => [...current, uploaded]);
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить фотографию");
      } finally {
        const preview = previews[index];
        URL.revokeObjectURL(preview.url);
        setPendingPhotos((current) => current.filter((item) => item.key !== preview.key));
      }
    }
    setIsUploading(false);
  }

  async function replacePhoto(photoId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setIsUploading(true);
    try {
      const uploaded = await uploadFile(file, photoId);
      setPhotos((current) => current.map((photo) => photo.id === photoId ? uploaded : photo));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось заменить фотографию");
    } finally {
      setIsUploading(false);
    }
  }

  async function removePhoto(photoId: string) {
    setError("");
    setIsUploading(true);
    try {
      const response = await fetch(`/api/client/orders/${data.draft.id}/media/${photoId}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json() as { message?: string };
        throw new Error(payload.message ?? "Не удалось удалить фотографию");
      }
      setPhotos((current) => current.filter((photo) => photo.id !== photoId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить фотографию");
    } finally {
      setIsUploading(false);
    }
  }

  function nextStep() {
    setError("");
    startTransition(async () => {
      let result;
      if (step === 1) result = await saveOrderPhotoStepAction(data.draft.id);
      else if (step === 2) result = await saveOrderDescriptionAction(data.draft.id, description);
      else if (step === 3) result = await saveOrderCategoryAction(data.draft.id, { categoryId, subcategoryId });
      else if (step === 4) {
        const input: OrderAddressInput = addressMode === "saved"
          ? { mode: "saved", addressId: savedAddressId, serviceAreaId }
          : {
              mode: "new",
              serviceAreaId,
              city: newAddress.city,
              street: newAddress.street,
              house: newAddress.house,
              apartment: newAddress.apartment,
              comment: newAddress.comment,
              saveAddress: saveNewAddress,
            };
        result = await saveOrderAddressAction(data.draft.id, input);
      } else if (step === 5) result = await saveOrderScheduleAction(data.draft.id, { scheduleKind, scheduledAt });
      else if (step === 6) result = await saveOrderTypeAction(data.draft.id, orderType);
      else result = await saveOrderPriceAction(data.draft.id, Number(basePrice));

      if (!result.ok) {
        setError(result.message ?? "Проверьте введённые данные");
        return;
      }
      setStep((current) => Math.min(8, current + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function previousStep() {
    setError("");
    const previous = Math.max(1, step - 1);
    setStep(previous);
    startTransition(async () => {
      await setOrderDraftStepAction(data.draft.id, previous);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToStep(targetStep: number) {
    setError("");
    setStep(targetStep);
    startTransition(async () => {
      await setOrderDraftStepAction(data.draft.id, targetStep);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submit() {
    setError("");
    startTransition(async () => {
      const result = await submitOrderAction(data.draft.id);
      if (!result.ok || !result.orderId) {
        setError(result.message ?? "Не удалось отправить заказ");
        return;
      }
      router.push(`/client/orders/${result.orderId}`);
    });
  }

  function renderStep() {
    if (step === 1) {
      return (
        <section className="wizard-step">
          <StepHeading icon={Camera} title="Покажите задачу" description="Фото помогает мастеру быстрее понять объём работы. Этот шаг можно пропустить." />
          <div className="photo-uploader">
            <input id="order-photos" type="file" accept={ALLOWED_ORDER_PHOTO_TYPES.join(",")} multiple onChange={handlePhotoSelection} disabled={isUploading || photos.length >= MAX_ORDER_PHOTOS} />
            <label htmlFor="order-photos"><span><Upload size={27} /></span><strong>{photos.length ? "Добавить ещё фотографии" : "Добавить фотографии"}</strong><small>JPG, PNG или WebP · до 8 МБ · максимум 5</small></label>
          </div>
          {(photos.length > 0 || pendingPhotos.length > 0) && (
            <div className="photo-preview-grid">
              {photos.map((photo, index) => (
                <article key={photo.id}>
                  <Image src={photo.url} alt={`Фото задачи ${index + 1}`} fill sizes="(max-width: 600px) 45vw, 180px" unoptimized />
                  <div><label htmlFor={`replace-${photo.id}`}><Pencil size={14} /> Заменить</label><input id={`replace-${photo.id}`} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => replacePhoto(photo.id, event)} /><button type="button" onClick={() => removePhoto(photo.id)} aria-label={`Удалить фото ${index + 1}`}><Trash2 size={15} /></button></div>
                </article>
              ))}
              {pendingPhotos.map((photo) => (
                <article className="is-uploading" key={photo.key}><Image src={photo.url} alt={`Загружается ${photo.name}`} fill sizes="180px" unoptimized /><span><LoaderCircle size={22} /> Загружаем</span></article>
              ))}
              {photos.length + pendingPhotos.length < MAX_ORDER_PHOTOS && <label className="photo-preview-add" htmlFor="order-photos"><ImagePlus size={23} /><span>Добавить</span></label>}
            </div>
          )}
          <div className="wizard-tip"><Info size={18} /><p><strong>Совет:</strong> сделайте общий план и крупное фото проблемного места.</p></div>
        </section>
      );
    }

    if (step === 2) {
      return (
        <section className="wizard-step">
          <StepHeading icon={Pencil} title="Что нужно сделать?" description="Опишите проблему простыми словами — мастер уточнит детали в предложении." />
          <label className="wizard-textarea"><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={8} placeholder="Например: течёт под раковиной после включения воды" autoFocus /><span className={description.length >= 950 ? "is-limit" : ""}>{description.length} / 1000</span></label>
          <div className="wizard-examples"><span>Можно указать:</span><ul><li>что произошло;</li><li>когда появилась проблема;</li><li>что уже пробовали сделать.</li></ul></div>
        </section>
      );
    }

    if (step === 3) {
      return (
        <section className="wizard-step">
          <StepHeading icon={Hammer} title="Выберите категорию" description="Так заказ увидят мастера с подходящими навыками." />
          <div className="category-grid">
            {data.categories.map((category) => {
              const imageSrc = categoryImages[category.slug] ?? categoryImages.other;
              return <button className={categoryId === category.id ? "is-selected" : ""} type="button" key={category.id} aria-pressed={categoryId === category.id} onClick={() => { setCategoryId(category.id); setSubcategoryId(""); }}><span className="category-grid__visual"><Image src={imageSrc} alt="" width={768} height={768} sizes="(max-width: 620px) 45vw, 220px" /></span><strong>{category.name}</strong><Check size={16} /></button>;
            })}
          </div>
          {selectedCategory && selectedCategory.subcategories.length > 0 && <div className="subcategory-picker"><span>Уточните задачу <small>необязательно</small></span><div>{selectedCategory.subcategories.map((subcategory) => <button className={subcategoryId === subcategory.id ? "is-selected" : ""} type="button" key={subcategory.id} onClick={() => setSubcategoryId(subcategory.id === subcategoryId ? "" : subcategory.id)}>{subcategory.name}</button>)}</div></div>}
        </section>
      );
    }

    if (step === 4) {
      return (
        <section className="wizard-step">
          <StepHeading icon={MapPin} title="Куда нужен мастер?" description="Точный адрес будет доступен только выбранному вами мастеру." />
          {data.addresses.length > 0 && <div className="address-mode-tabs"><button className={addressMode === "saved" ? "is-active" : ""} type="button" onClick={() => setAddressMode("saved")}>Сохранённые</button><button className={addressMode === "new" ? "is-active" : ""} type="button" onClick={() => setAddressMode("new")}><Plus size={15} /> Новый адрес</button></div>}
          {addressMode === "saved" && data.addresses.length > 0 ? (
            <div className="wizard-address-list">{data.addresses.map((address) => <button className={savedAddressId === address.id ? "is-selected" : ""} type="button" key={address.id} onClick={() => setSavedAddressId(address.id)}><span><MapPin size={20} /></span><div><strong>{address.street}, {address.house}{address.apartment ? `, кв. ${address.apartment}` : ""}</strong><small>{address.city}{address.isPrimary ? " · Основной" : ""}</small></div><span className="wizard-radio"><Check size={14} /></span></button>)}</div>
          ) : (
            <div className="wizard-address-form">
              <label>Город<input value={newAddress.city} onChange={(event) => updateAddressField("city", event.target.value)} placeholder="Москва" autoComplete="address-level2" /></label>
              <label className="is-wide">Улица<input value={newAddress.street} onChange={(event) => updateAddressField("street", event.target.value)} placeholder="Название улицы" autoComplete="address-line1" /></label>
              <label>Дом<input value={newAddress.house} onChange={(event) => updateAddressField("house", event.target.value)} placeholder="12" /></label>
              <label>Квартира<input value={newAddress.apartment} onChange={(event) => updateAddressField("apartment", event.target.value)} placeholder="45" /></label>
              <label className="is-wide">Комментарий мастеру<textarea value={newAddress.comment} onChange={(event) => updateAddressField("comment", event.target.value)} maxLength={500} rows={3} placeholder="Подъезд, этаж, домофон" /></label>
              <label className="checkbox-field is-wide"><input type="checkbox" checked={saveNewAddress} onChange={(event) => setSaveNewAddress(event.target.checked)} /><span><Check size={14} /></span> Сохранить адрес для следующих заказов</label>
            </div>
          )}
          <label className="service-area-picker">
            <span>Район</span>
            <select value={serviceAreaId} onChange={(event) => setServiceAreaId(event.target.value)}>
              <option value="">Выберите район</option>
              {data.serviceAreas.map((area) => (
                <option key={area.id} value={area.id}>{area.name} · {area.city}</option>
              ))}
            </select>
            <small>Мастера увидят этот район вместо точного адреса.</small>
          </label>
          <div className="privacy-notice"><ShieldCheck size={19} /><p><strong>Адрес защищён.</strong> До выбора исполнителя мастера увидят только город и примерный район.</p></div>
        </section>
      );
    }

    if (step === 5) {
      return (
        <section className="wizard-step">
          <StepHeading icon={Clock3} title="Когда нужен мастер?" description="Выберите удобный вариант. Точное время можно согласовать с мастером." />
          <div className="schedule-options">
            <button className={scheduleKind === "NOW" ? "is-selected" : ""} type="button" onClick={() => setScheduleKind("NOW")}><span><Sparkles size={22} /></span><div><strong>Сейчас</strong><small>Начать поиск немедленно</small></div><span className="wizard-radio"><Check size={14} /></span></button>
            <button className={scheduleKind === "TODAY" ? "is-selected" : ""} type="button" onClick={() => setScheduleKind("TODAY")}><span><Clock3 size={22} /></span><div><strong>Сегодня</strong><small>В удобное время сегодня</small></div><span className="wizard-radio"><Check size={14} /></span></button>
            <button className={scheduleKind === "CUSTOM" ? "is-selected" : ""} type="button" onClick={() => setScheduleKind("CUSTOM")}><span><CalendarDays size={22} /></span><div><strong>Выбрать дату и время</strong><small>Запланировать заранее</small></div><span className="wizard-radio"><Check size={14} /></span></button>
          </div>
          {scheduleKind === "TODAY" && <label className="schedule-time-field">Удобное время<input type="time" value={todayTime} onChange={(event) => setTodayTime(event.target.value)} /></label>}
          {scheduleKind === "CUSTOM" && <div className="schedule-custom-fields"><label>Дата<input type="date" min={todayDate} value={customDate} onChange={(event) => setCustomDate(event.target.value)} /></label><label>Время<input type="time" value={customTime} onChange={(event) => setCustomTime(event.target.value)} /></label></div>}
        </section>
      );
    }

    if (step === 6) {
      return (
        <section className="wizard-step">
          <StepHeading icon={Zap} title="Обычный или срочный заказ?" description="Срочные заказы получают повышенный приоритет у мастеров онлайн." />
          <div className="order-type-grid">
            <button className={orderType === "NORMAL" ? "is-selected" : ""} type="button" onClick={() => setOrderType("NORMAL")}><span><Clock3 size={24} /></span><div><strong>Обычный</strong><p>Подходит, если можно спокойно сравнить предложения.</p><small>Без дополнительного коэффициента</small></div><span className="wizard-radio"><Check size={14} /></span></button>
            <button className={`is-urgent ${orderType === "URGENT" ? "is-selected" : ""}`} type="button" onClick={() => setOrderType("URGENT")}><span><Zap size={24} /></span><div><strong>Срочный</strong><p>Для задачи, которую нужно решить как можно быстрее.</p><small>Коэффициент ×{formatMultiplier(data.urgencyMultiplier)}</small></div><span className="wizard-radio"><Check size={14} /></span></button>
          </div>
          {orderType === "URGENT" && <div className="urgency-explainer"><Info size={19} /><div><strong>Как считается срочная цена</strong><p>К вашей базовой цене применяется настроенный коэффициент ×{formatMultiplier(data.urgencyMultiplier)}. Точный расчёт будет показан на следующем шаге.</p></div></div>}
        </section>
      );
    }

    if (step === 7) {
      return (
        <section className="wizard-step">
          <StepHeading icon={WalletCards} title="Сколько вы готовы заплатить?" description="Вы предлагаете цену. Мастер сможет принять её или предложить другую." />
          <div className="price-field"><label htmlFor="order-price">{orderType === "URGENT" ? "Ваша базовая цена" : "Предлагаемая цена"}</label><div><input id="order-price" type="number" inputMode="numeric" min="500" max="1000000" step="100" value={basePrice} onChange={(event) => setBasePrice(event.target.value)} placeholder="3 000" autoFocus /><span>₽</span></div></div>
          <div className="price-suggestions"><span>Быстрый выбор</span><div>{[1500, 3000, 5000, 8000].map((price) => <button type="button" key={price} onClick={() => setBasePrice(String(price))}>{formatRubles(price)}</button>)}</div></div>
          <div className={`price-calculation ${orderType === "URGENT" ? "is-urgent" : ""}`}>
            <div><span>Ваша базовая цена</span><strong>{formatRubles(numericBasePrice)}</strong></div>
            {orderType === "URGENT" && <div><span>Срочный коэффициент</span><strong>×{formatMultiplier(data.urgencyMultiplier)}</strong></div>}
            <div className="price-calculation__total"><span>Итоговая цена заказа</span><strong>{formatRubles(totalPrice)}</strong></div>
          </div>
        </section>
      );
    }

    const reviewAddress = addressMode === "saved" && selectedSavedAddress ? selectedSavedAddress : newAddress;
    const scheduleLabel = scheduleKind === "NOW"
      ? "Сейчас"
      : scheduleKind === "TODAY"
        ? `Сегодня, ${todayTime}`
        : scheduledAt
          ? `${new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(scheduledAt)}, ${customTime}`
          : "Дата и время не выбраны";

    return (
      <section className="wizard-step wizard-review">
        <StepHeading icon={Check} title="Проверьте заказ" description="Убедитесь, что всё верно. После отправки начнём искать мастеров." />
        <ReviewRow title="Фотографии" onEdit={() => goToStep(1)}>{photos.length ? <div className="review-photos">{photos.map((photo, index) => <Image key={photo.id} src={photo.url} alt={`Фото задачи ${index + 1}`} width={78} height={62} unoptimized />)}</div> : <span className="review-empty">Без фотографий</span>}</ReviewRow>
        <ReviewRow title="Описание" onEdit={() => goToStep(2)}><p>{description}</p></ReviewRow>
        <ReviewRow title="Категория" onEdit={() => goToStep(3)}><p>{selectedCategory?.name}{selectedSubcategory ? ` → ${selectedSubcategory.name}` : ""}</p></ReviewRow>
        <ReviewRow title="Адрес" onEdit={() => goToStep(4)}><p>{reviewAddress.city}, {reviewAddress.street}, {reviewAddress.house}{reviewAddress.apartment ? `, кв. ${reviewAddress.apartment}` : ""}</p><small>Район: {data.serviceAreas.find((area) => area.id === serviceAreaId)?.name ?? "не выбран"}</small>{reviewAddress.comment && <small>{reviewAddress.comment}</small>}</ReviewRow>
        <div className="review-grid-row"><ReviewRow title="Когда" onEdit={() => goToStep(5)}><p>{scheduleLabel}</p></ReviewRow><ReviewRow title="Тип заказа" onEdit={() => goToStep(6)}><p>{orderType === "URGENT" ? "Срочный" : "Обычный"}</p></ReviewRow></div>
        <ReviewRow title="Цена" onEdit={() => goToStep(7)}><div className="review-price"><strong>{formatRubles(totalPrice)}</strong>{orderType === "URGENT" && <small>{formatRubles(numericBasePrice)} × {formatMultiplier(data.urgencyMultiplier)}</small>}</div></ReviewRow>
        <div className="review-privacy"><ShieldCheck size={19} /><p>Точный адрес увидит только выбранный вами мастер.</p></div>
      </section>
    );
  }

  return (
    <div className="order-wizard-page">
      <header className="wizard-topbar">
        <Link href="/client"><X size={20} /><span>Закрыть</span></Link>
        <div><span>Этап {currentStageIndex + 1} из {stages.length}</span><strong>{currentStage.title}</strong><small>{currentStage.hint}</small></div>
        <span className="wizard-draft-status"><Check size={14} /> Черновик</span>
      </header>
      <div className="wizard-progress" aria-label={`Шаг ${step} из ${steps.length}`}><span style={{ width: `${progress}%` }} /></div>
      <ol className="wizard-stepper" aria-label="Этапы создания заказа">{stages.map((stage, index) => <li className={index === currentStageIndex ? "is-current" : index < currentStageIndex ? "is-complete" : ""} key={stage.title}><span>{index < currentStageIndex ? <Check size={12} /> : index + 1}</span><small>{stage.title}</small></li>)}</ol>
      <div className="wizard-content">{renderStep()}</div>
      <footer className="wizard-footer">
        <div>
          {step > 1 ? <button className="button button--secondary" type="button" onClick={previousStep} disabled={isPending || isUploading}><ArrowLeft size={17} /> Назад</button> : <Link className="button button--secondary" href="/client"><ArrowLeft size={17} /> Назад</Link>}
          <span className="wizard-save-note"><Check size={13} /> Данные сохраняются по шагам</span>
        </div>
        <div>
          {error && <span className="wizard-error" role="alert"><AlertCircle size={16} /> {error}</span>}
          {step < 8 ? <button className="button button--primary button--large" type="button" onClick={nextStep} disabled={isPending || isUploading}>{isPending ? <><LoaderCircle className="spin" size={18} /> Сохраняем…</> : <>{nextLabels[step - 1]} <ArrowRight size={18} /></>}</button> : <button className="button button--primary button--large" type="button" onClick={submit} disabled={isPending}>{isPending ? <><LoaderCircle className="spin" size={18} /> Публикуем…</> : <><Search size={18} /> Найти мастера</>}</button>}
        </div>
      </footer>
    </div>
  );
}

function StepHeading({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return <header className="wizard-step-heading"><span><Icon size={23} /></span><div><h1>{title}</h1><p>{description}</p></div></header>;
}

function ReviewRow({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return <section className="review-row"><div><span>{title}</span><button type="button" onClick={onEdit}><Pencil size={14} /> Изменить</button></div>{children}</section>;
}
