import { notFound, redirect } from "next/navigation";

import { MasterDashboard } from "@/components/master/master-dashboard";
import { MasterOnboarding } from "@/components/master/master-onboarding";
import { MasterOrdersFeed } from "@/components/master/master-orders-feed";
import { MasterProfileEditor } from "@/components/master/master-profile";
import { CalendarView } from "@/components/calendar/calendar-view";
import { OrderLifecycleDetails } from "@/components/orders/order-lifecycle-details";
import { OrderHistoryList } from "@/components/orders/order-history-list";
import { requireRole } from "@/lib/auth/guards";
import { listMasterCalendarEvents } from "@/lib/calendar/repository";
import { listMatchedOrdersForMaster } from "@/lib/marketplace/matching";
import { expireOffers } from "@/lib/marketplace/offers";
import { getMasterOrderDetails, listMasterOrders } from "@/lib/orders/details";
import { getMasterDashboardData, getMasterProfileData } from "@/lib/masters/repository";

export default async function MasterPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ step?: string; tab?: string }>;
}) {
  const user = await requireRole("MASTER");
  const { slug = [] } = await params;
  const profileData = getMasterProfileData(user.id);

  if (slug.length === 1 && slug[0] === "onboarding") {
    const query = await searchParams;
    const requestedStep = Number(query.step);
    return <MasterOnboarding data={profileData} initialStep={Number.isInteger(requestedStep) ? requestedStep : undefined} />;
  }

  if (!profileData.profile.onboardingCompleted) redirect("/master/onboarding");
  if (slug.length === 0) return <MasterDashboard data={getMasterDashboardData(user.id)} />;
  if (slug.length === 1 && slug[0] === "profile") return <MasterProfileEditor data={profileData} />;
  if (slug.length === 1 && slug[0] === "calendar") {
    return <CalendarView events={listMasterCalendarEvents(user.id)} audience="MASTER" />;
  }
  if (slug.length === 1 && slug[0] === "new-orders") redirect("/master/orders/new");
  if (slug.length === 2 && slug[0] === "orders" && slug[1] === "new") {
    expireOffers();
    return <MasterOrdersFeed orders={listMatchedOrdersForMaster(user.id)} isOnline={profileData.profile.isOnline} />;
  }
  if (slug.length === 1 && slug[0] === "orders") {
    const query = await searchParams;
    return <OrderHistoryList orders={listMasterOrders(user.id)} audience="MASTER" requestedTab={query.tab} />;
  }
  if (slug.length === 1 && slug[0] === "history") redirect("/master/orders?tab=COMPLETED");
  if (slug.length === 2 && slug[0] === "orders") {
    const details = getMasterOrderDetails(user.id, slug[1]);
    if (!details) notFound();
    return <OrderLifecycleDetails details={details} audience="MASTER" />;
  }
  notFound();
}
