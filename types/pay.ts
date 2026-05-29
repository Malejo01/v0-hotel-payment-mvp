// Currency codes supported
export type CurrencyCode = "USD" | "BRL" | "ARS" | "CRYPTO"

// Track identifier for Arkiv - MUST be consistent everywhere
export const PAY_TRACK = "salta-pay-tourist" as const
export type PayTrack = typeof PAY_TRACK

// Payment status
export type PaymentStatus = "pending" | "processing" | "confirmed" | "failed"

// Hotel context (hardcoded for demo)
export interface HotelContext {
  hotelId: string
  hotelName: string
  localidad: string
  provincia: string
}

// Tourist context
export interface TouristContext {
  touristId: string
  displayName: string
  country: string
}

// Payment quote request/response
export interface PaymentQuoteRequest {
  sourceCurrency: CurrencyCode
  sourceAmount: number
}

export interface PaymentQuoteResponse {
  sourceCurrency: CurrencyCode
  sourceAmount: number
  targetCurrency: "USDC"
  targetAmount: number
  rateUsed: number
  feeEstimate: number
  arsLiquidation: number
}

// Stellar mock transaction
export interface StellarMockTransaction {
  transactionId: string
  network: "stellar-testnet-mock"
  sourceCurrency: CurrencyCode
  sourceAmount: number
  targetCurrency: "USDC"
  targetAmount: number
  rateUsed: number
  feeEstimate: number
  status: "confirmed" | "failed"
  createdAt: string
}

// Arkiv receipt payload (stored on-chain)
export interface ArkivReceiptPayload {
  track: PayTrack
  hotelId: string
  hotelName: string
  localidad: string
  touristId: string
  touristName: string
  touristCountry: string
  monedaOrigen: CurrencyCode
  montoOrigen: number
  montoUSDC: number
  montoARS: number
  cotizacion: number
  stellarTxId: string
  status: PaymentStatus
  fechaHora: string
  rubro: "hotel"
}

// Arkiv entity response
export interface ArkivEntity {
  id: string
  txHash: string
  payload: ArkivReceiptPayload
  attributes: Record<string, string>
  createdAt: string
}

// API request/response types
export interface PaymentCreateRequest {
  hotel: HotelContext
  tourist: TouristContext
  sourceCurrency: CurrencyCode
  sourceAmount: number
}

export interface PaymentCreateResponse {
  success: boolean
  txHash?: string
  entityId?: string
  receipt?: ArkivReceiptPayload
  error?: string
}

// Hotel dashboard row
export interface HotelPaymentRow {
  id: string
  txHash: string
  hora: string
  touristName: string
  touristCountry: string
  monedaOrigen: CurrencyCode
  montoOrigen: number
  montoUSDC: number
  montoARS: number
  status: PaymentStatus
  payload: ArkivReceiptPayload
}

// API list response
export interface PayListResponse {
  payments: HotelPaymentRow[]
  totals: {
    totalARS: number
    totalUSDC: number
    count: number
  }
}

// Stepper step definition
export interface StepperStep {
  id: number
  label: string
  sublabel?: string
  icon: string
}

// Exchange rates (demo)
export const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  USD: 1.0,
  BRL: 0.18,
  ARS: 0.001,
  CRYPTO: 1.0,
}

// ARS per USDC rate (demo)
export const ARS_PER_USDC = 1250
