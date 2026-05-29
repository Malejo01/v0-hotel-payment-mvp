"use client"

import { Card, CardContent } from "@/components/ui/card"
import { DollarSign, CreditCard, Shield } from "lucide-react"

interface MetricsCardsProps {
  totalARS: number
  totalUSDC: number
  paymentCount: number
}

export function MetricsCards({ totalARS, totalUSDC, paymentCount }: MetricsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Total ARS */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total ARS (hoy)</p>
              <p className="text-2xl font-bold text-emerald-600">
                ${totalARS.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment count */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100">
              <CreditCard className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pagos confirmados</p>
              <p className="text-2xl font-bold">{paymentCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Arkiv status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
              <Shield className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estado Arkiv</p>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium text-emerald-600">Conectado</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
