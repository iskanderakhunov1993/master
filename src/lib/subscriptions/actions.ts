"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/guards";

import { createClientSubscription, updateClientSubscriptionStatus } from "./repository";
import type { SubscriptionActionResult, SubscriptionInput } from "./types";

const subscriptionSchema = z.object({
  categoryId: z.string().min(1, "Выберите категорию"),
  subcategoryId: z.string().optional(),
  addressId: z.string().min(1, "Выберите адрес"),
  serviceAreaId: z.string().min(1, "Выберите район"),
  description: z.string().trim().min(10, "Опишите работу минимум в 10 символах").max(1000),
  frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]),
  firstServiceAt: z.number().int().positive(),
  priceRubles: z.number().int().min(500, "Минимальная цена — 500 ₽").max(1_000_000),
});

function refreshSubscriptions() {
  revalidatePath("/client");
  revalidatePath("/client/subscriptions");
  revalidatePath("/client/orders");
  revalidatePath("/client/calendar");
  revalidatePath("/master/orders/new");
}

function subscriptionError(error: unknown): SubscriptionActionResult {
  const code = error instanceof Error ? error.message : "";
  const messages: Record<string, string> = {
    SUBSCRIPTION_CATEGORY_NOT_FOUND: "Выбранная категория недоступна",
    SUBSCRIPTION_SUBCATEGORY_NOT_FOUND: "Выбранная подкатегория недоступна",
    SUBSCRIPTION_ADDRESS_NOT_FOUND: "Сохранённый адрес не найден",
    SUBSCRIPTION_AREA_NOT_FOUND: "Выберите доступный район",
    SUBSCRIPTION_AREA_CITY_MISMATCH: "Район не относится к городу выбранного адреса",
    SUBSCRIPTION_NOT_FOUND: "Подписка не найдена",
    SUBSCRIPTION_CANCELLED: "Отменённую подписку нельзя возобновить",
    SUBSCRIPTION_UPDATE_CONFLICT: "Подписка уже изменилась. Обновите страницу",
  };
  return { ok: false, message: messages[code] ?? "Не удалось сохранить подписку" };
}

export async function createSubscriptionAction(input: SubscriptionInput): Promise<SubscriptionActionResult> {
  const client = await requireRole("CLIENT");
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Проверьте данные" };
  if (parsed.data.firstServiceAt <= Date.now() + 30 * 60 * 1000) {
    return { ok: false, message: "Первый выезд должен быть минимум через 30 минут" };
  }
  try {
    const result = createClientSubscription(client.id, parsed.data);
    refreshSubscriptions();
    return { ok: true, subscriptionId: result.subscription.id, orderId: result.orderId };
  } catch (error) {
    return subscriptionError(error);
  }
}

export async function setSubscriptionStatusAction(
  subscriptionId: string,
  status: "ACTIVE" | "PAUSED" | "CANCELLED",
): Promise<SubscriptionActionResult> {
  const client = await requireRole("CLIENT");
  const parsed = z.object({
    subscriptionId: z.string().min(1),
    status: z.enum(["ACTIVE", "PAUSED", "CANCELLED"]),
  }).safeParse({ subscriptionId, status });
  if (!parsed.success) return { ok: false, message: "Не удалось изменить подписку. Обновите страницу и попробуйте снова" };
  try {
    updateClientSubscriptionStatus(client.id, parsed.data.subscriptionId, parsed.data.status);
    refreshSubscriptions();
    return { ok: true, subscriptionId };
  } catch (error) {
    return subscriptionError(error);
  }
}

