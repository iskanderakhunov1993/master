import { z } from "zod";
import { fail, ok, parseJson } from "@/lib/api";

const schema = z.object({
  repairRequestId: z.string(),
  reviewerId: z.string(),
  revieweeId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(3),
});

export async function POST(request: Request) {
  const parsed = await parseJson(request, schema);
  if (!parsed.data) return fail(parsed.error);
  return ok({ id: "review-new", ...parsed.data, createdAt: new Date().toISOString() }, 201);
}
