"use client";

import {
  AlertCircle,
  CalendarDays,
  Camera,
  Check,
  Clock3,
  Hammer,
  ImagePlus,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  Search,
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
import { ChangeEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";

import type { ClientAddressInput } from "@/lib/addresses/types";
import {
  saveOrderAddressAction,
  saveOrderCategoryAction,
  saveOrderDescriptionAction,
  saveOrderPriceAction,
  saveOrderScheduleAction,
  saveOrderTypeAction,
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
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState<{ description: boolean; price: boolean }>({ description: false, price: false });
  const [error, setError] = useState("");
  const [serverFieldError, setServerFieldError] = useState<{ key: string; message: string; signature: string } | null>(null);
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

  const descriptionRef = useRef<HTMLElement>(null);
  const categoryRef = useRef<HTMLElement>(null);
  const addressRef = useRef<HTMLElement>(null);
  const scheduleRef = useRef<HTMLElement>(null);
  const priceRef = useRef<HTMLElement>(null);
  const sectionRefs: Record<string, React.RefObject<HTMLElement | null>> = {
    description: descriptionRef,
    category: categoryRef,
    address: addressRef,
    schedule: scheduleRef,
    price: priceRef,
  };
  const sectionLabels: Record<string, string> = {
    description: "Что нужно сделать",
    category: "Категория",
    address: "Адрес",
    schedule: "Когда нужен мастер",
    price: "Цена",
  };
  const summaryRef = useRef<HTMLDivElement>(null);

  const selectedCategory = data.categories.find((category) => category.id === categoryId);
  const multiplier = orderType === "URGENT" ? data.urgencyMultiplier : 1;
  const numericBasePrice = Number(basePrice) || 0;
  const totalPrice = Math.round(numericBasePrice * multiplier);

  const scheduledAt = useMemo(() => {
    if (scheduleKind === "NOW") return null;
    if (scheduleKind === "TODAY") return parseDateTime(todayDate, todayTime);
    return parseDateTime(customDate, customTime);
  }, [customDate, customTime, scheduleKind, todayDate, todayTime]);

  const trimmedDescription = description.trim();
  const hasAddress = addressMode === "saved"
    ? Boolean(savedAddressId)
    : Boolean(newAddress.city.trim() && newAddress.street.trim() && newAddress.house.trim());

  const descriptionError = (attempted || touched.description) && trimmedDescription.length < 10 ? "Опишите задачу минимум в 10 символах" : undefined;
  const categoryError = attempted && !categoryId ? "Выберите категорию" : undefined;
  const addressError = attempted && !hasAddress
    ? "Укажите город, улицу и дом или выберите сохранённый адрес"
    : attempted && !serviceAreaId
      ? "Выберите район"
      : undefined;
  const scheduleError = attempted && scheduleKind !== "NOW" && !scheduledAt ? "Укажите дату и время" : undefined;
  const priceError = (attempted || touched.price) && (!basePrice || numericBasePrice < 500) ? "Укажите цену от 500 ₽" : undefined;

  // A server-reported field error is only shown while the fields it was
  // raised against are unchanged — editing anything relevant retires it
  // without needing an effect just to clear state.
  const fieldSignature = JSON.stringify([
    description, categoryId, subcategoryId, addressMode, savedAddressId, serviceAreaId,
    newAddress, scheduleKind, todayTime, customDate, customTime, orderType, basePrice,
  ]);
  const activeServerError = serverFieldError?.signature === fieldSignature ? serverFieldError : null;
  const sectionErrors: Record<string, string | undefined> = {
    description: descriptionError ?? (activeServerError?.key === "description" ? activeServerError.message : undefined),
    category: categoryError ?? (activeServerError?.key === "category" ? activeServerError.message : undefined),
    address: addressError ?? (activeServerError?.key === "address" ? activeServerError.message : undefined),
    schedule: scheduleError ?? (activeServerError?.key === "schedule" ? activeServerError.message : undefined),
    price: priceError ?? (activeServerError?.key === "price" ? activeServerError.message : undefined),
  };
  const summaryItems = attempted
    ? (Object.keys(sectionLabels) as (keyof typeof sectionLabels)[]).filter((key) => sectionErrors[key])
    : [];

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

  function firstInvalidSection(): keyof typeof sectionRefs | null {
    if (trimmedDescription.length < 10) return "description";
    if (!categoryId) return "category";
    if (!hasAddress || !serviceAreaId) return "address";
    if (scheduleKind !== "NOW" && !scheduledAt) return "schedule";
    if (!basePrice || numericBasePrice < 500) return "price";
    return null;
  }

  function scrollToSection(key: keyof typeof sectionRefs) {
    sectionRefs[key].current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const focusSummaryRef = useRef(false);
  useEffect(() => {
    if (focusSummaryRef.current && summaryItems.length > 0) {
      summaryRef.current?.focus();
      focusSummaryRef.current = false;
    }
  });


  function submit() {
    setAttempted(true);
    setError("");
    setServerFieldError(null);

    const invalidSection = firstInvalidSection();
    if (invalidSection) {
      setError("Заполните обязательные поля — они отмечены ниже.");
      focusSummaryRef.current = true;
      return;
    }

    startTransition(async () => {
      const addressInput: OrderAddressInput = addressMode === "saved"
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

      const steps: { key: keyof typeof sectionRefs; run: () => Promise<{ ok: boolean; message?: string }> }[] = [
        { key: "description", run: () => saveOrderDescriptionAction(data.draft.id, description) },
        { key: "category", run: () => saveOrderCategoryAction(data.draft.id, { categoryId, subcategoryId }) },
        { key: "address", run: () => saveOrderAddressAction(data.draft.id, addressInput) },
        { key: "schedule", run: () => saveOrderScheduleAction(data.draft.id, { scheduleKind, scheduledAt }) },
        { key: "price", run: () => saveOrderTypeAction(data.draft.id, orderType).then(() => saveOrderPriceAction(data.draft.id, Number(basePrice))) },
      ];

      for (const step of steps) {
        const result = await step.run();
        if (!result.ok) {
          const message = result.message ?? "Проверьте введённые данные";
          setError(message);
          setServerFieldError({ key: step.key, message, signature: fieldSignature });
          scrollToSection(step.key);
          return;
        }
      }

      const result = await submitOrderAction(data.draft.id);
      if (!result.ok || !result.orderId) {
        setError(result.message ?? "Не удалось отправить заказ");
        return;
      }
      router.push(`/client/orders/${result.orderId}`);
    });
  }

  return (
    <div className="order-wizard-page">
      <header className="wizard-topbar">
        <Link href="/client"><X size={20} /><span>Закрыть</span></Link>
        <div><strong>Новый заказ</strong><small>Опишите задачу — обычно занимает около минуты</small></div>
        <span className="wizard-draft-status"><Check size={14} /> Черновик</span>
      </header>

      <div className="wizard-content">
        <h1 className="order-form-title">Расскажите, что нужно сделать</h1>

        {summaryItems.length > 0 && (
          <div className="order-error-summary" ref={summaryRef} tabIndex={-1} role="alert" aria-labelledby="order-error-summary-title">
            <p className="order-error-summary__title" id="order-error-summary-title"><AlertCircle size={16} /> Есть незаполненные поля</p>
            <ul>
              {summaryItems.map((key) => (
                <li key={key}>
                  <a href={`#section-${key}`} onClick={(event) => { event.preventDefault(); scrollToSection(key); }}>
                    {sectionLabels[key]}: {sectionErrors[key]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <OrderSection sectionRef={descriptionRef} id="section-description" icon={Pencil} title="Что нужно сделать?" error={sectionErrors.description}>
          <label className="wizard-textarea">
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, description: true }))}
              maxLength={1000}
              rows={6}
              placeholder="Например: течёт под раковиной после включения воды"
              className={sectionErrors.description ? "is-invalid" : ""}
              aria-invalid={Boolean(sectionErrors.description)}
              aria-describedby={sectionErrors.description ? "section-description-error" : undefined}
            />
            <span className={description.length >= 950 ? "is-limit" : ""}>{description.length} / 1000</span>
          </label>
        </OrderSection>

        <OrderSection icon={Camera} title="Фото" description="Необязательно">
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
        </OrderSection>

        <OrderSection sectionRef={categoryRef} id="section-category" icon={Hammer} title="Категория" error={sectionErrors.category}>
          <div className="category-grid">
            {data.categories.map((category) => {
              const imageSrc = categoryImages[category.slug] ?? categoryImages.other;
              return <button className={categoryId === category.id ? "is-selected" : ""} type="button" key={category.id} aria-pressed={categoryId === category.id} onClick={() => { setCategoryId(category.id); setSubcategoryId(""); }}><span className="category-grid__visual"><Image src={imageSrc} alt="" width={768} height={768} sizes="(max-width: 620px) 45vw, 220px" /></span><strong>{category.name}</strong><Check size={16} /></button>;
            })}
          </div>
          {selectedCategory && selectedCategory.subcategories.length > 0 && <div className="subcategory-picker"><span>Уточните задачу <small>необязательно</small></span><div>{selectedCategory.subcategories.map((subcategory) => <button className={subcategoryId === subcategory.id ? "is-selected" : ""} type="button" key={subcategory.id} onClick={() => setSubcategoryId(subcategory.id === subcategoryId ? "" : subcategory.id)}>{subcategory.name}</button>)}</div></div>}
        </OrderSection>

        <OrderSection sectionRef={addressRef} id="section-address" icon={MapPin} title="Адрес" description="Точный адрес увидит только выбранный вами мастер." error={sectionErrors.address}>
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
            <select
              value={serviceAreaId}
              onChange={(event) => setServiceAreaId(event.target.value)}
              className={attempted && !serviceAreaId ? "is-invalid" : ""}
              aria-invalid={attempted && !serviceAreaId}
              aria-describedby={sectionErrors.address ? "section-address-error" : undefined}
            >
              <option value="">Выберите район</option>
              {data.serviceAreas.map((area) => (
                <option key={area.id} value={area.id}>{area.name} · {area.city}</option>
              ))}
            </select>
            <small>Мастера увидят этот район вместо точного адреса.</small>
          </label>
        </OrderSection>

        <OrderSection sectionRef={scheduleRef} id="section-schedule" icon={Clock3} title="Когда" error={sectionErrors.schedule}>
          <div className="schedule-options">
            <button className={scheduleKind === "NOW" ? "is-selected" : ""} type="button" onClick={() => setScheduleKind("NOW")}><span><Sparkles size={22} /></span><div><strong>Сейчас</strong><small>Начать поиск немедленно</small></div><span className="wizard-radio"><Check size={14} /></span></button>
            <button className={scheduleKind === "TODAY" ? "is-selected" : ""} type="button" onClick={() => setScheduleKind("TODAY")}><span><Clock3 size={22} /></span><div><strong>Сегодня</strong><small>В удобное время сегодня</small></div><span className="wizard-radio"><Check size={14} /></span></button>
            <button className={scheduleKind === "CUSTOM" ? "is-selected" : ""} type="button" onClick={() => setScheduleKind("CUSTOM")}><span><CalendarDays size={22} /></span><div><strong>Выбрать дату и время</strong><small>Запланировать заранее</small></div><span className="wizard-radio"><Check size={14} /></span></button>
          </div>
          {scheduleKind === "TODAY" && <label className="schedule-time-field">Удобное время<input type="time" value={todayTime} onChange={(event) => setTodayTime(event.target.value)} /></label>}
          {scheduleKind === "CUSTOM" && <div className="schedule-custom-fields"><label>Дата<input type="date" min={todayDate} value={customDate} onChange={(event) => setCustomDate(event.target.value)} /></label><label>Время<input type="time" value={customTime} onChange={(event) => setCustomTime(event.target.value)} /></label></div>}

          <div className="order-type-divider"><span>Обычный или срочный заказ?</span></div>
          <div className="order-type-grid">
            <button className={orderType === "NORMAL" ? "is-selected" : ""} type="button" onClick={() => setOrderType("NORMAL")}><span><Clock3 size={24} /></span><div><strong>Обычный</strong><p>Подходит, если можно спокойно сравнить предложения.</p><small>Без дополнительного коэффициента</small></div><span className="wizard-radio"><Check size={14} /></span></button>
            <button className={`is-urgent ${orderType === "URGENT" ? "is-selected" : ""}`} type="button" onClick={() => setOrderType("URGENT")}><span><Zap size={24} /></span><div><strong>Срочный</strong><p>Для задачи, которую нужно решить как можно быстрее.</p><small>Коэффициент ×{formatMultiplier(data.urgencyMultiplier)}</small></div><span className="wizard-radio"><Check size={14} /></span></button>
          </div>
        </OrderSection>

        <OrderSection sectionRef={priceRef} id="section-price" icon={WalletCards} title="Ваша цена" description="Мастер примет её или предложит свою." error={sectionErrors.price}>
          <div className="price-field">
            <label htmlFor="order-price">{orderType === "URGENT" ? "Ваша базовая цена" : "Предлагаемая цена"}</label>
            <div>
              <input
                id="order-price"
                type="number"
                inputMode="numeric"
                min="500"
                max="1000000"
                step="100"
                value={basePrice}
                onChange={(event) => setBasePrice(event.target.value)}
                onBlur={() => setTouched((current) => ({ ...current, price: true }))}
                placeholder="3 000"
                className={sectionErrors.price ? "is-invalid" : ""}
                aria-invalid={Boolean(sectionErrors.price)}
                aria-describedby={sectionErrors.price ? "section-price-error" : undefined}
              />
              <span>₽</span>
            </div>
          </div>
          <div className="price-suggestions"><span>Быстрый выбор</span><div>{[1500, 3000, 5000, 8000].map((price) => <button type="button" key={price} onClick={() => setBasePrice(String(price))}>{formatRubles(price)}</button>)}</div></div>
          <div className={`price-calculation ${orderType === "URGENT" ? "is-urgent" : ""}`}>
            <div><span>Ваша базовая цена</span><strong>{formatRubles(numericBasePrice)}</strong></div>
            {orderType === "URGENT" && <div><span>Срочный коэффициент</span><strong>×{formatMultiplier(data.urgencyMultiplier)}</strong></div>}
            <div className="price-calculation__total"><span>Итоговая цена заказа</span><strong>{formatRubles(totalPrice)}</strong></div>
          </div>
        </OrderSection>
      </div>

      <footer className="wizard-footer">
        <div>
          <Link className="button button--secondary" href="/client"><X size={17} /> Закрыть</Link>
          <span className="wizard-save-note"><Check size={13} /> Черновик сохраняется автоматически</span>
        </div>
        <div>
          {error && <span className="wizard-error" role="alert"><AlertCircle size={16} /> {error}</span>}
          <button className="button button--primary button--large" type="button" onClick={submit} disabled={isPending || isUploading}>{isPending ? <><LoaderCircle className="spin" size={18} /> Создаём заказ…</> : <><Search size={18} /> Создать заказ</>}</button>
        </div>
      </footer>
    </div>
  );
}

function OrderSection({
  sectionRef,
  id,
  icon: Icon,
  title,
  description,
  error,
  children,
}: {
  sectionRef?: React.RefObject<HTMLElement | null>;
  id?: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`order-section${error ? " has-error" : ""}`} id={id} ref={sectionRef as React.RefObject<HTMLElement>}>
      <header className="wizard-step-heading">
        <span><Icon size={23} /></span>
        <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
      </header>
      {children}
      {error && <p className="order-field-error" id={id ? `${id}-error` : undefined} role="alert"><AlertCircle size={14} /> {error}</p>}
    </section>
  );
}
