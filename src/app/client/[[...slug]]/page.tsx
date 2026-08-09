import { notFound, redirect } from "next/navigation";

import { AddressManager } from "@/components/client/address-manager";
import { ClientDashboard } from "@/components/client/client-dashboard";
import { HomePassport } from "@/components/client/home-passport";
import { OrderHistoryList } from "@/components/orders/order-history-list";
import { OrderSearching } from "@/components/client/order-searching";
import { OrderCandidates } from "@/components/client/order-candidates";
import { OrderWizard } from "@/components/client/order-wizard";
import { OrderLifecycleDetails } from "@/components/orders/order-lifecycle-details";
import { TaskBoard } from "@/components/client/task-board";
import { TaskDetails } from "@/components/client/task-details";
import { SubscriptionManager } from "@/components/client/subscription-manager";
import { CalendarView } from "@/components/calendar/calendar-view";
import { SectionPage } from "@/components/dashboard/section-page";
import { listClientAddresses } from "@/lib/addresses/repository";
import { requireRole } from "@/lib/auth/guards";
import { listClientCalendarEvents } from "@/lib/calendar/repository";
import { listRankedCandidates } from "@/lib/marketplace/ranking";
import { getClientOrderDetails } from "@/lib/orders/details";
import {
  getClientDashboardData,
  getClientOrder,
  getOrCreateOrderWizardData,
  listClientOrders,
  listServiceCategories,
} from "@/lib/orders/repository";
import { getClientTask, listClientTasks } from "@/lib/tasks/repository";
import { getCurrentTimestamp } from "@/lib/time";
import { getSubscriptionPageData } from "@/lib/subscriptions/repository";
import { listClientWarranties } from "@/lib/warranties/repository";

const sections: Record<string, { title: string; description: string }> = {
  tasks: { title: "Задачи", description: "Планируйте бытовые дела и превращайте их в заказы, когда нужна помощь." },
  calendar: { title: "Календарь", description: "Все задачи и заказы с назначенным временем в одном календаре." },
  history: { title: "История", description: "Завершённые и отменённые заказы с сохранёнными деталями." },
  profile: { title: "Профиль", description: "Ваши личные данные и настройки публичного отображения." },
  settings: { title: "Настройки", description: "Уведомления, безопасность аккаунта и предпочтения сервиса." },
};

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ type?: string; task?: string; tab?: string }>;
}) {
  const user = await requireRole("CLIENT");
  const { slug = [] } = await params;

  if (slug.length === 0) {
    return <ClientDashboard user={user} data={getClientDashboardData(user.id)} />;
  }

  if (slug.length === 1 && slug[0] === "addresses") {
    return <AddressManager addresses={listClientAddresses(user.id)} />;
  }

  if (slug.length === 1 && slug[0] === "home") {
    const dashboard = getClientDashboardData(user.id);
    return <HomePassport addresses={listClientAddresses(user.id)} activeOrder={dashboard.activeOrder} recentOrders={listClientOrders(user.id, 50)} warranties={listClientWarranties(user.id)} tasks={listClientTasks(user.id)} referenceTime={getCurrentTimestamp()} />;
  }

  if (slug.length === 1 && slug[0] === "tasks") {
    return <TaskBoard initialTasks={listClientTasks(user.id)} categories={listServiceCategories()} />;
  }

  if (slug.length === 2 && slug[0] === "tasks") {
    const task = getClientTask(user.id, slug[1]);
    if (!task) notFound();
    return <TaskDetails task={task} categories={listServiceCategories()} />;
  }

  if (slug.length === 1 && slug[0] === "calendar") {
    return <CalendarView events={listClientCalendarEvents(user.id)} audience="CLIENT" />;
  }

  if (slug.length === 1 && slug[0] === "subscriptions") {
    return <SubscriptionManager data={getSubscriptionPageData(user.id)} />;
  }

  if (slug.length === 1 && slug[0] === "orders") {
    const query = await searchParams;
    return <OrderHistoryList orders={listClientOrders(user.id)} audience="CLIENT" requestedTab={query.tab} />;
  }

  if (slug.length === 1 && slug[0] === "history") redirect("/client/orders?tab=COMPLETED");

  if (slug.length === 2 && slug[0] === "orders" && slug[1] === "new") {
    const query = await searchParams;
    const preferredType = query.type === "URGENT" ? "URGENT" : undefined;
    return <OrderWizard data={getOrCreateOrderWizardData(user.id, preferredType, query.task)} />;
  }

  if (slug.length === 2 && slug[0] === "orders") {
    const order = getClientOrder(user.id, slug[1]);
    if (!order) notFound();
    if (order.status === "OFFERS_RECEIVED") {
      const candidates = listRankedCandidates(user.id, order.id);
      if (candidates.length > 0) return <OrderCandidates order={order} candidates={candidates} />;
      const refreshedOrder = getClientOrder(user.id, order.id);
      if (!refreshedOrder) notFound();
      return <OrderSearching order={refreshedOrder} />;
    }
    if ([
      "MASTER_SELECTED", "MASTER_CONFIRMED", "MASTER_ON_THE_WAY",
      "MASTER_ARRIVED", "IN_PROGRESS", "COMPLETED_BY_MASTER",
      "COMPLETED", "REVIEWED", "DISPUTED", "CANCELLED_BY_CLIENT",
      "CANCELLED_BY_MASTER",
    ].includes(order.status)) {
      const details = getClientOrderDetails(user.id, order.id);
      if (!details) notFound();
      return <OrderLifecycleDetails details={details} audience="CLIENT" />;
    }
    return <OrderSearching order={order} />;
  }

  if (slug.length !== 1 || !sections[slug[0]]) notFound();
  const section = sections[slug[0]];
  return <SectionPage eyebrow="Кабинет клиента" title={section.title} description={section.description} homeHref="/client" />;
}
