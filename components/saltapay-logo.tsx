import { cn } from '@/lib/utils'

export function SaltaPayLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn('shrink-0', className)}
      role="img"
      aria-label="SaltaPay"
    >
      {/* Andean cerro / coin mark */}
      <rect width="40" height="40" rx="11" className="fill-primary" />
      {/* sun */}
      <circle cx="27" cy="13" r="3.4" className="fill-[oklch(0.86_0.13_80)]" />
      {/* layered mountain peaks */}
      <path
        d="M6 30L15 17L21 25L27.5 15.5L34 30H6Z"
        className="fill-primary-foreground"
      />
      <path
        d="M6 30L13 21L18 27L14.5 30H6Z"
        className="fill-[oklch(0.86_0.13_80)]"
        opacity="0.9"
      />
    </svg>
  )
}
