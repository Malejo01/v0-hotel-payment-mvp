export type Currency = {
  code: string
  name: string
  /** 2-letter badge shown in the selector */
  badge: string
  symbol: string
  /** How many USDC one unit of this currency is worth */
  usdcPerUnit: number
}

/** SaltaPay commission: the competitive edge vs. local fintechs (0.25%). */
export const COMMISSION_RATE = 0.0025

/** Reception currency: how many ARS one USDC settles for (testnet quote). */
export const ARS_PER_USDC = 1250

export const CURRENCIES: Currency[] = [
  { code: 'BRL', name: 'Real Brasileño', badge: 'BR', symbol: 'R$', usdcPerUnit: 0.18 },
  { code: 'USD', name: 'Dólar Estadounidense', badge: 'US', symbol: '$', usdcPerUnit: 1 },
  { code: 'EUR', name: 'Euro', badge: 'EU', symbol: '€', usdcPerUnit: 1.08 },
  { code: 'CLP', name: 'Peso Chileno', badge: 'CL', symbol: '$', usdcPerUnit: 0.00105 },
  { code: 'BOB', name: 'Boliviano', badge: 'BO', symbol: 'Bs', usdcPerUnit: 0.145 },
  { code: 'GBP', name: 'Libra Esterlina', badge: 'GB', symbol: '£', usdcPerUnit: 1.27 },
]

export type Quote = {
  /** ARS the reception requested */
  arsAmount: number
  /** USDC required gross (before fee) */
  usdcGross: number
  /** USDC commission */
  fee: number
  /** USDC net delivered on-chain */
  usdcNet: number
  /** Amount the tourist pays in their origin currency */
  originAmount: number
  /** ARS the hotel actually receives */
  hotelReceivesArs: number
  /** USDC per 1 unit of origin currency */
  rate: number
}

export function quote(arsAmount: number, origin: Currency): Quote {
  const usdcGross = arsAmount > 0 ? arsAmount / ARS_PER_USDC : 0
  const fee = usdcGross * COMMISSION_RATE
  const usdcNet = usdcGross - fee
  const originAmount = origin.usdcPerUnit > 0 ? usdcGross / origin.usdcPerUnit : 0
  const hotelReceivesArs = usdcNet * ARS_PER_USDC
  return {
    arsAmount,
    usdcGross,
    fee,
    usdcNet,
    originAmount,
    hotelReceivesArs,
    rate: origin.usdcPerUnit,
  }
}

const numberFmt = (min: number, max: number) =>
  new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  })

export function fmtMoney(value: number, fractionDigits = 2): string {
  return numberFmt(fractionDigits, fractionDigits).format(value)
}

export function fmtUsdc(value: number): string {
  return numberFmt(2, 2).format(value)
}

export function fmtArs(value: number): string {
  return numberFmt(0, 0).format(Math.round(value))
}

export type PaymentRecord = {
  id: string
  tourist: string
  origin: string
  originAmount: number
  usdcNet: number
  arsReceived: number
  status: 'confirmado' | 'liquidado'
  timestamp: number
  txHash: string
}

export function shortHash(hash: string): string {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`
}

export function randomTxHash(): string {
  const chars = 'ABCDEF0123456789'
  let out = ''
  for (let i = 0; i < 56; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}
