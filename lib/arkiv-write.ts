import { createWalletClient, http } from "@arkiv-network/sdk"
import { braga } from "@arkiv-network/sdk/chains"
import { privateKeyToAccount } from "@arkiv-network/sdk/accounts"
import { jsonToPayload, ExpirationTime } from "@arkiv-network/sdk/utils"
import type { ArkivReceiptPayload } from "@/types/pay"
import { getEnvValue } from "@/lib/runtime-env"

// Server-only - creates wallet client with private key from env
function createArkivWalletClient() {
  const privateKey = getEnvValue("ARKIV_PRIVATE_KEY")
  if (!privateKey) {
    throw new Error("ARKIV_PRIVATE_KEY environment variable is required")
  }

  return createWalletClient({
    chain: braga,
    transport: http(),
    account: privateKeyToAccount(privateKey as `0x${string}`),
  })
}

export async function writeReceipt(payload: ArkivReceiptPayload): Promise<{
  txHash: string
  entityId: string
}> {
  const walletClient = createArkivWalletClient()
  const fechaTs = Date.parse(payload.fechaHora)

  const result = await walletClient.createEntity({
    payload: jsonToPayload(payload),
    contentType: "application/json",
    attributes: [
      { key: "track", value: payload.track },
      { key: "hotelId", value: payload.hotelId },
      { key: "localidad", value: payload.localidad },
      { key: "status", value: payload.status },
      { key: "rubro", value: payload.rubro },
      { key: "monedaOrigen", value: payload.monedaOrigen },
      { key: "fecha", value: payload.fechaHora },
      { key: "fechaTs", value: Number.isFinite(fechaTs) ? String(fechaTs) : String(Date.now()) },
    ],
    expiresIn: ExpirationTime.fromDays(365), // 1 year for demo
  })

  return {
    txHash: result.txHash,
    entityId: result.entityKey,
  }
}
