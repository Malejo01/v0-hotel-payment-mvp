"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PaymentStepper } from "./payment-stepper"
import { CurrencySelector } from "./currency-selector"
import { ConversionCard } from "./conversion-card"
import { SuccessScreen } from "./success-screen"
import type { CurrencyCode, HotelContext, TouristContext, PaymentCreateResponse, ArkivReceiptPayload } from "@/types/pay"

// Demo hardcoded contexts
const DEMO_HOTEL: HotelContext = {
  hotelId: "hotel-salta-001",
  hotelName: "Hotel Cerro San Bernardo",
  localidad: "Salta Capital",
  provincia: "Salta",
}

const DEMO_TOURIST: TouristContext = {
  touristId: "tourist-demo-001",
  displayName: "Maria Silva",
  country: "Brasil",
}

type ViewState = "form" | "processing" | "success"

export function TouristView() {
  const [viewState, setViewState] = useState<ViewState>("form")
  const [currentStep, setCurrentStep] = useState(1)
  const [sourceCurrency, setSourceCurrency] = useState<CurrencyCode>("BRL")
  const [sourceAmount, setSourceAmount] = useState<number>(500)
  const [result, setResult] = useState<{ txHash: string; receipt: ArkivReceiptPayload } | null>(null)

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
          hotel: DEMO_HOTEL,
          tourist: DEMO_TOURIST,
          sourceCurrency,
          sourceAmount,
        }),
      })

      setCurrentStep(4)
      await new Promise((r) => setTimeout(r, 500))

      const data: PaymentCreateResponse = await response.json()

      if (data.success && data.txHash && data.receipt) {
        setCurrentStep(5)
        await new Promise((r) => setTimeout(r, 500))
        setResult({ txHash: data.txHash, receipt: data.receipt })
        setViewState("success")
      } else {
        throw new Error(data.error || "Payment failed")
      }
    } catch (error) {
      console.error("Payment error:", error)
      setViewState("form")
      setCurrentStep(1)
      // In a real app, show error toast
    }
  }

  const handleReset = () => {
    setViewState("form")
    setCurrentStep(1)
    setSourceAmount(500)
    setResult(null)
  }

  if (viewState === "success" && result) {
    return <SuccessScreen txHash={result.txHash} receipt={result.receipt} onReset={handleReset} />
  }

  return (
    <div className="flex flex-col gap-6 p-4 max-w-md mx-auto">
      {/* Hotel info header */}
      <div className="text-center">
        <h2 className="text-lg font-semibold">{DEMO_HOTEL.hotelName}</h2>
        <p className="text-sm text-muted-foreground">{DEMO_HOTEL.localidad}, {DEMO_HOTEL.provincia}</p>
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
              <CardDescription>Selecciona tu moneda y monto a pagar</CardDescription>
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
                <Label htmlFor="amount">Monto a pagar</Label>
                <Input
                  id="amount"
                  type="number"
                  value={sourceAmount}
                  onChange={(e) => setSourceAmount(Number(e.target.value))}
                  min={1}
                  className="text-lg font-mono"
                />
              </div>
            </CardContent>
          </Card>

          {/* Conversion preview */}
          <ConversionCard sourceCurrency={sourceCurrency} sourceAmount={sourceAmount} />

          {/* Submit button */}
          <Button
            size="lg"
            className="w-full bg-sky-600 hover:bg-sky-700"
            onClick={handleSubmit}
            disabled={sourceAmount <= 0}
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
        <p>Turista: {DEMO_TOURIST.displayName} ({DEMO_TOURIST.country})</p>
      </div>
    </div>
  )
}
