import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

const PLANS: Record<string, { name: string; responses: number; price: number }> = {
  START: { name: "Стартовая", responses: 10, price: 990 },
  BASIC: { name: "Базовая", responses: 20, price: 1990 },
  PREMIUM: { name: "Премиум", responses: 999999, price: 3990 },
};

export async function POST(request: Request) {
  try {
    const user = await requireRole("MASTER");

    const body = await request.json().catch(() => null);
    const planName = body?.planName as string;

    if (!planName || !PLANS[planName]) {
      return fail("Некорректный план. Допустимые: START, BASIC, PREMIUM", 400);
    }

    const plan = PLANS[planName];

    const master = await prisma.masterProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!master) return fail("Профиль мастера не найден", 404);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const subscription = await prisma.masterSubscription.upsert({
      where: { masterId: master.id },
      create: {
        masterId: master.id,
        planName: planName,
        responsesLeft: plan.responses,
        responsesTotal: plan.responses,
        startsAt: now,
        expiresAt: expiresAt,
        isActive: true,
      },
      update: {
        planName: planName,
        responsesLeft: plan.responses,
        responsesTotal: plan.responses,
        startsAt: now,
        expiresAt: expiresAt,
        isActive: true,
      },
    });

    return ok({
      subscription: {
        planName: subscription.planName,
        planLabel: plan.name,
        price: plan.price,
        responsesLeft: subscription.responsesLeft,
        responsesTotal: subscription.responsesTotal,
        startsAt: subscription.startsAt,
        expiresAt: subscription.expiresAt,
        isActive: subscription.isActive,
      },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return fail("Ошибка сервера", 500);
  }
}
