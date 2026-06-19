import { z } from "zod";
import { fail, ok, parseJson } from "@/lib/api";
import { createMvpOrder, getMvpState } from "@/lib/mvp-store";

const createOrderSchema = z.object({
  title: z.string().min(3, "Опишите задачу"),
  category: z.string().min(2, "Выберите категорию"),
  price: z.coerce.number().min(100, "Укажите бюджет"),
  address: z.string().min(3, "Укажите адрес"),
  district: z.string().min(2, "Укажите район"),
  time: z.string().min(2, "Укажите время"),
  description: z.string().min(5, "Добавьте описание"),
});

export async function GET() {
  return ok(getMvpState().orders);
}

export async function POST(request: Request) {
  const parsed = await parseJson(request, createOrderSchema);
  if (!parsed.data) return fail(parsed.error);

  return ok(createMvpOrder(parsed.data), 201);
}
