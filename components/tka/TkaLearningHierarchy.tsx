import Link from 'next/link'
import {
    AlertCircle,
    BarChart3,
    BookOpen,
    BookOpenCheck,
    Calculator,
    CheckCircle2,
    Clock3,
    Dumbbell,
    LockKeyhole,
    School,
    Sparkles,
    Target,
} from 'lucide-react'
import TkaStartDrillButton from '@/components/tka/TkaStartDrillButton'
import {
    tkaLearningHierarchyService,
    type TkaHierarchyItem,
} from '@/src/services/tka-learning-hierarchy.service'

function masteryBadge(item: TkaHierarchyItem) {
    if (item.attemptedQuestions === 0) {
        return { label: 'Belum Dimulai', className: 'bg-slate-100 text-slate-600 ring-slate-200/80' }
    }
    if (item.masteryLevel === 'mastered') {
        return { label: 'Sudah Kuat', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
    }
    if (item.masteryLevel === 'proficient') {
        return { label: 'Cukup Kuat', className: 'bg-blue-50 text-blue-700 ring-blue-200' }
    }
    if (item.masteryLevel === 'developing') {
        return { label: 'Berkembang', className: 'bg-amber-50 text-amber-700 ring-amber-200' }
    }
    return { label: 'Perlu Diperkuat', className: 'bg-rose-50 text-rose-700 ring-rose-200' }
}

function exactDrills(items: TkaHierarchyItem[]) {
    const unique = new Map<string, TkaHierarchyItem>()
    for (const item of items) {
        if (item.drill?.exact && !unique.has(item.drill.examSlug)) {
            unique.set(item.drill.examSlug, item)
        }
    }
    return Array.from(unique.values()).sort((left, right) => (
        left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'id')
    ))
}

