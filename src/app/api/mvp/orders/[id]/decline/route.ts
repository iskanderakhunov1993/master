import { z } from "zod";
import { fail, ok, parseJson } from "@/lib/api";
import { addMvpMessage, updateMvpOrder } from "@/lib/mvp-store";

const declineSchema = z.object({
  reason: z.string().min(2).default("Не подходит по условиям"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = await parseJson(request, declineSchema);
  if (!parsed.data) return fail(parsed.error);

  const order = updateMvpOrder(id, {
    status: "declined",
    declineReason: parsed.data.reason,
  });
  if (!order) return fail("Заявка не найдена", 404);

  addMvpMessage(id, "master", `Не смогу взять заказ: ${parsed.data.reason}.`);
  return ok(order);
}
