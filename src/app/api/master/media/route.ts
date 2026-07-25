import { getSession } from "@/lib/auth/session";
import { validateMasterImage } from "@/lib/masters/media";
import { addMasterMedia } from "@/lib/masters/repository";
import type { MasterMediaKind } from "@/lib/masters/types";

const MEDIA_KINDS = new Set<MasterMediaKind>(["AVATAR", "IDENTITY", "PORTFOLIO"]);

function safeFileName(fileName: string) {
  return fileName
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._-]+/gu, "_")
    .slice(0, 120) || "image";
}

function hasSafeOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user || user.role !== "MASTER") {
    return Response.json({ message: "Требуется вход мастера" }, { status: 401 });
  }
  if (!hasSafeOrigin(request)) {
    return Response.json({ message: "Недопустимый источник запроса" }, { status: 403 });
  }

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") as MasterMediaKind | null;
  const replaceId = url.searchParams.get("replace") ?? undefined;
  if (!kind || !MEDIA_KINDS.has(kind)) {
    return Response.json({ message: "Неизвестный тип изображения" }, { status: 400 });
  }
  if (kind === "IDENTITY" && replaceId) {
    return Response.json({ message: "Загрузите новый документ" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ message: "Выберите изображение" }, { status: 400 });
  }

  const metadataError = validateMasterImage({ mimeType: file.type, byteSize: file.size });
  if (metadataError) {
    return Response.json(
      { message: metadataError.message },
      { status: metadataError.code === "INVALID_SIZE" ? 413 : 415 },
    );
  }

  const content = Buffer.from(await file.arrayBuffer());
  const contentError = validateMasterImage({ mimeType: file.type, byteSize: file.size, content });
  if (contentError) {
    return Response.json({ message: contentError.message }, { status: 415 });
  }

  try {
    const media = addMasterMedia({
      masterId: user.id,
      kind,
      replaceId,
      fileName: safeFileName(file.name),
      mimeType: file.type,
      byteSize: file.size,
      content,
    });
    return Response.json({ media }, { status: replaceId ? 200 : 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const messages: Record<string, [string, number]> = {
      MEDIA_NOT_FOUND: ["Изображение не найдено", 404],
      PORTFOLIO_LIMIT: ["В портфолио можно добавить не больше 10 фотографий", 409],
      MASTER_PROFILE_NOT_FOUND: ["Профиль мастера не найден", 404],
    };
    const [message, status] = messages[code] ?? ["Не удалось загрузить изображение", 500];
    return Response.json({ message }, { status });
  }
}