export default async function TkaLearningHierarchy({ activeTrack }: { activeTrack: boolean }) {
    if (!activeTrack) {
        return (
            <section id="tka-learning-hierarchy" data-testid="tka-learning-hierarchy" className="scroll-mt-6 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 to-orange-50/40 p-6 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 ring-1 ring-amber-200/60">
                        <LockKeyhole size={22} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-xl font-bold text-slate-950">Jalur Belajar Belum Aktif</h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                            Aktifkan jalur belajar TKA SMP di halaman Ringkasan agar progres latihan, riwayat pengerjaan, dan penguasaan materi tersimpan rapi di akunmu.
                        </p>
                        <Link href="/tka/smp" className="st-focus mt-4 inline-flex min-h-10 items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 active:scale-[0.98]">
                            Aktifkan di Halaman Ringkasan
                        </Link>
                    </div>
                </div>
            </section>
        )
    }

    let items: TkaHierarchyItem[] = []
    try {
        items = (await tkaLearningHierarchyService.getHierarchy()).items
    } catch {
        return (
            <LearningState
                icon={<AlertCircle size={22} />}
                title="Peta materi belum bisa dimuat"
                description="Data latihanmu tetap aman. Silakan muat ulang halaman ini."
                action="Muat Ulang Halaman"
            />
        )
    }

    if (items.length === 0) {
        return (
            <LearningState
                icon={<BookOpenCheck size={22} />}
                title="Katalog Latihan Fokus Sedang Disiapkan"
                description="Materi dan bab latihan akan segera tersedia untuk jenjang ini."
            />
        )
    }

    const allDrills = exactDrills(items)
    const subjects = Array.from(new Map(items.map((item) => [item.subjectId, {
        id: item.subjectId,
        code: item.subjectCode,
        name: item.subjectName,
        sortOrder: item.subjectSortOrder,
    }])).values()).sort((left, right) => left.sortOrder - right.sortOrder || left.code.localeCompare(right.code))

    // Calculate learner mastery stats
    const masteredCount = allDrills.filter((d) => d.masteryLevel === 'mastered' || d.masteryLevel === 'proficient').length
    const needsFocusCount = allDrills.filter((d) => d.masteryLevel === 'developing' || d.masteryLevel === 'needs_focus' || (d.attemptedQuestions > 0 && d.accuracy < 0.6)).length
    const notStartedCount = allDrills.filter((d) => d.attemptedQuestions === 0).length
    const totalDrills = allDrills.length || 1
    const progressPercent = Math.round((masteredCount / totalDrills) * 100)

    return (
        <section id="tka-learning-hierarchy" data-testid="tka-learning-hierarchy" className="scroll-mt-6 space-y-8">
            {/* Quick Context & Stats Banner */}
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-indigo-200">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                        <Clock3 size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Format Latihan</p>
                        <p className="text-base font-extrabold text-slate-900">10 Soal Fokus</p>
                        <p className="text-xs text-slate-500">±15 menit · Pembahasan instan</p>
                    </div>
                </div>

                <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-emerald-200">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Materi Dikuasai</p>
                        <p className="text-base font-extrabold text-slate-900">{masteredCount} Topik Kuat</p>
                        <div className="mt-1 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progressPercent}%` }} />
                            </div>
                            <span className="text-[11px] font-bold text-emerald-700">{progressPercent}%</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-amber-200">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                        <Target size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Prioritas Belajar</p>
                        <p className="text-base font-extrabold text-slate-900">{needsFocusCount} Perlu Diasah</p>
                        <p className="text-xs text-slate-500">{notStartedCount} topik belum dicoba</p>
                    </div>
                </div>
            </div>

            {/* Catalog Section Header */}
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
                <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-indigo-600">
                        <Sparkles size={13} />
                        <span>Katalog Latihan per Bab</span>
                    </div>
                    <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                        Pilih mata pelajaran, lalu materi
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                        Pilih materi yang ingin diperkuat untuk meningkatkan pemahaman dan skor tryout.
                    </p>
                </div>
                <Link
                    href="/tka/smp/progress"
                    className="st-focus inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-bold text-indigo-700 ring-1 ring-slate-200 transition hover:bg-indigo-50 hover:ring-indigo-200"
                >
                    <span>Lihat Analisis Perkembangan</span>
                    <BarChart3 size={14} aria-hidden="true" />
                </Link>
            </div>

            {/* Subjects and Topic Cards */}
            <div className="space-y-8">
                {subjects.map((subject) => {
                    const drills = exactDrills(items.filter((item) => item.subjectId === subject.id))
                    const isMath = subject.code.toLowerCase().includes('mat')
                    const isIndo = subject.code.toLowerCase().includes('ind')

                    return (
                        <div
                            key={subject.id}
                            data-testid={`tka-subject-${subject.code.toLowerCase()}`}
                            className="space-y-4"
                        >
                            {/* Subject Header Banner */}
                            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 sm:p-5 transition-all ${
                                isMath
                                    ? 'border-blue-100 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/40 shadow-xs'
                                    : isIndo
                                        ? 'border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/40 shadow-xs'
                                        : 'border-slate-200 bg-slate-50'
                            }`}>
                                <div className="flex items-center gap-3.5">
                                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-xs ${
                                        isMath ? 'bg-blue-600' : isIndo ? 'bg-indigo-600' : 'bg-slate-700'
                                    }`}>
                                        {isMath ? <Calculator size={22} /> : isIndo ? <BookOpen size={22} /> : <School size={22} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-extrabold text-slate-950">{subject.name}</h3>
                                            <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-black tracking-wide text-slate-700 ring-1 ring-slate-200/80 shadow-2xs">
                                                {subject.code}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-xs text-slate-500 font-medium">
                                            {isIndo
                                                ? 'Penguasaan wacana teks, ide pokok, penalaran kontekstual, dan kaidah bahasa.'
                                                : isMath
                                                    ? 'Konsep bilangan, aljabar dasar, geometri bangun ruang, dan pemecahan numerik.'
                                                    : `${drills.length} materi latihan siap dikerjakan.`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200/80 shadow-2xs">
                                        {drills.length} Topik Tersedia
                                    </span>
                                </div>
                            </div>

                            {/* Drill Topic Cards Grid */}
                            {drills.length > 0 ? (
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {drills.map((item) => {
                                        const badge = masteryBadge(item)
                                        const hasAttempt = item.attemptedQuestions > 0
                                        const accuracyPct = Math.round(item.accuracy * 100)

                                        return (
                                            <article
                                                key={item.drill!.examSlug}
                                                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:border-indigo-300 hover:shadow-md"
                                            >
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200/60">
                                                            <Dumbbell size={12} className="text-indigo-600" />
                                                            <span>{item.drill!.questionCount || 10} Soal</span>
                                                        </span>
                                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black ring-1 ${badge.className}`}>
                                                            {badge.label}
                                                        </span>
                                                    </div>

                                                    <div>
                                                        <h4 className="text-base font-extrabold text-slate-950 transition-colors group-hover:text-indigo-600 leading-snug">
                                                            {item.name}
                                                        </h4>
                                                    </div>

                                                    {/* Accuracy & Progress track */}
                                                    <div className="pt-1">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="font-semibold text-slate-600">
                                                                {hasAttempt ? (
                                                                    <>Akurasi: <b className="text-slate-900">{accuracyPct}%</b></>
                                                                ) : (
                                                                    <span className="text-slate-400 font-normal">Belum dikerjakan</span>
                                                                )}
                                                            </span>
                                                            {hasAttempt && (
                                                                <span className="text-[11px] text-slate-400">
                                                                    {item.correctQuestions}/{item.attemptedQuestions} dinilai
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-300 ${
                                                                    accuracyPct >= 80
                                                                        ? 'bg-emerald-500'
                                                                        : accuracyPct >= 60
                                                                            ? 'bg-indigo-600'
                                                                            : accuracyPct > 0
                                                                                ? 'bg-amber-500'
                                                                                : 'bg-transparent'
                                                                }`}
                                                                style={{ width: `${hasAttempt ? Math.max(accuracyPct, 5) : 0}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-5 border-t border-slate-100 pt-3">
                                                    <TkaStartDrillButton
                                                        level="SMP"
                                                        subjectCode={subject.code}
                                                        knowledgeNodeName={item.drill!.knowledgeNodeName}
                                                        compact
                                                    />
                                                </div>
                                            </article>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                                    <BookOpenCheck size={20} className="mx-auto text-slate-400 mb-1.5" />
                                    <span>Materi latihan untuk mata pelajaran ini sedang disiapkan.</span>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Study Hint Footer */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-blue-50/40 p-4 text-xs text-indigo-950 shadow-xs">
                <p className="font-bold flex items-center gap-1.5 text-indigo-900">
                    <Sparkles size={14} className="text-indigo-600" />
                    <span>Strategi Latihan Mandiri:</span>
                </p>
                <p className="mt-1 text-slate-600 leading-relaxed">
                    Selesaikan 10 butir soal terarah per materi. Manfaatkan pembahasan instan yang muncul setelah setiap butir soal dijawab untuk memahami konsep secara tuntas sebelum mengulang latihan.
                </p>
            </div>
        </section>
    )
}

function LearningState({
    icon,
    title,
    description,
    action,
}: {
    icon: React.ReactNode
    title: string
    description: string
    action?: string
}) {
    return (
        <section id="tka-learning-hierarchy" data-testid="tka-learning-hierarchy" className="scroll-mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">{icon}</div>
            <h2 className="mt-3 text-lg font-bold text-slate-950">{title}</h2>
            <p className="mx-auto mt-1 max-w-lg text-sm text-slate-600">{description}</p>
            {action && (
                <Link href="/tka/smp/focus?refresh=learning" className="st-focus mt-5 inline-flex min-h-10 items-center rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700">
                    {action}
                </Link>
            )}
        </section>
    )
}
