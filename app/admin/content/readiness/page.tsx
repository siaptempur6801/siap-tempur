import {
  AdminCard,
  AdminEmptyState,
  AdminPage,
  AdminPageHeader,
  AdminStatusBadge,
  AdminTh,
  adminSecondaryButtonClass,
  adminTableHeadClass,
} from '@/components/admin/AdminUi'
import { AdminDataTable } from '@/components/admin/data-display/AdminDataTable'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import { PERMISSIONS } from '@/src/auth/permissions'
import { cpnsContentAudit } from '@/src/services/admin-content-readiness.service'
import { authorizationService } from '@/src/services/authorization.service'
import Link from '@/components/admin/navigation/AdminLink'
export const dynamic = 'force-dynamic'
export default async function ContentReadinessPage() {
  const actor = await authorizationService.requireAuthenticated()
  if (
    !actor.permissions.some((p) =>
      (
        [
          PERMISSIONS.QUESTION_MANAGE,
          PERMISSIONS.CONTENT_REVIEW,
          PERMISSIONS.PRODUCT_MANAGE,
          PERMISSIONS.EXAM_MANAGE,
        ] as string[]
      ).includes(p),
    )
  )
    return <AdminEmptyState title="Akses tidak tersedia" />
  const audit = await cpnsContentAudit()
  return (
    <AdminPage>
      <AdminBreadcrumbs items={[{ label: 'Konten' }, { label: 'Kesiapan konten CPNS' }]} />
      <AdminPageHeader
        title="Kesiapan konten"
        description={`Snapshot audit production CPNS · ${audit.date}. Angka ini berasal dari manifest review, bukan katalog live pada environment saat ini.`}
        action={
          actor.permissions.includes(PERMISSIONS.QUESTION_MANAGE) ? (
            <Link
              className={adminSecondaryButtonClass}
              href="/admin/content/questions?program=CPNS&track=SKD"
            >
              Bank soal
            </Link>
          ) : undefined
        }
      />
      <AdminCard>
        <h2 className="p-5 font-bold">Assessment</h2>
        <AdminDataTable className="w-full min-w-[650px] text-sm">
          <thead className={adminTableHeadClass}>
            <tr>
              {['Assessment', 'Disetujui', 'Aset terblokir', 'Perlu review', 'Kesiapan'].map(
                (c) => (
                  <AdminTh key={c}>{c}</AdminTh>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {audit.assessments.map((a) => (
              <tr key={a.name}>
                <td className="px-5 py-4 font-semibold">{a.name}</td>
                <td className="px-4">
                  {a.approved} / {a.total}
                </td>
                <td className="px-4">{a.blockedAsset}</td>
                <td className="px-4">{a.needsReview}</td>
                <td className="px-5">
                  <AdminStatusBadge
                    status={a.approved === a.total && a.frozen ? 'ready' : 'unavailable'}
                    label={a.approved === a.total && a.frozen ? 'READY' : 'HOLD'}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </AdminDataTable>
        <p className="p-5 text-sm text-muted-foreground">
          READY menunjukkan manifest konten siap. Aktivasi assessment dan produk tetap memerlukan
          konfigurasi, Technical QA, dan uji peserta yang disetujui.
        </p>
      </AdminCard>
      <AdminCard>
        <div className="p-5">
          <h2 className="font-bold">
            Drill · {audit.readyNodes} / {audit.totalNodes} materi siap
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {audit.totalNodes - audit.nodes.length} materi lainnya belum memiliki manifest kesiapan
            dan belum dapat dinyatakan siap. Materi parsial tersedia sebagai konten terbatas. Cakupan
            drill tetap HOLD sampai seluruh materi memenuhi gate.
          </p>
        </div>
        <AdminDataTable className="w-full min-w-[650px] text-sm">
          <thead className={adminTableHeadClass}>
            <tr>
              {['Materi', 'Disetujui', 'Status', 'Langkah berikutnya'].map((c) => (
                <AdminTh key={c}>{c}</AdminTh>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {audit.nodes.map((n) => (
              <tr key={n.node_code}>
                <td className="px-5 py-4 font-semibold">{n.node_name}</td>
                <td className="px-4">{n.approved_unique_questions} / 30</td>
                <td className="px-4">
                  <AdminStatusBadge
                    status={n.state === 'FROZEN_V1_READY' ? 'ready' : 'unavailable'}
                    label={n.state === 'FROZEN_V1_READY' ? 'READY' : 'UNAVAILABLE'}
                  />
                </td>
                <td className="px-5 text-xs text-muted-foreground">
                  {n.state === 'FROZEN_V1_READY'
                    ? 'Konfigurasi assessment dan validasi uji peserta.'
                    : 'Lengkapi konten dan review sebelum digunakan.'}
                </td>
              </tr>
            ))}
          </tbody>
        </AdminDataTable>
        <p className="p-5 text-sm text-warning">
          Aset terblokir: aset belum tersedia untuk production. Perbaiki aset melalui alur review,
          kemudian verifikasi versi konten.
        </p>
      </AdminCard>
    </AdminPage>
  )
}
