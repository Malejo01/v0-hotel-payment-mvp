import { createPublicClient, http } from "@arkiv-network/sdk"
import { braga } from "@arkiv-network/sdk/chains"
import { eq } from "@arkiv-network/sdk/query"
import { PAY_TRACK, type ArkivEntity, type ArkivReceiptPayload, type PaymentListFilters } from "@/types/pay"

// Public client for reading - no auth needed
export const arkivPublicClient = createPublicClient({
  chain: braga,
  transport: http(),
})

export interface QueryPaymentsResult {
  entities: ArkivEntity[]
  nextCursor?: string
}

export async function queryPayments(filters: PaymentListFilters = {}): Promise<QueryPaymentsResult> {
  try {
    const track = filters.track ?? PAY_TRACK
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100)
    const offset = Math.max(Number(filters.cursor ?? "0") || 0, 0)
    const backendFetchLimit = Math.min(offset + limit + 1, 200)

    let query = arkivPublicClient
      .buildQuery()
      .where(eq("track", track))

    if (filters.hotelId) {
      query = query.where(eq("hotelId", filters.hotelId))
    }

    if (filters.localidad) {
      query = query.where(eq("localidad", filters.localidad))
    }

    if (filters.status) {
      query = query.where(eq("status", filters.status))
    }

    if (filters.monedaOrigen) {
      query = query.where(eq("monedaOrigen", filters.monedaOrigen))
    }

    const result = await query
      .withPayload(true)
      .withAttributes(true)
      .orderBy("fechaTs", "number", "desc")
      .limit(backendFetchLimit)
      .fetch()

    const allEntities: ArkivEntity[] = (result.entities || []).map((entity: any) => ({
      id: entity.id,
      txHash: entity.txHash,
      payload: entity.payload as ArkivReceiptPayload,
      attributes: entity.attributes || {},
      createdAt: entity.createdAt,
    }))

    const pageItems = allEntities.slice(offset, offset + limit)
    const hasMore = allEntities.length > offset + limit

    return {
      entities: pageItems,
      nextCursor: hasMore ? String(offset + limit) : undefined,
    }
  } catch (error) {
    console.error("[Arkiv Read] Query failed:", error)
    return { entities: [] }
  }
}
