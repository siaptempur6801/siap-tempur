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

function getSubjectIcon(code: string) {
    const c = code.toLowerCase()
    if (c.includes('mat') || c.includes('num')) return <Calculator size={20} />
    if (c.includes('ind') || c.includes('lit') || c.includes('bhs')) return <BookOpen size={20} />
    return <School size={20} />
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

    return (
        <section id="tka-learning-hierarchy" data-testid="tka-learning-hierarchy" className="scroll-mt-6 space-y-8">
            {/* Quick Context & Stats Banner */}
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                        <Clock3 size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-500">Format Latihan</p>
                        <p className="text-sm font-bold text-slate-900">10 soal · ±15 menit</p>
                        <p className="text-[11px] text-slate-400">Pembahasan instan per soal</p>
                    </div>
                </div>

                <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-500">Materi Sudah Kuat</p>
                        <p className="text-sm font-bold text-slate-900">{masteredCount} topik</p>
                        <p className="text-[11px] text-slate-400">Dari {allDrills.length} topik tersedia</p>
                    </div>
                </div>

                <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                        <Target size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-500">Prioritas Perbaikan</p>
                        <p className="text-sm font-bold text-slate-900">{needsFocusCount} topik perlu diasah</p>
                        <p className="text-[11px] text-slate-400">{notStartedCount} topik belum dicoba</p>
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
                    className="st-focus inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
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
                            {/* Subject Header */}
                            <div className="flex items-center justify-between rounded-2xl bg-slate-100/80 px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                                        isMath ? 'bg-violet-100 text-violet-700' : isIndo ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'
                                    }`}>
                                        {getSubjectIcon(subject.code)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-base font-bold text-slate-950">{subject.name}</h3>
                                            <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-black tracking-wide text-slate-600 shadow-2xs">
                                                {subject.code}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 font-medium">
                                            {drills.length} materi latihan siap dikerjakan
                                        </p>
                                    </div>
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
                                                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-200 hover:border-indigo-200 hover:shadow-md"
                                            >
                                                <div>
                                                    <div className="flex items-start justify-between gap-2">
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                                                            <Dumbbell size={13} className="text-indigo-600" />
                                                            <span>{item.drill!.questionCount || 10} soal</span>
                                                        </span>
                                                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black ring-1 ${badge.className}`}>
                                                            {badge.label}
                                                        </span>
                                                    </div>

                                                    <h4 className="mt-3 text-base font-bold leading-snug text-slate-950 group-hover:text-indigo-600 transition-colors">
                                                        {item.name}
                                                    </h4>

                                                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                                                        {hasAttempt ? (
                                                            <>
                                                                <span className="font-semibold">
                                                                    Akurasi: <b className="text-slate-900">{accuracyPct}%</b>
                                                                </span>
                                                                <span className="text-[11px] text-slate-400">
                                                                    {item.correctQuestions}/{item.attemptedQuestions} dinilai
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="text-slate-400 text-[11px]">
                                                                Belum pernah dikerjakan
                                                            </span>
                                                        )}
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
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-xs text-indigo-900">
                <p className="font-bold">💡 Tips Latihan Fokus:</p>
                <p className="mt-1 text-slate-600 leading-relaxed">
                    Kerjakan latihan per topik secara berkala. Jika nilai akurasi masih di bawah 70%, pelajari pembahasannya lalu ulangi latihan untuk memperkuat ingatan konsep.
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
        <section id="tka-learning-hierarchy" data-testid="tka-learning-hierarchy" className="scroll-mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
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
