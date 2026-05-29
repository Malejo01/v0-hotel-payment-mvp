"use client"

import { Coins, CreditCard, Zap, Shield, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface StepperStep {
  id: number
  label: string
  sublabel?: string
  icon: React.ReactNode
}

const steps: StepperStep[] = [
  { id: 1, label: "Seleccionando moneda", icon: <Coins className="h-5 w-5" /> },
  { id: 2, label: "Confirmando pago", icon: <CreditCard className="h-5 w-5" /> },
  { id: 3, label: "Validando en Stellar", sublabel: "(Simulado)", icon: <Zap className="h-5 w-5" /> },
  { id: 4, label: "Firmando en Arkiv...", icon: <Shield className="h-5 w-5" /> },
  { id: 5, label: "Pago procesado", icon: <CheckCircle className="h-5 w-5" /> },
]

interface PaymentStepperProps {
  currentStep: number
  className?: string
}

export function PaymentStepper({ currentStep, className }: PaymentStepperProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {steps.map((step, index) => {
        const isCompleted = step.id < currentStep
        const isActive = step.id === currentStep
        const isPending = step.id > currentStep

        return (
          <div key={step.id} className="flex items-center gap-3">
            {/* Step indicator */}
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                isCompleted && "border-emerald-500 bg-emerald-500 text-white",
                isActive && "border-sky-500 bg-sky-500 text-white animate-pulse",
                isPending && "border-muted-foreground/30 bg-muted text-muted-foreground"
              )}
            >
              {step.icon}
            </div>

            {/* Step content */}
            <div className="flex flex-col">
              <span
                className={cn(
                  "text-sm font-medium transition-colors",
                  isCompleted && "text-emerald-600",
                  isActive && "text-sky-600",
                  isPending && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
              {step.sublabel && (
                <span className="text-xs text-muted-foreground">{step.sublabel}</span>
              )}
            </div>

            {/* Loading indicator for active step */}
            {isActive && currentStep > 1 && currentStep < 5 && (
              <div className="ml-auto">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
