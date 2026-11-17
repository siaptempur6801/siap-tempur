import { PERMISSIONS } from '@/src/auth/permissions'
import { getAdminMonitoringSummary,type MonitoringParams } from '@/src/services/admin-monitoring.service'
import { authorizationService } from '@/src/services/authorization.service'
import { NextResponse } from 'next/server'
export const dynamic='force-dynamic'
export async function GET(request:Request) {
 try {
  await authorizationService.requirePermission(PERMISSIONS.REPORT_READ)
  const params=Object.fromEntries(new URL(request.url).searchParams) as MonitoringParams
  const data=await getAdminMonitoringSummary(params,true)
  if(!data.report) throw new Error('Reports tidak tersedia.')
  const report=data.report
  const escape=(v:unknown)=>`"${String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')}"`
  const rows=[['Workspace',data.context.title],['Batch',data.context.batch?.name || ''],['Assessment',data.context.assignment?.exam_title || ''],['Peserta',data.summary.total],['Belum mulai',data.summary.notStarted],['Sedang mengerjakan',data.summary.inProgress],['Selesai',data.summary.completed],['Completion (%)',report.completionRate],['Hasil dengan skor',report.scored],...report.bands.map(b=>[b.label,b.count])]
  return new NextResponse('\uFEFF'+[['Metric','Value'],...rows].map(row=>row.map(escape).join(',')).join('\r\n'),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="monitoring-report.csv"','Cache-Control':'private, no-store'}})
 }catch{return NextResponse.json({error:'Gagal mengekspor laporan distribusi.'},{status:403})}
}
