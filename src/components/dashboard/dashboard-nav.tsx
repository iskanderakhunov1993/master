"use client";

import {
  BadgeCheck,
  CalendarDays,
  CircleGauge,
  ClipboardList,
  House,
  ListTodo,
  MapPinned,
  MessageSquareWarning,
  PackageSearch,
  PanelsTopLeft,
  Repeat2,
  Tags,
  UserRound,
  UsersRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Role } from "@/lib/auth/types";

export type DashboardNavigationItem = {
  href: string;
  label: string;
  mobileLabel?: string;
  icon: LucideIcon;
  mobile?: boolean;
  /** Starts the secondary group: everything below the divider is support, not a daily task. */
  secondary?: boolean;
};

// Primary items come first and are the only ones in the mobile bottom bar
// (max 5). Secondary items sit below a divider in the sidebar.
export const dashboardNavigation: Record<Role, DashboardNavigationItem[]> = {
  CLIENT: [
    { href: "/client", label: "Главная", icon: House, mobile: true },
    { href: "/client/orders", label: "Заказы", icon: ClipboardList, mobile: true },
    { href: "/client/tasks", label: "Задачи", icon: ListTodo, mobile: true },
    { href: "/client/home", label: "Мой дом", icon: MapPinned, mobile: true },
    { href: "/client/calendar", label: "Календарь", icon: CalendarDays, secondary: true },
    { href: "/client/subscriptions", label: "Подписки", icon: Repeat2, secondary: true },
    { href: "/client/addresses", label: "Адреса", icon: MapPinned, secondary: true },
  ],
  MASTER: [
    { href: "/master", label: "Главная", icon: House, mobile: true },
    { href: "/master/orders/new", label: "Новые заказы", mobileLabel: "Новые", icon: PackageSearch, mobile: true },
    { href: "/master/orders", label: "Заказы", icon: ClipboardList, mobile: true },
    { href: "/master/profile", label: "Профиль", icon: UserRound, mobile: true },
    { href: "/master/calendar", label: "Календарь", icon: CalendarDays, secondary: true },
  ],
  ADMIN: [
    { href: "/admin", label: "Обзор", icon: CircleGauge, mobile: true },
    { href: "/admin/orders", label: "Заказы", icon: ClipboardList, mobile: true },
    { href: "/admin/masters", label: "Мастера", icon: Wrench, mobile: true },
    { href: "/admin/users", label: "Люди", icon: UsersRound, mobile: true },
    { href: "/admin/verifications", label: "Верификация", icon: BadgeCheck, secondary: true },
    { href: "/admin/categories", label: "Категории", icon: Tags, secondary: true },
    { href: "/admin/complaints", label: "Жалобы", icon: MessageSquareWarning, secondary: true },
  ],
};

function matchLength(pathname: string, href: string) {
  if (pathname === href) return href.length;
  if (href.split("/").length > 2 && pathname.startsWith(`${href}/`)) return href.length;
  return -1;
}

// Only the most specific matching item is active, so /master/orders/new does not
// also highlight its /master/orders parent.
function activeHref(pathname: string, items: DashboardNavigationItem[]) {
  let best: string | null = null;
  let bestLength = -1;

  for (const item of items) {
    const length = matchLength(pathname, item.href);
    if (length > bestLength) {
      bestLength = length;
      best = item.href;
    }
  }

  return best;
}

function NavLink({
  item,
  items,
  compact = false,
}: {
  item: DashboardNavigationItem;
  items: DashboardNavigationItem[];
  compact?: boolean;
}) {
  const pathname = usePathname();
  const Icon = item.icon;

  return (
    <Link className={activeHref(pathname, items) === item.href ? "is-active" : ""} href={item.href}>
      <Icon size={compact ? 21 : 19} strokeWidth={2} aria-hidden="true" />
      <span>{compact ? (item.mobileLabel ?? item.label) : item.label}</span>
    </Link>
  );
}

function NavGroups({ role, className, ariaLabel }: { role: Role; className: string; ariaLabel: string }) {
  const items = dashboardNavigation[role];
  const primary = items.filter((item) => !item.secondary);
  const secondary = items.filter((item) => item.secondary);

  return (
    <nav className={className} aria-label={ariaLabel}>
      {primary.map((item) => <NavLink key={item.href} item={item} items={items} />)}
      {secondary.length > 0 && <span className="dashboard-nav__divider" aria-hidden="true" />}
      {secondary.map((item) => <NavLink key={item.href} item={item} items={items} />)}
    </nav>
  );
}

export function DesktopDashboardNavigation({ role }: { role: Role }) {
  return <NavGroups role={role} className="dashboard-nav" ariaLabel="Навигация личного кабинета" />;
}

export function MobileDashboardMenu({ role }: { role: Role }) {
  return <NavGroups role={role} className="mobile-dashboard-menu__links" ariaLabel="Все разделы личного кабинета" />;
}

export function MobileBottomNavigation({ role }: { role: Role }) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Основные разделы">
      {dashboardNavigation[role].filter((item) => item.mobile).map((item) => (
        <NavLink key={item.href} item={item} items={dashboardNavigation[role]} compact />
      ))}
    </nav>
  );
}

export function RoleGlyph({ role }: { role: Role }) {
  const Glyph = role === "CLIENT" ? UserRound : role === "MASTER" ? Wrench : PanelsTopLeft;
  return <Glyph size={17} aria-hidden="true" />;
}
