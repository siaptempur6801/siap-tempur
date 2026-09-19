import Link from 'next/link'
import {
    ArrowRight,
    BarChart3,
    CalendarDays,
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    CreditCard,
    FilePlus2,
    FileQuestion,
    Package,
    RefreshCcw,
    Users,
} from 'lucide-react'
import {
    AdminBadge,
    AdminCard,
    AdminEmptyState,
    AdminMetric,
    AdminPageHeader,
    AdminSectionHeading,
    adminPrimaryButtonClass,
    adminSecondaryButtonClass,
} from '@/components/admin/AdminUi'
import { adminV2Service, type WorkspaceSection } from '@/src/services/admin-v2.service'
import { contentReviewService } from '@/src/services/content-review.service'
import { authorizationService } from '@/src/services/authorization.service'
import { PERMISSIONS } from '@/src/auth/permissions'

/**
 * Dashboard Admin Workspace.
 *
 * ## Kenapa sadar-peran
 *
 * Dashboard ini dulu SELALU memuat ringkasan content dan SELURUH domain
 * (`getWorkspaceData` tanpa argumen `sections`) untuk siapa pun yang punya
 * `admin.access`. Padahal `FINANCE` dan `SUPPORT` juga punya `admin.access`:
 *
 * - keduanya melihat metrik Editorial/Academic/Technical QA yang bukan
 *   pekerjaannya, dan angka yang bagi mereka selalu nol;
 * - keduanya menunggu query soal + seluruh opsinya, exam, event, product, order,
 *   dan payment yang tidak satu pun ditampilkan;
 * - "Quick actions" menawarkan Question Bank, Exams, dan Products yang semuanya
 *   berujung "Akses tidak tersedia".
 *
 * Sekarang setiap section dirender hanya bila permission-nya dimiliki, dan query
 * untuk section yang tidak dirender TIDAK dijalankan sama sekali.
 */

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

const CONTENT_PERMISSIONS = [
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_UPDATE,
    PERMISSIONS.CONTENT_REVIEW,
    PERMISSIONS.CONTENT_PUBLISH,
    PERMISSIONS.QUESTION_MANAGE,
]

