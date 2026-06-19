import { z } from "zod";
import { fail, ok, parseJson } from "@/lib/api";
import { addMvpMessage, getMvpMessages } from "@/lib/mvp-store";

const messageSchema = z.object({
  role: z.enum(["client", "master"]),
  text: z.string().min(1, "Напишите сообщение"),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return ok(getMvpMessages(id));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = await parseJson(request, messageSchema);
  if (!parsed.data) return fail(parsed.error);

  const message = addMvpMessage(id, parsed.data.role, parsed.data.text);
  if (!message) return fail("Заявка не найдена", 404);

  return ok(message, 201);
}
