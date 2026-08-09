"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/guards";

import { createPostgresClientOrder } from "./postgres-repository";

export async function createPostgresClientOrderAction(formData: FormData) {
  const user = await requireRole("CLIENT");
  const categoryId = String(formData.get("categoryId") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const budgetRubles = Number(formData.get("budgetRubles"));
  const orderType = formData.get("orderType") === "URGENT" ? "URGENT" : "NORMAL";

  if (!categoryId || description.length < 10 || !Number.isFinite(budgetRubles) || budgetRubles < 500) {
    throw new Error("Укажите категорию, опишите задачу (минимум 10 символов) и бюджет от 500 ₽");
  }

  await createPostgresClientOrder({
    clientId: user.id,
    categoryId,
    description,
    budgetRubles,
    orderType,
  });
  revalidatePath("/client");
}
