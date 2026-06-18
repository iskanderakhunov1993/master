import { z } from "zod";
import { offers } from "@/lib/mock-data";
import { fail, ok, parseJson } from "@/lib/api";

const schema = z.object({
  masterId: z.string().default("master-profile-1"),
  price: z.number().positive(),
  comment: z.string().min(3),
  availableTimeFrom: z.string().optional(),
  availableTimeTo: z.string().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return ok(offers.filter((offer) => offer.requestId === id));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseJson(request, schema);
  if (!parsed.data) return fail(parsed.error);
  return ok({ id: "offer-new", requestId: id, status: "PENDING", ...parsed.data }, 201);
}
