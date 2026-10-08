import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Building2, CalendarDays, CheckCircle2, Clock3, LockKeyhole } from 'lucide-react'
import { createV2Client } from '@/lib/utils/supabase/server'
import { organizationParticipantAssignmentService, type ParticipantAssignment } from '@/src/services/organization-participant-assignment.service'
import { startOrganizationAssignment } from '@/app/actions/organization-assignment'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function dateLabel(value: string | null) {
    if (!value) return 'Jadwal belum ditentukan'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Jadwal belum ditentukan'
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(date)
}

function statusLabel(status: ParticipantAssignment['status']) {
    if (status === 'IN_PROGRESS') return 'Sedang dikerjakan'
    if (status === 'COMPLETED') return 'Selesai'
    if (status === 'UPCOMING') return 'Belum tersedia'
    if (status === 'CLOSED') return 'Periode berakhir'
    if (status === 'UNAVAILABLE') return 'Assessment belum siap'
    return 'Belum dimulai'
}

const ERROR_TEXT: Record<string, string> = {
    invalid: 'Assignment tidak valid.',
    'not-found': 'Assignment tidak ditemukan atau bukan milik akun Anda.',
    unavailable: 'Assessment ini belum tersedia.',
    upcoming: 'Assignment belum dibuka.',
    closed: 'Periode assignment sudah berakhir.',
    failed: 'Assignment belum bisa dimulai. Coba muat ulang halaman.',
}

export default async function OrganizationAssignmentsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const query = await searchParams
    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/login?returnTo=${encodeURIComponent('/cpns/dashboard/assignments')}`)

    const assignments = await organizationParticipantAssignmentService.listForParticipant(user.id)
    return (
        <main className="space-y-5" data-testid="organization-assignments-ready">
            <header>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Instansi</p>
                <h1 className="mt-1 text-3xl font-black text-slate-950">Assignment saya</h1>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">Assessment yang ditugaskan oleh instansi dan batch Anda.</p>
            </header>

            {query.error && ERROR_TEXT[query.error] ? (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{ERROR_TEXT[query.error]}</p>
            ) : null}

            {assignments.length === 0 ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                    <Building2 className="mx-auto text-slate-400" size={26}/>
                    <h2 className="mt-3 text-lg font-black">Belum ada assignment</h2>
                    <p className="mt-1 text-sm text-slate-600">Ujian dari instansi akan muncul di sini setelah Anda bergabung ke batch.</p>
                </section>
            ) : assignments.map((assignment) => {
                const completed = assignment.status === 'COMPLETED'
                const canStart = assignment.status === 'NOT_STARTED' || assignment.status === 'IN_PROGRESS'
                const resultPath = assignment.programCode === 'TKA'
                    ? `/tka/${assignment.trackCode.toLowerCase()}/tryout/${assignment.attemptId}/result`
                    : `/cpns/dashboard/tryout/${assignment.attemptId}/result`
                return (
                    <article key={assignment.id} data-testid="organization-assignment" data-assignment-id={assignment.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                                    <span>{assignment.organizationName}</span><span aria-hidden="true">·</span><span>{assignment.batchName}</span>
                                </div>
                                <h2 className="mt-1 text-xl font-black text-slate-950">{assignment.examTitle}</h2>
                                <p className="mt-1 text-xs font-semibold text-slate-600">{assignment.programCode}{assignment.programCode === 'TKA' ? ` ${assignment.trackCode}` : ''} · {assignment.examTypeCode.replaceAll('_', ' ')}</p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700">{statusLabel(assignment.status)}</span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
                            <span className="inline-flex items-center gap-1.5"><CalendarDays size={14}/>Mulai: {dateLabel(assignment.startsAt)}</span>
                            <span className="inline-flex items-center gap-1.5"><Clock3 size={14}/>Batas: {dateLabel(assignment.dueAt)}</span>
                        </div>
                        {completed && assignment.attemptId ? (
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                                <p className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700"><CheckCircle2 size={17}/>Selesai{assignment.score !== null ? ` · Skor ${assignment.score}` : ''}</p>
                                <Link className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white" href={resultPath}>Lihat hasil<ArrowRight size={15}/></Link>
                            </div>
                        ) : canStart ? (
                            <form action={startOrganizationAssignment} className="mt-4 border-t border-slate-100 pt-4">
                                <input type="hidden" name="assignment_id" value={assignment.id}/>
                                <button className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700">
                                    {assignment.status === 'IN_PROGRESS' ? 'Lanjutkan' : 'Mulai'}<ArrowRight size={15}/>
                                </button>
                            </form>
                        ) : (
                            <p className="mt-4 inline-flex items-center gap-2 border-t border-slate-100 pt-4 text-sm font-semibold text-slate-500"><LockKeyhole size={15}/>{statusLabel(assignment.status)}</p>
                        )}
                    </article>
                )
            })}
        </main>
    )
}
