import { createHash } from 'node:crypto'
import { writeReceipt } from '@/lib/arkiv-write'
import {
  ARKIV_RECEIPT_STATUS,
  ARS_PER_USDC,
  PAY_TRACK,
  RECEIPT_SCHEMA_VERSION,
  type ArkivReceiptPayload,
  type CurrencyCode,
  type PayTrack,
} from '@/types/pay'

export interface PersistHotelReceiptInput {
  transactionHash: string
  touristId: string
  touristOrigin: string
  hotelId: string
  hotelNombre: string
  localidad: string
  sourceCurrency: CurrencyCode
  sourceAmount: number
  receivedAmount: number
  track?: PayTrack
}

export function buildHotelReceiptPayload(input: PersistHotelReceiptInput): ArkivReceiptPayload {
  const baseReceipt: Omit<ArkivReceiptPayload, 'receiptHash'> = {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    transaccionIdStellar: input.transactionHash,
    hotelId: input.hotelId,
    hotelNombre: input.hotelNombre,
    turistaId: input.touristId,
    turistaOrigen: input.touristOrigin,
    monedaOrigen: input.sourceCurrency,
    montoOriginalFiat: input.sourceAmount,
    montoUSDC: input.receivedAmount,
    montoLiquidadoARS: Number((input.receivedAmount * ARS_PER_USDC).toFixed(2)),
    fechaHora: new Date().toISOString(),
    localidad: input.localidad,
    status: ARKIV_RECEIPT_STATUS,
    track: input.track ?? PAY_TRACK,
    rubro: 'hotel',
  }

  const receiptHash = createHash('sha256').update(JSON.stringify(baseReceipt)).digest('hex')
  return {
    ...baseReceipt,
    receiptHash,
  }
}

export async function persistHotelReceipt(input: PersistHotelReceiptInput) {
  const receipt = buildHotelReceiptPayload(input)
  const arkiv = await writeReceipt(receipt)

  return {
    receipt,
    arkiv: {
      txHash: arkiv.txHash,
      entityId: arkiv.entityId,
    },
  }
}
