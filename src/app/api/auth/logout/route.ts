import { removeAuthCookie } from "@/lib/auth";
import { ok } from "@/lib/api";

export async function POST() {
  removeAuthCookie();
  return ok({ message: "Вы вышли из системы" });
}
