import { getSession } from "@/lib/auth/session";
import { validateOrderPhoto } from "@/lib/orders/media";
import { addOrderWorkMedia, type WorkMediaStage } from "@/lib/orders/work-media";

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
  if (!user || user.role !== "MASTER") {
    return Response.json({ message: "Требуется вход" }, { status: 401 });
  }
  if (!hasSafeOrigin(request)) {
    return Response.json({ message: "Недопустимый источник запроса" }, { status: 403 });
  }

  const { orderId } = await params;
  const stage = new URL(request.url).searchParams.get("stage");
  if (stage !== "BEFORE" && stage !== "AFTER") {
    return Response.json({ message: "Укажите этап фотографии" }, { status: 400 });
  }

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
  const contentError = validateOrderPhoto({ mimeType: file.type, byteSize: file.size, content });
  if (contentError) {
    return Response.json({ message: contentError.message }, { status: 415 });
  }

  try {
    const photo = addOrderWorkMedia({
      masterId: user.id,
      orderId,
      stage: stage as WorkMediaStage,
      fileName: safeFileName(file.name),
      mimeType: file.type,
      byteSize: file.size,
      content,
    });
    return Response.json({ photo }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const messages: Record<string, [string, number]> = {
      ORDER_NOT_FOUND: ["Заказ не найден", 404],
      ORDER_ACCESS_DENIED: ["У вас нет доступа к этому заказу", 403],
      WORK_MEDIA_WRONG_STAGE: [
        stage === "BEFORE"
          ? "Фото «до» можно добавить только после отметки «Я на месте»"
          : "Фото «после» можно добавить только во время выполнения работы",
        409,
      ],
      PHOTO_LIMIT: ["Можно добавить не больше 5 фотографий на этап", 409],
    };
    const [message, status] = messages[code] ?? ["Не удалось загрузить фотографию", 500];
    return Response.json({ message }, { status });
  }
}
