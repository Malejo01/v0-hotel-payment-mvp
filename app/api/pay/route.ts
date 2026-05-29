import { NextRequest, NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { simulateStellarPayment } from "@/lib/stellar-mock"
import { writeReceipt } from "@/lib/arkiv-write"
import { queryPayments } from "@/lib/arkiv-read"
import {
  ARKIV_RECEIPT_STATUS,
  EXCHANGE_RATES,
  PAY_TRACK,
  ARS_PER_USDC,
  RECEIPT_SCHEMA_VERSION,
  type CurrencyCode,
  type PaymentListFilters,
  type PaymentCreateRequest,
  type PaymentCreateResponse,
  type PayListResponse,
  type HotelPaymentRow,
  type ArkivReceiptPayload,
} from "@/types/pay"

function normalizeTrack(rawTrack?: string): typeof PAY_TRACK {
  if (!rawTrack || rawTrack === PAY_TRACK) {
    return PAY_TRACK
  }

  throw new Error(`Unsupported track: ${rawTrack}`)
}

function toSafeNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toSafeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback
}

function normalizePayload(rawPayload: unknown): ArkivReceiptPayload {
  const payload = (rawPayload ?? {}) as Record<string, unknown>

  const fechaHora = toSafeString(payload.fechaHora, new Date(0).toISOString())
  const monedaOrigen = toSafeString(payload.monedaOrigen, "USD") as CurrencyCode
  const montoUSDC = toSafeNumber(payload.montoUSDC)
  const montoLiquidadoARS = toSafeNumber(
    payload.montoLiquidadoARS ?? payload.montoARS,
    Number((montoUSDC * ARS_PER_USDC).toFixed(2))
  )

  return {
    schemaVersion: toSafeString(payload.schemaVersion, RECEIPT_SCHEMA_VERSION) as typeof RECEIPT_SCHEMA_VERSION,
    transaccionIdStellar: toSafeString(payload.transaccionIdStellar ?? payload.stellarTxId, "stellar-unknown"),
    hotelId: toSafeString(payload.hotelId, "hotel-unknown"),
    hotelNombre: toSafeString(payload.hotelNombre ?? payload.hotelName, "Hotel desconocido"),
    turistaId: toSafeString(payload.turistaId ?? payload.touristId, "tourist-unknown"),
    turistaOrigen: toSafeString(payload.turistaOrigen ?? payload.touristCountry, "Origen desconocido"),
    monedaOrigen,
    montoOriginalFiat: toSafeNumber(payload.montoOriginalFiat ?? payload.montoOrigen),
    montoUSDC,
    montoLiquidadoARS,
    fechaHora,
    localidad: toSafeString(payload.localidad, "Localidad desconocida"),
    status: ARKIV_RECEIPT_STATUS,
    track: PAY_TRACK,
    rubro: "hotel",
    receiptHash: typeof payload.receiptHash === "string" ? payload.receiptHash : undefined,
  }
}

