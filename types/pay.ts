export type CurrencyCode = "ARS" | "USD" | "BRL" | "USDC" | "CRYPTO" | "EUR" | "CLP" | "BOB" | "GBP"

export const PAY_TRACK = "salta-pay-tourist" as const
export type PayTrack = typeof PAY_TRACK

export const ARKIV_RECEIPT_STATUS = "liquidado" as const
export type ArkivReceiptStatus = typeof ARKIV_RECEIPT_STATUS

export const STELLAR_NETWORK = "stellar-testnet-mock" as const
export const RECEIPT_SCHEMA_VERSION = "1.0.0" as const

export type PaymentStatus =
  | "draft"
  | "quoting"
  | "stellar_simulated"
  | "arkiv_signing"
  | "confirmed"
  | "failed"

export type PaymentSessionStatus = "draft" | "opened" | "completed" | "expired"

export interface PaymentSession {
  sessionId: string
  hotelId: string
  hotelNombre: string
  localidad: string
  montoARS: number
  createdAt: string
  expiresAt: string
  status: PaymentSessionStatus
  sourceCurrency?: CurrencyCode
}

export interface HotelContext {
  hotelId: string
  hotelNombre: string
  localidad: string
  rubro: "hotel"
}

export interface TouristContext {
  turistaId: string
  turistaOrigen: string
  monedaOrigen: CurrencyCode
}

export interface PaymentQuoteRequest {
  track: PayTrack
  hotel: HotelContext
  turista: TouristContext
  montoARS: number
}

export interface PaymentQuoteResponse {
  track: PayTrack
  quoteId: string
  sourceCurrency: CurrencyCode
  sourceAmount: number
  targetCurrency: "USDC"
  targetAmount: number
  rateUsed: number
  feeEstimate: number
  estimatedARS: number
  status: "quoting"
  expiresAt: string
}

export interface StellarMockTransaction {
  transactionId: string
  network: typeof STELLAR_NETWORK
  sourceCurrency: CurrencyCode
  sourceAmount: number
  targetCurrency: "USDC"
  targetAmount: number
  rateUsed: number
  feeEstimate: number
  status: "confirmed" | "failed"
  createdAt: string
}

export interface ArkivReceiptPayload {
  schemaVersion: typeof RECEIPT_SCHEMA_VERSION
  transaccionIdStellar: string
  hotelId: string
  hotelNombre: string
  turistaId: string
  turistaOrigen: string
  monedaOrigen: CurrencyCode
  montoOriginalFiat: number
  montoUSDC: number
  montoLiquidadoARS: number
  fechaHora: string
  localidad: string
  status: ArkivReceiptStatus
  track: PayTrack
  rubro: "hotel"
  receiptHash?: string
}

export interface ArkivEntity {
  id: string
  txHash: string
  payload: ArkivReceiptPayload
  attributes: Record<string, string>
  createdAt: string
}

export interface PaymentCreateRequest {
  track?: PayTrack
  quoteId?: string
  hotel: HotelContext
  turista: TouristContext
  montoARS: number
  sourceCurrency: CurrencyCode
  sourceAmount?: number
  context?: Record<string, string>
}

export interface PaymentCreateResponse {
  status: "confirmed" | "failed"
  track: PayTrack
  stellar?: StellarMockTransaction
  arkiv?: {
    txHash: string
    entityId: string
    confirmedAt: string
  }
  receipt?: ArkivReceiptPayload
  uiMessage: string
  error?: string
  success?: boolean
  txHash?: string
  entityId?: string
}

export interface PaymentListFilters {
  track?: PayTrack
  hotelId?: string
  localidad?: string
  status?: ArkivReceiptStatus
  monedaOrigen?: CurrencyCode
  limit?: number
  cursor?: string
}

export interface HotelPaymentRow {
  id: string
  txHash: string
  hora: string
  turistaId: string
  turistaOrigen: string
  monedaOrigen: CurrencyCode
  montoOriginalFiat: number
  montoUSDC: number
  montoLiquidadoARS: number
  status: ArkivReceiptStatus
  payload: ArkivReceiptPayload
}

export interface PayListResponse {
  track: PayTrack
  items: HotelPaymentRow[]
  totalARS: number
  totalPayments: number
  nextCursor?: string
  payments?: HotelPaymentRow[]
  totals?: {
    totalARS: number
    totalUSDC: number
    count: number
  }
}

export const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  ARS: 0.001,
  USD: 1.0,
  BRL: 0.18,
  USDC: 1.0,
  CRYPTO: 1.0,
  EUR: 1.08,
  CLP: 0.00105,
  BOB: 0.145,
  GBP: 1.27,
}

export const ARS_PER_USDC = 1250
