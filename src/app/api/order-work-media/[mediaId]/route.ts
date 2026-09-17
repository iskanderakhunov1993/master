import { getSession } from "@/lib/auth/session";
import { getOrderWorkMediaForViewer } from "@/lib/orders/work-media";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const user = await getSession();
  if (!user || !["CLIENT", "MASTER"].includes(user.role)) {
    return new Response(null, { status: 404 });
  }

  const { mediaId } = await params;
  const media = getOrderWorkMediaForViewer(user.id, mediaId);
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
