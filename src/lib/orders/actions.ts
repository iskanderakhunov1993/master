"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/guards";
import { getSession } from "@/lib/auth/session";
import { matchOrder } from "@/lib/marketplace/matching";
import { createClientAddress, findClientAddress } from "@/lib/addresses/repository";
import type { ClientAddress } from "@/lib/addresses/types";

import { createChangeRequest, respondToChangeRequest } from "./change-requests";
import { sendOrderMessage } from "./chat";
import { reportMasterNoShow, transitionOrder } from "./lifecycle";
import { fileWarrantyClaim } from "./warranty";
import {
  saveAddressStep,
  saveCategoryStep,
  saveDescriptionStep,
  saveOrderTypeStep,
  savePhotoStep,
  savePriceStep,
  saveScheduleStep,
  setDraftCurrentStep,
  submitOrder,
  getClientOrder,
} from "./repository";
import { submitClientReview, submitMasterReview } from "./reviews";
import type { OrderActionResult, OrderType, ScheduleKind } from "./types";

export type LifecycleActionResult = { ok: boolean; message?: string };

export type OrderAddressInput =
  | { mode: "saved"; addressId: string; serviceAreaId: string }
  | {
      mode: "new";
      serviceAreaId: string;
      city: string;
      street: string;
      house: string;
      apartment?: string;
      comment?: string;
      saveAddress: boolean;
    };

const masterStatusSchema = z.enum([
  "MASTER_CONFIRMED",
  "MASTER_ON_THE_WAY",
  "MASTER_ARRIVED",
  "IN_PROGRESS",
  "COMPLETED_BY_MASTER",
  "CANCELLED_BY_MASTER",
]);

