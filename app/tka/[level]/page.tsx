import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, BookOpenCheck, CheckCircle2, Clock3, LockKeyhole, School } from 'lucide-react'
import { activateTkaTrackAction } from '@/app/actions/user-track'
import TkaStartExamButton from '@/components/tka/TkaStartExamButton'
import { createV2AdminClient, createV2Client } from '@/lib/utils/supabase/server'
import { catalogContextService } from '@/src/services/catalog-context.service'
import { userTrackService } from '@/src/services/user-track.service'
import { parseTkaLevel, tkaContext, tkaLevelPath, type TkaLevel } from '@/src/tka/context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const LEVEL_LABEL: Record<TkaLevel, string> = {
    SD: 'Sekolah Dasar',
    SMP: 'Sekolah Menengah Pertama',
    SMA: 'Sekolah Menengah Atas',
}

function minutes(seconds: unknown) {
    const value = Number(seconds ?? 0)
    return value > 0 ? Math.round(value / 60) : null
}

function examWindowDisabledReason(input: { starts_at: string | null; ends_at: string | null }) {
    const now = Date.now()
    const startsAt = input.starts_at ? Date.parse(input.starts_at) : null
    const endsAt = input.ends_at ? Date.parse(input.ends_at) : null
    if (startsAt !== null && Number.isFinite(startsAt) && startsAt > now) return 'Belum dimulai'
    if (endsAt !== null && Number.isFinite(endsAt) && endsAt < now) return 'Sudah berakhir'
    return null
}

