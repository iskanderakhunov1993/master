import { z } from "zod";
import { fail, ok, parseJson } from "@/lib/api";
import { addMvpMessage, addMvpReview, getMvpState } from "@/lib/mvp-store";

const reviewSchema = z.object({
  role: z.enum(["client", "master"]),
  rating: z.coerce.number().min(1, "Минимум 1 балл").max(5, "Максимум 5 баллов"),
  comment: z.string().min(5, "Комментарий обязателен"),
  paymentConfirmed: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = await parseJson(request, reviewSchema);
  if (!parsed.data) return fail(parsed.error);

  const order = getMvpState().orders.find((item) => item.id === id);
  if (!order) return fail("Заявка не найдена", 404);
  if (order.status !== "awaiting_review" && order.status !== "completed") {
    return fail("Отзыв можно оставить после выполнения работы");
  }
  if (parsed.data.role === "client" && !parsed.data.paymentConfirmed) {
    return fail("Подтвердите, что оплатили мастеру самостоятельно");
  }

  const review = addMvpReview({
    orderId: id,
    reviewerRole: parsed.data.role,
    rating: parsed.data.rating,
    comment: parsed.data.comment,
    paymentConfirmed: parsed.data.role === "client" ? true : undefined,
  });
  if (!review) return fail("Заявка не найдена", 404);

  addMvpMessage(
    id,
    parsed.data.role,
    `Оставлен отзыв: ${parsed.data.rating}/5. ${parsed.data.comment}`,
  );

  return ok({ review, state: getMvpState() }, 201);
}
