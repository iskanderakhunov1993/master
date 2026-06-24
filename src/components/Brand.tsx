import Link from 'next/link'

export function Brand({ size = 'default' }: { size?: 'small' | 'default' | 'large' }) {
  const sizes = {
    small:   { icon: 'w-8 h-8 text-sm rounded-xl',      text: 'text-lg' },
    default: { icon: 'w-10 h-10 text-base rounded-[15px]', text: 'text-[22px]' },
    large:   { icon: 'w-14 h-14 text-xl rounded-2xl',    text: 'text-3xl' },
  }
  const s = sizes[size]

  return (
    <Link href="/" className="brand">
      <span className={`brand-mark ${s.icon}`}>🔧</span>
      <span className={s.text}>Мастер рядом</span>
    </Link>
  )
}

export default Brand
