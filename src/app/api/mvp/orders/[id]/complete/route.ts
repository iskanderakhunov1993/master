import { fail, ok } from "@/lib/api";
import { addMvpMessage, updateMvpOrder } from "@/lib/mvp-store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const order = updateMvpOrder(id, {
    status: "awaiting_review",
  });
  if (!order) return fail("Заявка не найдена", 404);

  addMvpMessage(id, "client", "Работа выполнена. Теперь нужно подтвердить оплату и оставить взаимные отзывы.");
  return ok(order);
}
