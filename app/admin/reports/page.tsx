import { redirect } from 'next/navigation'
import { Award, BarChart3, CalendarDays, CreditCard, FileQuestion, TrendingUp, Users } from 'lucide-react'
import {
    AdminCard,
    AdminHint,
    AdminMetric,
    AdminPage,
    AdminPageHeader,
    AdminSectionHeading,
    adminSecondaryButtonClass,
} from '@/components/admin/AdminUi'
import Link from 'next/link'
import { formatRupiah, formatNumber } from '@/lib/admin-format'
import { PERMISSIONS } from '@/src/auth/permissions'
import { authorizationService } from '@/src/services/authorization.service'
import { adminDirectoryService, type ReportSection } from '@/src/services/admin-directory.service'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Reports.
 *
 * Ini permukaan pertama yang dimiliki `SCHOOL_ADMIN` (`report.read`) — dan
 * sekaligus satu-satunya. Sebelum halaman ini ada, peran itu tidak punya
 * halaman apa pun: tanpa `admin.access` dan tanpa permission content, ia
 * dilempar diam-diam ke dashboard peserta.
 *
 * `FINANCE` juga memakai halaman ini (`report.read`), jadi angka order dan
 * pendapatan ditampilkan lebih dulu untuk peran yang memang mengurusnya —
 * urutan kartu mengikuti permission pemakainya.
 */

type SearchParams = { program?: string; track?: string }

/**
 * Label kunci RPC `admin_report_overview` dalam bahasa operasional.
 * Kunci di luar peta ini jatuh ke versi humanized (underscore → spasi).
 */
const REPORT_KEY_LABELS: Record<string, string> = {
    total: 'Total',
    active: 'Aktif',
    onboarded: 'Selesai onboarding',
    new_last_30d: 'Baru 30 hari terakhir',
    last_30d: '30 hari terakhir',
    in_progress: 'Sedang mengerjakan',
    completed: 'Selesai',
    registrations: 'Pendaftaran',
    paid: 'Lunas',
    pending: 'Menunggu bayar',
    revenue_paid: 'Pendapatan lunas',
    questions_total: 'Soal total',
    questions_published: 'Soal terbit',
    questions_draft: 'Soal draft',
    awaiting_review: 'Menunggu review',
    articles_published: 'Artikel terbit',
}

function reportKeyLabel(key: string) {
    return REPORT_KEY_LABELS[key] ?? key.replace(/_/g, ' ')
}

