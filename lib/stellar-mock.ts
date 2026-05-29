import { EXCHANGE_RATES, STELLAR_NETWORK, type CurrencyCode, type StellarMockTransaction } from "@/types/pay"

export async function simulateStellarPayment(params: {
  sourceCurrency: CurrencyCode
  sourceAmount: number
}): Promise<StellarMockTransaction> {
  // Simulate network delay (1.5-2 seconds for demo storytelling)
  await new Promise((r) => setTimeout(r, 1500 + Math.random() * 500))

  const rate = EXCHANGE_RATES[params.sourceCurrency]
  const targetAmount = params.sourceAmount * rate
  const feeEstimate = targetAmount * 0.005 // 0.5% fee

  return {
    transactionId: `stellar-${crypto.randomUUID()}`,
    network: STELLAR_NETWORK,
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
