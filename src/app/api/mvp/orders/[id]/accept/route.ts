import { z } from "zod";
import { fail, ok, parseJson } from "@/lib/api";
import { addMvpMessage, updateMvpOrder } from "@/lib/mvp-store";

const acceptSchema = z.object({
  price: z.coerce.number().min(100).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = await parseJson(request, acceptSchema);
  if (!parsed.data) return fail(parsed.error);

  const order = updateMvpOrder(id, {
    status: "assigned",
    master: "Алексей Соколов",
    offers: 1,
    ...(parsed.data.price ? { price: parsed.data.price } : {}),
  });
  if (!order) return fail("Заявка не найдена", 404);

  addMvpMessage(
    id,
    "master",
    parsed.data.price
      ? `Готов выполнить за ${parsed.data.price.toLocaleString("ru-RU")} ₽.`
      : "Принял заказ. Готов обсудить детали в чате.",
  );

  return ok(order);
}
