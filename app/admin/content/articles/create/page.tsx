import { redirect } from 'next/navigation'
import { adminHref } from '@/lib/admin-routes'
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const q = new URLSearchParams(await searchParams)
  redirect(adminHref(`/admin/content/articles/create?${q}`))
}
