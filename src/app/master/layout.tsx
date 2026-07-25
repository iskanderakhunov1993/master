import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth/guards";

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("MASTER");
  return <DashboardShell user={user}>{children}</DashboardShell>;
}
