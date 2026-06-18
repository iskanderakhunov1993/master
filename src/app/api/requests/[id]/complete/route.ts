import { ok } from "@/lib/api";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return ok({ requestId: id, status: "COMPLETED", historyCreated: true });
}
