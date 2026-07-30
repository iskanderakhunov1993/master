"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/guards";
import { validateOrderPhoto } from "@/lib/orders/media";

import { openWarrantyClaim } from "./repository";

export type WarrantyActionResult = { ok: boolean; message?: string };

export async function openWarrantyClaimAction(formData: FormData): Promise<WarrantyActionResult> {
  const client = await requireRole("CLIENT");
  const parsed = z.object({
    warrantyId: z.string().min(1),
    description: z.string().trim().min(10, "Опишите повторную проблему минимум в 10 символах").max(1000),
  }).safeParse({ warrantyId: formData.get("warrantyId"), description: formData.get("description") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, message: "Добавьте фотографию повторной проблемы" };
  const metadataError = validateOrderPhoto({ mimeType: file.type, byteSize: file.size });
  if (metadataError) return { ok: false, message: metadataError.message };
  const content = Buffer.from(await file.arrayBuffer());
  const contentError = validateOrderPhoto({ mimeType: file.type, byteSize: file.size, content });
  if (contentError) return { ok: false, message: contentError.message };
  try {
    openWarrantyClaim({
      clientId: client.id,
      warrantyId: parsed.data.warrantyId,
      description: parsed.data.description,
      evidence: {
        fileName: file.name.normalize("NFKC").replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(0, 120) || "problem-photo",
        mimeType: file.type,
        byteSize: file.size,
        content,
      },
    });
    revalidatePath("/client/home");
    return { ok: true };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const messages: Record<string, string> = {
      WARRANTY_NOT_FOUND: "Гарантия не найдена",
      WARRANTY_ACCESS_DENIED: "Нет доступа к этой гарантии",
      WARRANTY_EXPIRED: "Срок гарантии уже закончился",
      WARRANTY_CLAIM_EXISTS: "По этой гарантии уже открыто обращение",
    };
    return { ok: false, message: messages[code] ?? "Не удалось открыть обращение" };
  }
}