export default async function TkaLevelPage({
    params,
    searchParams,
}: {
    params: Promise<{ level: string }>
    searchParams: Promise<{ activated?: string; error?: string }>
}) {
    const { level: levelParam } = await params
    const query = await searchParams
    const level = parseTkaLevel(levelParam)
    if (!level) notFound()

    const path = tkaLevelPath(level)
    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/login?returnTo=${encodeURIComponent(path)}`)

    const context = tkaContext(level)
    const [catalog, userTrack] = await Promise.all([
        catalogContextService.resolve(context),
        userTrackService.getForUser({ userId: user.id, context }),
    ])

    const admin = await createV2AdminClient()
    const [{ data: exams, error: examError }, { data: examTypes, error: typeError }, { data: questionRows, error: questionError }] = await Promise.all([
        admin
            .from('exams')
            .select('id, exam_type_id, title, slug, duration_seconds, status, token_cost, starts_at, ends_at')
            .eq('program_id', catalog.program.id)
            .eq('track_id', catalog.track.id)
            .in('status', ['active', 'ACTIVE', 'scheduled', 'SCHEDULED'])
            .order('created_at', { ascending: true }),
        admin.from('exam_types').select('id, code, name'),
        admin
            .from('questions')
            .select('subject_id')
            .eq('program_id', catalog.program.id)
            .eq('track_id', catalog.track.id)
            .in('status', ['published', 'PUBLISHED', 'active', 'ACTIVE'])
            .limit(5000),
    ])
    if (examError) throw examError
    if (typeError) throw typeError
    if (questionError) throw questionError

    const examTypeById = new Map((examTypes ?? []).map((row) => [String(row.id), row]))
    const questionCountBySubject = new Map<string, number>()
    for (const row of questionRows ?? []) {
        const id = String(row.subject_id)
        questionCountBySubject.set(id, (questionCountBySubject.get(id) ?? 0) + 1)
    }
    const activeTrack = userTrack?.status.toLowerCase() === 'active'

    return (
        <main className="min-h-screen bg-[#fdfbf7] px-4 py-8 text-gray-900 md:px-8 md:py-12">
            <div className="mx-auto max-w-6xl space-y-6">
                <Link href="/tka" className="inline-flex items-center gap-2 font-black text-gray-700 hover:text-blue-700">
                    <ArrowLeft size={18} /> Semua jenjang TKA
                </Link>

                <header className="border-2 border-gray-900 bg-white p-6 shadow-[6px_6px_0_0_#111] md:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-5">
                        <div>
                            <span className="inline-flex border-2 border-gray-900 bg-cyan-100 px-3 py-1 text-xs font-black uppercase">
                                TKA / {level}
                            </span>
                            <h1 className="mt-3 font-handwriting text-4xl font-black md:text-5xl">TKA {LEVEL_LABEL[level]}</h1>
                            <p className="mt-2 max-w-2xl font-semibold text-gray-600">
                                Track ini memakai catalog, bank soal, progress, dan attempt yang terpisah dari CPNS/SKD.
                            </p>
                        </div>
                        <div className={`border-2 border-gray-900 px-4 py-3 font-black ${activeTrack ? 'bg-green-100 text-green-900' : 'bg-yellow-100 text-yellow-900'}`}>
                            {activeTrack ? <span className="inline-flex items-center gap-2"><CheckCircle2 size={18}/> Track aktif</span> : <span className="inline-flex items-center gap-2"><LockKeyhole size={18}/> Belum diaktifkan</span>}
                        </div>
                    </div>
                </header>

                {query.activated === '1' && (
                    <div className="border-2 border-gray-900 bg-green-100 px-4 py-3 font-bold text-green-900 shadow-[3px_3px_0_0_#111]">
                        Jalur TKA {level} berhasil diaktifkan untuk akun ini.
                    </div>
                )}
                {query.error && (
                    <div className="border-2 border-gray-900 bg-red-100 px-4 py-3 font-bold text-red-800 shadow-[3px_3px_0_0_#111]">
                        {query.error}
                    </div>
                )}

                {!activeTrack && (
                    <section className="border-2 border-gray-900 bg-yellow-50 p-5 shadow-[4px_4px_0_0_#111]">
                        <h2 className="text-xl font-black">Aktifkan jalur TKA {level}</h2>
                        <p className="mt-1 text-sm font-semibold text-gray-600">Aktivasi membuat progress jenjang ini disimpan di user_tracks. Data sekolah bersifat opsional.</p>
                        <form action={activateTkaTrackAction} className="mt-4 grid gap-3 md:grid-cols-4">
                            <input type="hidden" name="level" value={level} />
                            <label className="space-y-1">
                                <span className="block text-xs font-black uppercase text-gray-500">Nama sekolah</span>
                                <input name="school_name" className="w-full border-2 border-gray-900 bg-white px-3 py-2 font-semibold" placeholder="Opsional" />
                            </label>
                            <label className="space-y-1">
                                <span className="block text-xs font-black uppercase text-gray-500">Kelas</span>
                                <input name="school_grade" className="w-full border-2 border-gray-900 bg-white px-3 py-2 font-semibold" placeholder="Contoh: 6" />
                            </label>
                            <label className="space-y-1">
                                <span className="block text-xs font-black uppercase text-gray-500">Tahun target</span>
                                <input name="target_year" type="number" min="2025" max="2100" className="w-full border-2 border-gray-900 bg-white px-3 py-2 font-semibold" placeholder="2026" />
                            </label>
                            <button className="self-end border-2 border-gray-900 bg-gray-900 px-4 py-2 font-black text-white shadow-[3px_3px_0_0_#aaa] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">
                                Aktifkan TKA {level}
                            </button>
                        </form>
                    </section>
                )}

                <section className="space-y-3">
                    <div>
                        <h2 className="text-2xl font-black">Mapel</h2>
                        <p className="text-sm font-semibold text-gray-600">Bank soal dan progress dihitung per subject di track {level}.</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {catalog.subjects.map((subject) => (
                            <article key={subject.id} className="border-2 border-gray-900 bg-white p-4 shadow-[3px_3px_0_0_#bbb]">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-black uppercase text-blue-700">{subject.code}</div>
                                        <h3 className="mt-1 text-lg font-black">{subject.name}</h3>
                                    </div>
                                    <School size={20} />
                                </div>
                                <p className="mt-3 text-sm font-semibold text-gray-600">
                                    {questionCountBySubject.get(subject.id) ?? 0} soal published tersedia.
                                </p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="space-y-3">
                    <div>
                        <h2 className="text-2xl font-black">Tryout tersedia</h2>
                        <p className="text-sm font-semibold text-gray-600">Hanya konfigurasi active/scheduled yang ditampilkan kepada user. Validasi final tetap dilakukan server saat tombol mulai ditekan.</p>
                    </div>
                    {(exams ?? []).length > 0 ? (
                        <div className="grid gap-3 md:grid-cols-2">
                            {(exams ?? []).map((exam) => {
                                const type = examTypeById.get(String(exam.exam_type_id))
                                const duration = minutes(exam.duration_seconds)
                                const windowReason = examWindowDisabledReason({ starts_at: exam.starts_at, ends_at: exam.ends_at })
                                const disabledReason = !activeTrack ? 'Aktifkan track terlebih dahulu' : windowReason
                                return (
                                    <article key={exam.id} className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0_0_#111]">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-xs font-black uppercase text-blue-700">{type?.name || type?.code || 'Exam'}</div>
                                                <h3 className="mt-1 text-xl font-black">{exam.title}</h3>
                                            </div>
                                            <BookOpenCheck />
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold text-gray-600">
                                            {duration && <span className="inline-flex items-center gap-1"><Clock3 size={15}/>{duration} menit</span>}
                                            <span>{Number(exam.token_cost ?? 0)} token</span>
                                            <span className="uppercase">{exam.status}</span>
                                        </div>
                                        <TkaStartExamButton level={level} examSlug={exam.slug} disabledReason={disabledReason} />
                                    </article>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="border-2 border-dashed border-gray-400 bg-white/70 p-6 text-center">
                            <BookOpenCheck className="mx-auto" />
                            <h3 className="mt-3 font-black">Tryout belum dibuka</h3>
                            <p className="mt-1 text-sm font-semibold text-gray-600">Konfigurasi draft tidak ditampilkan sampai bank soal dan QA selesai.</p>
                        </div>
                    )}
                </section>
            </div>
        </main>
    )
}