// POST /api/pay - Process a payment
export async function POST(request: NextRequest): Promise<NextResponse<PaymentCreateResponse>> {
  try {
    const body: PaymentCreateRequest = await request.json()
    const track = normalizeTrack(body.track)

    // Validate required fields
    if (!body.hotel?.hotelId || !body.turista?.turistaId || !body.sourceCurrency || body.montoARS <= 0) {
      return NextResponse.json(
        {
          status: "failed",
          track,
          uiMessage: "Datos incompletos para procesar el pago",
          error: "Missing required fields",
          success: false,
        },
        { status: 400 }
      )
    }

    const rateUsed = EXCHANGE_RATES[body.sourceCurrency as CurrencyCode]
    if (!rateUsed || rateUsed <= 0) {
      return NextResponse.json(
        {
          status: "failed",
          track,
          uiMessage: "Moneda no soportada para la demo",
          error: "Unsupported sourceCurrency",
          success: false,
        },
        { status: 400 }
      )
    }

    const desiredUsdc = body.montoARS / ARS_PER_USDC
    const sourceAmount = body.sourceAmount ?? Number((desiredUsdc / rateUsed).toFixed(2))

    // Step 1: Simulate Stellar conversion
    const stellarTx = await simulateStellarPayment({
      sourceCurrency: body.sourceCurrency,
      sourceAmount,
    })

    if (stellarTx.status !== "confirmed") {
      return NextResponse.json(
        {
          status: "failed",
          track,
          stellar: stellarTx,
          uiMessage: "No se pudo confirmar la conversion en Stellar",
          error: "Stellar conversion failed",
          success: false,
        },
        { status: 500 }
      )
    }

    // Step 2: Calculate ARS liquidation amount
    const montoLiquidadoARS = Number((stellarTx.targetAmount * ARS_PER_USDC).toFixed(2))

    // Step 3: Build Arkiv receipt payload
    const baseReceipt: Omit<ArkivReceiptPayload, "receiptHash"> = {
      schemaVersion: RECEIPT_SCHEMA_VERSION,
      transaccionIdStellar: stellarTx.transactionId,
      hotelId: body.hotel.hotelId,
      hotelNombre: body.hotel.hotelNombre,
      turistaId: body.turista.turistaId,
      turistaOrigen: body.turista.turistaOrigen,
      monedaOrigen: body.sourceCurrency,
      montoOriginalFiat: sourceAmount,
      montoUSDC: stellarTx.targetAmount,
      montoLiquidadoARS,
      fechaHora: new Date().toISOString(),
      localidad: body.hotel.localidad,
      status: ARKIV_RECEIPT_STATUS,
      track,
      rubro: "hotel",
    }
    const receiptHash = createHash("sha256").update(JSON.stringify(baseReceipt)).digest("hex")
    const receipt: ArkivReceiptPayload = { ...baseReceipt, receiptHash }

    // Step 4: Write receipt to Arkiv blockchain
    const arkivResult = await writeReceipt(receipt)

    return NextResponse.json({
      status: "confirmed",
      track,
      success: true,
      txHash: arkivResult.txHash,
      entityId: arkivResult.entityId,
      stellar: stellarTx,
      arkiv: {
        txHash: arkivResult.txHash,
        entityId: arkivResult.entityId,
        confirmedAt: new Date().toISOString(),
      },
      receipt,
      uiMessage: "Pago procesado con exito y recibo firmado en Arkiv",
    })
  } catch (error) {
    console.error("[API Pay POST] Error:", error)
    return NextResponse.json(
      {
        status: "failed",
        track: PAY_TRACK,
        uiMessage: "No se pudo procesar el pago",
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      },
      { status: 500 }
    )
  }
}

// GET /api/pay - List payments for hotel dashboard
export async function GET(request: NextRequest): Promise<NextResponse<PayListResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const track = normalizeTrack(searchParams.get("track") ?? undefined)
    const filters: PaymentListFilters = {
      track,
      hotelId: searchParams.get("hotelId") ?? undefined,
      localidad: searchParams.get("localidad") ?? undefined,
      status: (searchParams.get("status") as PaymentListFilters["status"]) ?? undefined,
      monedaOrigen: (searchParams.get("monedaOrigen") as CurrencyCode) ?? undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    }

    // Query Arkiv for payments
    const queryResult = await queryPayments(filters)
    const entities = queryResult.entities

    // Transform to dashboard rows (legacy-safe)
    const items: HotelPaymentRow[] = entities.map((entity) => {
      const normalizedPayload = normalizePayload(entity.payload)

      return {
      id: entity.id,
      txHash: entity.txHash,
      hora: new Date(normalizedPayload.fechaHora).toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      turistaId: normalizedPayload.turistaId,
      turistaOrigen: normalizedPayload.turistaOrigen,
      monedaOrigen: normalizedPayload.monedaOrigen,
      montoOriginalFiat: normalizedPayload.montoOriginalFiat,
      montoUSDC: normalizedPayload.montoUSDC,
      montoLiquidadoARS: normalizedPayload.montoLiquidadoARS,
      status: normalizedPayload.status,
      payload: normalizedPayload,
    }})

    // Calculate totals
    const totals = items.reduce(
      (acc, p) => ({
        totalARS: acc.totalARS + p.montoLiquidadoARS,
        totalUSDC: acc.totalUSDC + p.montoUSDC,
        count: acc.count + 1,
      }),
      { totalARS: 0, totalUSDC: 0, count: 0 }
    )

    return NextResponse.json({
      track,
      items,
      totalARS: Number(totals.totalARS.toFixed(2)),
      totalPayments: totals.count,
      nextCursor: queryResult.nextCursor,
      payments: items,
      totals: {
        totalARS: Number(totals.totalARS.toFixed(2)),
        totalUSDC: Number(totals.totalUSDC.toFixed(2)),
        count: totals.count,
      },
    })
  } catch (error) {
    console.error("[API Pay GET] Error:", error)
    return NextResponse.json(
      {
        track: PAY_TRACK,
        items: [],
        totalARS: 0,
        totalPayments: 0,
        payments: [],
        totals: { totalARS: 0, totalUSDC: 0, count: 0 },
      },
      { status: 500 }
    )
  }
}
