import * as StellarSdk from '@stellar/stellar-sdk'
import { getEnvValue } from '@/lib/runtime-env'

// Stellar Testnet configuration
export const HORIZON_URL = 'https://horizon-testnet.stellar.org'
export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET

// Get hotel public key from environment (read at runtime)
export function getHotelPublicKey(): string {
  return getEnvValue('STELLAR_HOTEL_PUBLIC_KEY')
}

// Get tourist secret key from environment (read at runtime)
export function getTouristSecretKey(): string {
  const configuredValue = getEnvValue('STELLAR_TOURIST_SECRET_KEY')
  return StellarSdk.StrKey.isValidEd25519SecretSeed(configuredValue) ? configuredValue : ''
}

export function getTouristSourceAccount(): string {
  const publicKey = getEnvValue('STELLAR_TOURIST_PUBLIC_KEY') || getEnvValue('STELLAR_TOURIST_SECRET_KEY')

  if (StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
    return publicKey
  }

  if (StellarSdk.StrKey.isValidEd25519SecretSeed(publicKey)) {
    return StellarSdk.Keypair.fromSecret(publicKey).publicKey()
  }

  return ''
}

// For backwards compatibility (but reads dynamically now)
export const HOTEL_PUBLIC_KEY = getEnvValue('STELLAR_HOTEL_PUBLIC_KEY')

// Validate that required env vars are set
export function validateHotelConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = []
  if (!getEnvValue('STELLAR_HOTEL_PUBLIC_KEY')) missing.push('STELLAR_HOTEL_PUBLIC_KEY')
  return { valid: missing.length === 0, missing }
}

export function validatePaymentIntentConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = []
  if (!getEnvValue('STELLAR_HOTEL_PUBLIC_KEY')) missing.push('STELLAR_HOTEL_PUBLIC_KEY')
  if (!getTouristSourceAccount()) missing.push('STELLAR_TOURIST_PUBLIC_KEY or STELLAR_TOURIST_SECRET_KEY')
  return { valid: missing.length === 0, missing }
}

export function validateStellarConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = []
  if (!getEnvValue('STELLAR_HOTEL_PUBLIC_KEY')) missing.push('STELLAR_HOTEL_PUBLIC_KEY')
  if (!getEnvValue('STELLAR_TOURIST_SECRET_KEY')) missing.push('STELLAR_TOURIST_SECRET_KEY')
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

export interface StellarPaymentIntent {
  sep7Url: string
  xdr: string
  sourceAccount: string
  destinationAccount: string
  expectedAmount: string
  memo: string
  callbackUrl: string
  message: string
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
  sourceAccount?: string
  sessionId?: string
}

function resolveTouristSourceAccount(sourceAccount?: string): string {
  const candidate = sourceAccount?.trim() || getTouristSourceAccount()
  return StellarSdk.StrKey.isValidEd25519PublicKey(candidate) ? candidate : ''
}

// Initialize Horizon server
export function getHorizonServer() {
  return new StellarSdk.Horizon.Server(HORIZON_URL)
}

function buildSep7CallbackUrl(): string {
  const baseUrl = getEnvValue('NEXT_PUBLIC_APP_URL').trim() || getEnvValue('VERCEL_URL').trim()

  if (!baseUrl) {
    return 'http://localhost:3000/api/payments/callback'
  }

  const normalizedBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`
  return `${normalizedBaseUrl.replace(/\/$/, '')}/api/payments/callback`
}

// Build an unsigned transaction for external wallet signing via SEP-0007 QR
export async function createSep7PaymentIntent(request: PaymentRequest): Promise<StellarPaymentIntent> {
  const server = getHorizonServer()
  const hotelKey = getHotelPublicKey()
  const touristSourceAccount = resolveTouristSourceAccount(request.sourceAccount)

  if (!hotelKey || !touristSourceAccount) {
    throw new Error('Stellar intent configuration is incomplete')
  }

  const touristAccount = await server.loadAccount(touristSourceAccount)
  const memo = `SaltaPay: ${request.arsAmount} ARS`
  const callbackUrl = buildSep7CallbackUrl()
  const message = `Hotel Cerro San Bernardo · ${request.arsAmount} ARS`

  const transaction = new StellarSdk.TransactionBuilder(touristAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: hotelKey,
        asset: StellarSdk.Asset.native(),
        amount: request.usdcAmount.toFixed(7),
      })
    )
    .addMemo(StellarSdk.Memo.text(memo))
    .setTimeout(300)
    .build()

  const xdr = transaction.toXDR()
  const sep7Url =
    `web+stellar:tx?xdr=${encodeURIComponent(xdr)}` +
    `&network_passphrase=${encodeURIComponent(NETWORK_PASSPHRASE)}` +
    `&callback=${encodeURIComponent(`url:${callbackUrl}`)}` +
    `&msg=${encodeURIComponent(message)}`

  return {
    sep7Url,
    xdr,
    sourceAccount: touristSourceAccount,
    destinationAccount: hotelKey,
    expectedAmount: request.usdcAmount.toFixed(7),
    memo,
    callbackUrl,
    message,
  }
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