function ReportGrid({ section, hiddenKeys = [] }: { section: ReportSection; hiddenKeys?: string[] }) {
    const entries = Object.entries(section).filter(([key]) => !hiddenKeys.includes(key))
    if (entries.length === 0) return null
    return (
        <dl className="grid grid-cols-2 gap-3">
            {entries.map(([key, value]) => (
                <div key={key} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                    <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{reportKeyLabel(key)}</dt>
                    <dd className="mt-1 text-lg font-black text-slate-900">{formatNumber(value)}</dd>
                </div>
            ))}
        </dl>
    )
}

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams
    const authorization = await authorizationService.requireAuthenticated()
    const permissions = new Set(authorization.permissions)

    if (!permissions.has(PERMISSIONS.REPORT_READ)) {
        redirect('/cpns/dashboard?admin=no-access')
    }

    const context = {
        programCode: (params.program || 'CPNS').toUpperCase(),
        trackCode: (params.track || 'SKD').toUpperCase(),
    }
    const report = await adminDirectoryService.getReportOverview(context)

    const canCommerce = permissions.has(PERMISSIONS.ORDER_READ) || permissions.has(PERMISSIONS.PAYMENT_MANAGE)
    const canContent = permissions.has(PERMISSIONS.CONTENT_READ) || permissions.has(PERMISSIONS.QUESTION_MANAGE)
    const canAssessment = permissions.has(PERMISSIONS.EXAM_MANAGE) || permissions.has(PERMISSIONS.EVENT_MANAGE)
    const canPeople = permissions.has(PERMISSIONS.USER_READ) || permissions.has(PERMISSIONS.USER_MANAGE)

    // Kartu utama mengikuti pekerjaan pemakainya: FINANCE membuka halaman ini
    // untuk order, SCHOOL_ADMIN untuk gambaran umum, ADMIN untuk content.
    const primaryCards = [
        canCommerce ? { label: 'Order lunas', value: report.orders.paid ?? 0, helper: `${formatNumber(report.orders.total ?? 0)} order total`, icon: <CreditCard size={18}/>, tone: 'green' as const } : null,
        canCommerce ? { label: 'Pendapatan', value: formatRupiah(report.orders.revenue_paid ?? 0), helper: 'Dari order berstatus paid', icon: <TrendingUp size={18}/>, tone: 'green' as const } : null,
        canContent ? { label: 'Soal terbit', value: report.content.questions_published ?? 0, helper: `${formatNumber(report.content.questions_total ?? 0)} soal total`, icon: <FileQuestion size={18}/>, tone: 'blue' as const } : null,
        canContent ? { label: 'Menunggu review', value: report.content.awaiting_review ?? 0, helper: 'Perlu tindakan reviewer', icon: <BarChart3 size={18}/>, tone: (report.content.awaiting_review ?? 0) > 0 ? 'orange' as const : 'green' as const } : null,
        canAssessment ? { label: 'Event aktif', value: report.events.active ?? 0, helper: `${formatNumber(report.events.registrations ?? 0)} pendaftaran`, icon: <CalendarDays size={18}/>, tone: 'violet' as const } : null,
        canPeople ? { label: 'Pengguna aktif', value: report.users.active ?? 0, helper: `${formatNumber(report.users.new_last_30d ?? 0)} baru 30 hari`, icon: <Users size={18}/>, tone: 'blue' as const } : null,
        { label: 'Sertifikat terbit', value: report.certificates.total ?? 0, helper: `${formatNumber(report.certificates.last_30d ?? 0)} dalam 30 hari`, icon: <Award size={18}/>, tone: 'green' as const },
        { label: 'Attempt selesai', value: report.attempts.completed ?? 0, helper: `${formatNumber(report.attempts.total ?? 0)} attempt total`, icon: <TrendingUp size={18}/>, tone: 'neutral' as const },
    ].filter(Boolean) as Array<{ label: string; value: number | string; helper: string; icon: React.ReactNode; tone: 'green' | 'blue' | 'orange' | 'violet' | 'neutral' }>

    return (
        <AdminPage>
            <AdminPageHeader
                title="Reports"
                description={`Ringkasan lintas modul untuk ${report.context.program} / ${report.context.track}. Angka dihitung langsung dari tabel sumber, bukan dari tabel ringkasan yang bisa basi.`}
                steps={['Baca kartu utama sesuai peran Anda', 'Cek rincian per area di bawah', 'Baca catatan pembacaan agar angka tidak disalahartikan']}
            />

            {!report.context.resolved ? (
                <AdminHint tone="amber">
                    Kombinasi {report.context.program} / {report.context.track} tidak ditemukan di katalog. Angka di bawah tetap global, tetapi rincian per program/track mungkin tidak tepat.
                </AdminHint>
            ) : null}

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {primaryCards.map((card) => <AdminMetric key={card.label} label={card.label} value={card.value} helper={card.helper} icon={card.icon} tone={card.tone}/>)}
            </section>

            <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                <AdminCard className="p-5">
                    <AdminSectionHeading title="Pengguna" description="Pertumbuhan dan status akun."/>
                    <div className="mt-4"><ReportGrid section={report.users}/></div>
                </AdminCard>

                <AdminCard className="p-5">
                    <AdminSectionHeading title="Pengerjaan" description="Attempt ujian lintas modul."/>
                    <div className="mt-4"><ReportGrid section={report.attempts}/></div>
                </AdminCard>

                <AdminCard className="p-5">
                    <AdminSectionHeading title="Konten" description="Status bank soal dan artikel."/>
                    <div className="mt-4"><ReportGrid section={report.content}/></div>
                </AdminCard>

                <AdminCard className="p-5">
                    <AdminSectionHeading title="Order & pendapatan" description="Status pembayaran dan nilai transaksi."/>
                    <div className="mt-4 space-y-3">
                        <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
                            <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-600">Pendapatan lunas</div>
                            <div className="mt-1 text-xl font-black text-emerald-900">{formatRupiah(report.orders.revenue_paid ?? 0)}</div>
                        </div>
                        {/* `revenue_paid` sudah dirender di kotak emerald di atas —
                            semula ia diselamatkan dengan nilai 0 dan justru muncul
                            sebagai tile hantu "revenue paid 0" di grid. */}
                        <ReportGrid section={report.orders} hiddenKeys={['revenue_paid']}/>
                    </div>
                </AdminCard>

                <AdminCard className="p-5">
                    <AdminSectionHeading title="Event" description="Event dan pendaftaran peserta."/>
                    <div className="mt-4"><ReportGrid section={report.events}/></div>
                </AdminCard>

                <AdminCard className="p-5">
                    <AdminSectionHeading title="Sertifikat" description="Sertifikat yang sudah diterbitkan."/>
                    <div className="mt-4"><ReportGrid section={report.certificates}/></div>
                </AdminCard>
            </div>

            <AdminCard className="p-5">
                <AdminSectionHeading title="Catatan pembacaan" description="Supaya angka tidak disalahartikan."/>
                <ul className="mt-3 space-y-2 text-xs font-medium leading-6 text-slate-500">
                    <li>• <b className="text-slate-700">Pengerjaan</b> dihitung dari <code className="font-mono">exam_attempts</code>, mencakup seluruh program — bukan hanya context aktif.</li>
                    <li>• <b className="text-slate-700">Pendapatan</b> hanya menjumlahkan order berstatus <code className="font-mono">paid</code>; order pending dan gagal tidak dihitung.</li>
                    <li>• <b className="text-slate-700">Konten</b> menghitung soal lintas program, sedangkan <i>menunggu review</i> memakai status workflow aktif.</li>
                    <li>• Sertifikat memakai <code className="font-mono">issued_at</code>, bukan tanggal dibuatnya baris.</li>
                </ul>
                {permissions.has(PERMISSIONS.AUDIT_READ) ? (
                    <Link href="/admin/audit" className={`${adminSecondaryButtonClass} mt-4`}>Buka audit log</Link>
                ) : null}
            </AdminCard>

            <AdminHint>
                Halaman ini memerlukan permission <code className="font-mono">report.read</code>. Angka yang tidak termasuk wewenang peran Anda tidak ditampilkan sebagai kartu utama.
            </AdminHint>
        </AdminPage>
    )
}
