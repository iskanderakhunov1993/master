"use client";

import {
  BadgeCheck,
  CalendarDays,
  CircleGauge,
  ClipboardList,
  FolderClock,
  House,
  ListTodo,
  MapPinned,
  MessageSquareWarning,
  PackageSearch,
  PanelsTopLeft,
  Repeat2,
  Settings,
  Star,
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
};

export const dashboardNavigation: Record<Role, DashboardNavigationItem[]> = {
  CLIENT: [
    { href: "/client", label: "Главная", icon: House, mobile: true },
    { href: "/client/orders", label: "Мои заказы", mobileLabel: "Заказы", icon: ClipboardList, mobile: true },
    { href: "/client/home", label: "Мой дом", icon: MapPinned, mobile: true },
    { href: "/client/profile", label: "Профиль", icon: UserRound, mobile: true },
    { href: "/client/tasks", label: "Задачи", icon: ListTodo },
    { href: "/client/calendar", label: "Календарь", icon: CalendarDays },
    { href: "/client/subscriptions", label: "Подписки", icon: Repeat2 },
    { href: "/client/history", label: "История", icon: FolderClock },
    { href: "/client/addresses", label: "Адреса", icon: MapPinned },
    { href: "/client/settings", label: "Настройки", icon: Settings },
  ],
  MASTER: [
    { href: "/master", label: "Главная", icon: House, mobile: true },
    { href: "/master/orders/new", label: "Новые заказы", mobileLabel: "Новые", icon: PackageSearch, mobile: true },
    { href: "/master/orders", label: "Мои заказы", mobileLabel: "Заказы", icon: ClipboardList, mobile: true },
    { href: "/master/calendar", label: "Календарь", icon: CalendarDays },
    { href: "/master/history", label: "История", icon: FolderClock },
    { href: "/master/reviews", label: "Отзывы", icon: Star },
    { href: "/master/profile", label: "Профиль", icon: UserRound, mobile: true },
    { href: "/master/settings", label: "Настройки", icon: Settings },
  ],
  ADMIN: [
    { href: "/admin", label: "Dashboard", icon: CircleGauge, mobile: true },
    { href: "/admin/users", label: "Пользователи", mobileLabel: "Люди", icon: UsersRound, mobile: true },
    { href: "/admin/masters", label: "Мастера", icon: Wrench, mobile: true },
    { href: "/admin/verifications", label: "Верификация", icon: BadgeCheck },
    { href: "/admin/orders", label: "Заказы", icon: ClipboardList, mobile: true },
    { href: "/admin/categories", label: "Категории", icon: Tags },
    { href: "/admin/complaints", label: "Жалобы", icon: MessageSquareWarning },
  ],
};

function isActive(pathname: string, href: string) {
  return pathname === href || (href.split("/").length > 2 && pathname.startsWith(`${href}/`));
}

function NavLink({ item, compact = false }: { item: DashboardNavigationItem; compact?: boolean }) {
  const pathname = usePathname();
  const Icon = item.icon;

  return (
    <Link className={isActive(pathname, item.href) ? "is-active" : ""} href={item.href}>
      <Icon size={compact ? 21 : 19} strokeWidth={2} aria-hidden="true" />
      <span>{compact ? (item.mobileLabel ?? item.label) : item.label}</span>
    </Link>
  );
}

export function DesktopDashboardNavigation({ role }: { role: Role }) {
  return (
    <nav className="dashboard-nav" aria-label="Навигация личного кабинета">
      {dashboardNavigation[role].map((item) => <NavLink key={item.href} item={item} />)}
    </nav>
  );
}

export function MobileDashboardMenu({ role }: { role: Role }) {
  return (
    <nav className="mobile-dashboard-menu__links" aria-label="Все разделы личного кабинета">
      {dashboardNavigation[role].map((item) => <NavLink key={item.href} item={item} />)}
    </nav>
  );
}

export function MobileBottomNavigation({ role }: { role: Role }) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Основные разделы">
      {dashboardNavigation[role].filter((item) => item.mobile).map((item) => (
        <NavLink key={item.href} item={item} compact />
      ))}
    </nav>
  );
}

export function RoleGlyph({ role }: { role: Role }) {
  const Glyph = role === "CLIENT" ? UserRound : role === "MASTER" ? Wrench : PanelsTopLeft;
  return <Glyph size={17} aria-hidden="true" />;
}
