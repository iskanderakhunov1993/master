import { z } from "zod";
import { demoUsers } from "@/lib/mock-data";
import { fail, ok, parseJson } from "@/lib/api";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = await parseJson(request, schema);
  if (!parsed.data) return fail(parsed.error);
  const user = Object.values(demoUsers).find((item) => item.email === parsed.data.email) ?? demoUsers.client;
  return ok({ user, token: "mock-token" });
}
