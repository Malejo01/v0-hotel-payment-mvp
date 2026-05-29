'use client'

import { Suspense, useState } from 'react'
import { Smartphone, Building2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { SaltaPayHeader } from '@/components/saltapay-header'
import { TouristView } from '@/components/tourist-view'
import { HotelPanel } from '@/components/hotel-panel'
import type { PaymentRecord } from '@/lib/saltapay'

export default function Page() {
  const [payments, setPayments] = useState<PaymentRecord[]>([])

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
            <Suspense
              fallback={
                <Card className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">Abriendo checkout turista...</p>
                </Card>
              }
            >
              <TouristView onPaymentComplete={handlePaymentComplete} />
            </Suspense>
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
