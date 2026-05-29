import { NextRequest, NextResponse } from 'next/server'
import { persistHotelReceipt } from '@/lib/payment-receipts'
import { completePaymentSession } from '@/lib/payment-sessions'
import { type CurrencyCode } from '@/types/pay'

interface ConfirmPaymentRequest {
  sessionId?: string
  transactionHash: string
  touristSourceAccount: string
  sourceCurrency: CurrencyCode
  originAmount: number
  receivedAmount: number
  hotel?: {
    hotelId: string
    hotelNombre: string
    localidad: string
  }
}

const DEFAULT_HOTEL = {
  hotelId: 'hotel-salta-001',
  hotelNombre: 'Hotel Cerro San Bernardo',
  localidad: 'Salta Capital',
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ConfirmPaymentRequest

    if (!body.transactionHash || !body.touristSourceAccount || !body.sourceCurrency) {
      return NextResponse.json(
        { success: false, error: 'Missing confirmation payload fields' },
        { status: 400 }
      )
    }

    if (!body.originAmount || body.originAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid origin amount' },
        { status: 400 }
      )
    }

    if (!body.receivedAmount || body.receivedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid received amount' },
        { status: 400 }
      )
    }

    const hotel = body.hotel ?? DEFAULT_HOTEL
    const { receipt, arkiv } = await persistHotelReceipt({
      transactionHash: body.transactionHash,
      touristId: body.touristSourceAccount,
      touristOrigin: 'Wallet Stellar externa',
      hotelId: hotel.hotelId,
      hotelNombre: hotel.hotelNombre,
      localidad: hotel.localidad,
      sourceCurrency: body.sourceCurrency,
      sourceAmount: body.originAmount,
      receivedAmount: body.receivedAmount,
    })

    if (body.sessionId) {
      completePaymentSession(body.sessionId, body.sourceCurrency)
    }

    return NextResponse.json({
      success: true,
      receipt,
      arkiv,
    })
  } catch (error) {
    console.error('[API] Error confirming on-chain payment:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Payment confirmation failed',
      },
      { status: 500 }
    )
  }
}
