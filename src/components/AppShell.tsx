'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ReactNode } from 'react'
import { Brand } from './Brand'

type Role = 'CLIENT' | 'MASTER' | 'ADMIN'

const navMap: Record<Role, { icon: string; label: string; href: string }[]> = {
  CLIENT: [
    { icon: '🏠', label: 'Мои заявки',   href: '/client/dashboard' },
    { icon: '➕', label: 'Новая заявка',  href: '/client/requests/new' },
    { icon: '📋', label: 'История',       href: '/client/history' },
    { icon: '👤', label: 'Профиль',       href: '/client/profile' },
  ],
  MASTER: [
    { icon: '📋', label: 'Заявки',        href: '/master/requests' },
    { icon: '🧰', label: 'Мои заказы',    href: '/master/orders' },
    { icon: '💎', label: 'Подписка',      href: '/master/subscription' },
    { icon: '👤', label: 'Профиль',       href: '/master/profile' },
  ],
  ADMIN: [
    { icon: '📊', label: 'Дашборд',       href: '/admin' },
    { icon: '👥', label: 'Пользователи',  href: '/admin/users' },
    { icon: '📋', label: 'Заявки',        href: '/admin/requests' },
    { icon: '📁', label: 'Категории',     href: '/admin/categories' },
  ],
}

const roleLabels: Record<Role, string> = {
  CLIENT: 'Клиент',
  MASTER: 'Мастер',
  ADMIN:  'Админ',
}

export function AppShell({
  children,
  role = 'CLIENT',
}: {
  children: ReactNode
  role?: Role
}) {
  const pathname = usePathname()
  const router = useRouter()
  const items = navMap[role]

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <div className="app-layout">
      {/* ---- Topbar ---- */}
      <header className="topbar">
        <Brand size="small" />
        <div className="flex items-center gap-3">
          <span className="pill">{roleLabels[role]}</span>
        </div>
      </header>

      {/* ---- Desktop sidebar ---- */}
      <aside className="sidebar">
        <Brand />
        <div className="mt-2 mb-4">
          <span className="pill">{roleLabels[role]}</span>
        </div>
        <nav className="flex flex-col gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive(item.href) ? 'nav-item-active' : ''}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <button onClick={handleLogout} className="nav-item w-full text-left" style={{ color: 'var(--red)' }}>
            🚪 Выйти
          </button>
        </div>
      </aside>

      {/* ---- Main content ---- */}
      <main className="app-main">{children}</main>

      {/* ---- Mobile bottom nav ---- */}
      <nav className="bottom-nav">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item ${isActive(item.href) ? 'bottom-nav-item-active' : ''}`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}

export default AppShell
