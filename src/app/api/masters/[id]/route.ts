import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const profile = await prisma.masterProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true, ratingAvg: true, ratingCount: true },
        },
        categories: { include: { category: true } },
        portfolios: { include: { category: true }, orderBy: { createdAt: "desc" } },
      },
    });

    if (!profile) return fail("Мастер не найден", 404);

    const reviews = await prisma.review.findMany({
      where: { revieweeId: profile.userId },
      include: {
        reviewer: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return ok({ ...profile, reviews });
  } catch (error) {
    console.error("Master profile error:", error);
    return fail("Ошибка при загрузке профиля мастера", 500);
  }
}
