'use client'

import { Coins, CreditCard, Zap, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export const DEFAULT_STEPS = [
  { id: 0, label: 'Seleccionando moneda', hint: 'Elegí tu moneda de origen', icon: Coins },
  { id: 1, label: 'Cotizando ruta óptima', hint: 'Buscando el mejor path en Stellar', icon: CreditCard },
  { id: 2, label: 'Firmando transacción', hint: 'Firma criptográfica en Testnet', icon: ShieldCheck },
  { id: 3, label: '¡Pago procesado!', hint: 'El hotel recibió los pesos', icon: CheckCircle2 },
] as const

export function PaymentProgress({
  current,
  processing,
  labels,
}: {
  current: number
  processing: boolean
  labels?: string[]
}) {
  const steps = labels
    ? labels.map((label, i) => ({
        id: i,
        label,
        hint: '',
        icon: i === labels.length - 1 ? CheckCircle2 : DEFAULT_STEPS[Math.min(i, DEFAULT_STEPS.length - 1)]?.icon || Zap,
      }))
    : DEFAULT_STEPS

  const displaySteps = [
    { id: 0, label: 'Seleccionando moneda', hint: 'Elegí tu moneda de origen', icon: Coins },
    ...steps.map((s, i) => ({ ...s, id: i + 1 })),
  ]

  return (
    <ol className="flex flex-col gap-1">
      {displaySteps.map((step, i) => {
        const done = i < current
        const active = i === current
        const Icon = step.icon
        const isLast = i === displaySteps.length - 1
        return (
          <li key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'flex size-9 items-center justify-center rounded-full border-2 transition-colors',
                  done && 'border-success bg-success text-success-foreground',
                  active && !done && 'border-primary bg-primary text-primary-foreground',
                  !done && !active && 'border-border bg-muted text-muted-foreground',
                )}
              >
                {active && processing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Icon className="size-4" />
                )}
              </span>
              {!isLast && (
                <span
                  className={cn(
                    'my-0.5 w-0.5 flex-1 rounded-full',
                    done ? 'bg-success' : 'bg-border',
                  )}
                  style={{ minHeight: 18 }}
                />
              )}
            </div>
            <div className={cn('pb-3 pt-1.5', isLast && 'pb-0')}>
              <p
                className={cn(
                  'text-sm font-semibold transition-colors',
                  active && 'text-primary',
                  done && 'text-foreground',
                  !done && !active && 'text-muted-foreground',
                )}
              >
                {step.label}
              </p>
              {step.hint && <p className="text-xs text-muted-foreground">{step.hint}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
