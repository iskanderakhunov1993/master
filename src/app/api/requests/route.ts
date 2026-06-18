import { z } from "zod";
import { requests } from "@/lib/mock-data";
import { fail, ok, parseJson } from "@/lib/api";

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  categoryId: z.string().optional(),
  addressId: z.string().optional(),
  budgetAmount: z.number().optional(),
  urgency: z.enum(["NORMAL", "URGENT"]).default("NORMAL"),
});

export async function GET() {
  return ok(requests);
}

export async function POST(request: Request) {
  const parsed = await parseJson(request, createSchema);
  if (!parsed.data) return fail(parsed.error);
  return ok({ id: "req-new", status: "PUBLISHED", ...parsed.data }, 201);
}
