'use client'

import { useEffect, useRef, useState } from 'react'
import * as StellarSdk from '@stellar/stellar-sdk'
import QRCode from 'qrcode'
import { CheckCircle2, ExternalLink, Loader2, QrCode, RotateCcw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ARS_PER_USDC, fmtArs, fmtUsdc, shortHash } from '@/lib/saltapay'

type PaymentTrackerState = 'waiting' | 'success' | 'error'
type StreamConnectionState = 'connected' | 'reconnecting'

const WAIT_TIMEOUT_SECONDS = 180
const RECONNECT_DELAY_MS = 2000

type StreamPaymentRecord = {
  type?: string
  to?: string
  amount?: string
  transaction_hash?: string
}

export type PaymentTrackerSuccess = {
  txHash: string
  receivedAmount: number
}

export function PaymentTracker({
  sep7Url,
  hotelPublicKey,
  expectedAmount,
  expectedArs,
  onSuccess,
  onReset,
  displayMode = 'qr',
}: {
  sep7Url: string
  hotelPublicKey: string
  expectedAmount: number
  expectedArs: number
  onSuccess: (payload: PaymentTrackerSuccess) => void
  onReset: () => void
  displayMode?: 'qr' | 'link'
}) {
  const [status, setStatus] = useState<PaymentTrackerState>('waiting')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [receivedAmount, setReceivedAmount] = useState<number | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<StreamConnectionState>('connected')
  const [secondsRemaining, setSecondsRemaining] = useState(WAIT_TIMEOUT_SECONDS)
  const [streamVersion, setStreamVersion] = useState(0)

  const onSuccessRef = useRef(onSuccess)
  const isConfirmedRef = useRef(false)
  const reconnectTimerRef = useRef<number | null>(null)

  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  useEffect(() => {
    if (status !== 'waiting') {
      return
    }

    setSecondsRemaining(WAIT_TIMEOUT_SECONDS)

    const intervalId = window.setInterval(() => {
      setSecondsRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId)
          setStatus('error')
          setErrorMessage('No vimos la confirmación on-chain a tiempo. Reintentá generar el QR o verificá la billetera.')
          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [status, streamVersion])

  useEffect(() => {
    if (displayMode !== 'qr') {
      setQrDataUrl(null)
      return
    }

    let cancelled = false

    async function buildQr() {
      try {
        const dataUrl = await QRCode.toDataURL(sep7Url, {
          width: 360,
          margin: 1,
          errorCorrectionLevel: 'M',
        })
        if (!cancelled) {
          setQrDataUrl(dataUrl)
        }
      } catch (error) {
        console.error('[PaymentTracker] QR generation error:', error)
        if (!cancelled) {
          setStatus('error')
          setErrorMessage('No se pudo generar el QR de pago.')
        }
      }
    }

    buildQr()

    return () => {
      cancelled = true
    }
  }, [displayMode, sep7Url])

  useEffect(() => {
    if (status !== 'waiting') {
      return
    }

    if (!hotelPublicKey) {
      setStatus('error')
      setErrorMessage('Cuenta de hotel no disponible para seguimiento on-chain.')
      return
    }

    setConnectionState('connected')

    const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org')
    const closeStream = server
      .payments()
      .forAccount(hotelPublicKey)
      .cursor('now')
      .stream({
        onmessage: (payment) => {
          const record = payment as unknown as StreamPaymentRecord
          const isSupportedType =
            record.type === 'payment' ||
            record.type === 'path_payment_strict_send' ||
            record.type === 'path_payment_strict_receive'

          if (!isSupportedType || record.to !== hotelPublicKey || !record.transaction_hash) {
            return
          }

          if (isConfirmedRef.current) {
            return
          }

          isConfirmedRef.current = true
          setConnectionState('connected')

          const parsedAmount = Number.parseFloat(record.amount ?? '0')
          const normalizedAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : expectedAmount

          setReceivedAmount(normalizedAmount)
          setTxHash(record.transaction_hash)
          setStatus('success')

          onSuccessRef.current({
            txHash: record.transaction_hash,
            receivedAmount: normalizedAmount,
          })
        },
        onerror: (error) => {
          console.error('[PaymentTracker] Horizon stream error:', error)

          if (isConfirmedRef.current) {
            return
          }

          setConnectionState('reconnecting')
          closeStream()

          if (reconnectTimerRef.current !== null) {
            window.clearTimeout(reconnectTimerRef.current)
          }

          reconnectTimerRef.current = window.setTimeout(() => {
            setStreamVersion((current) => current + 1)
          }, RECONNECT_DELAY_MS)
        },
      })

    return () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      closeStream()
    }
  }, [expectedAmount, hotelPublicKey, status, streamVersion])

  if (status === 'error') {
    return (
      <Card className="border-destructive/30 bg-destructive/10 p-5 text-center">
        <p className="text-sm font-semibold text-destructive">No pudimos iniciar el seguimiento</p>
        <p className="mt-1 text-sm text-muted-foreground">{errorMessage ?? 'Ocurrió un error inesperado.'}</p>
        <Button variant="outline" className="mt-4 w-full" onClick={onReset}>
          Reintentar pago
        </Button>
      </Card>
    )
  }

  if (status === 'success' && txHash) {
    const onChainAmount = receivedAmount ?? expectedAmount

    return (
      <Card className="overflow-hidden border-success/30 bg-gradient-to-b from-success/15 to-card p-5 text-center">
        <div className="relative mx-auto flex h-14 w-14 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-success/30 animate-ping" aria-hidden />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-success text-success-foreground">
            <CheckCircle2 className="size-8" />
          </span>
        </div>

        <p className="mt-3 text-lg font-bold text-foreground">¡Pago confirmado on-chain!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu transacción fue detectada en Stellar Testnet y el hotel ya puede verla en su panel.
        </p>

        <dl className="mt-4 space-y-2 rounded-xl bg-card/80 p-4 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Monto esperado</dt>
            <dd className="font-mono text-foreground">{fmtUsdc(expectedAmount)} XLM</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Monto recibido on-chain</dt>
            <dd className="font-mono font-semibold text-success">{fmtUsdc(onChainAmount)} XLM</dd>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2">
            <dt className="text-muted-foreground">ARS esperados</dt>
            <dd className="font-mono text-foreground">${fmtArs(expectedArs)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">ARS estimados on-chain</dt>
            <dd className="font-mono font-semibold text-success">${fmtArs(onChainAmount * ARS_PER_USDC)}</dd>
          </div>
        </dl>

        <a
          href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 font-mono text-sm text-accent hover:bg-accent/15"
        >
          {shortHash(txHash)}
          <ExternalLink className="size-3.5" />
        </a>

        <Button variant="outline" className="mt-4 w-full" onClick={onReset}>
          <RotateCcw className="size-4" /> Nuevo pago
        </Button>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-primary/25 bg-gradient-to-b from-card to-primary/5 p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary animate-pulse">
          <Loader2 className="size-5 animate-spin" />
        </span>
        <div>
          <p className="text-base font-bold text-foreground">Esperando confirmación on-chain...</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Por favor, firma la transacción desde tu billetera Stellar.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-border px-2 py-1 font-medium text-muted-foreground">
              {connectionState === 'connected' ? 'Escuchando Horizon en tiempo real' : 'Reconectando stream de Horizon...'}
            </span>
            <span className="rounded-full border border-border px-2 py-1 font-mono text-muted-foreground">
              Tiempo restante: {Math.floor(secondsRemaining / 60)}:{String(secondsRemaining % 60).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        {displayMode === 'qr' ? (
          <>
            <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <QrCode className="size-4" /> QR SEP-0007
            </p>

            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR SEP-7 para firmar pago Stellar" className="mx-auto h-56 w-56 rounded-lg bg-white p-2" />
            ) : (
              <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-lg bg-muted">
                <Loader2 className="size-7 animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center">
            <p className="text-sm font-medium text-foreground">Abrí tu billetera Stellar para firmar</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Si la app no se abrió sola, usá el botón de abajo para continuar la firma.
            </p>
          </div>
        )}

        <a
          href={sep7Url}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <ShieldCheck className="size-4" /> {displayMode === 'qr' ? 'Abrir firma en billetera' : 'Abrir billetera y firmar'}
        </a>
      </div>
    </Card>
  )
}