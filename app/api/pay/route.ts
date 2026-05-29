import { NextRequest, NextResponse } from "next/server"
import { simulateStellarPayment } from "@/lib/stellar-mock"
import { writeReceipt } from "@/lib/arkiv-write"
import { queryPayments } from "@/lib/arkiv-read"
import {
  PAY_TRACK,
  ARS_PER_USDC,
  type PaymentCreateRequest,
  type PaymentCreateResponse,
  type PayListResponse,
  type HotelPaymentRow,
  type ArkivReceiptPayload,
} from "@/types/pay"

// POST /api/pay - Process a payment
export async function POST(request: NextRequest): Promise<NextResponse<PaymentCreateResponse>> {
  try {
    const body: PaymentCreateRequest = await request.json()

    // Validate required fields
    if (!body.hotel?.hotelId || !body.tourist?.touristId || !body.sourceCurrency || !body.sourceAmount) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Step 1: Simulate Stellar conversion
    const stellarTx = await simulateStellarPayment({
      sourceCurrency: body.sourceCurrency,
      sourceAmount: body.sourceAmount,
    })

    if (stellarTx.status !== "confirmed") {
      return NextResponse.json(
        { success: false, error: "Stellar conversion failed" },
        { status: 500 }
      )
    }

    // Step 2: Calculate ARS liquidation amount
    const montoARS = stellarTx.targetAmount * ARS_PER_USDC

    // Step 3: Build Arkiv receipt payload
    const receipt: ArkivReceiptPayload = {
      track: PAY_TRACK,
      hotelId: body.hotel.hotelId,
      hotelName: body.hotel.hotelName,
      localidad: body.hotel.localidad,
      touristId: body.tourist.touristId,
      touristName: body.tourist.displayName,
      touristCountry: body.tourist.country,
      monedaOrigen: body.sourceCurrency,
      montoOrigen: body.sourceAmount,
      montoUSDC: stellarTx.targetAmount,
      montoARS: Number(montoARS.toFixed(2)),
      cotizacion: stellarTx.rateUsed,
      stellarTxId: stellarTx.transactionId,
      status: "confirmed",
      fechaHora: new Date().toISOString(),
      rubro: "hotel",
    }

    // Step 4: Write receipt to Arkiv blockchain
    const arkivResult = await writeReceipt(receipt)

    return NextResponse.json({
      success: true,
      txHash: arkivResult.txHash,
      entityId: arkivResult.entityId,
      receipt,
    })
  } catch (error) {
    console.error("[API Pay POST] Error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// GET /api/pay - List payments for hotel dashboard
export async function GET(request: NextRequest): Promise<NextResponse<PayListResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get("hotelId") || undefined

    // Query Arkiv for payments
    const entities = await queryPayments(hotelId)

    // Transform to dashboard rows
    const payments: HotelPaymentRow[] = entities.map((entity) => ({
      id: entity.id,
      txHash: entity.txHash,
      hora: new Date(entity.payload.fechaHora).toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      touristName: entity.payload.touristName,
      touristCountry: entity.payload.touristCountry,
      monedaOrigen: entity.payload.monedaOrigen,
      montoOrigen: entity.payload.montoOrigen,
      montoUSDC: entity.payload.montoUSDC,
      montoARS: entity.payload.montoARS,
      status: entity.payload.status,
      payload: entity.payload,
    }))

    // Calculate totals
    const totals = payments.reduce(
      (acc, p) => ({
        totalARS: acc.totalARS + p.montoARS,
        totalUSDC: acc.totalUSDC + p.montoUSDC,
        count: acc.count + 1,
      }),
      { totalARS: 0, totalUSDC: 0, count: 0 }
    )

    return NextResponse.json({ payments, totals })
  } catch (error) {
    console.error("[API Pay GET] Error:", error)
    return NextResponse.json(
      { payments: [], totals: { totalARS: 0, totalUSDC: 0, count: 0 } },
      { status: 500 }
    )
  }
}
