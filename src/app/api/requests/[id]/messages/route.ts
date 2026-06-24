import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { fail, ok, parseJson } from "@/lib/api";

const schema = z.object({
  message: z.string().min(1, "Сообщение не может быть пустым"),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;

  try {
    const request = await prisma.repairRequest.findUnique({
      where: { id },
      select: { clientId: true, selectedMasterId: true },
    });

    if (!request) return fail("Заявка не найдена", 404);
    if (request.clientId !== user.id && request.selectedMasterId !== user.id) {
      return fail("Нет доступа к сообщениям", 403);
    }

    const messages = await prisma.chatMessage.findMany({
      where: { repairRequestId: id },
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: "asc" },
    });

    return ok(messages);
  } catch (error) {
    console.error("Messages GET error:", error);
    return fail("Ошибка при загрузке сообщений", 500);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;

  const parsed = await parseJson(request, schema);
  if (!parsed.data) return fail(parsed.error);

  try {
    const repairRequest = await prisma.repairRequest.findUnique({
      where: { id },
      select: { clientId: true, selectedMasterId: true },
    });

    if (!repairRequest) return fail("Заявка не найдена", 404);
    if (repairRequest.clientId !== user.id && repairRequest.selectedMasterId !== user.id) {
      return fail("Нет доступа к чату", 403);
    }

    const message = await prisma.chatMessage.create({
      data: {
        repairRequestId: id,
        senderId: user.id,
        message: parsed.data.message,
      },
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    });

    return ok(message, 201);
  } catch (error) {
    console.error("Messages POST error:", error);
    return fail("Ошибка при отправке сообщения", 500);
  }
}
