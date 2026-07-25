import { getSession } from "@/lib/auth/session";
import { getOwnedTaskMedia } from "@/lib/tasks/repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const user = await getSession();
  if (!user || user.role !== "CLIENT") return new Response(null, { status: 404 });
  const { mediaId } = await params;
  const media = getOwnedTaskMedia(user.id, mediaId);
  if (!media) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(media.content), {
    headers: {
      "Content-Type": media.mimeType,
      "Content-Length": String(media.byteSize),
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
