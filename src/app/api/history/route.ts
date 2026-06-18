import { ok } from "@/lib/api";
import { repairHistory } from "@/lib/mock-data";

export async function GET() {
  return ok(repairHistory);
}
