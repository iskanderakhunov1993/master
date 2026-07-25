import { getSession } from "@/lib/auth/session";
import { deleteOrderMedia } from "@/lib/orders/repository";

function hasSafeOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ orderId: string; mediaId: string }> },
) {
  const user = await getSession();
  if (!user || user.role !== "CLIENT") {
    return Response.json({ message: "Требуется вход" }, { status: 401 });
  }
  if (!hasSafeOrigin(request)) {
    return Response.json({ message: "Недопустимый источник запроса" }, { status: 403 });
  }

  const { orderId, mediaId } = await params;
  try {
    if (!deleteOrderMedia(user.id, orderId, mediaId)) {
      return Response.json({ message: "Фотография не найдена" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message === "DRAFT_NOT_FOUND") {
      return Response.json({ message: "Черновик не найден" }, { status: 404 });
    }
    return Response.json({ message: "Не удалось удалить фотографию" }, { status: 500 });
  }
}
