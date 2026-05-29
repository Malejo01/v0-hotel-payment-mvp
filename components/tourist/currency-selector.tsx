"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { CurrencyCode } from "@/types/pay"

const currencies: { code: CurrencyCode; label: string; flag: string }[] = [
  { code: "BRL", label: "Real Brasileno", flag: "BR" },
  { code: "USD", label: "Dolar Estadounidense", flag: "US" },
  { code: "ARS", label: "Peso Argentino", flag: "AR" },
  { code: "CRYPTO", label: "Cripto (USDC)", flag: "CC" },
]

interface CurrencySelectorProps {
  value: CurrencyCode
  onValueChange: (value: CurrencyCode) => void
  disabled?: boolean
}

export function CurrencySelector({ value, onValueChange, disabled }: CurrencySelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as CurrencyCode)} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Seleccionar moneda" />
      </SelectTrigger>
      <SelectContent>
        {currencies.map((currency) => (
          <SelectItem key={currency.code} value={currency.code}>
            <span className="flex items-center gap-2">
              <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                {currency.flag}
              </span>
              <span>{currency.label}</span>
              <span className="text-muted-foreground">({currency.code})</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
