import { ok, fail } from "@/lib/api";
import { requireAuth } from "@/lib/auth";

// In-memory store for MVP
const codeStore = ((globalThis as any).__verificationCodes ??= new Map<
  string,
  { code: string; expiresAt: Date }
>());

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function GET() {
  try {
    const user = await requireAuth();

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes

    codeStore.set(user.id, { code, expiresAt });

    // Auto-cleanup after expiry
    setTimeout(() => {
      const stored = codeStore.get(user.id);
      if (stored && stored.code === code) {
        codeStore.delete(user.id);
      }
    }, 3 * 60 * 1000);

    return ok({ code, expiresAt: expiresAt.toISOString() });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error("Verification code error:", e);
    return fail("Ошибка генерации кода", 500);
  }
}
