import { cn } from '@/lib/cn'

/** ScholarAI mark — a graduation cap with an AI spark on the tassel. */
export function LogoMark({ className, light }: { className?: string; light?: boolean }) {
  const spark = light ? '#ffffff' : 'var(--color-ai)'
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8', className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill={light ? 'rgba(255,255,255,0.15)' : 'var(--color-primary)'} />
      {/* mortarboard */}
      <path
        d="M16 8 L25 12 L16 16 L7 12 Z"
        fill={light ? '#ffffff' : '#ffffff'}
      />
      <path
        d="M11 14.2 V18.5 C11 20.4 21 20.4 21 18.5 V14.2 L16 16.4 Z"
        fill={light ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.85)'}
      />
      {/* tassel */}
      <path d="M25 12 V17.5" stroke={light ? '#ffffff' : '#ffffff'} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="25" cy="19.2" r="1.8" fill={spark} />
    </svg>
  )
}

export function Logo({
  className,
  light,
  size = 'md',
}: {
  className?: string
  light?: boolean
  size?: 'sm' | 'md'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2.5 font-bold tracking-tight',
        size === 'sm' ? 'text-base' : 'text-lg',
        light ? 'text-white' : 'text-primary',
        className,
      )}
    >
      <LogoMark className={size === 'sm' ? 'h-7 w-7' : 'h-8 w-8'} light={light} />
      <span>
        Scholar<span className={light ? 'text-white/70' : 'text-ai'}>AI</span>
      </span>
    </span>
  )
}
