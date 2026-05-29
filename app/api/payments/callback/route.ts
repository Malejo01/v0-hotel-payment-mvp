import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? 'pending'
  const tx = searchParams.get('tx') ?? searchParams.get('transaction_hash') ?? ''

  return NextResponse.json({
    success: true,
    status,
    transactionHash: tx || null,
    message: 'SEP-7 callback received',
  })
}

export async function POST(request: NextRequest) {
  let body: unknown = null

  try {
    body = await request.json()
  } catch {
    body = null
  }

  return NextResponse.json({
    success: true,
    body,
    message: 'SEP-7 callback received',
  })
}
