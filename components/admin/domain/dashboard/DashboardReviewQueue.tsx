import {AdminCard,AdminStatusBadge,AdminTh,adminSecondaryButtonClass,adminTableHeadClass} from '@/components/admin/AdminUi'
import {AdminDataTable} from '@/components/admin/data-display/AdminDataTable'
import {AdminErrorState} from '@/components/admin/feedback/AdminErrorState'
import Link from '@/components/admin/navigation/AdminLink'
import type {DashboardReviewQueueData} from '@/src/services/admin-dashboard.service'
import {ClipboardCheck} from 'lucide-react'

export default async function DashboardReviewQueue({program,track,queue}:{program:string;track:string;queue:DashboardReviewQueueData}) {
 const {data:review}=await queue
 if(!review)return <AdminErrorState noun="antrean review" retryHref={`/admin?${new URLSearchParams({program,track})}`}/>
 const href=(path:string,extra:Record<string,string>={})=>`${path}?${new URLSearchParams({program,track,...extra})}`
 return (
          <AdminCard>
            <AdminDataTable
              caption="Antrean review"
              className="min-w-[650px]"
              empty={
                !review?.questions.length
                  ? {
                      title: 'Tidak ada pekerjaan konten',
                      description: 'Antrean akan terisi saat soal dikirim untuk review.'
                    }
                  : undefined
              }
            >
              <thead className={adminTableHeadClass}>
                <tr>
                  {['Question', 'Taxonomy', 'Review State', 'Actions'].map((h) => (
                    <AdminTh key={h}>{h}</AdminTh>
                  ))}
                </tr>
              </thead>
              <tbody>
                {review?.questions.slice(0, 6).map((q) => (
                  <tr key={String(q.id)}>
                    <td className="max-w-md">
                      <p className="font-medium">{String(q.question_code)}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {String(q.stem).replace(/<[^>]*>/g, ' ')}
                      </p>
                    </td>
                    <td>
                      {review.subjectById.get(String(q.subject_id))?.name || 'Belum ditetapkan'}
                    </td>
                    <td>
                      <AdminStatusBadge status={q.status} />
                    </td>
                    <td>
                      <Link
                        className={adminSecondaryButtonClass}
                        href={href('/admin/content/review', { question: String(q.id) })}
                      >
                        <ClipboardCheck size={14} />
                        Buka Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </AdminDataTable>
          </AdminCard>
 )
}
