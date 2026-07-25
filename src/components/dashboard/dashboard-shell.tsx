import { LogOut, Menu } from "lucide-react";

import { logoutAction } from "@/lib/auth/actions";
import { ROLE_LABEL, type SessionUser } from "@/lib/auth/types";

import { Brand } from "../brand";
import {
  DesktopDashboardNavigation,
  MobileBottomNavigation,
  MobileDashboardMenu,
  RoleGlyph,
} from "./dashboard-nav";
import { RouteScrollReset } from "./route-scroll-reset";

export function DashboardShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const initial = user.name.trim().slice(0, 1).toUpperCase();

  return (
    <div className={`dashboard-shell dashboard-shell--${user.role.toLowerCase()}`}>
      <RouteScrollReset />
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar__brand"><Brand /></div>
        <div className="dashboard-role-badge"><RoleGlyph role={user.role} /> {ROLE_LABEL[user.role]}</div>
        <DesktopDashboardNavigation role={user.role} />
        <div className="dashboard-sidebar__user">
          <span className="dashboard-user-avatar">{initial}</span>
          <span><strong>{user.name}</strong><small>{user.email}</small></span>
          <form action={logoutAction}>
            <button type="submit" aria-label="Выйти"><LogOut size={18} /></button>
          </form>
        </div>
      </aside>

      <div className="dashboard-workspace">
        <header className="dashboard-mobile-header">
          <Brand compact />
          <strong>Мастер рядом</strong>
          <details className="mobile-dashboard-menu">
            <summary aria-label="Открыть меню"><Menu size={22} /></summary>
            <div>
              <div className="mobile-dashboard-menu__user">
                <span className="dashboard-user-avatar">{initial}</span>
                <span><strong>{user.name}</strong><small>{ROLE_LABEL[user.role]}</small></span>
              </div>
              <MobileDashboardMenu role={user.role} />
              <form action={logoutAction}>
                <button className="mobile-logout" type="submit"><LogOut size={18} /> Выйти</button>
              </form>
            </div>
          </details>
        </header>

        <main className="dashboard-main">{children}</main>
        <MobileBottomNavigation role={user.role} />
      </div>
    </div>
  );
}
