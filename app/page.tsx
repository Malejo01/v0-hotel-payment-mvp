'use client'

import { useState } from 'react'
import { Smartphone, Building2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SaltaPayHeader } from '@/components/saltapay-header'
import { TouristView } from '@/components/tourist-view'
import { HotelPanel } from '@/components/hotel-panel'
import { randomTxHash, type PaymentRecord } from '@/lib/saltapay'

const SEED_PAYMENTS: PaymentRecord[] = [
  {
    id: 'seed-1',
    tourist: 'tourist-eu-882',
    origin: 'EUR',
    originAmount: 138.89,
    usdcNet: 149.63,
    arsReceived: 187031,
    status: 'liquidado',
    timestamp: Date.now() - 1000 * 60 * 42,
    txHash: randomTxHash(),
  },
  {
    id: 'seed-2',
    tourist: 'tourist-us-104',
    origin: 'USD',
    originAmount: 80,
    usdcNet: 79.8,
    arsReceived: 99750,
    status: 'liquidado',
    timestamp: Date.now() - 1000 * 60 * 60 * 3,
    txHash: randomTxHash(),
  },
]

export default function Page() {
  const [payments, setPayments] = useState<PaymentRecord[]>(SEED_PAYMENTS)

  function handlePaymentComplete(record: PaymentRecord) {
    setPayments((prev) => [record, ...prev])
  }

  return (
    <div className="min-h-screen bg-background">
      <SaltaPayHeader />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Tabs defaultValue="tourist" className="w-full">
          <TabsList className="grid h-12 w-full grid-cols-2">
            <TabsTrigger value="tourist" className="gap-2 text-sm font-semibold">
              <Smartphone className="size-4" /> Vista turista
            </TabsTrigger>
            <TabsTrigger value="hotel" className="gap-2 text-sm font-semibold">
              <Building2 className="size-4" /> Panel hotel
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tourist" className="mt-6">
            <TouristView onPaymentComplete={handlePaymentComplete} />
          </TabsContent>
          <TabsContent value="hotel" className="mt-6">
            <HotelPanel payments={payments} />
          </TabsContent>
        </Tabs>

        <footer className="mt-10 border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            SaltaPay · Comisión 0,25% · Stablecoins sobre Stellar
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Hackathon Puna Tech — Salta Capital 2026
          </p>
        </footer>
      </main>
    </div>
  )
}
