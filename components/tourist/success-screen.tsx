"use client"

import { CheckCircle, ExternalLink, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { ArkivReceiptPayload } from "@/types/pay"

interface SuccessScreenProps {
  txHash: string
  receipt: ArkivReceiptPayload
  onReset: () => void
}

export function SuccessScreen({ txHash, receipt, onReset }: SuccessScreenProps) {
  const explorerUrl = `https://explorer.braga.arkiv.network/tx/${txHash}`

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Success icon with animation */}
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500">
          <CheckCircle className="h-10 w-10 text-white" />
        </div>
      </div>

      {/* Success message */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-emerald-700">Pago confirmado!</h2>
        <p className="text-muted-foreground mt-1">
          El hotel ha recibido ${receipt.montoLiquidadoARS.toLocaleString("es-AR")} ARS
        </p>
      </div>

      {/* Arkiv verification badge */}
      <Card className="w-full max-w-sm border-emerald-200 bg-emerald-50/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-emerald-700">
                Verificado en Arkiv
              </p>
              <p className="text-xs text-muted-foreground truncate font-mono">
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </p>
            </div>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 hover:text-emerald-700"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Receipt summary */}
      <Card className="w-full max-w-sm">
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Turista</span>
            <span>{receipt.turistaId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Hotel</span>
            <span>{receipt.hotelNombre}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Monto pagado</span>
            <span>{receipt.montoOriginalFiat} {receipt.monedaOrigen}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">USDC convertido</span>
            <span>{receipt.montoUSDC} USDC</span>
          </div>
          <div className="flex justify-between text-sm font-medium">
            <span>ARS liquidado</span>
            <span className="text-emerald-600">${receipt.montoLiquidadoARS.toLocaleString("es-AR")}</span>
          </div>
        </CardContent>
      </Card>

      {/* Immutability note */}
      <p className="text-xs text-muted-foreground text-center max-w-xs">
        Este recibo es inmutable y quedo guardado en la blockchain de Arkiv (Braga testnet)
      </p>

      {/* New payment button */}
      <Button onClick={onReset} variant="outline" className="mt-4">
        Nuevo pago
      </Button>
    </div>
  )
}