const clientReviewSchema = z.object({
  orderId: z.string().min(1),
  overallRating: z.number().int().min(1).max(5),
  qualityRating: z.number().int().min(1).max(5),
  punctualityRating: z.number().int().min(1).max(5),
  communicationRating: z.number().int().min(1).max(5),
  agreementRating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

const masterReviewSchema = z.object({
  orderId: z.string().min(1),
  overallRating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

function revalidateOrder(orderId: string) {
  revalidatePath("/client");
  revalidatePath("/client/orders");
  revalidatePath(`/client/orders/${orderId}`);
  revalidatePath("/master");
  revalidatePath("/master/orders");
  revalidatePath(`/master/orders/${orderId}`);
}

function failure(error: unknown): LifecycleActionResult {
  const code = error instanceof Error ? error.message : "";
  const messages: Record<string, string> = {
    ORDER_NOT_FOUND: "Заказ не найден",
    ORDER_ACCESS_DENIED: "У вас нет доступа к этому заказу",
    ORDER_TRANSITION_NOT_ALLOWED: "Действие уже выполнено или недоступно на текущем этапе",
    ORDER_TRANSITION_CONFLICT: "Статус уже изменился. Данные сейчас обновятся",
    SELECTED_MASTER_MISSING: "У заказа не выбран мастер",
    REVIEW_ACCESS_DENIED: "Нельзя оставить отзыв на чужой заказ",
    REVIEW_ALREADY_EXISTS: "Вы уже оставили отзыв по этому заказу",
    REVIEW_ORDER_NOT_COMPLETED: "Отзыв можно оставить только после завершения заказа",
    REVIEW_RATING_INVALID: "Поставьте оценку от 1 до 5",
    REVIEW_COMMENT_TOO_LONG: "Комментарий не должен превышать 1000 символов",
    BEFORE_PHOTO_REQUIRED: "Добавьте фото «до» — без него нельзя начать работу",
    AFTER_PHOTO_REQUIRED: "Добавьте фото «после» — без него нельзя завершить работу",
    CHANGE_REQUEST_PENDING: "Сначала дождитесь ответа клиента на изменение цены",
    CHANGE_REQUEST_NOT_ALLOWED: "Изменить цену можно только пока вы на месте или выполняете работу",
    CHANGE_REQUEST_SAME_PRICE: "Новая цена совпадает с текущей",
    CHANGE_REQUEST_ALREADY_PENDING: "По этому заказу уже есть запрос на изменение цены",
    CHANGE_REQUEST_NOT_FOUND: "Запрос на изменение цены не найден",
    CHANGE_REQUEST_STALE: "Запрос уже обработан. Обновите страницу",
    CHAT_NOT_AVAILABLE: "Чат откроется после того, как вы выберете мастера",
    WARRANTY_NOT_FOUND: "Гарантия не найдена",
    WARRANTY_ALREADY_CLAIMED: "По этой гарантии уже открыто обращение",
    WARRANTY_EXPIRED: "Срок гарантии истёк",
    NO_SHOW_NOT_ELIGIBLE: "Сейчас нельзя сообщить о неявке — мастер уже приступил к заказу",
    NO_SHOW_REQUIRES_SCHEDULE: "Неявку можно зафиксировать только для заказа с назначенным временем",
    NO_SHOW_TOO_EARLY: "Подождите ещё немного — мастер может опаздывать",
  };
  return { ok: false, message: messages[code] ?? "Не удалось выполнить действие. Попробуйте ещё раз" };
}

function orderFailure(error: unknown): OrderActionResult {
  const code = error instanceof Error ? error.message : "";
  const messages: Record<string, string> = {
    DRAFT_NOT_FOUND: "Черновик заказа не найден",
    DESCRIPTION_REQUIRED: "Опишите задачу минимум в 10 символах",
    CATEGORY_NOT_FOUND: "Выберите доступную категорию",
    SUBCATEGORY_NOT_FOUND: "Выбранная подкатегория недоступна",
    ADDRESS_REQUIRED: "Укажите город, улицу и дом",
    ADDRESS_NOT_FOUND: "Сохранённый адрес не найден",
    SERVICE_AREA_NOT_FOUND: "Выберите район",
    SERVICE_AREA_REQUIRED: "Выберите район",
    SERVICE_AREA_CITY_MISMATCH: "Выбранный район не относится к указанному городу",
    SCHEDULE_REQUIRED: "Выберите, когда нужен мастер",
    SCHEDULE_TIME_REQUIRED: "Укажите дату и время",
    SCHEDULE_TIME_PAST: "Дата и время должны быть в будущем",
    PRICE_REQUIRED: "Укажите цену от 500 ₽",
    ORDER_SUBMIT_CONFLICT: "Заказ уже отправлен или изменён",
  };
  return { ok: false, message: messages[code] ?? "Не удалось сохранить заказ" };
}

const newAddressSchema = z.object({
  mode: z.literal("new"),
  serviceAreaId: z.string().min(1, "Выберите район"),
  city: z.string().trim().min(2, "Укажите город").max(100),
  street: z.string().trim().min(2, "Укажите улицу").max(160),
  house: z.string().trim().min(1, "Укажите дом").max(30),
  apartment: z.string().trim().max(30).optional(),
  comment: z.string().trim().max(500).optional(),
  saveAddress: z.boolean(),
});

const savedAddressSchema = z.object({
  mode: z.literal("saved"),
  addressId: z.string().min(1, "Выберите адрес"),
  serviceAreaId: z.string().min(1, "Выберите район"),
});

export async function saveOrderPhotoStepAction(orderId: string): Promise<OrderActionResult> {
  const client = await requireRole("CLIENT");
  try {
    savePhotoStep(client.id, orderId);
    return { ok: true };
  } catch (error) {
    return orderFailure(error);
  }
}

export async function saveOrderDescriptionAction(
  orderId: string,
  description: string,
): Promise<OrderActionResult> {
  const client = await requireRole("CLIENT");
  const parsed = z.string().trim().min(10, "Опишите задачу минимум в 10 символах").max(1000).safeParse(description);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };
  try {
    saveDescriptionStep(client.id, orderId, parsed.data);
    return { ok: true };
  } catch (error) {
    return orderFailure(error);
  }
}

export async function saveOrderCategoryAction(
  orderId: string,
  input: { categoryId: string; subcategoryId?: string },
): Promise<OrderActionResult> {
  const client = await requireRole("CLIENT");
  const parsed = z.object({ categoryId: z.string().min(1, "Выберите категорию"), subcategoryId: z.string().optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };
  try {
    saveCategoryStep(client.id, orderId, parsed.data.categoryId, parsed.data.subcategoryId || null);
    return { ok: true };
  } catch (error) {
    return orderFailure(error);
  }
}

export async function saveOrderAddressAction(
  orderId: string,
  input: OrderAddressInput,
): Promise<OrderActionResult> {
  const client = await requireRole("CLIENT");
  const parsed = z.discriminatedUnion("mode", [savedAddressSchema, newAddressSchema]).safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };
  try {
    let address: ClientAddress;
    if (parsed.data.mode === "saved") {
      const saved = findClientAddress(client.id, parsed.data.addressId);
      if (!saved) throw new Error("ADDRESS_NOT_FOUND");
      address = saved;
    } else if (parsed.data.saveAddress) {
      address = createClientAddress(client.id, {
        city: parsed.data.city,
        street: parsed.data.street,
        house: parsed.data.house,
        apartment: parsed.data.apartment ?? "",
        comment: parsed.data.comment ?? "",
      });
    } else {
      address = {
        id: "",
        city: parsed.data.city,
        street: parsed.data.street,
        house: parsed.data.house,
        apartment: parsed.data.apartment ?? "",
        comment: parsed.data.comment ?? "",
        isPrimary: false,
      };
    }
    saveAddressStep(client.id, orderId, address, parsed.data.serviceAreaId);
    revalidatePath("/client/addresses");
    return { ok: true };
  } catch (error) {
    return orderFailure(error);
  }
}

export async function saveOrderScheduleAction(
  orderId: string,
  input: { scheduleKind: ScheduleKind; scheduledAt: number | null },
): Promise<OrderActionResult> {
  const client = await requireRole("CLIENT");
  const parsed = z.object({
    scheduleKind: z.enum(["NOW", "TODAY", "CUSTOM"]),
    scheduledAt: z.number().int().positive().nullable(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Укажите дату и время выезда" };
  if (parsed.data.scheduleKind !== "NOW" && (!parsed.data.scheduledAt || parsed.data.scheduledAt <= Date.now())) {
    return { ok: false, message: "Дата и время должны быть в будущем" };
  }
  try {
    saveScheduleStep(client.id, orderId, parsed.data.scheduleKind, parsed.data.scheduledAt);
    return { ok: true };
  } catch (error) {
    return orderFailure(error);
  }
}

export async function saveOrderTypeAction(orderId: string, orderType: OrderType): Promise<OrderActionResult> {
  const client = await requireRole("CLIENT");
  const parsed = z.enum(["NORMAL", "URGENT"]).safeParse(orderType);
  if (!parsed.success) return { ok: false, message: "Выберите тип заказа" };
  try {
    saveOrderTypeStep(client.id, orderId, parsed.data);
    return { ok: true };
  } catch (error) {
    return orderFailure(error);
  }
}

export async function saveOrderPriceAction(orderId: string, price: number): Promise<OrderActionResult> {
  const client = await requireRole("CLIENT");
  const parsed = z.number().int().min(500, "Минимальная цена — 500 ₽").max(1_000_000).safeParse(price);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };
  try {
    savePriceStep(client.id, orderId, parsed.data);
    return { ok: true };
  } catch (error) {
    return orderFailure(error);
  }
}

export async function setOrderDraftStepAction(orderId: string, step: number): Promise<OrderActionResult> {
  const client = await requireRole("CLIENT");
  try {
    setDraftCurrentStep(client.id, orderId, step);
    return { ok: true };
  } catch (error) {
    return orderFailure(error);
  }
}

export async function submitOrderAction(orderId: string): Promise<OrderActionResult> {
  const client = await requireRole("CLIENT");
  try {
    submitOrder(client.id, orderId);
    revalidateOrder(orderId);
    revalidatePath("/client/tasks");
    revalidatePath("/client/calendar");
    return { ok: true, orderId };
  } catch (error) {
    return orderFailure(error);
  }
}

export async function refreshOrderSearchAction(orderId: string): Promise<LifecycleActionResult> {
  const client = await requireRole("CLIENT");
  const order = getClientOrder(client.id, orderId);
  if (!order) return { ok: false, message: "Заказ не найден" };
  if (!["SEARCHING_MASTERS", "OFFERS_RECEIVED"].includes(order.status)) {
    return { ok: false, message: "Поиск уже завершён или заказ отменён" };
  }
  try {
    matchOrder(orderId);
    revalidateOrder(orderId);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function cancelClientOrderAction(orderId: string): Promise<LifecycleActionResult> {
  const client = await requireRole("CLIENT");
  if (!orderId) return { ok: false, message: "Заказ не найден" };
  try {
    transitionOrder({ orderId, actorId: client.id, actorRole: "CLIENT", toStatus: "CANCELLED_BY_CLIENT" });
    revalidateOrder(orderId);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function reportMasterNoShowAction(orderId: string): Promise<LifecycleActionResult> {
  const client = await requireRole("CLIENT");
  if (!orderId) return { ok: false, message: "Заказ не найден" };
  try {
    reportMasterNoShow({ orderId, clientId: client.id });
    revalidateOrder(orderId);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function advanceMasterOrderAction(input: {
  orderId: string;
  toStatus: z.infer<typeof masterStatusSchema>;
}): Promise<LifecycleActionResult> {
  const master = await requireRole("MASTER");
  const parsed = z.object({ orderId: z.string().min(1), toStatus: masterStatusSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Не удалось обновить статус заказа. Обновите страницу и попробуйте снова" };
  try {
    transitionOrder({
      orderId: parsed.data.orderId,
      actorId: master.id,
      actorRole: "MASTER",
      toStatus: parsed.data.toStatus,
    });
    revalidateOrder(parsed.data.orderId);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function proposeChangeOrderAction(input: {
  orderId: string;
  proposedPriceRubles: number;
  reason: string;
}): Promise<LifecycleActionResult> {
  const master = await requireRole("MASTER");
  const parsed = z.object({
    orderId: z.string().min(1),
    proposedPriceRubles: z.number().int().min(500, "Цена — от 500 до 1 000 000 ₽").max(1_000_000),
    reason: z.string().trim().min(10, "Опишите причину минимум в 10 символах").max(500),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };
  try {
    createChangeRequest({
      masterId: master.id,
      orderId: parsed.data.orderId,
      proposedPriceRubles: parsed.data.proposedPriceRubles,
      reason: parsed.data.reason,
    });
    revalidateOrder(parsed.data.orderId);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function respondToChangeOrderAction(input: {
  orderId: string;
  requestId: string;
  accept: boolean;
}): Promise<LifecycleActionResult> {
  const client = await requireRole("CLIENT");
  const parsed = z.object({
    orderId: z.string().min(1),
    requestId: z.string().min(1),
    accept: z.boolean(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Не удалось обработать ответ. Обновите страницу" };
  try {
    respondToChangeRequest({
      clientId: client.id,
      orderId: parsed.data.orderId,
      requestId: parsed.data.requestId,
      accept: parsed.data.accept,
    });
    revalidateOrder(parsed.data.orderId);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function sendOrderMessageAction(orderId: string, body: string): Promise<LifecycleActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, message: "Требуется вход" };

  const parsed = z.string().trim().min(1, "Введите сообщение").max(2000, "Сообщение слишком длинное").safeParse(body);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };

  try {
    sendOrderMessage({ orderId, senderId: user.id, body: parsed.data });
    revalidateOrder(orderId);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function fileWarrantyClaimAction(input: { warrantyId: string; description: string }): Promise<LifecycleActionResult> {
  const client = await requireRole("CLIENT");
  const parsed = z.object({
    warrantyId: z.string().min(1),
    description: z.string().trim().min(10, "Опишите проблему минимум в 10 символах").max(1000, "Описание слишком длинное"),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };

  try {
    fileWarrantyClaim({ clientId: client.id, warrantyId: parsed.data.warrantyId, description: parsed.data.description });
    revalidatePath("/client/home");
    revalidatePath("/admin/complaints");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function respondToCompletionAction(
  orderId: string,
  isCompleted: boolean,
): Promise<LifecycleActionResult> {
  const client = await requireRole("CLIENT");
  if (!orderId) return { ok: false, message: "Заказ не найден" };
  try {
    transitionOrder({
      orderId,
      actorId: client.id,
      actorRole: "CLIENT",
      toStatus: isCompleted ? "COMPLETED" : "DISPUTED",
      reason: isCompleted ? undefined : "Клиент сообщил о проблеме с выполнением",
    });
    revalidateOrder(orderId);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function submitClientReviewAction(
  input: z.infer<typeof clientReviewSchema>,
): Promise<LifecycleActionResult> {
  const client = await requireRole("CLIENT");
  const parsed = clientReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Поставьте все оценки от 1 до 5" };
  try {
    submitClientReview({ clientId: client.id, ...parsed.data });
    revalidateOrder(parsed.data.orderId);
    revalidatePath("/masters");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function submitMasterReviewAction(
  input: z.infer<typeof masterReviewSchema>,
): Promise<LifecycleActionResult> {
  const master = await requireRole("MASTER");
  const parsed = masterReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Поставьте оценку от 1 до 5" };
  try {
    submitMasterReview({ masterId: master.id, ...parsed.data });
    revalidateOrder(parsed.data.orderId);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
