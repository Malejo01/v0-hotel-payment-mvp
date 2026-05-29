"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Shield, ExternalLink, Copy, Check } from "lucide-react"
import { useState } from "react"
import type { HotelPaymentRow } from "@/types/pay"

interface ReceiptModalProps {
  payment: HotelPaymentRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReceiptModal({ payment, open, onOpenChange }: ReceiptModalProps) {
  const [copied, setCopied] = useState(false)

  if (!payment) return null

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(payment.payload, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const explorerUrl = `https://explorer.braga.arkiv.network/tx/${payment.txHash}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" />
            Recibo Blockchain
          </DialogTitle>
          <DialogDescription>
            Recibo inmutable almacenado en Arkiv (Braga testnet)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* TxHash link */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <div>
              <p className="text-xs text-muted-foreground">Transaction Hash</p>
              <p className="font-mono text-sm">{payment.txHash}</p>
            </div>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700"
            >
              Ver en Explorer
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          {/* JSON payload */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 overflow-auto text-xs font-mono">
              {JSON.stringify(payment.payload, null, 2)}
            </pre>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-muted-foreground">Hotel</p>
              <p className="font-medium">{payment.payload.hotelNombre}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-muted-foreground">Turista</p>
              <p className="font-medium">{payment.payload.turistaId}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-muted-foreground">Monto Original</p>
              <p className="font-medium">{payment.payload.montoOriginalFiat} {payment.payload.monedaOrigen}</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50">
              <p className="text-emerald-700">ARS Liquidado</p>
              <p className="font-medium text-emerald-700">
                ${payment.payload.montoLiquidadoARS.toLocaleString("es-AR")}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
