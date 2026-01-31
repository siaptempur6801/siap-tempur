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
        if (entry.subject === 'TWK') return '#3b82f6' // Blue
        if (entry.subject === 'TIU') return '#8b5cf6' // Purple
        return '#f97316' // Orange TKP
    }

    return (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full flex flex-col">
            <div className="mb-6">
                <h3 className="text-lg font-bold">Analisis Kategori</h3>
                <p className="text-sm text-muted-foreground">Rata-rata skor vs Passing Grade</p>
            </div>

            <div className="h-[300px] w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={data}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="subject"
                            type="category"
                            stroke="hsl(var(--foreground))"
                            fontSize={14}
                            fontWeight="bold"
                            tickLine={false}
                            axisLine={false}
                            width={40}
                        />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.2 }}
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                borderRadius: '8px',
                                border: '1px solid hsl(var(--border))'
                            }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={32}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
                            ))}
                        </Bar>
                        {/* Reference Lines for Passing Grades could be complex in single chart, skipping for cleanliness or adding custom logic */}
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Legend / Metrics */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
                {data.map((d) => {
                    const gap = d.passing - d.score
                    const isPassed = d.score >= d.passing

                    return (
                        <div key={d.subject} className="text-center flex flex-col items-center justify-start h-full">
                            <div className="text-[10px] text-muted-foreground font-bold mb-1">{d.subject}</div>

                            <div className="text-lg font-bold leading-none mb-1">
                                {d.score} <span className="text-xs text-muted-foreground font-normal">/ {d.passing}</span>
                            </div>

                            {isPassed ? (
                                <div className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                                    Lulus (+{Math.abs(gap)} poin)
                                </div>
                            ) : (
                                <div className="text-[10px] font-bold text-orange-500 leading-tight">
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
