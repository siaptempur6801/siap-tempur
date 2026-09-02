import { BookOpenCheck, ChevronRight, Dumbbell, Layers3, LockKeyhole, School } from 'lucide-react'
import TkaStartDrillButton from '@/components/tka/TkaStartDrillButton'
import {
    tkaLearningHierarchyService,
    type TkaHierarchyItem,
} from '@/src/services/tka-learning-hierarchy.service'

type HierarchyNode = TkaHierarchyItem & { children: HierarchyNode[] }

function labelForNodeType(nodeType: string) {
    switch (nodeType.toLowerCase()) {
        case 'domain': return 'Domain'
        case 'dimension': return 'Dimensi'
        case 'competency': return 'Kompetensi'
        case 'subcompetency': return 'Submateri'
        case 'element': return 'Elemen'
        case 'subelement': return 'Submateri'
        default: return 'Topik'
    }
}

function masteryLabel(item: TkaHierarchyItem) {
    if (item.attemptedQuestions === 0) return 'Belum dimulai'
    if (item.masteryLevel === 'mastered') return 'Sudah kuat'
    if (item.masteryLevel === 'proficient') return 'Cukup kuat'
    if (item.masteryLevel === 'developing') return 'Berkembang'
    return 'Perlu diperkuat'
}

function buildTree(items: TkaHierarchyItem[]) {
    const nodes = new Map<string, HierarchyNode>()
    for (const item of items) nodes.set(item.knowledgeNodeId, { ...item, children: [] })

    const roots: HierarchyNode[] = []
    for (const node of nodes.values()) {
        const parent = node.parentId ? nodes.get(node.parentId) : null
        if (parent) parent.children.push(node)
        else roots.push(node)
    }

    const sort = (left: HierarchyNode, right: HierarchyNode) => (
        left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'id')
    )
    const sortBranch = (node: HierarchyNode) => {
        node.children.sort(sort)
        node.children.forEach(sortBranch)
    }
    roots.sort(sort)
    roots.forEach(sortBranch)
    return roots
}

function HierarchyNodeCard({ node, subjectCode }: { node: HierarchyNode; subjectCode: string }) {
    const hasChildren = node.children.length > 0
    const progress = Math.round(node.masteryScore * 100)
    const content = (
        <>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.12em] text-indigo-600">
                        {labelForNodeType(node.nodeType)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                        {node.publishedQuestionCount} soal
                    </span>
                    {node.drill?.exact && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                            Drill tersedia
                        </span>
                    )}
                </div>
                <h4 className="mt-1.5 text-sm font-black leading-snug text-slate-950 md:text-base">{node.name}</h4>
                <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-slate-500">
                    <span>{masteryLabel(node)}</span>
                    {node.attemptedQuestions > 0 && <span>· {progress}% penguasaan</span>}
                </div>
            </div>
            {hasChildren && <ChevronRight size={17} className="shrink-0 text-slate-400 transition group-open:rotate-90" aria-hidden="true" />}
        </>
    )

    return (
        <li data-testid="tka-hierarchy-node" className="list-none">
            {hasChildren ? (
                <details open={node.depth <= 1} className="group rounded-2xl border border-slate-200 bg-white/80">
                    <summary className="st-focus flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3 marker:content-none">
                        {content}
                    </summary>
                    <div className="border-t border-slate-100 px-3 pb-3 pt-3 md:px-4">
                        {node.drill?.exact && (
                            <div className="mb-3 max-w-sm">
                                <TkaStartDrillButton
                                    level="SMP"
                                    subjectCode={subjectCode}
                                    knowledgeNodeName={node.drill.knowledgeNodeName}
                                />
                            </div>
                        )}
                        <ul className="space-y-2 border-l-2 border-indigo-100 pl-3 md:pl-4">
                            {node.children.map((child) => (
                                <HierarchyNodeCard key={child.knowledgeNodeId} node={child} subjectCode={subjectCode} />
                            ))}
                        </ul>
                    </div>
                </details>
            ) : (
                <article className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
                    <div className="flex min-h-10 items-center gap-3">{content}</div>
                    {node.drill?.exact ? (
                        <TkaStartDrillButton
                            level="SMP"
                            subjectCode={subjectCode}
                            knowledgeNodeName={node.drill.knowledgeNodeName}
                        />
                    ) : node.drill ? (
                        <p className="mt-3 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold leading-relaxed text-indigo-700">
                            Latihan topik ini mengikuti Drill {node.drill.knowledgeNodeName} pada materi induk.
                        </p>
                    ) : null}
                </article>
            )}
        </li>
    )
}

