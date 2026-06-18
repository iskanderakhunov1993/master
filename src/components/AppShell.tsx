import Link from "next/link";
import { ReactNode } from "react";
import { Brand } from "./Brand";

const nav = [
  { href: "/client/dashboard", label: "Клиент" },
  { href: "/master/dashboard", label: "Мастер" },
  { href: "/admin", label: "Админ" },
];

export function AppShell({ children, role }: { children: ReactNode; role?: string }) {
  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <Brand />
        <nav>
          {nav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="app-sidebar-card">
          <span>{role ?? "MVP"}</span>
          <strong>Demo mode</strong>
          <p>API и Prisma готовы, интерфейс работает на seed-логике.</p>
        </div>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
