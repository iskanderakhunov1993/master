import { getSession } from "@/lib/auth/session";
import { getOrderEvidenceMedia } from "@/lib/orders/transparency";

export async function GET(_request: Request, { params }: { params: Promise<{ evidenceId: string }> }) {
  const user = await getSession();
  if (!user || !["CLIENT", "MASTER", "ADMIN"].includes(user.role)) return new Response(null, { status: 404 });
  const { evidenceId } = await params;
  const media = getOrderEvidenceMedia(user.id, user.role as "CLIENT" | "MASTER" | "ADMIN", evidenceId);
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
