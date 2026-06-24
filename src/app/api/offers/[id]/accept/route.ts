import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fail, ok } from "@/lib/api";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("CLIENT");
  const { id } = await params;

  try {
    const offer = await prisma.offer.findUnique({
      where: { id },
      include: { repairRequest: true, master: true },
    });

    if (!offer) return fail("Предложение не найдено", 404);
    if (offer.repairRequest.clientId !== user.id) return fail("Это не ваша заявка", 403);
    if (offer.status !== "PENDING") return fail("Предложение уже обработано", 400);

    const [updatedRequest] = await prisma.$transaction([
      prisma.repairRequest.update({
        where: { id: offer.repairRequestId },
        data: {
          status: "ASSIGNED",
          selectedMasterId: offer.master.userId,
        },
        include: { category: true, address: true },
      }),
      prisma.offer.update({
        where: { id },
        data: { status: "ACCEPTED" },
      }),
      prisma.offer.updateMany({
        where: {
          repairRequestId: offer.repairRequestId,
          id: { not: id },
          status: "PENDING",
        },
        data: { status: "REJECTED" },
      }),
    ]);

    return ok(updatedRequest);
  } catch (error) {
    console.error("Accept offer error:", error);
    return fail("Ошибка при принятии предложения", 500);
  }
}
