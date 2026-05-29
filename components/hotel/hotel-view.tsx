"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { RefreshCw, X } from "lucide-react"
import { MetricsCards } from "./metrics-cards"
import { PaymentsTable } from "./payments-table"
import { ReceiptModal } from "./receipt-modal"
import { PAY_TRACK } from "@/types/pay"
import type { ArkivReceiptStatus, CurrencyCode, PayListResponse, HotelPaymentRow } from "@/types/pay"

const HOTEL_ID = "hotel-salta-001"
const PAGE_SIZE = 10

type StatusFilter = ArkivReceiptStatus | "all"
type CurrencyFilter = CurrencyCode | "all"

interface AppliedFilters {
  localidad: string
  status: StatusFilter
  currency: CurrencyFilter
}

export function HotelView() {
  const { toast } = useToast()
  const [data, setData] = useState<PayListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastError, setLastError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<HotelPaymentRow | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [localidadInput, setLocalidadInput] = useState("")
  const [localidadFilter, setLocalidadFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>("all")
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const isLoadingRef = useRef(isLoading)
  const isLoadingMoreRef = useRef(isLoadingMore)

  useEffect(() => {
    isLoadingRef.current = isLoading
  }, [isLoading])

  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore
  }, [isLoadingMore])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const localidad = params.get("hLocalidad") ?? ""
    const status = (params.get("hStatus") as StatusFilter | null) ?? "all"
    const currency = (params.get("hCurrency") as CurrencyFilter | null) ?? "all"

    setLocalidadInput(localidad)
    setLocalidadFilter(localidad.trim())
    setStatusFilter(status)
    setCurrencyFilter(currency)
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLocalidadFilter(localidadInput.trim())
    }, 350)

    return () => clearTimeout(timeout)
  }, [localidadInput])

  const fetchPayments = useCallback(async (options?: {
    filters?: Partial<AppliedFilters>
    cursor?: string
    append?: boolean
  }) => {
    const overrides = options?.filters
    const appliedLocalidad = overrides?.localidad ?? localidadFilter
    const appliedStatus = overrides?.status ?? statusFilter
    const appliedCurrency = overrides?.currency ?? currencyFilter
    const isAppending = Boolean(options?.append)

    if (isAppending && (isLoadingRef.current || isLoadingMoreRef.current)) {
      return
    }

    if (!isAppending && isLoadingMoreRef.current) {
      return
    }

    if (isAppending) {
      isLoadingMoreRef.current = true
      setIsLoadingMore(true)
    } else {
      isLoadingRef.current = true
      setIsLoading(true)
    }
    setLastError(null)
    try {
      const params = new URLSearchParams({
        track: PAY_TRACK,
        hotelId: HOTEL_ID,
        limit: String(PAGE_SIZE),
      })

      if (options?.cursor) {
        params.set("cursor", options.cursor)
      }

      if (appliedLocalidad.trim()) {
        params.set("localidad", appliedLocalidad.trim())
      }

      if (appliedStatus !== "all") {
        params.set("status", appliedStatus)
      }

      if (appliedCurrency !== "all") {
        params.set("monedaOrigen", appliedCurrency)
      }

      const response = await fetch(`/api/pay?${params.toString()}`)
      const result: PayListResponse = await response.json()

      if (!response.ok) {
        throw new Error("No se pudo cargar el listado de pagos")
      }

      if (isAppending) {
        setData((previous) => {
          if (!previous) {
            return result
          }

          return {
            ...result,
            items: [...previous.items, ...result.items],
            payments: [...(previous.payments ?? previous.items), ...(result.payments ?? result.items)],
          }
        })
      } else {
        setData(result)
      }

      setLastUpdatedAt(new Date().toISOString())
    } catch (error) {
      console.error("Failed to fetch payments:", error)
      setLastError(error instanceof Error ? error.message : "Error inesperado")
      toast({
        title: "Error al cargar panel hotel",
        description: error instanceof Error ? error.message : "Error inesperado",
        variant: "destructive",
      })
    } finally {
      if (isAppending) {
        isLoadingMoreRef.current = false
        setIsLoadingMore(false)
      } else {
        isLoadingRef.current = false
        setIsLoading(false)
      }
    }
  }, [currencyFilter, localidadFilter, statusFilter, toast])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    if (localidadFilter) {
      params.set("hLocalidad", localidadFilter)
    } else {
      params.delete("hLocalidad")
    }

    if (statusFilter !== "all") {
      params.set("hStatus", statusFilter)
    } else {
      params.delete("hStatus")
    }

    if (currencyFilter !== "all") {
      params.set("hCurrency", currencyFilter)
    } else {
      params.delete("hCurrency")
    }

    const query = params.toString()
    const url = query ? `${window.location.pathname}?${query}` : window.location.pathname
    window.history.replaceState(null, "", url)
  }, [currencyFilter, localidadFilter, statusFilter])

  useEffect(() => {
    fetchPayments()
    // Poll every 5 seconds for demo purposes
    const interval = setInterval(() => {
      if (!isLoadingMoreRef.current) {
        fetchPayments()
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchPayments])

  const handleRowClick = (payment: HotelPaymentRow) => {
    setSelectedPayment(payment)
    setModalOpen(true)
  }

  const handleResetFilters = () => {
    setLocalidadInput("")
    setLocalidadFilter("")
    setStatusFilter("all")
    setCurrencyFilter("all")
    setLastError(null)
    fetchPayments({ filters: { localidad: "", status: "all", currency: "all" } })
  }

  const removeFilter = (key: keyof AppliedFilters) => {
    if (key === "localidad") {
      setLocalidadInput("")
      setLocalidadFilter("")
      return
    }

    if (key === "status") {
      setStatusFilter("all")
      return
    }

    setCurrencyFilter("all")
  }

  const activeFiltersCount =
    (localidadFilter ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (currencyFilter !== "all" ? 1 : 0)

  const loadedCount = data?.items.length ?? 0
  const hasMorePages = Boolean(data?.nextCursor)
  const lastUpdatedLabel = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "-"

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
        totalARS={data?.totalARS ?? 0}
        paymentCount={data?.totalPayments ?? 0}
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Filtros</CardTitle>
            {activeFiltersCount > 0 && <Badge variant="secondary">{activeFiltersCount} activos</Badge>}
          </div>
          <CardDescription>Refina por localidad, estado o moneda de origen</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <Input
            value={localidadInput}
            onChange={(e) => setLocalidadInput(e.target.value)}
            placeholder="Localidad"
          />

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="liquidado">Liquidado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={currencyFilter} onValueChange={(value) => setCurrencyFilter(value as CurrencyFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="Moneda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las monedas</SelectItem>
              <SelectItem value="ARS">ARS</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="BRL">BRL</SelectItem>
              <SelectItem value="USDC">USDC</SelectItem>
              <SelectItem value="CRYPTO">CRYPTO</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={fetchPayments} disabled={isLoading}>
            Aplicar filtros
          </Button>

          <Button variant="ghost" onClick={handleResetFilters} disabled={isLoading}>
            Limpiar filtros
          </Button>
        </CardContent>

        {activeFiltersCount > 0 && (
          <CardContent className="pt-0 flex flex-wrap gap-2">
            {localidadFilter && (
              <Badge variant="outline" className="gap-2 pr-1">
                Localidad: {localidadFilter}
                <button
                  type="button"
                  className="rounded p-0.5 hover:bg-muted"
                  aria-label="Quitar filtro localidad"
                  onClick={() => removeFilter("localidad")}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {statusFilter !== "all" && (
              <Badge variant="outline" className="gap-2 pr-1">
                Estado: {statusFilter}
                <button
                  type="button"
                  className="rounded p-0.5 hover:bg-muted"
                  aria-label="Quitar filtro estado"
                  onClick={() => removeFilter("status")}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {currencyFilter !== "all" && (
              <Badge variant="outline" className="gap-2 pr-1">
                Moneda: {currencyFilter}
                <button
                  type="button"
                  className="rounded p-0.5 hover:bg-muted"
                  aria-label="Quitar filtro moneda"
                  onClick={() => removeFilter("currency")}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </CardContent>
        )}
      </Card>

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
            payments={data?.items ?? []}
            isLoading={isLoading && !data}
            emptyTitle={lastError ? "No pudimos cargar pagos" : "No hay pagos para los filtros actuales"}
            emptyDescription={
              lastError
                ? "Verifica Arkiv, variables de entorno o intenta nuevamente"
                : "Prueba limpiar filtros o espera nuevas transacciones"
            }
            onRowClick={handleRowClick}
          />

          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>Mostrando {loadedCount} pagos cargados</span>
            <span>{hasMorePages ? "Hay mas paginas disponibles" : "Sin mas paginas"}</span>
          </div>

          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Ultima actualizacion: {lastUpdatedLabel}</span>
            {isLoading && <span>Actualizando...</span>}
          </div>

          {data?.nextCursor && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={() => fetchPayments({ append: true, cursor: data.nextCursor })}
                disabled={isLoadingMore || isLoading}
              >
                {isLoadingMore ? "Cargando..." : "Cargar mas"}
              </Button>
            </div>
          )}
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
