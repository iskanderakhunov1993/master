import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createToken, setAuthCookie } from "@/lib/auth";
import { fail, ok, parseJson } from "@/lib/api";

const schema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export async function POST(request: Request) {
  const parsed = await parseJson(request, schema);
  if (!parsed.data) return fail(parsed.error);

  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return fail("Неверный email или пароль", 401);

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return fail("Неверный email или пароль", 401);

    const token = await createToken(user.id);
    await setAuthCookie(token);

    return ok({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatarUrl: user.avatarUrl,
      ratingAvg: user.ratingAvg,
      ratingCount: user.ratingCount,
    });
  } catch (error) {
    console.error("Login error:", error);
    return fail("Ошибка при входе", 500);
  }
}
