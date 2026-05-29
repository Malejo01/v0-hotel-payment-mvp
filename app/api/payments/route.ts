import { NextRequest, NextResponse } from 'next/server'
import {
  fetchHotelPayments,
  executePayment,
  checkNetworkStatus,
  type PaymentRequest,
  type StellarPaymentReceipt,
  type HotelStats,
  HOTEL_PUBLIC_KEY,
} from '@/lib/stellar'
import { ARS_PER_USDC } from '@/lib/saltapay'

export const dynamic = 'force-dynamic'

// GET: Fetch payment history from Horizon (the ledger IS the database)
export async function GET() {
  try {
    const [payments, networkStatus] = await Promise.all([
      fetchHotelPayments(),
      checkNetworkStatus(),
    ])

    // Calculate stats from on-chain data
    const totalUsdc = payments.reduce(
      (sum, p) => sum + parseFloat(p.destinationAmount),
      0
    )
    const stats: HotelStats = {
      totalReceivedARS: totalUsdc * ARS_PER_USDC,
      paymentCount: payments.length,
      networkStatus,
    }

    return NextResponse.json({
      success: true,
      hotelPublicKey: HOTEL_PUBLIC_KEY,
      payments,
      stats,
    })
  } catch (error) {
    console.error('[API] Error fetching payments:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// POST: Execute a payment on Stellar Testnet
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PaymentRequest

    // Validate request
    if (!body.arsAmount || body.arsAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid ARS amount' },
        { status: 400 }
      )
    }

    if (!body.usdcAmount || body.usdcAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid USDC amount' },
        { status: 400 }
      )
    }

    // Execute the payment on Stellar Testnet
    const receipt: StellarPaymentReceipt = await executePayment(body)

    return NextResponse.json({
      success: true,
      receipt,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${receipt.transactionHash}`,
    })
  } catch (error) {
    console.error('[API] Error executing payment:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      },
      { status: 500 }
    )
  }
}
