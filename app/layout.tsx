import type { Metadata, Viewport } from 'next'
import { Manrope, IBM_Plex_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SaltaPay — Pagos en stablecoin para el turismo de Salta',
  description:
    'SaltaPay permite a los turistas pagar en su moneda de origen y a los comercios de Salta recibir pesos al instante, con stablecoins sobre la red Stellar. Rápido, seguro y sin intermediarios bancarios.',
  generator: 'v0.app',
  keywords: [
    'SaltaPay',
    'Stellar',
    'USDC',
    'stablecoin',
    'pagos',
    'Salta',
    'turismo',
    'cripto',
  ],
  openGraph: {
    title: 'SaltaPay — Pagos en stablecoin para el turismo de Salta',
    description:
      'Pagá en tu moneda, el hotel recibe pesos al instante. Stablecoins sobre Stellar.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#b8542e',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="bg-background">
      <body className={`${manrope.variable} ${plexMono.variable} font-sans antialiased`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
