'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Loader2, MapPin, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import {
  CURRENCIES,
  fmtArs,
  fmtMoney,
  quote,
  randomTxHash,
  type Currency,
  type PaymentRecord,
} from '@/lib/saltapay'
import { ConversionCard } from './conversion-card'
import { PaymentProgress } from './payment-progress'

const STEP_LABELS = [
  'Confirmando pago…',
  'Validando en Stellar…',
  'Firmando transacción…',
  'Pago procesado',
]

export function TouristView({
  onPaymentComplete,
}: {
  onPaymentComplete: (record: PaymentRecord) => void
}) {
  const [currencyCode, setCurrencyCode] = useState('BRL')
  const [arsInput, setArsInput] = useState('125000')
  const [step, setStep] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)

  const origin = useMemo<Currency>(
    () => CURRENCIES.find((c) => c.code === currencyCode) ?? CURRENCIES[0],
    [currencyCode],
  )
  const arsAmount = Number(arsInput.replace(/[^\d]/g, '')) || 0
  const q = useMemo(() => quote(arsAmount, origin), [arsAmount, origin])

  const canPay = arsAmount > 0 && !processing && !done

  function handlePay() {
    if (!canPay) return
    setProcessing(true)
    let s = 1
    setStep(1)
    const timer = setInterval(() => {
      s += 1
      setStep(s)
      if (s >= 4) {
        clearInterval(timer)
        setProcessing(false)
        setDone(true)
        onPaymentComplete({
          id: crypto.randomUUID(),
          tourist: 'tourist-demo-001',
          origin: origin.code,
          originAmount: q.originAmount,
          usdcNet: q.usdcNet,
          arsReceived: q.hotelReceivesArs,
          status: 'liquidado',
          timestamp: Date.now(),
          txHash: randomTxHash(),
        })
      }
    }, 1100)
  }

  function reset() {
    setStep(0)
    setDone(false)
    setProcessing(false)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Hotel context */}
      <div className="text-center">
        <h2 className="text-balance text-2xl font-extrabold tracking-tight text-foreground">
          Hotel Cerro San Bernardo
        </h2>
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-3.5" /> Salta Capital, Argentina
        </p>
      </div>

      {/* Progress */}
      <Card className="p-5">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Progreso del pago
        </h3>
        <PaymentProgress current={step} processing={processing} />
      </Card>

      {/* Payment data */}
      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Datos del pago
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          El monto en pesos lo define la recepción del hotel. Vos elegís en qué
          moneda querés pagar.
        </p>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currency">Moneda de origen</Label>
            <Select value={currencyCode} onValueChange={setCurrencyCode} disabled={processing || done}>
              <SelectTrigger id="currency" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-5 min-w-7 items-center justify-center rounded-md bg-secondary px-1 text-[10px] font-bold text-secondary-foreground">
                        {c.badge}
                      </span>
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground">({c.code})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ars">Monto en ARS (recepción)</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="ars"
                inputMode="numeric"
                value={arsInput}
                onChange={(e) => setArsInput(e.target.value)}
                disabled={processing || done}
                className="h-12 pl-7 font-mono text-lg"
                placeholder="0"
              />
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              ${fmtArs(arsAmount)} ARS
            </p>
          </div>
        </div>
      </Card>

      {/* Conversion */}
      <ConversionCard origin={origin} q={q} />

      {/* Action */}
      {done ? (
        <Card className="border-success/30 bg-success/8 p-5 text-center">
          <CheckCircle2 className="mx-auto size-10 text-success" />
          <p className="mt-2 text-lg font-bold text-foreground">¡Pago confirmado!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            El hotel recibió{' '}
            <span className="font-mono font-semibold text-success">
              ${fmtArs(q.hotelReceivesArs)} ARS
            </span>{' '}
            liquidados sobre Stellar.
          </p>
          <Button variant="outline" className="mt-4 w-full" onClick={reset}>
            Realizar otro pago
          </Button>
        </Card>
      ) : (
        <Button
          size="lg"
          className="h-14 w-full text-base font-bold"
          onClick={handlePay}
          disabled={!canPay}
        >
          {processing ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              {STEP_LABELS[Math.min(step - 1, STEP_LABELS.length - 1)]}
            </>
          ) : (
            <>
              <ShieldCheck className="size-5" />
              Confirmar pago · {origin.symbol}
              {fmtMoney(q.originAmount, q.originAmount < 100 ? 2 : 3)}
            </>
          )}
        </Button>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Turista: <span className="font-mono">tourist-demo-001</span> · Liquidación
        instantánea en USDC sobre la red Stellar
      </p>
    </div>
  )
}
