import { NextResponse } from "next/server";
import { z } from "zod";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function parseJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }
  return { data: parsed.data, error: null };
}