export default async function TkaLearningHierarchy({ activeTrack }: { activeTrack: boolean }) {
    if (!activeTrack) {
        return (
            <section id="tka-learning-hierarchy" data-testid="tka-learning-hierarchy" className="st-card-md scroll-mt-6 p-6 md:p-8">
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                        <LockKeyhole size={21} />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-600">Jenjang → Mapel → Materi → Drill</p>
                        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Aktifkan jalur untuk membuka peta belajar</h2>
                        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">Setelah aktif, kamu bisa memilih mata pelajaran dan latihan langsung dari materi yang tersedia.</p>
                    </div>
                </div>
            </section>
        )
    }

    let items: TkaHierarchyItem[] = []
    try {
        items = (await tkaLearningHierarchyService.getHierarchy()).items
    } catch {
        return null
    }
    if (items.length === 0) return null

    const subjects = Array.from(new Map(items.map((item) => [item.subjectId, {
        id: item.subjectId,
        code: item.subjectCode,
        name: item.subjectName,
        sortOrder: item.subjectSortOrder,
    }])).values()).sort((left, right) => left.sortOrder - right.sortOrder || left.code.localeCompare(right.code))

    return (
        <section id="tka-learning-hierarchy" data-testid="tka-learning-hierarchy" className="scroll-mt-6 space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-indigo-600">
                        <Layers3 size={17} /> Jenjang → Mapel → Materi → Drill
                    </div>
                    <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Pilih mata pelajaran, lalu materi</h2>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
                        Mulai dari Drill pada materi tertentu, gunakan Mini Tryout untuk mengukur satu mapel, lalu Full Tryout untuk mengukur seluruh TKA SMP.
                    </p>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700">{subjects.length} mata pelajaran</span>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
                {subjects.map((subject) => {
                    const subjectItems = items.filter((item) => item.subjectId === subject.id)
                    const roots = buildTree(subjectItems)
                    const exactDrills = subjectItems.filter((item) => item.drill?.exact).length
                    return (
                        <article key={subject.id} id={`tka-subject-${subject.code.toLowerCase()}`} data-testid={`tka-subject-${subject.code.toLowerCase()}`} className="st-card-md scroll-mt-6 p-5 md:p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex min-w-0 items-start gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                                        <School size={21} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-black uppercase tracking-[0.13em] text-indigo-600">{subject.code} · Mata pelajaran</p>
                                        <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{subject.name}</h3>
                                    </div>
                                </div>
                                <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">{exactDrills} Drill</span>
                            </div>

                            <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                                <BookOpenCheck size={15} className="text-indigo-600" /> Buka cabang materi untuk memilih latihan fokus.
                            </div>
                            <ul className="mt-4 space-y-2">
                                {roots.map((node) => (
                                    <HierarchyNodeCard key={node.knowledgeNodeId} node={node} subjectCode={subject.code} />
                                ))}
                            </ul>
                        </article>
                    )
                })}
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3 text-sm font-bold leading-relaxed text-violet-800">
                <Dumbbell size={18} className="shrink-0" /> Drill berisi 10 soal fokus dengan durasi sekitar 15 menit. Satu percobaan awal gratis per materi.
            </div>
        </section>
    )
}
