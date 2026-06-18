import { z } from "zod";
import { messages } from "@/lib/mock-data";
import { fail, ok, parseJson } from "@/lib/api";

const schema = z.object({ senderId: z.string(), message: z.string().min(1) });

export async function GET() {
  return ok(messages);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseJson(request, schema);
  if (!parsed.data) return fail(parsed.error);
  return ok({ id: "msg-new", repairRequestId: id, createdAt: new Date().toISOString(), ...parsed.data }, 201);
}
