"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/guards";
import { matchOpenOrdersForMaster } from "@/lib/marketplace/matching";

import {
  completeMasterOnboarding,
  decideVerification,
  saveMasterBasic,
  saveMasterCategories,
  saveMasterEditableProfile,
  saveMasterExperience,
  saveMasterServiceAreas,
  setMasterOnline,
  setMasterOnboardingStep,
  submitVerification,
} from "./repository";
import type { MasterActionResult } from "./types";

const basicSchema = z.object({
  name: z.string().trim().min(2, "Укажите имя").max(80, "Имя слишком длинное"),
  phone: z.string().trim().min(10, "Укажите телефон").max(24, "Проверьте телефон"),
});

const selectionSchema = z.array(z.string().min(1)).min(1, "Выберите хотя бы один вариант").max(20);

const experienceSchema = z.object({
  experienceYears: z.number().int().min(0, "Опыт не может быть отрицательным").max(70, "Проверьте количество лет"),
  bio: z.string().trim().min(30, "Расскажите о себе чуть подробнее").max(1000, "Описание не должно превышать 1000 символов"),
});

const verificationSchema = z.object({
  legalName: z.string().trim().min(2, "Укажите имя как в документе").max(100),
  documentLastFour: z.string().regex(/^\d{4}$/, "Укажите последние 4 цифры номера документа"),
  documentMediaId: z.string().min(1, "Добавьте фотографию документа"),
});

const editableProfileSchema = basicSchema.extend({
  experienceYears: experienceSchema.shape.experienceYears,
  bio: experienceSchema.shape.bio,
  categoryIds: selectionSchema,
  areaIds: selectionSchema,
});

function resultError(message: string): MasterActionResult {
  return { ok: false, message };
}

function firstIssue(result: { error: { issues: Array<{ message: string }> } }) {
  return result.error.issues[0]?.message ?? "Проверьте введённые данные";
}

function mapError(error: unknown): MasterActionResult {
  const code = error instanceof Error ? error.message : "";
  const messages: Record<string, string> = {
    MASTER_PROFILE_NOT_FOUND: "Профиль мастера не найден",
    SELECTION_REQUIRED: "Выберите хотя бы один вариант",
    SELECTION_INVALID: "Один из выбранных вариантов больше недоступен",
    VERIFICATION_PENDING: "Заявка уже находится на проверке",
    VERIFICATION_ALREADY_APPROVED: "Личность уже подтверждена",
    IDENTITY_DOCUMENT_REQUIRED: "Добавьте фотографию документа",
    BASIC_DATA_REQUIRED: "Заполните имя и телефон",
    AVATAR_REQUIRED: "Добавьте фотографию профиля",
    VERIFICATION_REQUIRED: "Отправьте данные на подтверждение личности",
    CATEGORIES_REQUIRED: "Выберите категории работ",
    AREAS_REQUIRED: "Выберите районы работы",
    EXPERIENCE_REQUIRED: "Добавьте описание опыта",
    ONBOARDING_REQUIRED: "Сначала завершите настройку профиля",
    MASTER_NOT_VERIFIED: "Online станет доступен после подтверждения личности",
    MATCHING_SETTINGS_REQUIRED: "Выберите категории и районы работы",
    MASTER_BLOCKED: "Профиль заблокирован администратором",
    APPLICATION_NOT_FOUND: "Заявка уже обработана или не найдена",
    ADMIN_ACCESS_REQUIRED: "Недостаточно прав для проверки заявки",
    REJECTION_REASON_REQUIRED: "Укажите причину отклонения",
  };
  return resultError(messages[code] ?? "Не удалось сохранить изменения. Попробуйте ещё раз");
}

function revalidateMaster(masterId: string) {
  revalidatePath("/master");
  revalidatePath("/master/profile");
  revalidatePath(`/masters/${masterId}`);
}

export async function saveMasterBasicAction(input: { name: string; phone: string }): Promise<MasterActionResult> {
  const user = await requireRole("MASTER");
  const parsed = basicSchema.safeParse(input);
  if (!parsed.success) return resultError(firstIssue(parsed));
  try {
    saveMasterBasic(user.id, parsed.data);
    revalidateMaster(user.id);
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function saveMasterCategoriesAction(categoryIds: string[]): Promise<MasterActionResult> {
  const user = await requireRole("MASTER");
  const parsed = selectionSchema.safeParse(categoryIds);
  if (!parsed.success) return resultError(firstIssue(parsed));
  try {
    saveMasterCategories(user.id, parsed.data);
    matchOpenOrdersForMaster(user.id);
    revalidateMaster(user.id);
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function saveMasterAreasAction(areaIds: string[]): Promise<MasterActionResult> {
  const user = await requireRole("MASTER");
  const parsed = selectionSchema.safeParse(areaIds);
  if (!parsed.success) return resultError(firstIssue(parsed));
  try {
    saveMasterServiceAreas(user.id, parsed.data);
    matchOpenOrdersForMaster(user.id);
    revalidateMaster(user.id);
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function saveMasterExperienceAction(input: {
  experienceYears: number;
  bio: string;
}): Promise<MasterActionResult> {
  const user = await requireRole("MASTER");
  const parsed = experienceSchema.safeParse(input);
  if (!parsed.success) return resultError(firstIssue(parsed));
  try {
    saveMasterExperience(user.id, parsed.data);
    revalidateMaster(user.id);
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function saveMasterProfileAction(input: {
  name: string;
  phone: string;
  experienceYears: number;
  bio: string;
  categoryIds: string[];
  areaIds: string[];
}): Promise<MasterActionResult> {
  const user = await requireRole("MASTER");
  const parsed = editableProfileSchema.safeParse(input);
  if (!parsed.success) return resultError(firstIssue(parsed));
  try {
    saveMasterEditableProfile({ masterId: user.id, ...parsed.data });
    revalidateMaster(user.id);
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function submitMasterVerificationAction(input: {
  legalName: string;
  documentLastFour: string;
  documentMediaId: string;
}): Promise<MasterActionResult> {
  const user = await requireRole("MASTER");
  const parsed = verificationSchema.safeParse(input);
  if (!parsed.success) return resultError(firstIssue(parsed));
  try {
    submitVerification({ masterId: user.id, ...parsed.data });
    revalidateMaster(user.id);
    revalidatePath("/admin/verifications");
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function setMasterOnboardingStepAction(step: number) {
  const user = await requireRole("MASTER");
  setMasterOnboardingStep(user.id, step);
}

export async function completeMasterOnboardingAction(): Promise<MasterActionResult> {
  const user = await requireRole("MASTER");
  try {
    completeMasterOnboarding(user.id);
    revalidateMaster(user.id);
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function setMasterOnlineAction(isOnline: boolean): Promise<MasterActionResult> {
  const user = await requireRole("MASTER");
  try {
    setMasterOnline(user.id, isOnline);
    if (isOnline) matchOpenOrdersForMaster(user.id);
    revalidateMaster(user.id);
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function decideVerificationAction(input: {
  applicationId: string;
  decision: "VERIFIED" | "REJECTED";
  rejectionReason?: string;
}): Promise<MasterActionResult> {
  const admin = await requireRole("ADMIN");
  try {
    decideVerification({ ...input, adminId: admin.id });
    revalidatePath("/admin/verifications");
    revalidatePath("/admin");
    revalidatePath("/master");
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}
