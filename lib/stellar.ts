import * as StellarSdk from '@stellar/stellar-sdk'

// Stellar Testnet configuration
export const HORIZON_URL = 'https://horizon-testnet.stellar.org'
export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET

// Get hotel public key from environment (read at runtime)
export function getHotelPublicKey(): string {
  return process.env.STELLAR_HOTEL_PUBLIC_KEY || ''
}

// Get tourist secret key from environment (read at runtime)
export function getTouristSecretKey(): string {
  return process.env.STELLAR_TOURIST_SECRET_KEY || ''
}

// For backwards compatibility (but reads dynamically now)
export const HOTEL_PUBLIC_KEY = process.env.STELLAR_HOTEL_PUBLIC_KEY || ''

// Validate that required env vars are set
export function validateStellarConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = []
  if (!process.env.STELLAR_HOTEL_PUBLIC_KEY) missing.push('STELLAR_HOTEL_PUBLIC_KEY')
  if (!process.env.STELLAR_TOURIST_SECRET_KEY) missing.push('STELLAR_TOURIST_SECRET_KEY')
  return { valid: missing.length === 0, missing }
}

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
  const hotelKey = getHotelPublicKey()
  
  if (!hotelKey) {
    console.error('[Stellar] STELLAR_HOTEL_PUBLIC_KEY not configured')
    return []
  }
  
  try {
    const payments = await server
      .payments()
      .forAccount(hotelKey)
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
      if (record.from === hotelKey) {
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
  const hotelKey = getHotelPublicKey()
  const touristSecret = getTouristSecretKey()
  
  if (!hotelKey || !touristSecret) {
    throw new Error('Stellar keys not configured')
  }
  
  // Load tourist account
  const touristKeypair = StellarSdk.Keypair.fromSecret(touristSecret)
  const touristAccount = await server.loadAccount(touristKeypair.publicKey())
  
  // Build the transaction
  // For demo, we send XLM as a simple payment (in production, would use path_payment)
  const transaction = new StellarSdk.TransactionBuilder(touristAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: hotelKey,
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
    destinationAccount: hotelKey,
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
