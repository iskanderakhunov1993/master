import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    return ok(categories);
  } catch (error) {
    console.error("Categories error:", error);
    return fail("Ошибка при загрузке категорий", 500);
  }
}
