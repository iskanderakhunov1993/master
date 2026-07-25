"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/guards";

import { skipMatchedOrder } from "./matching";
import { createMasterOffer } from "./offers";
import { confirmMasterSelection, selectMasterOffer } from "./selection";
import type { MarketplaceActionResult } from "./types";

const offerSchema = z.object({
  orderId: z.string().min(1),
  proposedPriceRubles: z.number().int().min(500).max(1_000_000).optional(),
  etaMinutes: z.number().int().min(5, "Минимальное время — 5 минут").max(240, "Максимальное время — 4 часа"),
  comment: z.string().trim().max(500, "Комментарий не должен превышать 500 символов").optional(),
  acceptClientPrice: z.boolean(),
}).superRefine((value, context) => {
  if (!value.acceptClientPrice && value.proposedPriceRubles === undefined) {
    context.addIssue({ code: "custom", path: ["proposedPriceRubles"], message: "Укажите вашу цену" });
  }
});

function resultError(message: string): MarketplaceActionResult {
  return { ok: false, message };
}

function mapError(error: unknown): MarketplaceActionResult {
  const code = error instanceof Error ? error.message : "";
  const messages: Record<string, string> = {
    ORDER_NOT_OPEN: "Заказ уже отменён или больше не принимает предложения",
    ORDER_PRICE_MISSING: "В заказе не указана цена",
    MASTER_NOT_ELIGIBLE: "Заказ больше не подходит вашим настройкам или вы сейчас заняты",
    MATCH_NOT_AVAILABLE: "Предложение заказа истекло или уже обработано",
    DUPLICATE_OFFER: "Вы уже отправили предложение по этому заказу",
    OFFER_PRICE_INVALID: "Укажите цену от 500 ₽ до 1 000 000 ₽",
    OFFER_ETA_INVALID: "Укажите время приезда от 5 минут до 4 часов",
    OFFER_COMMENT_TOO_LONG: "Комментарий не должен превышать 500 символов",
    ORDER_NOT_FOUND: "Заказ не найден",
    ORDER_NOT_SELECTABLE: "Заказ отменён или больше не принимает выбор мастера",
    MASTER_ALREADY_SELECTED: "Мастер для этого заказа уже выбран",
    OFFER_NOT_AVAILABLE: "Предложение истекло или больше недоступно",
    MASTER_BUSY: "Мастер уже занят другим несовместимым заказом",
    SELECTION_NOT_FOUND: "Выбор мастера не найден",
    SELECTION_ALREADY_CONFIRMED: "Заказ уже подтверждён",
    SELECTION_NOT_CONFIRMABLE: "Этот заказ сейчас нельзя подтвердить",
    SELECTION_CONFIRM_CONFLICT: "Статус заказа уже изменился. Обновите страницу",
  };
  return resultError(messages[code] ?? "Не удалось выполнить действие. Обновите страницу и попробуйте снова");
}

function revalidateMarketplace(orderId: string) {
  revalidatePath("/master");
  revalidatePath("/master/orders/new");
  revalidatePath(`/client/orders/${orderId}`);
  revalidatePath("/client");
}

export async function createMasterOfferAction(input: {
  orderId: string;
  proposedPriceRubles?: number;
  etaMinutes: number;
  comment?: string;
  acceptClientPrice: boolean;
}): Promise<MarketplaceActionResult> {
  const master = await requireRole("MASTER");
  const parsed = offerSchema.safeParse(input);
  if (!parsed.success) {
    return resultError(parsed.error.issues[0]?.message ?? "Проверьте предложение");
  }

  try {
    const offer = createMasterOffer({ masterId: master.id, ...parsed.data });
    revalidateMarketplace(input.orderId);
    return { ok: true, offer };
  } catch (error) {
    return mapError(error);
  }
}

export async function skipMatchedOrderAction(orderId: string): Promise<MarketplaceActionResult> {
  const master = await requireRole("MASTER");
  if (!orderId) return resultError("Заказ не найден");
  try {
    skipMatchedOrder(master.id, orderId);
    revalidateMarketplace(orderId);
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function selectMasterOfferAction(input: {
  orderId: string;
  offerId: string;
}): Promise<MarketplaceActionResult> {
  const client = await requireRole("CLIENT");
  const parsed = z.object({ orderId: z.string().min(1), offerId: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return resultError("Предложение не найдено");
  try {
    const selected = selectMasterOffer({ clientId: client.id, ...parsed.data });
    revalidateMarketplace(input.orderId);
    revalidatePath("/master/orders");
    return { ok: true, selected };
  } catch (error) {
    return mapError(error);
  }
}

export async function confirmMasterSelectionAction(orderId: string): Promise<MarketplaceActionResult> {
  const master = await requireRole("MASTER");
  if (!orderId) return resultError("Заказ не найден");
  try {
    confirmMasterSelection(master.id, orderId);
    revalidateMarketplace(orderId);
    revalidatePath("/master/orders");
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}
