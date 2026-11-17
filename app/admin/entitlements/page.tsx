import { redirect } from 'next/navigation'
import { adminHref } from '@/lib/admin-routes'

export default async function LegacyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const query = new URLSearchParams(Object.entries(params).flatMap(([key,value]) => value === undefined ? [] : (Array.isArray(value) ? value : [value]).map(v => [key,v])))
  redirect(adminHref('/admin/entitlements' + (query.size ? `?${query}` : '')))
}
