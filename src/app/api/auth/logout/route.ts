import { removeAuthCookie } from "@/lib/auth";
import { ok } from "@/lib/api";

export async function POST() {
  await removeAuthCookie();
  return ok({ message: "Вы вышли из системы" });
}
