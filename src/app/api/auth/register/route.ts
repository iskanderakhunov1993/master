import bcrypt from "bcryptjs";
import { z } from "zod";
import { fail, ok, parseJson } from "@/lib/api";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["CLIENT", "MASTER", "ADMIN"]).default("CLIENT"),
});

export async function POST(request: Request) {
  const parsed = await parseJson(request, schema);
  if (!parsed.data) return fail(parsed.error);
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  return ok({ id: "mock-user-id", ...parsed.data, passwordHash: passwordHash.slice(0, 12) + "...", token: "mock-token" }, 201);
}
