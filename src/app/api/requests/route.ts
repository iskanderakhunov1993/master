import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth";
import { fail, ok, parseJson } from "@/lib/api";
import { NextRequest } from "next/server";

const createSchema = z.object({
  title: z.string().min(3, "Заголовок минимум 3 символа"),
  description: z.string().min(5, "Описание минимум 5 символов"),
  categoryId: z.string(),
  addressId: z.string(),
  budgetAmount: z.number().positive().optional(),
  budgetType: z.enum(["FIXED", "NEGOTIABLE", "REQUEST_PRICE"]).default("NEGOTIABLE"),
  preferredDate: z.string().optional(),
  preferredTimeFrom: z.string().optional(),
  preferredTimeTo: z.string().optional(),
  urgency: z.enum(["NORMAL", "URGENT"]).default("NORMAL"),
  district: z.string().optional(),
  street: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const user = await requireAuth();

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));
  const status = searchParams.get("status");
  const categoryId = searchParams.get("categoryId");

  try {
    const where: Record<string, unknown> = {};

    if (user.role === "CLIENT") {
      where.clientId = user.id;
    } else if (user.role === "MASTER") {
      where.status = "PUBLISHED";
      // Get master's categories and city
      const profile = await prisma.masterProfile.findUnique({
        where: { userId: user.id },
        include: { categories: true },
      });
      if (profile) {
        const categoryIds = profile.categories.map((c) => c.categoryId);
        if (categoryIds.length > 0) {
          where.categoryId = { in: categoryIds };
        }
        if (profile.city) {
          where.address = { city: profile.city };
        }
      }
    }

    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;

    const [requests, total] = await Promise.all([
      prisma.repairRequest.findMany({
        where,
        include: {
          category: true,
          address: { select: { id: true, title: true, city: true, district: true } },
          client: { select: { id: true, name: true, avatarUrl: true, ratingAvg: true, ratingCount: true } },
          _count: { select: { offers: true } },
          selectedMaster: { select: { id: true, name: true, avatarUrl: true, ratingAvg: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.repairRequest.count({ where }),
    ]);

    return ok({ requests, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Requests GET error:", error);
    return fail("Ошибка при загрузке заявок", 500);
  }
}

export async function POST(request: Request) {
  const user = await requireRole("CLIENT");

  const parsed = await parseJson(request, createSchema);
  if (!parsed.data) return fail(parsed.error);

  try {
    let addressId = parsed.data.addressId;

    if (!addressId || addressId === "placeholder" || addressId === "new") {
      const district = parsed.data.district?.trim();
      const street = parsed.data.street?.trim();

      if (district || street) {
        const newAddress = await prisma.address.create({
          data: {
            userId: user.id,
            title: district || "Мой адрес",
            city: "Москва",
            district: district || "Не указан",
            street: street || "Не указана",
            house: "—",
          },
        });
        addressId = newAddress.id;
      } else {
        const existingAddress = await prisma.address.findFirst({
          where: { userId: user.id },
        });
        if (existingAddress) {
          addressId = existingAddress.id;
        } else {
          const newAddress = await prisma.address.create({
            data: {
              userId: user.id,
              title: "Мой адрес",
              city: "Москва",
              district: "Не указан",
              street: "Не указана",
              house: "—",
            },
          });
          addressId = newAddress.id;
        }
      }
    }

    const repairRequest = await prisma.repairRequest.create({
      data: {
        clientId: user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        categoryId: parsed.data.categoryId,
        addressId,
        budgetAmount: parsed.data.budgetAmount,
        budgetType: parsed.data.budgetType,
        preferredDate: parsed.data.preferredDate ? new Date(parsed.data.preferredDate) : undefined,
        preferredTimeFrom: parsed.data.preferredTimeFrom,
        preferredTimeTo: parsed.data.preferredTimeTo,
        urgency: parsed.data.urgency,
        status: "PUBLISHED",
      },
      include: { category: true, address: true },
    });

    return ok(repairRequest, 201);
  } catch (error) {
    console.error("Requests POST error:", error);
    return fail("Ошибка при создании заявки", 500);
  }
}
