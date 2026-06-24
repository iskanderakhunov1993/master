import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";

export async function GET() {
  const authUser = await getAuthUser();
  if (!authUser) return fail("Не авторизован", 401);

  try {
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        ratingAvg: true,
        ratingCount: true,
        createdAt: true,
        masterProfile: {
          include: {
            categories: { include: { category: true } },
            subscription: true,
          },
        },
      },
    });

    if (!user) return fail("Пользователь не найден", 404);

    return ok(user);
  } catch (error) {
    console.error("Me error:", error);
    return fail("Ошибка сервера", 500);
  }
}
