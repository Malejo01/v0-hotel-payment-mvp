import { createPublicClient, http } from "@arkiv-network/sdk"
import { braga } from "@arkiv-network/sdk/chains"
import { eq } from "@arkiv-network/sdk/query"
import { PAY_TRACK, type ArkivEntity, type ArkivReceiptPayload } from "@/types/pay"

// Public client for reading - no auth needed
export const arkivPublicClient = createPublicClient({
  chain: braga,
  transport: http(),
})

export async function queryPayments(hotelId?: string): Promise<ArkivEntity[]> {
  try {
    let query = arkivPublicClient
      .buildQuery()
      .where(eq("track", PAY_TRACK))

    if (hotelId) {
      query = query.where(eq("hotelId", hotelId))
    }

    const result = await query
      .withPayload(true)
      .withAttributes(true)
      .orderBy("fecha", "number", "desc")
      .limit(50)
      .fetch()

    // Transform to our entity type
    return (result.entities || []).map((entity: any) => ({
      id: entity.id,
      txHash: entity.txHash,
      payload: entity.payload as ArkivReceiptPayload,
      attributes: entity.attributes || {},
      createdAt: entity.createdAt,
    }))
  } catch (error) {
    console.error("[Arkiv Read] Query failed:", error)
    return []
  }
}
