import { randomUUID } from 'node:crypto'
import type { CurrencyCode } from '@/types/pay'

export type PaymentSessionStatus = 'draft' | 'opened' | 'completed' | 'expired'

export interface PaymentSession {
  sessionId: string
  hotelId: string
  hotelNombre: string
  localidad: string
  montoARS: number
  createdAt: string
  expiresAt: string
  status: PaymentSessionStatus
  sourceCurrency?: CurrencyCode
}

interface CreatePaymentSessionInput {
  hotelId: string
  hotelNombre: string
  localidad: string
  montoARS: number
  expiresInSeconds?: number
}

const DEFAULT_EXPIRY_SECONDS = 30 * 60
const sessionStore = new Map<string, PaymentSession>()

function cleanupExpiredSessions() {
  const now = Date.now()

  for (const [sessionId, session] of sessionStore.entries()) {
    if (Date.parse(session.expiresAt) <= now) {
      sessionStore.set(sessionId, { ...session, status: 'expired' })
      sessionStore.delete(sessionId)
    }
  }
}

export function createPaymentSession(input: CreatePaymentSessionInput): PaymentSession {
  cleanupExpiredSessions()

  const now = new Date()
  const expiresInSeconds = Math.max(input.expiresInSeconds ?? DEFAULT_EXPIRY_SECONDS, 60)
  const session: PaymentSession = {
    sessionId: randomUUID(),
    hotelId: input.hotelId,
    hotelNombre: input.hotelNombre,
    localidad: input.localidad,
    montoARS: input.montoARS,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + expiresInSeconds * 1000).toISOString(),
    status: 'draft',
  }

  sessionStore.set(session.sessionId, session)
  return session
}

export function getPaymentSession(sessionId: string): PaymentSession | null {
  cleanupExpiredSessions()
  const session = sessionStore.get(sessionId)

  if (!session) {
    return null
  }

  if (Date.parse(session.expiresAt) <= Date.now()) {
    sessionStore.delete(sessionId)
    return null
  }

  return session
}

export function markPaymentSessionOpened(sessionId: string): PaymentSession | null {
  const session = getPaymentSession(sessionId)
  if (!session) {
    return null
  }

  const updatedSession: PaymentSession = { ...session, status: 'opened' }
  sessionStore.set(sessionId, updatedSession)
  return updatedSession
}

export function completePaymentSession(sessionId: string, sourceCurrency?: CurrencyCode): PaymentSession | null {
  const session = getPaymentSession(sessionId)
  if (!session) {
    return null
  }

  const updatedSession: PaymentSession = {
    ...session,
    sourceCurrency: sourceCurrency ?? session.sourceCurrency,
    status: 'completed',
  }
  sessionStore.set(sessionId, updatedSession)
  return updatedSession
}
