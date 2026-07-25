import { getSession } from "@/lib/auth/session";
import { getMasterMedia } from "@/lib/masters/repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const { mediaId } = await params;
  const media = getMasterMedia(mediaId);
  if (!media) return new Response(null, { status: 404 });

  if (media.kind === "IDENTITY") {
    const viewer = await getSession();
    if (!viewer || (viewer.role !== "ADMIN" && viewer.id !== media.masterId)) {
      return new Response(null, { status: 404 });
    }
  }

  return new Response(new Uint8Array(media.content), {
    headers: {
      "Content-Type": media.mimeType,
      "Content-Length": String(media.byteSize),
      "Cache-Control": media.kind === "IDENTITY" ? "private, no-store" : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
