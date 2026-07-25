import { getSession } from "@/lib/auth/session";
import { validateOrderPhoto } from "@/lib/orders/media";
import { addTaskMedia } from "@/lib/tasks/repository";

function safeFileName(fileName: string) {
  return fileName.normalize("NFKC").replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(0, 120) || "photo";
}

function hasSafeOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const user = await getSession();
  if (!user || user.role !== "CLIENT") {
    return Response.json({ message: "Требуется вход" }, { status: 401 });
  }
  if (!hasSafeOrigin(request)) {
    return Response.json({ message: "Недопустимый источник запроса" }, { status: 403 });
  }
  const { taskId } = await params;
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
  if (contentError) return Response.json({ message: contentError.message }, { status: 415 });

  try {
    const photo = addTaskMedia({
      clientId: user.id,
      taskId,
      fileName: safeFileName(file.name),
      mimeType: file.type,
      byteSize: file.size,
      content,
    });
    return Response.json({ photo }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "TASK_NOT_FOUND") return Response.json({ message: "Задача не найдена" }, { status: 404 });
    if (code === "PHOTO_LIMIT") return Response.json({ message: "Можно добавить не больше 5 фотографий" }, { status: 409 });
    return Response.json({ message: "Не удалось загрузить фотографию" }, { status: 500 });
  }
}
