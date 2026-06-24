import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { fail, ok, parseJson } from "@/lib/api";

const schema = z.object({
  finalPrice: z.number().positive("Укажите итоговую цену"),
  notes: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;

  const parsed = await parseJson(request, schema);
  if (!parsed.data) return fail(parsed.error);

  try {
    const repairRequest = await prisma.repairRequest.findUnique({
      where: { id },
      include: { category: true, address: true },
    });

    if (!repairRequest) return fail("Заявка не найдена", 404);
    if (repairRequest.clientId !== user.id && repairRequest.selectedMasterId !== user.id) {
      return fail("Нет доступа к этой заявке", 403);
    }
    if (repairRequest.status !== "ASSIGNED" && repairRequest.status !== "IN_PROGRESS") {
      return fail("Заявка не может быть завершена в текущем статусе", 400);
    }
    if (!repairRequest.selectedMasterId) {
      return fail("Мастер не назначен", 400);
    }

    const now = new Date();

    // Get the accepted offer for warranty calculation
    const acceptedOffer = await prisma.offer.findFirst({
      where: { repairRequestId: id, status: "ACCEPTED" },
      include: { master: true },
    });

    const guaranteeDays = acceptedOffer?.guaranteeDays ?? acceptedOffer?.master.guaranteeDays ?? 30;
    const warrantyUntil = new Date(now.getTime() + guaranteeDays * 24 * 60 * 60 * 1000);

    const [updatedRequest] = await prisma.$transaction([
      prisma.repairRequest.update({
        where: { id },
        data: { status: "COMPLETED", finalPrice: parsed.data.finalPrice },
        include: { category: true, address: true },
      }),
      prisma.homeRepairHistory.create({
        data: {
          clientId: repairRequest.clientId,
          masterId: repairRequest.selectedMasterId,
          addressId: repairRequest.addressId,
          repairRequestId: id,
          categoryId: repairRequest.categoryId,
          title: repairRequest.title,
          description: repairRequest.description,
          finalPrice: parsed.data.finalPrice,
          completedAt: now,
          warrantyUntil,
          notes: parsed.data.notes,
        },
      }),
    ]);

    return ok(updatedRequest);
  } catch (error) {
    console.error("Complete error:", error);
    return fail("Ошибка при завершении заявки", 500);
  }
}
