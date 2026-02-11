import { BarChart3, CheckCircle2 } from 'lucide-react'

// ... imports

export default function CategoryChart({ data }: { data: any[] }) {

    // ... getBarColor

    return (
        <div className="flex flex-col h-full">
            <div className="mb-6 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-gray-900" />
                <div>
                    <h3 className="text-xl font-bold text-gray-900">Analisis Kategori</h3>
                    <p className="text-sm text-gray-600">Rata-rata skor vs Passing Grade</p>
                </div>
            </div>

            {/* ... chart ... */}

            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t-2 border-gray-900">
                {data.map((d) => {
                    const gap = d.passing - d.score
                    const isPassed = d.score >= d.passing

                    return (
                        <div key={d.subject} className="text-center flex flex-col items-center justify-start h-full p-2 bg-gray-50 border-2 border-gray-300">
                            {/* ... */}
                            {isPassed ? (
                                <div className="text-xs font-bold text-green-700 bg-green-200 px-2 py-1 border-2 border-gray-900 flex items-center gap-1 justify-center">
                                    <CheckCircle2 className="w-3 h-3" /> Lulus (+{Math.abs(gap)})
                                </div>
                            ) : (
                                <div className="text-xs font-bold text-orange-700 bg-orange-200 px-2 py-1 border-2 border-gray-900">
                                    Kurang {gap} poin
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
