import { randomUUID } from "node:crypto";

import { getPrisma } from "@/lib/db/prisma";

export const POSTGRES_ORDER_CATEGORIES = [
  ["plumbing", "Сантехника"],
  ["electrical", "Электрика"],
  ["furniture-assembly", "Сборка мебели"],
  ["installation", "Установка"],
  ["small-repair", "Мелкий ремонт"],
  ["other", "Другое"],
] as const;

export type PostgresClientOrder = {
  id: string;
  categoryId: string | null;
  description: string | null;
  status: string;
  totalPriceMinor: number | null;
  createdAt: Date;
};

export async function listPostgresClientOrders(clientId: string): Promise<PostgresClientOrder[]> {
  return getPrisma().order.findMany({
    where: { clientId },
    select: {
      id: true,
      categoryId: true,
      description: true,
      status: true,
      totalPriceMinor: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function createPostgresClientOrder(input: {
  clientId: string;
  categoryId: string;
  description: string;
  budgetRubles: number;
  orderType: "NORMAL" | "URGENT";
}) {
  return getPrisma().order.create({
    data: {
      id: randomUUID(),
      clientId: input.clientId,
      categoryId: input.categoryId,
      description: input.description,
      status: "SEARCHING_MASTERS",
      scheduleKind: "NOW",
      orderType: input.orderType,
      basePriceMinor: Math.round(input.budgetRubles * 100),
      totalPriceMinor: Math.round(input.budgetRubles * 100),
      submittedAt: new Date(),
    },
  });
}
