import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { fail, ok } from "@/lib/api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;

  try {
    const request = await prisma.repairRequest.findUnique({
      where: { id },
      include: {
        category: true,
        address: true,
        photos: true,
        offers: {
          include: {
            master: {
              include: {
                user: { select: { id: true, name: true, avatarUrl: true, ratingAvg: true, ratingCount: true } },
              },
            },
          },
        },
        messages: {
          include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: "asc" },
        },
        reviews: {
          include: {
            reviewer: { select: { id: true, name: true } },
            reviewee: { select: { id: true, name: true } },
          },
        },
        client: { select: { id: true, name: true, avatarUrl: true, ratingAvg: true } },
      },
    });

    if (!request) return fail("Заявка не найдена", 404);

    // Check access
    const isClient = request.clientId === user.id;
    const isSelectedMaster = request.selectedMasterId === user.id;
    const hasOffer = request.offers.some((o) => o.master.userId === user.id);
    const isAdmin = user.role === "ADMIN";

    if (!isClient && !isSelectedMaster && !hasOffer && !isAdmin) {
      return fail("Нет доступа к этой заявке", 403);
    }

    // Hide exact address from non-selected masters
    if (!isClient && !isSelectedMaster && !isAdmin) {
      request.address = {
        ...request.address,
        street: "***",
        house: "***",
        apartment: null,
      };
    }

    return ok(request);
  } catch (error) {
    console.error("Request GET error:", error);
    return fail("Ошибка при загрузке заявки", 500);
  }
}
