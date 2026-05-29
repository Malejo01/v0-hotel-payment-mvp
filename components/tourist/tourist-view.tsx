"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { PaymentStepper } from "./payment-stepper"
import { CurrencySelector } from "./currency-selector"
import { ConversionCard } from "./conversion-card"
import { SuccessScreen } from "./success-screen"
import { ARS_PER_USDC, EXCHANGE_RATES, PAY_TRACK, type CurrencyCode, type HotelContext, type TouristContext, type PaymentCreateResponse, type ArkivReceiptPayload } from "@/types/pay"

// Demo hardcoded contexts
const DEMO_HOTEL: HotelContext = {
  hotelId: "hotel-salta-001",
  hotelNombre: "Hotel Cerro San Bernardo",
  localidad: "Salta Capital",
  rubro: "hotel",
}

const DEMO_TOURIST: TouristContext = {
  turistaId: "tourist-demo-001",
  turistaOrigen: "Brasil",
  monedaOrigen: "BRL",
}

type ViewState = "form" | "processing" | "success"

export function TouristView() {
  const { toast } = useToast()
  const [viewState, setViewState] = useState<ViewState>("form")
  const [currentStep, setCurrentStep] = useState(1)
  const [sourceCurrency, setSourceCurrency] = useState<CurrencyCode>("BRL")
  const [montoARS, setMontoARS] = useState<number>(125000)
  const [result, setResult] = useState<{ txHash: string; receipt: ArkivReceiptPayload } | null>(null)

  const requiredUsdc = montoARS / ARS_PER_USDC
  const selectedRate = EXCHANGE_RATES[sourceCurrency]
  const estimatedSourceAmount = Number((requiredUsdc / selectedRate).toFixed(2))

  const handleSubmit = async () => {
    setViewState("processing")
    setCurrentStep(2)

    try {
      // Step 2 -> 3: Confirming
      await new Promise((r) => setTimeout(r, 800))
      setCurrentStep(3)

      // Step 3 -> 4: Stellar validation (API handles delay)
      const response = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track: PAY_TRACK,
          hotel: DEMO_HOTEL,
          turista: {
            ...DEMO_TOURIST,
            monedaOrigen: sourceCurrency,
          },
          montoARS,
          sourceCurrency,
          sourceAmount: estimatedSourceAmount,
        }),
      })

      setCurrentStep(4)
      await new Promise((r) => setTimeout(r, 500))

      const data: PaymentCreateResponse = await response.json()

      if (response.ok && data.status === "confirmed" && data.arkiv?.txHash && data.receipt) {
        setCurrentStep(5)
        await new Promise((r) => setTimeout(r, 500))
        setResult({ txHash: data.arkiv.txHash, receipt: data.receipt })
        setViewState("success")
        toast({
          title: "Pago confirmado",
          description: data.uiMessage,
        })
      } else {
        throw new Error(data.error || "Payment failed")
      }
    } catch (error) {
      console.error("Payment error:", error)
      setViewState("form")
      setCurrentStep(1)
      toast({
        title: "Error al procesar pago",
        description: error instanceof Error ? error.message : "Ocurrio un error inesperado",
        variant: "destructive",
      })
    }
  }

  const handleReset = () => {
    setViewState("form")
    setCurrentStep(1)
    setMontoARS(125000)
    setResult(null)
  }

  if (viewState === "success" && result) {
    return <SuccessScreen txHash={result.txHash} receipt={result.receipt} onReset={handleReset} />
  }

  return (
    <div className="flex flex-col gap-6 p-4 max-w-md mx-auto">
      {/* Hotel info header */}
      <div className="text-center">
        <h2 className="text-lg font-semibold">{DEMO_HOTEL.hotelNombre}</h2>
        <p className="text-sm text-muted-foreground">{DEMO_HOTEL.localidad}</p>
      </div>

      {/* Stepper */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Progreso del pago</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentStepper currentStep={currentStep} />
        </CardContent>
      </Card>

      {/* Payment form */}
      {viewState === "form" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos del pago</CardTitle>
                <CardDescription>Monto ARS definido por recepcion y moneda de origen del turista</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda de origen</Label>
                <CurrencySelector
                  value={sourceCurrency}
                  onValueChange={setSourceCurrency}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ars-amount">Monto en ARS (recepcion)</Label>
                <Input
                  id="ars-amount"
                  type="number"
                  value={montoARS}
                  onChange={(e) => setMontoARS(Number(e.target.value))}
                  min={1}
                  className="text-lg font-mono"
                />
              </div>
            </CardContent>
          </Card>

          {/* Conversion preview */}
          <ConversionCard sourceCurrency={sourceCurrency} montoARS={montoARS} />

          {/* Submit button */}
          <Button
            size="lg"
            className="w-full bg-sky-600 hover:bg-sky-700"
            onClick={handleSubmit}
            disabled={montoARS <= 0}
          >
            Confirmar Pago
          </Button>
        </>
      )}

      {/* Processing state - just show stepper */}
      {viewState === "processing" && (
        <Card className="border-sky-200 bg-sky-50/30">
          <CardContent className="py-8 text-center">
            <p className="text-sky-700 font-medium">Procesando pago...</p>
            <p className="text-sm text-muted-foreground mt-1">
              Por favor espera mientras validamos tu transaccion
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tourist info footer */}
      <div className="text-center text-sm text-muted-foreground">
        <p>Turista: {DEMO_TOURIST.turistaId} ({DEMO_TOURIST.turistaOrigen})</p>
      </div>
    </div>
  )
}
