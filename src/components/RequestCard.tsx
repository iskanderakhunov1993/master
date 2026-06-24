import Link from 'next/link'
import { Clock3, MapPin, Banknote, Navigation } from 'lucide-react'
import { formatRub } from '@/lib/mock-data'
import { ReactNode } from 'react'

type Status = 'new' | 'in_progress' | 'done' | 'cancelled' | string

type RequestCardProps = {
  request: {
    id: string
    title: string
    category: string
    categoryIcon?: string
    budgetAmount: number
    status: Status
    district: string
    preferredTime: string
    description: string
    urgency?: string
    distance?: string
  }
  href: string
  children?: ReactNode
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  new:         { label: 'Новая',       cls: 'pill-accent' },
  in_progress: { label: 'В работе',    cls: 'pill-orange' },
  done:        { label: 'Завершена',   cls: 'pill-green' },
  cancelled:   { label: 'Отменена',    cls: 'pill-red' },
}

export function RequestCard({ request, href, children }: RequestCardProps) {
  const status = statusConfig[request.status] ?? { label: request.status, cls: 'pill' }

  return (
    <Link href={href} className="request-card" style={{ textDecoration: 'none' }}>
      {/* Top row: category + status */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="pill pill-violet">
          {request.categoryIcon && <span>{request.categoryIcon}</span>}
          {request.category}
        </span>
        <span className={`pill ${status.cls}`}>{status.label}</span>
      </div>

      {/* Title */}
      <h3>{request.title}</h3>

      {/* Description */}
      <p>{request.description}</p>

      {/* Info grid */}
      <div className="request-meta">
        <span><MapPin size={14} /> {request.district}</span>
        <span><Clock3 size={14} /> {request.preferredTime}</span>
        <span><Banknote size={14} /> {formatRub(request.budgetAmount)}</span>
        {request.distance && (
          <span><Navigation size={14} /> {request.distance}</span>
        )}
      </div>

      {/* Optional action slot */}
      {children && (
        <div className="flex gap-2 mt-1" onClick={(e) => e.preventDefault()}>
          {children}
        </div>
      )}
    </Link>
  )
}

export default RequestCard
