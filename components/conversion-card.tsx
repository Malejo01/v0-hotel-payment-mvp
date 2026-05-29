'use client'

import { ArrowRight, TrendingUp } from 'lucide-react'
import type { Currency, Quote } from '@/lib/saltapay'
import { ARS_PER_USDC, COMMISSION_RATE, fmtArs, fmtMoney, fmtUsdc } from '@/lib/saltapay'

export function ConversionCard({ origin, q }: { origin: Currency; q: Quote }) {
  return (
    <div className="rounded-2xl border border-accent/25 bg-accent/5 p-5">
      <div className="flex items-center gap-2 text-accent">
        <TrendingUp className="size-4" />
        <h3 className="text-sm font-bold uppercase tracking-wide">Conversión estimada</h3>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-3xl font-semibold leading-none text-foreground">
            {origin.symbol}
            {fmtMoney(q.originAmount, q.originAmount < 100 ? 2 : 3)}
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">{origin.code}</p>
        </div>
        <ArrowRight className="mb-5 size-5 shrink-0 text-accent" />
        <div className="text-right">
          <p className="font-mono text-3xl font-semibold leading-none text-accent">
            {fmtUsdc(q.usdcGross)}
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">USDC</p>
        </div>
      </div>

      <dl className="mt-5 space-y-2 rounded-xl bg-card p-4 font-mono text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Tasa de cambio</dt>
          <dd className="text-foreground">
            1 {origin.code} = {fmtMoney(q.rate, 4)} USDC
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">
            Comisión SaltaPay ({(COMMISSION_RATE * 100).toFixed(2)}%)
          </dt>
          <dd className="text-primary">-{fmtUsdc(q.fee)} USDC</dd>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2">
          <dt className="text-muted-foreground">USDC neto on-chain</dt>
          <dd className="font-semibold text-foreground">{fmtUsdc(q.usdcNet)} USDC</dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-success/12 px-4 py-3">
        <div className="leading-tight">
          <p className="text-sm font-semibold text-success">El hotel recibe (ARS)</p>
          <p className="font-mono text-xs text-muted-foreground">
            @ {fmtArs(ARS_PER_USDC)} ARS/USDC
          </p>
        </div>
        <p className="font-mono text-2xl font-semibold text-success">
          ${fmtArs(q.hotelReceivesArs)}
        </p>
      </div>
    </div>
  )
}
