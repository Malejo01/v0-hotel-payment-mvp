import type { CurrencyCode, StellarMockTransaction, EXCHANGE_RATES } from "@/types/pay"

const rates: Record<CurrencyCode, number> = {
  USD: 1.0,
  BRL: 0.18,
  ARS: 0.001,
  CRYPTO: 1.0,
}

export async function simulateStellarPayment(params: {
  sourceCurrency: CurrencyCode
  sourceAmount: number
}): Promise<StellarMockTransaction> {
  // Simulate network delay (1.5-2 seconds for demo storytelling)
  await new Promise((r) => setTimeout(r, 1500 + Math.random() * 500))

  const rate = rates[params.sourceCurrency]
  const targetAmount = params.sourceAmount * rate
  const feeEstimate = targetAmount * 0.005 // 0.5% fee

  return {
    transactionId: `stellar-${crypto.randomUUID()}`,
    network: "stellar-testnet-mock",
    sourceCurrency: params.sourceCurrency,
    sourceAmount: params.sourceAmount,
    targetCurrency: "USDC",
    targetAmount: Number(targetAmount.toFixed(2)),
    rateUsed: rate,
    feeEstimate: Number(feeEstimate.toFixed(2)),
    status: "confirmed",
    createdAt: new Date().toISOString(),
  }
}
