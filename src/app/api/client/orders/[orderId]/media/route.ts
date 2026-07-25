import { getSession } from "@/lib/auth/session";
import { validateOrderPhoto } from "@/lib/orders/media";
import { addOrderMedia, replaceOrderMedia } from "@/lib/orders/repository";

function safeFileName(fileName: string) {
  return fileName
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._-]+/gu, "_")
    .slice(0, 120) || "photo";
}

function hasSafeOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const user = await getSession();
  if (!user || user.role !== "CLIENT") {
    return Response.json({ message: "Требуется вход" }, { status: 401 });
  }
  if (!hasSafeOrigin(request)) {
    return Response.json({ message: "Недопустимый источник запроса" }, { status: 403 });
  }

  const { orderId } = await params;
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ message: "Выберите фотографию" }, { status: 400 });
  }
  const metadataError = validateOrderPhoto({ mimeType: file.type, byteSize: file.size });
  if (metadataError) {
    return Response.json(
      { message: metadataError.message },
      { status: metadataError.code === "INVALID_SIZE" ? 413 : 415 },
    );
  }

  const content = Buffer.from(await file.arrayBuffer());
  const contentError = validateOrderPhoto({
    mimeType: file.type,
    byteSize: file.size,
    content,
  });
  if (contentError) {
    return Response.json({ message: contentError.message }, { status: 415 });
  }
  const replaceId = new URL(request.url).searchParams.get("replace");

  try {
    const photo = replaceId
      ? replaceOrderMedia({
          clientId: user.id,
          orderId,
          mediaId: replaceId,
          fileName: safeFileName(file.name),
          mimeType: file.type,
          byteSize: file.size,
          content,
        })
      : addOrderMedia({
          clientId: user.id,
          orderId,
          fileName: safeFileName(file.name),
          mimeType: file.type,
          byteSize: file.size,
          content,
        });

    return Response.json({ photo }, { status: replaceId ? 200 : 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const messages: Record<string, [string, number]> = {
      DRAFT_NOT_FOUND: ["Черновик не найден", 404],
      PHOTO_LIMIT: ["Можно добавить не больше 5 фотографий", 409],
      PHOTO_NOT_FOUND: ["Фотография не найдена", 404],
    };
    const [message, status] = messages[code] ?? ["Не удалось загрузить фотографию", 500];
    return Response.json({ message }, { status });
  }
}
