import { notFound, redirect } from "next/navigation";

import { AdminComplaintCase } from "@/components/admin/admin-complaint-case";
import { AdminComplaints } from "@/components/admin/admin-complaints";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminMasters } from "@/components/admin/admin-masters";
import { AdminOrders } from "@/components/admin/admin-orders";
import { AdminUsers } from "@/components/admin/admin-users";
import { CategoryManager } from "@/components/admin/category-manager";
import { VerificationQueue } from "@/components/admin/verification-queue";
import {
  getAdminComplaintCase,
  getAdminDashboardData,
  listAdminCategories,
  listAdminComplaints,
  listAdminMasters,
  listAdminOrders,
  listAdminUsers,
} from "@/lib/admin/repository";
import { requireRole } from "@/lib/auth/guards";
import { listPendingVerificationApplications } from "@/lib/masters/repository";
import { listOrderChangeRequests } from "@/lib/orders/change-requests";
import { listOrderWorkMedia } from "@/lib/orders/work-media";

export default async function AdminPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const user = await requireRole("ADMIN");
  const { slug = [] } = await params;
  if (slug.length === 0) return <AdminDashboard user={user} data={getAdminDashboardData()} />;

  if (slug.length === 2 && slug[0] === "complaints") {
    const complaintCase = getAdminComplaintCase(slug[1]);
    if (!complaintCase) notFound();
    const workPhotos = listOrderWorkMedia(complaintCase.orderId);
    return (
      <AdminComplaintCase
        complaint={complaintCase}
        beforePhotos={workPhotos.filter((photo) => photo.stage === "BEFORE")}
        afterPhotos={workPhotos.filter((photo) => photo.stage === "AFTER")}
        changeRequests={listOrderChangeRequests(complaintCase.orderId)}
      />
    );
  }

  if (slug.length !== 1) notFound();
  if (slug[0] === "verification") redirect("/admin/verifications");
  if (slug[0] === "users") return <AdminUsers users={listAdminUsers()} />;
  if (slug[0] === "masters") return <AdminMasters masters={listAdminMasters()} />;
  if (slug[0] === "verifications") return <VerificationQueue applications={listPendingVerificationApplications()} />;
  if (slug[0] === "orders") return <AdminOrders orders={listAdminOrders()} />;
  if (slug[0] === "categories") return <CategoryManager categories={listAdminCategories()} />;
  if (slug[0] === "complaints") return <AdminComplaints complaints={listAdminComplaints()} />;
  notFound();
}
