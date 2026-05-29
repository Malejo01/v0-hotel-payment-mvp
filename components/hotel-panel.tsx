'use client'

import { ArrowDownLeft, Building2, ExternalLink, Wallet } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CURRENCIES,
  fmtArs,
  fmtUsdc,
  shortHash,
  type PaymentRecord,
} from '@/lib/saltapay'

function badgeFor(code: string) {
  return CURRENCIES.find((c) => c.code === code)?.badge ?? code.slice(0, 2)
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'hace instantes'
  const m = Math.floor(s / 60)
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h} h`
  return new Date(ts).toLocaleDateString('es-AR')
}

export function HotelPanel({ payments }: { payments: PaymentRecord[] }) {
  const totalArs = payments.reduce((acc, p) => acc + p.arsReceived, 0)
  const totalUsdc = payments.reduce((acc, p) => acc + p.usdcNet, 0)

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-balance text-2xl font-extrabold tracking-tight text-foreground">
          Hotel Cerro San Bernardo
        </h2>
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Building2 className="size-3.5" /> Panel del comercio
        </p>
      </div>

      {/* Balance hero */}
      <Card className="overflow-hidden border-none bg-primary p-0 text-primary-foreground">
        <div className="p-6">
          <p className="flex items-center gap-2 text-sm font-medium opacity-90">
            <Wallet className="size-4" /> Liquidado en pesos (ARS)
          </p>
          <p className="mt-2 font-mono text-4xl font-semibold tracking-tight">
            ${fmtArs(totalArs)}
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <Badge className="border-none bg-primary-foreground/15 font-mono text-primary-foreground hover:bg-primary-foreground/15">
              {fmtUsdc(totalUsdc)} USDC
            </Badge>
            <span className="opacity-80">recibidos en {payments.length} pagos</span>
          </div>
        </div>
        <div className="border-t border-primary-foreground/15 px-6 py-3 text-xs opacity-90">
          Wallet Stellar · GSALTA…HOTEL · liquidación instantánea 24/7
        </div>
      </Card>

      {/* Transactions */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Pagos recibidos
          </h3>
          <Badge variant="secondary" className="font-mono">
            {payments.length}
          </Badge>
        </div>

        {payments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <ArrowDownLeft className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Sin pagos todavía</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Pedile a un turista que realice un pago desde la pestaña{' '}
              <span className="font-semibold">Vista turista</span> y aparecerá aquí
              al instante.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success/12 text-success">
                  <ArrowDownLeft className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 min-w-7 items-center justify-center rounded-md bg-secondary px-1 text-[10px] font-bold text-secondary-foreground">
                      {badgeFor(p.origin)}
                    </span>
                    <p className="truncate text-sm font-semibold text-foreground">
                      {p.tourist}
                    </p>
                  </div>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs text-accent hover:underline"
                  >
                    {shortHash(p.txHash)}
                    <ExternalLink className="size-3" />
                    <span className="text-muted-foreground">· {timeAgo(p.timestamp)}</span>
                  </a>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold text-success">
                    +${fmtArs(p.arsReceived)}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {fmtUsdc(p.usdcNet)} USDC
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
