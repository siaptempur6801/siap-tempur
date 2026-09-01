import Link from 'next/link'
import {
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    FilePlus2,
    FileQuestion,
    Package,
    RefreshCcw,
} from 'lucide-react'
import {
    AdminBadge,
    AdminCard,
    AdminMetric,
    AdminPageHeader,
    AdminSectionHeading,
    adminPrimaryButtonClass,
    adminSecondaryButtonClass,
} from '@/components/admin/AdminUi'
import { adminV2Service } from '@/src/services/admin-v2.service'
import { contentReviewService } from '@/src/services/content-review.service'
import { authorizationService } from '@/src/services/authorization.service'
import { PERMISSIONS } from '@/src/auth/permissions'

type SearchParams = { program?: string; track?: string }
type Row = Record<string, unknown>

function s(value: unknown) {
    return value == null ? '' : String(value)
}

function lower(value: unknown) {
    return s(value).toLowerCase()
}

function statusVariant(value: unknown): 'neutral' | 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'violet' {
    switch (lower(value)) {
        case 'published':
        case 'approved':
        case 'active': return 'green'
        case 'submitted':
        case 'editorial_review': return 'yellow'
        case 'academic_review': return 'violet'
        case 'technical_qa': return 'blue'
        case 'revision_required': return 'orange'
        case 'rejected':
        case 'failed': return 'red'
        default: return 'neutral'
    }
}

function prettyStatus(value: unknown) {
    const raw = lower(value)
    const labels: Record<string, string> = {
        draft: 'Draft',
        submitted: 'Editorial Review',
        editorial_review: 'Editorial Review',
        academic_review: 'Academic Review',
        technical_qa: 'Technical QA',
        revision_required: 'Perlu Revisi',
        approved: 'Approved',
        published: 'Published',
        rejected: 'Rejected',
        active: 'Active',
    }
    return labels[raw] || s(value) || 'Unknown'
}

function contextHref(path: string, program: string, track: string, extra?: Record<string, string>) {
    const params = new URLSearchParams({ program, track, ...extra })
    return `${path}?${params.toString()}`
}

