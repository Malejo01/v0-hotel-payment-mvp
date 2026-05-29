'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ExternalLink, Loader2, MapPin, Smartphone } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ARS_PER_USDC,
  CURRENCIES,
  fmtArs,
  fmtMoney,
  fmtUsdc,
  quote,
  shortHash,
  type Currency,
  type PaymentRecord,
} from '@/lib/saltapay'
import { ConversionCard } from './conversion-card'
import { PaymentProgress } from './payment-progress'
import { PaymentTracker, type PaymentTrackerSuccess } from './payment-tracker'
import type { PaymentSession } from '@/types/pay'

const STEP_LABELS = [
  'Preparando operación…',
  'Esperando firma en billetera Stellar…',
  '¡Pago procesado con éxito!',
]

type CheckoutState = 'idle' | 'waiting' | 'success'
type ReceiptState = 'idle' | 'saving' | 'saved' | 'error'

export function TouristView({
  onPaymentComplete,
}: {
  onPaymentComplete: (record: PaymentRecord) => void
}) {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session')

  const [session, setSession] = useState<PaymentSession | null>(null)
  const [sessionLoading, setSessionLoading] = useState(Boolean(sessionId))
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [currencyCode, setCurrencyCode] = useState('BRL')
  const [step, setStep] = useState(0)
  const [checkoutState, setCheckoutState] = useState<CheckoutState>('idle')
  const [intent, setIntent] = useState<{ sep7Url: string; hotelPublicKey: string; sourceAccount: string } | null>(null)
  const [lastTxHash, setLastTxHash] = useState<string | null>(null)
  const [receivedAmount, setReceivedAmount] = useState<number | null>(null)
  const [confirmedPayment, setConfirmedPayment] = useState<PaymentTrackerSuccess | null>(null)
  const [receiptState, setReceiptState] = useState<ReceiptState>('idle')
  const [receiptInfo, setReceiptInfo] = useState<{ txHash: string; entityId: string } | null>(null)
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const origin = useMemo<Currency>(
    () => CURRENCIES.find((currency) => currency.code === currencyCode) ?? CURRENCIES[0],
    [currencyCode],
  )
  const arsAmount = session?.montoARS ?? 0
  const q = useMemo(() => quote(arsAmount, origin), [arsAmount, origin])

  useEffect(() => {
    if (!sessionId) {
      setSession(null)
      setSessionLoading(false)
      setSessionError(null)
      return
    }

    const activeSessionId = sessionId
    let cancelled = false
    setSessionLoading(true)
    setSessionError(null)

    async function loadSession() {
      try {
        const response = await fetch(`/api/payment-sessions?sessionId=${encodeURIComponent(activeSessionId)}&markOpened=true`)
        const data = await response.json()

        if (!response.ok || !data.success || !data.session) {
          throw new Error(data.error || 'No encontramos el cobro solicitado')
        }

        if (!cancelled) {
          setSession(data.session)
        }
      } catch (sessionLoadError) {
        if (!cancelled) {
          console.error('[TouristView] Error loading session:', sessionLoadError)
          setSession(null)
          setSessionError(
            sessionLoadError instanceof Error ? sessionLoadError.message : 'No se pudo abrir el checkout del hotel'
          )
        }
      } finally {
        if (!cancelled) {
          setSessionLoading(false)
        }
      }
    }

    void loadSession()

    return () => {
      cancelled = true
    }
  }, [sessionId])

  async function persistReceipt(payload: PaymentTrackerSuccess) {
    if (!session) {
      return
    }

    setReceiptState('saving')
    setReceiptError(null)

    try {
      const response = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          transactionHash: payload.txHash,
          touristSourceAccount: intent?.sourceAccount ?? 'wallet-demo',
          sourceCurrency: origin.code,
          originAmount: q.originAmount,
          receivedAmount: payload.receivedAmount,
          hotel: {
            hotelId: session.hotelId,
            hotelNombre: session.hotelNombre,
            localidad: session.localidad,
          },
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success || !data.arkiv?.txHash || !data.arkiv?.entityId) {
        throw new Error(data.error || 'No se pudo guardar el recibo inmutable')
      }

      setReceiptInfo({ txHash: data.arkiv.txHash, entityId: data.arkiv.entityId })
      setReceiptState('saved')
    } catch (persistError) {
      console.error('[TouristView] Arkiv persistence error:', persistError)
      setReceiptState('error')
      setReceiptError(
        persistError instanceof Error ? persistError.message : 'No se pudo guardar el recibo en Arkiv'
      )
    }
  }

  async function handleConfirmOperation() {
    if (!session) {
      return
    }

    setError(null)
    setStep(1)

    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      setStep(2)

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          arsAmount: session.montoARS,
          originCurrency: origin.code,
          originAmount: q.originAmount,
          usdcAmount: q.usdcNet,
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success || !data.intent?.sep7Url || !data.intent?.destinationAccount) {
        throw new Error(data.error || 'No se pudo preparar la firma en la billetera')
      }

      setIntent({
        sep7Url: data.intent.sep7Url,
        hotelPublicKey: data.intent.destinationAccount,
        sourceAccount: data.intent.sourceAccount,
      })
      setCheckoutState('waiting')

      if (typeof window !== 'undefined') {
        window.location.href = data.intent.sep7Url
      }
    } catch (checkoutError) {
      console.error('[TouristView] Payment intent error:', checkoutError)
      setError(checkoutError instanceof Error ? checkoutError.message : 'No se pudo iniciar la operación')
      setStep(0)
    }
  }

  function handleTrackedSuccess(payload: PaymentTrackerSuccess) {
    if (!session || !intent) {
      return
    }

    setConfirmedPayment(payload)
    setLastTxHash(payload.txHash)
    setReceivedAmount(payload.receivedAmount)
    setCheckoutState('success')
    setStep(3)
    void persistReceipt(payload)

    onPaymentComplete({
      id: crypto.randomUUID(),
      tourist: shortHash(intent.sourceAccount),
      origin: origin.code,
      originAmount: q.originAmount,
      usdcNet: payload.receivedAmount,
      arsReceived: payload.receivedAmount * ARS_PER_USDC,
      status: 'liquidado',
      timestamp: Date.now(),
      txHash: payload.txHash,
    })
  }

  function reset() {
    setStep(0)
    setCheckoutState('idle')
    setIntent(null)
    setLastTxHash(null)
    setReceivedAmount(null)
    setConfirmedPayment(null)
    setReceiptState('idle')
    setReceiptInfo(null)
    setReceiptError(null)
    setError(null)
  }

  if (!sessionId) {
    return (
      <Card className="p-8 text-center">
        <span className="mx-auto inline-flex size-14 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Smartphone className="size-7" />
        </span>
        <p className="mt-4 text-lg font-bold text-foreground">Escaneá el QR que te muestra el hotel</p>
        <p className="mt-2 text-sm text-muted-foreground">
          La recepción genera el cobro. Vos solo escaneás con la cámara del celular, elegís tu moneda y confirmás la operación.
        </p>
      </Card>
    )
  }

  if (sessionLoading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="mx-auto size-8 animate-spin text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Abriendo checkout del hotel...</p>
      </Card>
    )
  }

  if (!session || sessionError) {
    return (
      <Card className="border-destructive/30 bg-destructive/10 p-8 text-center">
        <p className="text-lg font-semibold text-destructive">No pudimos abrir este cobro</p>
        <p className="mt-2 text-sm text-muted-foreground">{sessionError ?? 'La sesión no existe o venció.'}</p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-balance text-2xl font-extrabold tracking-tight text-foreground">
          {session.hotelNombre}
        </h2>
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-3.5" /> {session.localidad}
        </p>
      </div>

      <Card className="p-5">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Progreso del pago
        </h3>
        <PaymentProgress current={step} processing={checkoutState === 'waiting'} labels={STEP_LABELS} />
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Checkout escaneado
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          La recepción ya definió el monto. Elegí con qué moneda querés pagar y confirmá la operación.
        </p>

        <div className="mt-4 rounded-2xl border border-border bg-card/80 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Monto a pagar</span>
            <span className="font-mono text-2xl font-semibold text-foreground">${fmtArs(session.montoARS)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Sesión {session.sessionId.slice(0, 8)} · vence {new Date(session.expiresAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currency">Moneda de pago</Label>
            <Select value={currencyCode} onValueChange={setCurrencyCode} disabled={checkoutState !== 'idle'}>
              <SelectTrigger id="currency" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-5 min-w-7 items-center justify-center rounded-md bg-secondary px-1 text-[10px] font-bold text-secondary-foreground">
                        {currency.badge}
                      </span>
                      <span className="font-medium">{currency.name}</span>
                      <span className="text-muted-foreground">({currency.code})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <ConversionCard origin={origin} q={q} />

      {error && (
        <Card className="border-destructive/30 bg-destructive/10 p-4 text-center">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <p className="mt-1 text-xs text-muted-foreground">No pudimos preparar la operación. Intentá de nuevo.</p>
        </Card>
      )}

      {checkoutState === 'waiting' && intent ? (
        <PaymentTracker
          sep7Url={intent.sep7Url}
          hotelPublicKey={intent.hotelPublicKey}
          expectedAmount={q.usdcNet}
          expectedArs={q.hotelReceivesArs}
          onSuccess={handleTrackedSuccess}
          onReset={reset}
          displayMode="link"
        />
      ) : checkoutState === 'success' && lastTxHash ? (
        <Card className="overflow-hidden border-success/30 bg-gradient-to-b from-success/15 to-card p-5 text-center">
          <div className="relative mx-auto flex h-14 w-14 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-success/30 animate-ping" aria-hidden />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-success text-success-foreground">
              <CheckCircle2 className="size-8" />
            </span>
          </div>
          <p className="mt-3 text-lg font-bold text-foreground">¡Pago confirmado on-chain!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tu pago fue detectado en Stellar Testnet y el hotel ya puede verlo reflejado.
          </p>

          <dl className="mt-4 space-y-2 rounded-xl bg-card/80 p-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Moneda elegida</dt>
              <dd className="font-mono text-foreground">{origin.code}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Monto estimado</dt>
              <dd className="font-mono text-foreground">{origin.symbol}{fmtMoney(q.originAmount, q.originAmount < 100 ? 2 : 3)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Monto recibido on-chain</dt>
              <dd className="font-mono font-semibold text-success">{fmtUsdc(receivedAmount ?? q.usdcNet)} XLM</dd>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2">
              <dt className="text-muted-foreground">ARS liquidados</dt>
              <dd className="font-mono text-foreground">${fmtArs((receivedAmount ?? q.usdcNet) * ARS_PER_USDC)}</dd>
            </div>
          </dl>

          <a
            href={`https://stellar.expert/explorer/testnet/tx/${lastTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 font-mono text-sm text-accent hover:bg-accent/15"
          >
            {shortHash(lastTxHash)}
            <ExternalLink className="size-3.5" />
          </a>

          <div className="mt-4 rounded-xl border border-border bg-card/80 p-4 text-left text-sm">
            <p className="font-semibold text-foreground">Recibo inmutable</p>
            {receiptState === 'saving' && (
              <p className="mt-1 text-muted-foreground">Guardando confirmación en Arkiv...</p>
            )}
            {receiptState === 'saved' && receiptInfo && (
              <div className="mt-2 space-y-2">
                <p className="text-muted-foreground">El recibo quedó firmado y publicado para demostrar la trazabilidad del cobro.</p>
                <a
                  href={`https://explorer.braga.arkiv.network/tx/${receiptInfo.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 font-mono text-sm text-accent hover:bg-accent/15"
                >
                  Arkiv · {shortHash(receiptInfo.txHash)}
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            )}
            {receiptState === 'error' && (
              <div className="mt-2 space-y-2">
                <p className="text-destructive">{receiptError ?? 'No se pudo guardar el recibo en Arkiv.'}</p>
                {confirmedPayment && (
                  <Button variant="outline" size="sm" onClick={() => void persistReceipt(confirmedPayment)}>
                    Reintentar guardado en Arkiv
                  </Button>
                )}
              </div>
            )}
          </div>

          <Button variant="outline" className="mt-4 w-full" onClick={reset}>
            Realizar otro pago
          </Button>
        </Card>
      ) : (
        <Button size="lg" className="h-14 w-full text-base font-bold" onClick={handleConfirmOperation}>
          Confirmar operación · {origin.symbol}{fmtMoney(q.originAmount, q.originAmount < 100 ? 2 : 3)}
        </Button>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Escaneado desde la cámara del celular · El hotel generó este checkout y vos elegís cómo pagarlo.
      </p>
    </div>
  )
}
