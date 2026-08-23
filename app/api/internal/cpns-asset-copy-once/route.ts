import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EDGE_URL = 'https://lpgrivowdcepcxradavu.supabase.co/functions/v1/cpns-legacy-asset-copy-once'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'missing token' }, { status: 400 })

  const response = await fetch(`${EDGE_URL}?token=${encodeURIComponent(token)}`, {
    method: 'GET',
    cache: 'no-store',
  })
  const body = await response.text()
  return new NextResponse(body, {
    status: response.status,
    headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
  })
}
