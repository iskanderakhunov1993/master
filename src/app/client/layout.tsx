import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth/guards";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("CLIENT");
  return <DashboardShell user={user}>{children}</DashboardShell>;
}
