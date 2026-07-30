import { getSession } from "@/lib/auth/session";
import { getWarrantyClaimEvidence } from "@/lib/warranties/repository";

export async function GET(_request: Request, { params }: { params: Promise<{ evidenceId: string }> }) {
  const user = await getSession();
  if (!user || !["CLIENT", "ADMIN"].includes(user.role)) return new Response(null, { status: 404 });
  const { evidenceId } = await params;
  const evidence = getWarrantyClaimEvidence(user.id, user.role as "CLIENT" | "ADMIN", evidenceId);
  if (!evidence) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(evidence.content), {
    headers: {
      "Content-Type": evidence.mimeType,
      "Content-Length": String(evidence.byteSize),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
