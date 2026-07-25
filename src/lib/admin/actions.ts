"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/guards";

import {
  createAdminCategory,
  setAdminCategoryActive,
  setUserBlocked,
  updateAdminCategory,
} from "./repository";
import type { AdminActionResult } from "./types";

function errorResult(error: unknown): AdminActionResult {
  const code = error instanceof Error ? error.message : "";
  const messages: Record<string, string> = {
    USER_NOT_FOUND: "Пользователь не найден",
    ADMIN_BLOCK_FORBIDDEN: "Администраторские аккаунты нельзя блокировать из панели",
    SELF_BLOCK_FORBIDDEN: "Нельзя заблокировать собственный аккаунт",
    USER_UPDATE_CONFLICT: "Статус уже изменился. Обновите страницу",
    CATEGORY_NOT_FOUND: "Категория не найдена",
    ADMIN_ACCESS_REQUIRED: "Недостаточно прав для этого действия",
  };
  return { ok: false, message: messages[code] ?? "Не удалось выполнить действие. Попробуйте ещё раз" };
}

function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/masters");
  revalidatePath("/admin/categories");
}

export async function setUserBlockedAction(input: {
  userId: string;
  blocked: boolean;
  reason?: string;
}): Promise<AdminActionResult> {
  const admin = await requireRole("ADMIN");
  const parsed = z.object({
    userId: z.string().min(1),
    blocked: z.boolean(),
    reason: z.string().trim().max(300, "Причина не должна превышать 300 символов").optional(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Проверьте данные" };
  try {
    setUserBlocked({ adminId: admin.id, ...parsed.data });
    revalidateAdmin();
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
}

export async function createCategoryAction(name: string): Promise<AdminActionResult> {
  const admin = await requireRole("ADMIN");
  const parsed = z.string().trim().min(2, "Название слишком короткое").max(80, "Название слишком длинное").safeParse(name);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };
  try {
    createAdminCategory(admin.id, parsed.data);
    revalidateAdmin();
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
}

export async function updateCategoryAction(input: { categoryId: string; name: string }): Promise<AdminActionResult> {
  const admin = await requireRole("ADMIN");
  const parsed = z.object({
    categoryId: z.string().min(1),
    name: z.string().trim().min(2, "Название слишком короткое").max(80, "Название слишком длинное"),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };
  try {
    updateAdminCategory(admin.id, parsed.data.categoryId, parsed.data.name);
    revalidateAdmin();
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
}

export async function setCategoryActiveAction(input: { categoryId: string; isActive: boolean }): Promise<AdminActionResult> {
  const admin = await requireRole("ADMIN");
  const parsed = z.object({ categoryId: z.string().min(1), isActive: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Категория не найдена" };
  try {
    setAdminCategoryActive(admin.id, parsed.data.categoryId, parsed.data.isActive);
    revalidateAdmin();
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
}
