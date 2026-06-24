import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, createToken, setAuthCookie } from "@/lib/auth";
import { fail, ok, parseJson } from "@/lib/api";

const schema = z.object({
  name: z.string().min(2, "Имя должно содержать минимум 2 символа"),
  email: z.string().email("Некорректный email"),
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
  phone: z.string().optional(),
  role: z.enum(["CLIENT", "MASTER"], { message: "Роль должна быть CLIENT или MASTER" }),
});

export async function POST(request: Request) {
  const parsed = await parseJson(request, schema);
  if (!parsed.data) return fail(parsed.error);

  const { name, email, password, phone, role } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return fail("Пользователь с таким email уже существует", 400);

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        phone,
        role,
        ...(role === "MASTER"
          ? {
              masterProfile: {
                create: {
                  bio: "",
                  city: "",
                  district: "",
                  experienceYears: 0,
                  workRadiusKm: 5,
                  freeResponsesLeft: 3,
                  guaranteeDays: 30,
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    const token = await createToken(user.id);
    setAuthCookie(token);

    return ok(user, 201);
  } catch (error) {
    console.error("Register error:", error);
    return fail("Ошибка при регистрации", 500);
  }
}
