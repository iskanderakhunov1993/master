import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const user = await requireAuth();

  const searchParams = request.nextUrl.searchParams;
  const addressId = searchParams.get("addressId");

  try {
    const where: Record<string, unknown> = {
      OR: [{ clientId: user.id }, { masterId: user.id }],
    };

    if (addressId) where.addressId = addressId;

    const history = await prisma.homeRepairHistory.findMany({
      where,
      include: {
        category: true,
        address: { select: { id: true, title: true, city: true, district: true } },
        client: { select: { id: true, name: true, avatarUrl: true } },
        master: { select: { id: true, name: true, avatarUrl: true, ratingAvg: true } },
      },
      orderBy: { completedAt: "desc" },
    });

    return ok(history);
  } catch (error) {
    console.error("History error:", error);
    return fail("Ошибка при загрузке истории", 500);
  }
}
