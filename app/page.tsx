"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TouristView } from "@/components/tourist/tourist-view"
import { HotelView } from "@/components/hotel/hotel-view"
import { Smartphone, Building2, Shield } from "lucide-react"

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">Puna Tech</h1>
              <p className="text-xs text-muted-foreground">Arkiv Payments</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-right">
            <p>Hackathon Salta 2026</p>
            <p className="text-sky-600">Braga Testnet</p>
          </div>
        </div>
      </header>

      {/* Main content with tabs */}
      <div className="container mx-auto max-w-6xl">
        <Tabs defaultValue="tourist" className="w-full">
          <div className="border-b bg-muted/30">
            <TabsList className="container mx-auto h-14 w-full justify-start rounded-none bg-transparent p-0">
              <TabsTrigger
                value="tourist"
                className="h-full rounded-none border-b-2 border-transparent px-6 data-[state=active]:border-sky-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Vista Turista
              </TabsTrigger>
              <TabsTrigger
                value="hotel"
                className="h-full rounded-none border-b-2 border-transparent px-6 data-[state=active]:border-sky-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Panel Hotel
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="tourist" className="mt-0">
            <div className="max-w-md mx-auto">
              <TouristView />
            </div>
          </TabsContent>

          <TabsContent value="hotel" className="mt-0">
            <HotelView />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t mt-auto py-4">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          <p>Puna Tech - Pagos turisticos con blockchain Arkiv</p>
          <p className="mt-1">
            Track: <code className="bg-muted px-1 py-0.5 rounded">salta-pay-tourist</code>
          </p>
        </div>
      </footer>
    </main>
  )
}
