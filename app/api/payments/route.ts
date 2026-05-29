import { NextRequest, NextResponse } from 'next/server'
import {
  fetchHotelPayments,
  createSep7PaymentIntent,
  checkNetworkStatus,
  validateHotelConfig,
  validatePaymentIntentConfig,
  getHotelPublicKey,
  type PaymentRequest,
  type StellarPaymentIntent,
  type HotelStats,
} from '@/lib/stellar'
import { ARS_PER_USDC } from '@/lib/saltapay'

export const dynamic = 'force-dynamic'

// GET: Fetch payment history from Horizon (the ledger IS the database)
export async function GET() {
  // Validate Stellar configuration
  const config = validateHotelConfig()
  if (!config.valid) {
    return NextResponse.json({
      success: false,
      error: `Missing environment variables: ${config.missing.join(', ')}`,
      configError: true,
    }, { status: 500 })
  }

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
      hotelPublicKey: getHotelPublicKey(),
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

// POST: Build a SEP-0007 payment intent for external wallet signing
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PaymentRequest

    // Validate Stellar configuration after reading the request so the source account
    // can come from the tourist wallet instead of only from env.
    const config = validatePaymentIntentConfig()
    if (!config.valid && !body.sourceAccount) {
      return NextResponse.json({
        success: false,
        error: `Missing environment variables: ${config.missing.join(', ')}`,
        configError: true,
      }, { status: 500 })
    }

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

    if (!body.sourceAccount && !body.sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing tourist source account' },
        { status: 400 }
      )
    }

    // Build unsigned tx intent for external wallet signing (SEP-7)
    const intent: StellarPaymentIntent = await createSep7PaymentIntent(body)

    return NextResponse.json({
      success: true,
      intent,
    })
  } catch (error) {
    console.error('[API] Error preparing payment intent:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Payment intent failed',
      },
      { status: 500 }
    )
  }
}
