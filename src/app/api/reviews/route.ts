import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { fail, ok, parseJson } from "@/lib/api";
import { NextRequest } from "next/server";

const schema = z.object({
  repairRequestId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(3, "Комментарий минимум 3 символа"),
  punctualityRating: z.number().int().min(1).max(5).optional(),
  priceFairnessRating: z.number().int().min(1).max(5).optional(),
  qualityRating: z.number().int().min(1).max(5).optional(),
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const repairRequestId = searchParams.get("repairRequestId");

  try {
    const where: Record<string, unknown> = {};
    if (userId) where.revieweeId = userId;
    if (repairRequestId) where.repairRequestId = repairRequestId;

    const reviews = await prisma.review.findMany({
      where,
      include: {
        reviewer: { select: { id: true, name: true, avatarUrl: true } },
        reviewee: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(reviews);
  } catch (error) {
    console.error("Reviews GET error:", error);
    return fail("Ошибка при загрузке отзывов", 500);
  }
}

export async function POST(request: Request) {
  const user = await requireAuth();

  const parsed = await parseJson(request, schema);
  if (!parsed.data) return fail(parsed.error);

  try {
    const repairRequest = await prisma.repairRequest.findUnique({
      where: { id: parsed.data.repairRequestId },
    });

    if (!repairRequest) return fail("Заявка не найдена", 404);
    if (repairRequest.status !== "COMPLETED") return fail("Заявка ещё не завершена", 400);

    // Determine reviewer/reviewee
    const isClient = repairRequest.clientId === user.id;
    const isMaster = repairRequest.selectedMasterId === user.id;

    if (!isClient && !isMaster) return fail("Вы не участник этой заявки", 403);

    const revieweeId = isClient ? repairRequest.selectedMasterId! : repairRequest.clientId;

    // Check duplicate
    const existing = await prisma.review.findFirst({
      where: { repairRequestId: parsed.data.repairRequestId, reviewerId: user.id },
    });
    if (existing) return fail("Вы уже оставили отзыв по этой заявке", 400);

    const review = await prisma.review.create({
      data: {
        repairRequestId: parsed.data.repairRequestId,
        reviewerId: user.id,
        revieweeId,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
        punctualityRating: parsed.data.punctualityRating,
        priceFairnessRating: parsed.data.priceFairnessRating,
        qualityRating: parsed.data.qualityRating,
      },
      include: {
        reviewer: { select: { id: true, name: true } },
        reviewee: { select: { id: true, name: true } },
      },
    });

    // Update reviewee's rating
    const { _avg, _count } = await prisma.review.aggregate({
      where: { revieweeId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.user.update({
      where: { id: revieweeId },
      data: {
        ratingAvg: _avg.rating ?? 0,
        ratingCount: _count.rating,
      },
    });

    return ok(review, 201);
  } catch (error) {
    console.error("Reviews POST error:", error);
    return fail("Ошибка при создании отзыва", 500);
  }
}
