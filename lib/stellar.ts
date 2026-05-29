import * as StellarSdk from '@stellar/stellar-sdk'

// Stellar Testnet configuration
export const HORIZON_URL = 'https://horizon-testnet.stellar.org'
export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET

// Hotel's Stellar account (testnet)
// In production, this would be securely stored
export const HOTEL_PUBLIC_KEY = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI'
export const HOTEL_SECRET_KEY = 'SC5O7VZUXDJ6JBDSZ74DSERBER6RJAFSTBMLWMQZ5EVSYDNQBSMM2VQSP'

// Demo tourist account (testnet)
export const TOURIST_PUBLIC_KEY = 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOUJ3DCKRJQHQYQV'
export const TOURIST_SECRET_KEY = 'SCZANGBA5YHTNYVVV3C7CAZMTQDBJHP5HPCBQJQMZJUWFGZTD5O3MDJX'

// Asset codes used in the demo
export const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
export const USDC_ASSET = new StellarSdk.Asset('USDC', USDC_ISSUER)

export type CurrencyCode = 'USDC' | 'XLM' | 'USD' | 'BRL' | 'EUR' | 'CLP' | 'BOB' | 'GBP'

export interface StellarPaymentReceipt {
  transactionHash: string
  ledgerNumber: number
  createdAt: string
  sourceAccount: string
  destinationAccount: string
  sourceAsset: CurrencyCode
  sourceAmount: string
  destinationAsset: CurrencyCode
  destinationAmount: string
  status: 'confirmed' | 'failed'
}

export interface HotelStats {
  totalReceivedARS: number
  paymentCount: number
  networkStatus: 'connected' | 'disconnected'
}

export interface PaymentRequest {
  arsAmount: number
  originCurrency: CurrencyCode
  originAmount: number
  usdcAmount: number
}

// Initialize Horizon server
export function getHorizonServer() {
  return new StellarSdk.Horizon.Server(HORIZON_URL)
}

// Fetch payments for hotel account from Horizon
export async function fetchHotelPayments(): Promise<StellarPaymentReceipt[]> {
  const server = getHorizonServer()
  
  try {
    const payments = await server
      .payments()
      .forAccount(HOTEL_PUBLIC_KEY)
      .order('desc')
      .limit(50)
      .call()
    
    const receipts: StellarPaymentReceipt[] = []
    
    for (const record of payments.records) {
      // Only process payment operations
      if (record.type !== 'payment' && record.type !== 'path_payment_strict_send' && record.type !== 'path_payment_strict_receive') {
        continue
      }
      
      // Skip outgoing payments
      if (record.from === HOTEL_PUBLIC_KEY) {
        continue
      }
      
      // Get transaction details for ledger number
      const tx = await record.transaction()
      
      receipts.push({
        transactionHash: record.transaction_hash,
        ledgerNumber: tx.ledger_attr,
        createdAt: record.created_at,
        sourceAccount: record.from,
        destinationAccount: record.to,
        sourceAsset: (record.asset_type === 'native' ? 'XLM' : record.asset_code || 'XLM') as CurrencyCode,
        sourceAmount: record.amount,
        destinationAsset: (record.asset_type === 'native' ? 'XLM' : record.asset_code || 'XLM') as CurrencyCode,
        destinationAmount: record.amount,
        status: 'confirmed',
      })
    }
    
    return receipts
  } catch (error) {
    console.error('[Stellar] Error fetching payments:', error)
    return []
  }
}

// Execute a payment on Stellar Testnet
export async function executePayment(request: PaymentRequest): Promise<StellarPaymentReceipt> {
  const server = getHorizonServer()
  
  // Load tourist account
  const touristKeypair = StellarSdk.Keypair.fromSecret(TOURIST_SECRET_KEY)
  const touristAccount = await server.loadAccount(touristKeypair.publicKey())
  
  // Build the transaction
  // For demo, we send XLM as a simple payment (in production, would use path_payment)
  const transaction = new StellarSdk.TransactionBuilder(touristAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: HOTEL_PUBLIC_KEY,
        asset: StellarSdk.Asset.native(),
        amount: request.usdcAmount.toFixed(7), // XLM amount (simulating USDC)
      })
    )
    .addMemo(StellarSdk.Memo.text(`SaltaPay: ${request.arsAmount} ARS`))
    .setTimeout(30)
    .build()
  
  // Sign the transaction
  transaction.sign(touristKeypair)
  
  // Submit to network
  const result = await server.submitTransaction(transaction)
  
  return {
    transactionHash: result.hash,
    ledgerNumber: result.ledger,
    createdAt: new Date().toISOString(),
    sourceAccount: touristKeypair.publicKey(),
    destinationAccount: HOTEL_PUBLIC_KEY,
    sourceAsset: request.originCurrency,
    sourceAmount: request.originAmount.toString(),
    destinationAsset: 'USDC',
    destinationAmount: request.usdcAmount.toString(),
    status: 'confirmed',
  }
}

// Check network status
export async function checkNetworkStatus(): Promise<'connected' | 'disconnected'> {
  try {
    const server = getHorizonServer()
    await server.root()
    return 'connected'
  } catch {
    return 'disconnected'
  }
}
