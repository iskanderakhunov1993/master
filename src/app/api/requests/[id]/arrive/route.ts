import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const repairRequest = await prisma.repairRequest.findUnique({
      where: { id },
    });

    if (!repairRequest) return fail("Заявка не найдена", 404);
    if (repairRequest.selectedMasterId !== user.id) {
      return fail("Вы не назначены на эту заявку", 403);
    }
    if (repairRequest.status !== "ASSIGNED") {
      return fail("Заявка не в статусе назначения", 400);
    }

    const updated = await prisma.repairRequest.update({
      where: { id },
      data: { status: "IN_PROGRESS" },
    });

    return ok(updated);
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error("Arrive error:", e);
    return fail("Ошибка при обновлении статуса", 500);
  }
}
