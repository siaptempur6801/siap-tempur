'use client'

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts'
import { useState } from 'react'

export default function TrendChart({
    data,
    trendDirection,
    trendPercentage,
    shortTermTrend,
    shortTermPercentage
}: {
    data: any[],
    trendDirection: string,
    trendPercentage: number,
    shortTermTrend?: string,
    shortTermPercentage?: number
}) {
    const [viewMode, setViewMode] = useState<'long' | 'short'>('long')

    const currentDirection = viewMode === 'long' ? trendDirection : (shortTermTrend || trendDirection)
    const currentPercentage = viewMode === 'long' ? trendPercentage : (shortTermPercentage !== undefined ? shortTermPercentage : trendPercentage)

    const isUp = currentDirection === 'up'

    // Filter data for chart display if short term selected?
    // Actually, user might want to see the whole chart but see calculation for short term.
    // Or focus the chart too? Let's focus the chart too for clarity.

    const displayData = viewMode === 'short' ? data.slice(-10) : data

    return (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col h-full">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                <div>
                    <h3 className="text-lg font-bold">Trend Nilai</h3>
                    <p className="text-sm text-muted-foreground">
                        {viewMode === 'long' ? 'Progres skor total latihan' : 'Progres 10 latihan terakhir'}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Selector */}
                    <div className="flex bg-secondary/50 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('long')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'long' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            Total
                        </button>
                        <button
                            onClick={() => setViewMode('short')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'short' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            Terbaru
                        </button>
                    </div>

                    {/* Badge */}
                    <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 border ${isUp
                        ? 'bg-green-500/10 text-green-600 border-green-500/20'
                        : currentDirection === 'down'
                            ? 'bg-red-500/10 text-red-600 border-red-500/20'
                            : 'bg-secondary text-muted-foreground border-transparent'
                        }`}>
                        {isUp ? (
                            <>📈 +{currentPercentage}%</>
                        ) : currentDirection === 'down' ? (
                            <>📉 -{currentPercentage}%</>
                        ) : (
                            <>➡️ 0%</>
                        )}
                    </div>
                </div>
            </div>

            <div className="h-[300px] w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={displayData}>
                        <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis
                            dataKey="attempt"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `#${value}`}
                        />
                        <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 'auto']}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                borderRadius: '8px',
                                border: '1px solid hsl(var(--border))',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                            labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
                            itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                            formatter={(value: any) => [`${value} Poin`, 'Skor Total']}
                            labelFormatter={(label) => `Latihan #${label}`}
                        />
                        <Area
                            type="monotone"
                            dataKey="score"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorScore)"
                            animationDuration={1000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
