"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, TrendingUp } from "lucide-react"
import type { CurrencyCode } from "@/types/pay"
import { EXCHANGE_RATES, ARS_PER_USDC } from "@/types/pay"

interface ConversionCardProps {
  sourceCurrency: CurrencyCode
  montoARS: number
}

export function ConversionCard({ sourceCurrency, montoARS }: ConversionCardProps) {
  const rate = EXCHANGE_RATES[sourceCurrency]
  const usdcAmount = montoARS / ARS_PER_USDC
  const sourceAmount = usdcAmount / rate
  const feeEstimate = usdcAmount * 0.005
  const netUsdc = usdcAmount - feeEstimate
  const arsAmount = netUsdc * ARS_PER_USDC

  const currencySymbols: Record<CurrencyCode, string> = {
    USD: "$",
    BRL: "R$",
    ARS: "$",
    USDC: "",
    CRYPTO: "",
  }

  return (
    <Card className="border-sky-200 bg-sky-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-sky-700 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Conversion Estimada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Source to USDC */}
        <div className="flex items-center justify-between gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">
              {currencySymbols[sourceCurrency]}{sourceAmount.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">{sourceCurrency}</p>
          </div>
          <ArrowRight className="h-5 w-5 text-sky-500" />
          <div className="text-center">
            <p className="text-2xl font-bold text-sky-600">
              {usdcAmount.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">USDC</p>
          </div>
        </div>

        {/* Rate info */}
        <div className="rounded-lg bg-white/80 p-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tasa de cambio</span>
            <span className="font-mono">1 {sourceCurrency} = {rate} USDC</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Comision estimada</span>
            <span className="font-mono text-amber-600">-{feeEstimate.toFixed(2)} USDC</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">USDC neto</span>
            <span className="font-mono">{netUsdc.toFixed(2)} USDC</span>
          </div>
        </div>

        {/* Final ARS */}
        <div className="rounded-lg bg-emerald-100 p-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-emerald-700">Hotel recibe (ARS)</p>
              <p className="text-xs text-muted-foreground">@ {ARS_PER_USDC} ARS/USDC</p>
            </div>
            <p className="text-2xl font-bold text-emerald-700">
              ${arsAmount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
