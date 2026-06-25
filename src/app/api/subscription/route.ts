import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireRole("MASTER");

    const master = await prisma.masterProfile.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        freeResponsesLeft: true,
        subscription: true,
      },
    });

    if (!master) return fail("Профиль мастера не найден", 404);

    return ok({
      freeResponsesLeft: master.freeResponsesLeft,
      subscription: master.subscription
        ? {
            planName: master.subscription.planName,
            responsesLeft: master.subscription.responsesLeft,
            responsesTotal: master.subscription.responsesTotal,
            startsAt: master.subscription.startsAt,
            expiresAt: master.subscription.expiresAt,
            isActive: master.subscription.isActive,
          }
        : null,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return fail("Ошибка сервера", 500);
  }
}
