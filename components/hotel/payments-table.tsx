"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Shield, ExternalLink } from "lucide-react"
import type { HotelPaymentRow } from "@/types/pay"

interface PaymentsTableProps {
  payments: HotelPaymentRow[]
  isLoading: boolean
  onRowClick: (payment: HotelPaymentRow) => void
}

export function PaymentsTable({ payments, isLoading, onRowClick }: PaymentsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Shield className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">No hay pagos registrados</p>
        <p className="text-sm text-muted-foreground/70">
          Los pagos confirmados apareceran aqui
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Hora</TableHead>
            <TableHead>Turista</TableHead>
            <TableHead className="w-[80px]">Moneda</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="text-right">USDC</TableHead>
            <TableHead className="text-right">ARS</TableHead>
            <TableHead className="w-[100px]">Estado</TableHead>
            <TableHead className="w-[100px]">Arkiv</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow
              key={payment.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onRowClick(payment)}
            >
              <TableCell className="font-mono text-sm">{payment.hora}</TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{payment.touristName}</p>
                  <p className="text-xs text-muted-foreground">{payment.touristCountry}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono">
                  {payment.monedaOrigen}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono">
                {payment.montoOrigen.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-mono text-sky-600">
                {payment.montoUSDC.toFixed(2)}
              </TableCell>
              <TableCell className="text-right font-mono font-medium text-emerald-600">
                ${payment.montoARS.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
              </TableCell>
              <TableCell>
                <Badge
                  variant={payment.status === "confirmed" ? "default" : "secondary"}
                  className={payment.status === "confirmed" ? "bg-emerald-500" : ""}
                >
                  {payment.status === "confirmed" ? "Confirmado" : payment.status}
                </Badge>
              </TableCell>
              <TableCell>
                <a
                  href={`https://explorer.braga.arkiv.network/tx/${payment.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700"
                >
                  <Shield className="h-3 w-3" />
                  <span className="font-mono">{payment.txHash.slice(0, 6)}...</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
