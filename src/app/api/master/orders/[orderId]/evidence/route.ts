import { getSession } from "@/lib/auth/session";
import { validateOrderPhoto } from "@/lib/orders/media";
import { addOrderEvidence, type EvidenceStage } from "@/lib/orders/transparency";

function safeFileName(fileName: string) {
  return fileName.normalize("NFKC").replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(0, 120) || "photo";
}

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const user = await getSession();
  if (!user || user.role !== "MASTER") return Response.json({ message: "Требуется вход мастера" }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ message: "Недопустимый источник" }, { status: 403 });
  const { orderId } = await params;
  const formData = await request.formData();
  const file = formData.get("file");
  const rawStage = formData.get("stage");
  if (!(file instanceof File)) return Response.json({ message: "Выберите фотографию" }, { status: 400 });
  if (!rawStage || !["BEFORE", "PROCESS", "AFTER"].includes(String(rawStage))) {
    return Response.json({ message: "Выберите этап фотографии" }, { status: 400 });
  }
  const metadataError = validateOrderPhoto({ mimeType: file.type, byteSize: file.size });
  if (metadataError) return Response.json({ message: metadataError.message }, { status: metadataError.code === "INVALID_SIZE" ? 413 : 415 });
  const content = Buffer.from(await file.arrayBuffer());
  const contentError = validateOrderPhoto({ mimeType: file.type, byteSize: file.size, content });
  if (contentError) return Response.json({ message: contentError.message }, { status: 415 });
  try {
    const evidence = addOrderEvidence({
      orderId,
      masterId: user.id,
      stage: String(rawStage) as EvidenceStage,
      fileName: safeFileName(file.name),
      mimeType: file.type,
      byteSize: file.size,
      content,
    });
    return Response.json({ evidence }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const errors: Record<string, [string, number]> = {
      ORDER_NOT_FOUND: ["Заказ не найден", 404],
      ORDER_ACCESS_DENIED: ["Нет доступа к заказу", 403],
      EVIDENCE_STAGE_INVALID: ["Фото недоступно на текущем этапе", 409],
      EVIDENCE_LIMIT: ["На одном этапе можно добавить до 8 фото", 409],
    };
    const [message, status] = errors[code] ?? ["Не удалось загрузить фото", 500];
    return Response.json({ message }, { status });
  }
}