export default async function AdminOverview({ params }: { params: SearchParams }) {
    await authorizationService.requirePermission(PERMISSIONS.ADMIN_ACCESS)
    const context = {
        programCode: (params.program || 'CPNS').toUpperCase(),
        trackCode: (params.track || 'SKD').toUpperCase(),
    }

    const [review, workspace] = await Promise.all([
        contentReviewService.getWorkspaceData(context),
        adminV2Service.getWorkspaceData(context),
    ])

    const program = review.catalog.program.code
    const track = review.catalog.track.code
    const questions = review.questions as Row[]
    const editorial = questions.filter((row) => ['submitted', 'editorial_review'].includes(lower(row.status))).length
    const academic = questions.filter((row) => lower(row.status) === 'academic_review').length
    const technical = questions.filter((row) => lower(row.status) === 'technical_qa').length
    const revision = questions.filter((row) => lower(row.status) === 'revision_required').length
    const needsAttention = editorial + academic + technical + revision
    const activeExams = workspace.exams.filter((row) => lower(row.status) === 'active').length
    const draftExams = workspace.exams.filter((row) => lower(row.status) === 'draft').length
    const activeProducts = workspace.products.filter((row) => lower(row.status) === 'active').length
    const draftProducts = workspace.products.filter((row) => lower(row.status) === 'draft').length
    const activeEvents = workspace.events.filter((row) => ['active', 'published', 'registration_open'].includes(lower(row.status))).length
    const queue = questions.filter((row) => ['submitted', 'editorial_review', 'academic_review', 'technical_qa', 'revision_required'].includes(lower(row.status))).slice(0, 6)

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Dashboard"
                description={`Ringkasan operasional ${program} / ${track}. Prioritaskan pekerjaan yang menunggu tindakan sebelum membuka modul lain.`}
                action={<Link href={contextHref('/admin/content/review', program, track, { new: '1' })} className={adminPrimaryButtonClass}><FilePlus2 size={16}/>Buat soal</Link>}
            />

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <AdminMetric label="Perlu perhatian" value={needsAttention} helper="Review + revisi" icon={<RefreshCcw size={18}/>} tone={needsAttention ? 'red' : 'green'}/>
                <AdminMetric label="Editorial" value={editorial} helper="Menunggu editorial" icon={<Clock3 size={18}/>} tone="yellow"/>
                <AdminMetric label="Academic" value={academic} helper="Menunggu akademik" icon={<ClipboardCheck size={18}/>} tone="violet"/>
                <AdminMetric label="Technical QA" value={technical} helper="Menunggu QA" icon={<CheckCircle2 size={18}/>} tone="blue"/>
                <AdminMetric label="Perlu revisi" value={revision} helper="Kembali ke author" icon={<RefreshCcw size={18}/>} tone="orange"/>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.7fr)]">
                <AdminCard className="overflow-hidden">
                    <div className="border-b border-slate-200 p-5">
                        <AdminSectionHeading
                            title="Review queue"
                            description="Pekerjaan content yang paling baru dan membutuhkan tindakan."
                            action={<Link className="text-sm font-extrabold text-blue-600 hover:text-blue-700" href={contextHref('/admin/content/review', program, track)}>Lihat semua →</Link>}
                        />
                    </div>
                    {queue.length ? (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-left text-sm">
                                <thead className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                                    <tr><th className="px-5 py-3">Soal</th><th className="px-4 py-3">Mata pelajaran</th><th className="px-4 py-3">Tahap</th><th className="px-4 py-3">Versi</th><th className="px-5 py-3 text-right">Aksi</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {queue.map((row) => {
                                        const subject = review.subjectById.get(s(row.subject_id))
                                        return (
                                            <tr key={s(row.id)} className="transition hover:bg-slate-50/70">
                                                <td className="px-5 py-4"><div className="font-extrabold text-slate-900">{s(row.question_code) || 'Tanpa kode'}</div><div className="mt-1 max-w-md truncate text-xs font-medium text-slate-500">{s(row.stem)}</div></td>
                                                <td className="px-4 py-4 font-semibold text-slate-600">{subject?.name || subject?.code || '—'}</td>
                                                <td className="px-4 py-4"><AdminBadge variant={statusVariant(row.status)}>{prettyStatus(row.status)}</AdminBadge></td>
                                                <td className="px-4 py-4 font-bold text-slate-500">v{s(row.version) || '1'}</td>
                                                <td className="px-5 py-4 text-right"><Link className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-600 hover:text-blue-700" href={contextHref('/admin/content/review', program, track, { question: s(row.id) })}>Buka <ArrowRight size={14}/></Link></td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : <div className="p-8 text-center text-sm font-semibold text-slate-500">Tidak ada content yang membutuhkan tindakan untuk context ini.</div>}
                </AdminCard>

                <div className="space-y-6">
                    <AdminCard className="p-5">
                        <AdminSectionHeading title="Context aktif" description="Semua modul mengikuti program dan track ini."/>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-xl bg-blue-50 p-3"><div className="text-[11px] font-bold uppercase tracking-wide text-blue-500">Program</div><div className="mt-1 text-lg font-black text-blue-950">{program}</div></div>
                            <div className="rounded-xl bg-violet-50 p-3"><div className="text-[11px] font-bold uppercase tracking-wide text-violet-500">Track</div><div className="mt-1 text-lg font-black text-violet-950">{track}</div></div>
                        </div>
                    </AdminCard>
                    <AdminCard className="p-5">
                        <AdminSectionHeading title="Quick actions" description="Jalur tercepat ke pekerjaan yang paling sering dilakukan."/>
                        <div className="mt-4 grid gap-2">
                            <Link href={contextHref('/admin/content/review', program, track)} className={adminSecondaryButtonClass}><ClipboardCheck size={16}/>Buka review queue</Link>
                            <Link href={contextHref('/admin/content/questions', program, track)} className={adminSecondaryButtonClass}><FileQuestion size={16}/>Question bank</Link>
                            <Link href={contextHref('/admin/assessment/exams', program, track)} className={adminSecondaryButtonClass}><CalendarDays size={16}/>Kelola exam</Link>
                            <Link href={contextHref('/admin/commerce/products', program, track)} className={adminSecondaryButtonClass}><Package size={16}/>Kelola product</Link>
                        </div>
                    </AdminCard>
                </div>
            </div>

            <section className="grid gap-4 md:grid-cols-3">
                <AdminCard className="p-5"><div className="flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Content</div><div className="mt-1 text-lg font-black">{questions.length} soal termuat</div></div><FileQuestion className="text-blue-500" size={22}/></div><div className="mt-4 flex flex-wrap gap-2"><AdminBadge variant="green">{review.counts.published} published</AdminBadge><AdminBadge variant="green">{review.counts.approved} approved</AdminBadge><AdminBadge variant="orange">{review.counts.revisionRequired} revisi</AdminBadge></div></AdminCard>
                <AdminCard className="p-5"><div className="flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Assessment</div><div className="mt-1 text-lg font-black">{workspace.exams.length} exam</div></div><CalendarDays className="text-violet-500" size={22}/></div><div className="mt-4 flex flex-wrap gap-2"><AdminBadge variant="green">{activeExams} active</AdminBadge><AdminBadge>{draftExams} draft</AdminBadge><AdminBadge variant="blue">{activeEvents} event aktif</AdminBadge></div></AdminCard>
                <AdminCard className="p-5"><div className="flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Commerce</div><div className="mt-1 text-lg font-black">{workspace.products.length} product</div></div><Package className="text-emerald-500" size={22}/></div><div className="mt-4 flex flex-wrap gap-2"><AdminBadge variant="green">{activeProducts} active</AdminBadge><AdminBadge>{draftProducts} draft</AdminBadge><AdminBadge variant="blue">{workspace.orders.length} order terbaru</AdminBadge></div></AdminCard>
            </section>
        </div>
    )
}
