import { getSession } from "@/lib/auth/session";
import { deleteMasterMedia } from "@/lib/masters/repository";
import type { MasterMediaKind } from "@/lib/masters/types";

function hasSafeOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const user = await getSession();
  if (!user || user.role !== "MASTER") {
    return Response.json({ message: "Требуется вход мастера" }, { status: 401 });
  }
  if (!hasSafeOrigin(request)) {
    return Response.json({ message: "Недопустимый источник запроса" }, { status: 403 });
  }

  const kind = new URL(request.url).searchParams.get("kind") as MasterMediaKind | null;
  if (kind !== "AVATAR" && kind !== "PORTFOLIO") {
    return Response.json({ message: "Это изображение нельзя удалить" }, { status: 400 });
  }

  const { mediaId } = await params;
  try {
    if (!deleteMasterMedia(user.id, mediaId, kind)) {
      return Response.json({ message: "Изображение не найдено" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ message: "Не удалось удалить изображение" }, { status: 500 });
  }
}
