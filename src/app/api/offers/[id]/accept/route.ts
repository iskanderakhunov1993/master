import { ok } from "@/lib/api";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return ok({ offerId: id, offerStatus: "ACCEPTED", requestStatus: "ASSIGNED" });
}
