import Link from 'next/link'

export function Brand({ size = 'default' }: { size?: 'small' | 'default' | 'large' }) {
  const sizes = {
    small:   { icon: 32, text: 'text-lg' },
    default: { icon: 40, text: 'text-[22px]' },
    large:   { icon: 56, text: 'text-3xl' },
  }
  const s = sizes[size]

  return (
    <Link href="/" className="brand">
      <span
        className="brand-mark"
        style={{
          width: s.icon,
          height: s.icon,
          borderRadius: '50%',
          background: '#000',
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: s.icon * 0.45,
          flexShrink: 0,
        }}
      >
        🔧
      </span>
      <span className={s.text} style={{ fontWeight: 800 }}>Мастер рядом</span>
    </Link>
  )
}

export default Brand
