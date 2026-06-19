import { fail, ok } from "@/lib/api";
import { updateMvpOrder } from "@/lib/mvp-store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const order = updateMvpOrder(id, { status: "in_progress" });
  if (!order) return fail("Заявка не найдена", 404);
  return ok(order);
}
