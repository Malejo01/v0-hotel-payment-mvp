"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { MetricsCards } from "./metrics-cards"
import { PaymentsTable } from "./payments-table"
import { ReceiptModal } from "./receipt-modal"
import type { PayListResponse, HotelPaymentRow } from "@/types/pay"

export function HotelView() {
  const [data, setData] = useState<PayListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPayment, setSelectedPayment] = useState<HotelPaymentRow | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const fetchPayments = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/pay?hotelId=hotel-salta-001")
      const result: PayListResponse = await response.json()
      setData(result)
    } catch (error) {
      console.error("Failed to fetch payments:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPayments()
    // Poll every 5 seconds for demo purposes
    const interval = setInterval(fetchPayments, 5000)
    return () => clearInterval(interval)
  }, [fetchPayments])

  const handleRowClick = (payment: HotelPaymentRow) => {
    setSelectedPayment(payment)
    setModalOpen(true)
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Hotel Cerro San Bernardo</h2>
          <p className="text-muted-foreground">Panel de pagos - Salta Capital</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPayments} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Metrics */}
      <MetricsCards
        totalARS={data?.totals.totalARS ?? 0}
        totalUSDC={data?.totals.totalUSDC ?? 0}
        paymentCount={data?.totals.count ?? 0}
      />

      {/* Payments table */}
      <Card>
        <CardHeader>
          <CardTitle>Pagos del dia</CardTitle>
          <CardDescription>
            Click en una fila para ver el recibo completo guardado en Arkiv
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentsTable
            payments={data?.payments ?? []}
            isLoading={isLoading && !data}
            onRowClick={handleRowClick}
          />
        </CardContent>
      </Card>

      {/* Receipt modal */}
      <ReceiptModal
        payment={selectedPayment}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  )
}
