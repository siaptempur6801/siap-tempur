import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      error: 'legacy_export_retired',
      message:
        'Export operasional Schema V2 belum tersedia. Endpoint export legacy sudah dinonaktifkan.',
    },
    {
      status: 410,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
