import Image from 'next/image'

export function SaltaPayHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Image 
            src="/logo.jpeg" 
            alt="SaltaPay Logo" 
            width={40} 
            height={40} 
            className="size-10 rounded-lg"
          />
          <div className="leading-tight">
            <p className="text-base font-extrabold tracking-tight text-foreground">
              SaltaPay
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              Pagos sobre Stellar
            </p>
          </div>
        </div>
        <div className="text-right leading-tight">
          <p className="text-xs font-medium text-muted-foreground">
            Hackathon Salta 2026
          </p>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
            <span className="size-1.5 rounded-full bg-success" aria-hidden />
            Stellar Testnet
          </p>
        </div>
      </div>
    </header>
  )
}
