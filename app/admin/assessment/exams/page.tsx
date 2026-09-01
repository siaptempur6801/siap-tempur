import AdminExamsWorkspace, { type AdminExamsSearchParams } from '@/app/admin/assessment/exams/AdminExamsWorkspace'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ExamsRoute({ searchParams }: { searchParams: Promise<AdminExamsSearchParams> }) {
  const params = await searchParams
  return <AdminExamsWorkspace searchParams={Promise.resolve({ ...params, program: params.program || 'CPNS', track: params.track || 'SKD' })}/>
}
