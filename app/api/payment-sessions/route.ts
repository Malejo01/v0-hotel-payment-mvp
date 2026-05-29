import { NextRequest, NextResponse } from 'next/server'
import {
  createPaymentSession,
  getPaymentSession,
  markPaymentSessionOpened,
} from '@/lib/payment-sessions'

const DEFAULT_HOTEL = {
  hotelId: 'hotel-salta-001',
  hotelNombre: 'Hotel Cerro San Bernardo',
  localidad: 'Salta Capital',
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')?.trim()
  const markOpened = searchParams.get('markOpened') === 'true'

  if (!sessionId) {
    return NextResponse.json(
      { success: false, error: 'Missing sessionId' },
      { status: 400 }
    )
  }

  const session = markOpened ? markPaymentSessionOpened(sessionId) : getPaymentSession(sessionId)

  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Payment session not found or expired' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    session,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { montoARS?: number; hotelId?: string; hotelNombre?: string; localidad?: string; expiresInSeconds?: number }
    const origin = new URL(request.url).origin

    if (!body.montoARS || body.montoARS <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid ARS amount' },
        { status: 400 }
      )
    }

    const session = createPaymentSession({
      hotelId: body.hotelId || DEFAULT_HOTEL.hotelId,
      hotelNombre: body.hotelNombre || DEFAULT_HOTEL.hotelNombre,
      localidad: body.localidad || DEFAULT_HOTEL.localidad,
      montoARS: body.montoARS,
      expiresInSeconds: body.expiresInSeconds,
    })

    return NextResponse.json({
      success: true,
      session,
      checkoutUrl: `${origin}/?tab=tourist&session=${encodeURIComponent(session.sessionId)}`,
    })
  } catch (error) {
    console.error('[API] Error creating payment session:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Session creation failed',
      },
      { status: 500 }
    )
  }
}
