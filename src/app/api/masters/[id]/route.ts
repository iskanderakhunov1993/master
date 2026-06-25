import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const profile = await prisma.masterProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            ratingAvg: true,
            ratingCount: true,
            createdAt: true,
          },
        },
        categories: { include: { category: true } },
        portfolios: {
          include: { category: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!profile) return fail("Мастер не найден", 404);

    const reviews = await prisma.review.findMany({
      where: { revieweeId: profile.userId },
      include: {
        reviewer: {
          select: { id: true, name: true, avatarUrl: true, ratingAvg: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const completedOrders = await prisma.repairRequest.count({
      where: {
        selectedMasterId: profile.userId,
        status: "COMPLETED",
      },
    });

    const data = {
      id: profile.id,
      user: {
        name: profile.user.name,
        avatarUrl: profile.user.avatarUrl,
        ratingAvg: profile.user.ratingAvg,
        ratingCount: profile.user.ratingCount,
        createdAt: profile.user.createdAt.toISOString(),
      },
      bio: profile.bio,
      experienceYears: profile.experienceYears,
      isVerified: profile.isVerified,
      city: profile.city,
      district: profile.district,
      workRadiusKm: profile.workRadiusKm,
      guaranteeDays: profile.guaranteeDays,
      isAvailableNow: profile.isAvailableNow,
      categories: profile.categories.map((c) => ({
        name: c.category.name,
        icon: c.category.icon,
      })),
      portfolio: profile.portfolios.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        price: p.price,
        photoBefore: p.photoBefore,
        photoAfter: p.photoAfter,
        isVerified: p.isVerified,
        category: { name: p.category.name, icon: p.category.icon },
        createdAt: p.createdAt.toISOString(),
      })),
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        qualityRating: r.qualityRating,
        punctualityRating: r.punctualityRating,
        priceFairnessRating: r.priceFairnessRating,
        createdAt: r.createdAt.toISOString(),
        reviewer: {
          name: r.reviewer.name,
          ratingAvg: r.reviewer.ratingAvg,
        },
      })),
      stats: {
        completedOrders,
        cancelRate: 1,
        avgResponseMinutes: 7,
        warrantyRequests: 2,
      },
    };

    return ok(data);
  } catch (error) {
    console.error("Master profile error:", error);
    return fail("Ошибка при загрузке профиля мастера", 500);
  }
}
