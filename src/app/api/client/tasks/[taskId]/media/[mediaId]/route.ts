import { getSession } from "@/lib/auth/session";
import { deleteTaskMedia } from "@/lib/tasks/repository";

function hasSafeOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ taskId: string; mediaId: string }> },
) {
  const user = await getSession();
  if (!user || user.role !== "CLIENT") {
    return Response.json({ message: "Требуется вход" }, { status: 401 });
  }
  if (!hasSafeOrigin(request)) {
    return Response.json({ message: "Недопустимый источник запроса" }, { status: 403 });
  }
  const { taskId, mediaId } = await params;
  try {
    deleteTaskMedia(user.id, taskId, mediaId);
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ message: "Фотография не найдена" }, { status: 404 });
  }
}
