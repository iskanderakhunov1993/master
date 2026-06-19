import { ok } from "@/lib/api";
import { getMvpState } from "@/lib/mvp-store";

export async function GET() {
  return ok(getMvpState());
}
