'use client'

import { useEffect, useState } from 'react'
import { ArrowDownLeft, Building2, ExternalLink, RefreshCw, Wallet, Wifi, WifiOff } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CURRENCIES,
  fmtArs,
  fmtUsdc,
  shortHash,
  type PaymentRecord,
} from '@/lib/saltapay'
import type { StellarPaymentReceipt, HotelStats } from '@/lib/stellar'
import { HotelPaymentRequest } from '@/components/hotel-payment-request'

function badgeFor(code: string) {
  return CURRENCIES.find((c) => c.code === code)?.badge ?? code.slice(0, 2)
}

function timeAgo(dateStr: string) {
  const ts = new Date(dateStr).getTime()
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'hace instantes'
  const m = Math.floor(s / 60)
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h} h`
  return new Date(ts).toLocaleDateString('es-AR')
}

interface HotelPanelProps {
  payments: PaymentRecord[]
  hotelPublicKey?: string
}

export function HotelPanel({ payments: localPayments, hotelPublicKey }: HotelPanelProps) {
  const [horizonPayments, setHorizonPayments] = useState<StellarPaymentReceipt[]>([])
  const [stats, setStats] = useState<HotelStats | null>(null)
  const [apiPublicKey, setApiPublicKey] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function fetchFromHorizon() {
    try {
      const response = await fetch('/api/payments')
      const data = await response.json()
      if (data.success) {
        setHorizonPayments(data.payments)
        setStats(data.stats)
        if (data.hotelPublicKey) {
          setApiPublicKey(data.hotelPublicKey)
        }
      }
    } catch (error) {
      console.error('[v0] Error fetching from Horizon:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchFromHorizon()
    // Poll every 10 seconds for new payments
    const interval = setInterval(fetchFromHorizon, 10000)
    return () => clearInterval(interval)
  }, [])

  // Refresh when local payments change (optimistic update)
  useEffect(() => {
    if (localPayments.length > 0) {
      fetchFromHorizon()
    }
  }, [localPayments.length])

  function handleRefresh() {
    setRefreshing(true)
    fetchFromHorizon()
  }

  // Combine local payments with horizon payments (local first for optimistic UI)
  const totalArs = localPayments.reduce((acc, p) => acc + p.arsReceived, 0) + (stats?.totalReceivedARS || 0)
  const totalUsdc = localPayments.reduce((acc, p) => acc + p.usdcNet, 0) + (horizonPayments.reduce((acc, p) => acc + parseFloat(p.destinationAmount), 0))
  const paymentCount = localPayments.length + horizonPayments.length

  const networkConnected = stats?.networkStatus === 'connected'
  const publicKey = apiPublicKey || hotelPublicKey || ''

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-balance text-2xl font-extrabold tracking-tight text-foreground">
          Hotel Cerro San Bernardo
        </h2>
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Building2 className="size-3.5" /> Panel del comercio
        </p>
      </div>

      {/* Balance hero */}
      <Card className="overflow-hidden border-none bg-primary p-0 text-primary-foreground">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-medium opacity-90">
              <Wallet className="size-4" /> Liquidado en pesos (ARS)
            </p>
            <Badge 
              variant="outline" 
              className={`border-primary-foreground/30 text-primary-foreground ${networkConnected ? 'bg-success/20' : 'bg-destructive/20'}`}
            >
              {networkConnected ? (
                <><Wifi className="mr-1 size-3" /> Conectado</>
              ) : (
                <><WifiOff className="mr-1 size-3" /> Desconectado</>
              )}
            </Badge>
          </div>
          <p className="mt-2 font-mono text-4xl font-semibold tracking-tight">
            ${fmtArs(totalArs)}
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <Badge className="border-none bg-primary-foreground/15 font-mono text-primary-foreground hover:bg-primary-foreground/15">
              {fmtUsdc(totalUsdc)} USDC
            </Badge>
            <span className="opacity-80">recibidos en {paymentCount} pagos</span>
          </div>
        </div>
        <div className="border-t border-primary-foreground/15 px-6 py-3 text-xs opacity-90">
          <a
            href={`https://stellar.expert/explorer/testnet/account/${publicKey}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:underline"
          >
            Wallet Stellar · {shortHash(publicKey)}
            <ExternalLink className="size-3" />
          </a>
          <span className="ml-2">· liquidación instantánea 24/7</span>
        </div>
      </Card>

      <HotelPaymentRequest />

      {/* Transactions */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Pagos recibidos (Horizon)
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-7 px-2"
            >
              <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Badge variant="secondary" className="font-mono">
              {paymentCount}
            </Badge>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <RefreshCw className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Consultando Horizon...</p>
          </div>
        ) : paymentCount === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <ArrowDownLeft className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Sin pagos todavía</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Pedile a un turista que realice un pago desde la pestaña{' '}
              <span className="font-semibold">Vista turista</span> y aparecerá aquí
              al instante consultando la blockchain.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {/* Local payments (optimistic) */}
            {localPayments.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success/12 text-success">
                  <ArrowDownLeft className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 min-w-7 items-center justify-center rounded-md bg-secondary px-1 text-[10px] font-bold text-secondary-foreground">
                      {badgeFor(p.origin)}
                    </span>
                    <p className="truncate text-sm font-semibold text-foreground">
                      {p.tourist}
                    </p>
                  </div>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${p.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs text-accent hover:underline"
                  >
                    {shortHash(p.txHash)}
                    <ExternalLink className="size-3" />
                    <span className="text-muted-foreground">· hace instantes</span>
                  </a>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold text-success">
                    +${fmtArs(p.arsReceived)}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {fmtUsdc(p.usdcNet)} USDC
                  </p>
                </div>
              </li>
            ))}
            {/* Horizon payments */}
            {horizonPayments.map((p) => (
              <li key={p.transactionHash} className="flex items-center gap-3 py-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success/12 text-success">
                  <ArrowDownLeft className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 min-w-7 items-center justify-center rounded-md bg-secondary px-1 text-[10px] font-bold text-secondary-foreground">
                      {badgeFor(p.sourceAsset)}
                    </span>
                    <p className="truncate text-sm font-semibold text-foreground">
                      {shortHash(p.sourceAccount)}
                    </p>
                    <Badge variant="outline" className="text-[10px]">Ledger #{p.ledgerNumber}</Badge>
                  </div>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${p.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs text-accent hover:underline"
                  >
                    {shortHash(p.transactionHash)}
                    <ExternalLink className="size-3" />
                    <span className="text-muted-foreground">· {timeAgo(p.createdAt)}</span>
                  </a>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold text-success">
                    +{p.destinationAmount} XLM
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {p.status === 'confirmed' ? 'Confirmado' : 'Fallido'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Datos en tiempo real desde{' '}
        <a
          href="https://horizon-testnet.stellar.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          Horizon Testnet
        </a>
        {' '}· El ledger es la base de datos
      </p>
    </div>
  )
}
