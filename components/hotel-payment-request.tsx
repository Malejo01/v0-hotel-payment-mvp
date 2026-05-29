'use client'

import { useState } from 'react'
import QRCode from 'qrcode'
import { Copy, QrCode, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fmtArs } from '@/lib/saltapay'

interface SessionPreview {
  sessionId: string
  checkoutUrl: string
  montoARS: number
  qrDataUrl: string
}

export function HotelPaymentRequest() {
  const [arsInput, setArsInput] = useState('125000')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionPreview, setSessionPreview] = useState<SessionPreview | null>(null)

  const arsAmount = Number(arsInput.replace(/[^\d]/g, '')) || 0

  async function handleCreatePayment() {
    if (arsAmount <= 0) {
      setError('Ingresá un monto válido en ARS para generar el cobro.')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/payment-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ montoARS: arsAmount }),
      })

      const data = await response.json()
      if (!response.ok || !data.success || !data.session?.sessionId || !data.checkoutUrl) {
        throw new Error(data.error || 'No se pudo generar el checkout del hotel')
      }

      const qrDataUrl = await QRCode.toDataURL(data.checkoutUrl, {
        width: 360,
        margin: 1,
        errorCorrectionLevel: 'M',
      })

      setSessionPreview({
        sessionId: data.session.sessionId,
        checkoutUrl: data.checkoutUrl,
        montoARS: data.session.montoARS,
        qrDataUrl,
      })
    } catch (sessionError) {
      console.error('[HotelPaymentRequest] Error creating session:', sessionError)
      setError(sessionError instanceof Error ? sessionError.message : 'No se pudo crear el cobro')
    } finally {
      setCreating(false)
    }
  }

  async function handleCopyLink() {
    if (!sessionPreview) {
      return
    }

    await navigator.clipboard.writeText(sessionPreview.checkoutUrl)
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Generar cobro para turista
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            La recepción define el monto y muestra el QR para que el turista lo escanee con la cámara del celular.
          </p>
        </div>
        <span className="inline-flex size-10 items-center justify-center rounded-full bg-accent/10 text-accent">
          <QrCode className="size-5" />
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="hotel-ars">Monto en ARS</Label>
          <Input
            id="hotel-ars"
            inputMode="numeric"
            value={arsInput}
            onChange={(event) => setArsInput(event.target.value)}
            className="h-12 font-mono text-lg"
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground">Se cobrará ${fmtArs(arsAmount)} ARS al tipo de cambio disponible.</p>
        </div>

        <Button className="w-full" onClick={handleCreatePayment} disabled={creating || arsAmount <= 0}>
          {creating ? (
            <>
              <RefreshCw className="size-4 animate-spin" /> Generando checkout...
            </>
          ) : (
            'Generar QR de cobro'
          )}
        </Button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {sessionPreview && (
        <div className="mt-5 rounded-2xl border border-border bg-card/80 p-4">
          <p className="text-sm font-semibold text-foreground">QR listo para el turista</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sesión {sessionPreview.sessionId.slice(0, 8)} · ${fmtArs(sessionPreview.montoARS)} ARS
          </p>

          <img
            src={sessionPreview.qrDataUrl}
            alt="QR de checkout turístico"
            className="mx-auto mt-4 h-56 w-56 rounded-xl bg-white p-2"
          />

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            El turista escanea este QR con la cámara, elige su moneda, revisa el monto y confirma la operación desde su billetera Stellar.
          </p>

          <div className="mt-4 flex gap-2">
            <a
              href={sessionPreview.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Abrir checkout
            </a>
            <Button variant="outline" className="px-3" onClick={handleCopyLink}>
              <Copy className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
