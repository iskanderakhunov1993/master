import { getSession } from "@/lib/auth/session";
import { getOrderWorkMediaForAdmin, getOrderWorkMediaForViewer } from "@/lib/orders/work-media";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const user = await getSession();
  if (!user) return new Response(null, { status: 404 });

  const { mediaId } = await params;
  const media = user.role === "ADMIN"
    ? getOrderWorkMediaForAdmin(mediaId)
    : ["CLIENT", "MASTER"].includes(user.role)
      ? getOrderWorkMediaForViewer(user.id, mediaId)
      : undefined;
  if (!media) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(media.content), {
    headers: {
      "Content-Type": media.mimeType,
      "Content-Length": String(media.byteSize),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
