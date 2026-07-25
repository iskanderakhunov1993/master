"use client";

import { DashboardRouteError } from "@/components/dashboard/dashboard-route-error";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <DashboardRouteError error={error} reset={reset} role="ADMIN" />;
}