export default async function AdminOverview({ params }: { params: SearchParams }) {
    const authorization = await authorizationService.requirePermission(PERMISSIONS.ADMIN_ACCESS)
    const permissions = new Set(authorization.permissions)

    const canContent = CONTENT_PERMISSIONS.some((permission) => permissions.has(permission))
    const canReviewQueue = CONTENT_PERMISSIONS.some((permission) => permissions.has(permission))
    const canQuestionBank = permissions.has(PERMISSIONS.QUESTION_MANAGE)
    const canExams = permissions.has(PERMISSIONS.EXAM_MANAGE)
    const canEvents = permissions.has(PERMISSIONS.EVENT_MANAGE)
    const canProducts = permissions.has(PERMISSIONS.PRODUCT_MANAGE)
    const canCommerce = permissions.has(PERMISSIONS.ORDER_READ) || permissions.has(PERMISSIONS.PAYMENT_MANAGE)
    const canPeople = permissions.has(PERMISSIONS.USER_READ) || permissions.has(PERMISSIONS.USER_MANAGE)
    const canReports = permissions.has(PERMISSIONS.REPORT_READ)

    const context = {
        programCode: (params.program || 'CPNS').toUpperCase(),
        trackCode: (params.track || 'SKD').toUpperCase(),
    }

    // Hanya minta domain yang benar-benar akan dirender. Sebelumnya seluruh
    // domain dimuat tanpa argumen `sections`.
    const wantedSections: WorkspaceSection[] = []
    if (canProducts) wantedSections.push('products')
    if (canExams) wantedSections.push('exams')
    if (canEvents) wantedSections.push('events')
    if (canCommerce) wantedSections.push('commerce')

    const [review, workspace] = await Promise.all([
        // Ringkasan ringan: dashboard hanya butuh angka status, 6 baris review
        // queue, dan peta subjek. `getWorkspaceData` akan ikut menarik 250 soal
        // lengkap + seluruh content_reviews + RPC detail satu soal, yang tidak
        // satu pun dipakai di sini.
        canContent ? contentReviewService.getReviewSummary(context) : null,
        wantedSections.length ? adminV2Service.getWorkspaceData(context, wantedSections) : null,
    ])

    const program = review?.catalog.program.code ?? context.programCode
    const track = review?.catalog.track.code ?? context.trackCode
    const questions = (review?.questions ?? []) as Row[]
    const editorial = questions.filter((row) => ['submitted', 'editorial_review'].includes(lower(row.status))).length
    const academic = questions.filter((row) => lower(row.status) === 'academic_review').length
    const technical = questions.filter((row) => lower(row.status) === 'technical_qa').length
    const revision = questions.filter((row) => lower(row.status) === 'revision_required').length
    const needsAttention = editorial + academic + technical + revision
    const exams = workspace?.exams ?? []
    const products = workspace?.products ?? []
    const events = workspace?.events ?? []
    const orders = workspace?.orders ?? []
    const activeExams = exams.filter((row) => lower(row.status) === 'active').length
    const draftExams = exams.filter((row) => lower(row.status) === 'draft').length
    const activeProducts = products.filter((row) => lower(row.status) === 'active').length
    const draftProducts = products.filter((row) => lower(row.status) === 'draft').length
    const activeEvents = events.filter((row) => ['active', 'published', 'registration_open'].includes(lower(row.status))).length
    const queue = questions.filter((row) => ['submitted', 'editorial_review', 'academic_review', 'technical_qa', 'revision_required'].includes(lower(row.status))).slice(0, 6)

    const quickActions = [
        canReviewQueue ? { href: contextHref('/admin/content/review', program, track), label: 'Buka review queue', icon: ClipboardCheck } : null,
        canQuestionBank ? { href: contextHref('/admin/content/questions', program, track), label: 'Question bank', icon: FileQuestion } : null,
        canExams ? { href: contextHref('/admin/assessment/exams', program, track), label: 'Kelola exam', icon: CalendarDays } : null,
        canProducts ? { href: contextHref('/admin/commerce/products', program, track), label: 'Kelola product', icon: Package } : null,
        canCommerce ? { href: contextHref('/admin/commerce', program, track), label: 'Order & pembayaran', icon: CreditCard } : null,
        canPeople ? { href: '/admin/users', label: 'Kelola pengguna', icon: Users } : null,
        canReports ? { href: contextHref('/admin/reports', program, track), label: 'Lihat laporan', icon: BarChart3 } : null,
    ].filter(Boolean) as Array<{ href: string; label: string; icon: typeof ClipboardCheck }>

    const summaryCards = [
        canContent ? { title: 'Content', headline: `${questions.length} soal termuat`, icon: FileQuestion, tone: 'text-blue-500', badges: [
            { variant: 'green' as const, text: `${review?.counts.published ?? 0} published` },
            { variant: 'green' as const, text: `${review?.counts.approved ?? 0} approved` },
            { variant: 'orange' as const, text: `${review?.counts.revisionRequired ?? 0} revisi` },
        ] } : null,
        canExams || canEvents ? { title: 'Assessment', headline: `${exams.length} exam`, icon: CalendarDays, tone: 'text-blue-500', badges: [
            { variant: 'green' as const, text: `${activeExams} active` },
            { variant: 'neutral' as const, text: `${draftExams} draft` },
            { variant: 'blue' as const, text: `${activeEvents} event aktif` },
        ] } : null,
        canProducts || canCommerce ? { title: 'Commerce', headline: `${products.length} product`, icon: Package, tone: 'text-emerald-500', badges: [
            { variant: 'green' as const, text: `${activeProducts} active` },
            { variant: 'neutral' as const, text: `${draftProducts} draft` },
            { variant: 'blue' as const, text: `${orders.length} order terbaru` },
        ] } : null,
    ].filter(Boolean) as Array<{ title: string; headline: string; icon: typeof FileQuestion; tone: string; badges: Array<{ variant: 'green' | 'neutral' | 'blue' | 'orange'; text: string }> }>

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Dashboard"
                description={`Ringkasan operasional ${program} / ${track}. Hanya modul yang menjadi tanggung jawab peran Anda yang ditampilkan.`}
                action={canReviewQueue ? <Link href={contextHref('/admin/content/review', program, track, { new: '1' })} className={adminPrimaryButtonClass}><FilePlus2 size={16}/>Buat soal</Link> : undefined}
            />

            {canContent ? (
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <AdminMetric label="Perlu perhatian" value={needsAttention} helper="Review + revisi" icon={<RefreshCcw size={18}/>} tone={needsAttention ? 'red' : 'green'}/>
                    <AdminMetric label="Editorial" value={editorial} helper="Menunggu editorial" icon={<Clock3 size={18}/>} tone="yellow"/>
                    <AdminMetric label="Academic" value={academic} helper="Menunggu akademik" icon={<ClipboardCheck size={18}/>} tone="violet"/>
                    <AdminMetric label="Technical QA" value={technical} helper="Menunggu QA" icon={<CheckCircle2 size={18}/>} tone="blue"/>
                    <AdminMetric label="Perlu revisi" value={revision} helper="Kembali ke author" icon={<RefreshCcw size={18}/>} tone="orange"/>
                </section>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.7fr)]">
                {canContent ? (
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
                                            const subject = review?.subjectById.get(s(row.subject_id))
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
                ) : (
                    <AdminCard><AdminEmptyState title="Tidak ada antrean content" description="Peran Anda tidak mencakup pekerjaan content, jadi tidak ada antrean yang perlu ditampilkan di sini."/></AdminCard>
                )}

                <div className="space-y-6">
                    <AdminCard className="p-5">
                        <AdminSectionHeading title="Context aktif" description="Semua modul mengikuti program dan track ini."/>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-xl bg-blue-50 p-3"><div className="text-[11px] font-bold uppercase tracking-wide text-blue-500">Program</div><div className="mt-1 text-lg font-black text-blue-950">{program}</div></div>
                            <div className="rounded-xl bg-blue-50 p-3"><div className="text-[11px] font-bold uppercase tracking-wide text-blue-500">Track</div><div className="mt-1 text-lg font-black text-blue-950">{track}</div></div>
                        </div>
                    </AdminCard>
                    {quickActions.length ? (
                        <AdminCard className="p-5">
                            <AdminSectionHeading title="Quick actions" description="Jalur tercepat ke pekerjaan yang paling sering dilakukan peran Anda."/>
                            <div className="mt-4 grid gap-2">
                                {quickActions.map((action) => {
                                    const Icon = action.icon
                                    return <Link key={action.href} href={action.href} className={adminSecondaryButtonClass}><Icon size={16}/>{action.label}</Link>
                                })}
                            </div>
                        </AdminCard>
                    ) : null}
                </div>
            </div>

            {summaryCards.length ? (
                <section className="grid gap-4 md:grid-cols-3">
                    {summaryCards.map((card) => {
                        const Icon = card.icon
                        return (
                            <AdminCard key={card.title} className="p-5">
                                <div className="flex items-center justify-between">
                                    <div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">{card.title}</div><div className="mt-1 text-lg font-black">{card.headline}</div></div>
                                    <Icon className={card.tone} size={22}/>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">{card.badges.map((badge) => <AdminBadge key={badge.text} variant={badge.variant}>{badge.text}</AdminBadge>)}</div>
                            </AdminCard>
                        )
                    })}
                </section>
            ) : null}
        </div>
    )
}
