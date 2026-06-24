import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth";
import { fail, ok, parseJson } from "@/lib/api";

const schema = z.object({
  price: z.number().positive("Цена должна быть положительной"),
  comment: z.string().min(3, "Комментарий минимум 3 символа"),
  guaranteeDays: z.number().int().positive().optional(),
  availableDate: z.string().optional(),
  availableTimeFrom: z.string().optional(),
  availableTimeTo: z.string().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  try {
    const offers = await prisma.offer.findMany({
      where: { repairRequestId: id },
      include: {
        master: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true, ratingAvg: true, ratingCount: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(offers);
  } catch (error) {
    console.error("Offers GET error:", error);
    return fail("Ошибка при загрузке предложений", 500);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("MASTER");
  const { id } = await params;

  const parsed = await parseJson(request, schema);
  if (!parsed.data) return fail(parsed.error);

  try {
    const profile = await prisma.masterProfile.findUnique({
      where: { userId: user.id },
      include: { subscription: true },
    });

    if (!profile) return fail("Профиль мастера не найден", 404);
    if (!profile.isVerified) return fail("Ваш профиль ещё не верифицирован", 403);

    // Check responses
    const hasSubscriptionResponses =
      profile.subscription?.isActive && profile.subscription.expiresAt > new Date() && profile.subscription.responsesLeft > 0;

    if (profile.freeResponsesLeft <= 0 && !hasSubscriptionResponses) {
      return fail("У вас закончились отклики. Оформите подписку для продолжения.", 403);
    }

    // Check request exists
    const repairRequest = await prisma.repairRequest.findUnique({ where: { id } });
    if (!repairRequest) return fail("Заявка не найдена", 404);

    // Check duplicate
    const existingOffer = await prisma.offer.findFirst({
      where: { repairRequestId: id, masterId: profile.id },
    });
    if (existingOffer) return fail("Вы уже откликнулись на эту заявку", 400);

    // Decrement response counter
    if (hasSubscriptionResponses) {
      await prisma.masterSubscription.update({
        where: { id: profile.subscription!.id },
        data: { responsesLeft: { decrement: 1 } },
      });
    } else {
      await prisma.masterProfile.update({
        where: { id: profile.id },
        data: { freeResponsesLeft: { decrement: 1 } },
      });
    }

    const offer = await prisma.offer.create({
      data: {
        repairRequestId: id,
        masterId: profile.id,
        price: parsed.data.price,
        comment: parsed.data.comment,
        guaranteeDays: parsed.data.guaranteeDays,
        availableDate: parsed.data.availableDate ? new Date(parsed.data.availableDate) : undefined,
        availableTimeFrom: parsed.data.availableTimeFrom,
        availableTimeTo: parsed.data.availableTimeTo,
        status: "PENDING",
      },
      include: {
        master: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true, ratingAvg: true } },
          },
        },
      },
    });

    return ok(offer, 201);
  } catch (error) {
    console.error("Offers POST error:", error);
    return fail("Ошибка при создании предложения", 500);
  }
}
