'use client'

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Cell
} from 'recharts'

export default function CategoryChart({ data }: { data: any[] }) {

    const getBarColor = (entry: any) => {
        if (entry.subject === 'TWK') return '#60a5fa' // Blue-400 (notebook blue)
        if (entry.subject === 'TIU') return '#a78bfa' // Violet-400 (notebook purple)
        return '#fb923c' // Orange-400 (notebook orange)
    }

    return (
        <div className="flex flex-col h-full">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">📊 Analisis Kategori</h3>
                <p className="text-sm text-gray-600">Rata-rata skor vs Passing Grade</p>
            </div>

            <div className="h-[300px] w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={data}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d1d5db" opacity={0.5} />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="subject"
                            type="category"
                            stroke="#374151"
                            fontSize={14}
                            fontWeight="bold"
                            tickLine={false}
                            axisLine={false}
                            width={40}
                        />
                        <Tooltip
                            cursor={{ fill: '#f3f4f6', opacity: 0.5 }}
                            contentStyle={{
                                backgroundColor: '#fff',
                                borderRadius: '0',
                                border: '2px solid #1f2937',
                                boxShadow: '3px 3px 0px 0px rgba(0,0,0,1)'
                            }}
                            labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                            itemStyle={{ color: '#1f2937', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="score" radius={[0, 0, 0, 0]} barSize={36}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={getBarColor(entry)}
                                    stroke="#1f2937"
                                    strokeWidth={2}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Legend / Metrics - Notebook Style */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t-2 border-gray-900">
                {data.map((d) => {
                    const gap = d.passing - d.score
                    const isPassed = d.score >= d.passing

                    return (
                        <div key={d.subject} className="text-center flex flex-col items-center justify-start h-full p-2 bg-gray-50 border-2 border-gray-300">
                            <div className="text-sm text-gray-700 font-bold mb-1">{d.subject}</div>

                            <div className="text-xl font-bold leading-none mb-2 text-gray-900">
                                {d.score} <span className="text-sm text-gray-500 font-normal">/ {d.passing}</span>
                            </div>

                            {isPassed ? (
                                <div className="text-xs font-bold text-green-700 bg-green-200 px-2 py-1 border-2 border-gray-900">
                                    ✅ Lulus (+{Math.abs(gap)} poin)
                                </div>
                            ) : (
                                <div className="text-xs font-bold text-orange-700 bg-orange-200 px-2 py-1 border-2 border-gray-900">
                                    Kurang {gap} poin lagi
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

