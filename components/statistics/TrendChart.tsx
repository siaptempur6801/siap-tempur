'use client'

import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts'
import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface TrendDataPoint {
    attempt: number
    date: string
    score: number
    fullDate: string
}

export default function TrendChart({
    data,
    trendDirection,
    trendPercentage,
    shortTermTrend,
    shortTermPercentage
}: {
    data: TrendDataPoint[],
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
        <div className="flex flex-col h-full">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6" /> Trend Nilai
                    </h3>
                    <p className="text-sm text-gray-600">
                        {viewMode === 'long' ? 'Progres skor total tryout' : 'Progres 10 tryout terakhir'}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Selector - Notebook Style */}
                    <div className="flex bg-gray-100 border-2 border-gray-900 p-1">
                        <button
                            onClick={() => setViewMode('long')}
                            className={`px-3 py-1 text-sm font-bold transition-all ${viewMode === 'long'
                                ? 'bg-blue-300 text-gray-900 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Total
                        </button>
                        <button
                            onClick={() => setViewMode('short')}
                            className={`px-3 py-1 text-sm font-bold transition-all ${viewMode === 'short'
                                ? 'bg-blue-300 text-gray-900 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Terbaru
                        </button>
                    </div>

                    {/* Badge - Notebook Style */}
                    <div className={`px-3 py-1.5 text-sm font-bold flex items-center gap-1 border-2 border-gray-900 ${isUp
                        ? 'bg-green-300 text-green-800'
                        : currentDirection === 'down'
                            ? 'bg-red-300 text-red-800'
                            : 'bg-gray-200 text-gray-700'
                        }`}>
                        {isUp ? (
                            <><TrendingUp className="w-4 h-4" /> +{currentPercentage}%</>
                        ) : currentDirection === 'down' ? (
                            <><TrendingDown className="w-4 h-4" /> -{currentPercentage}%</>
                        ) : (
                            <><Minus className="w-4 h-4" /> 0%</>
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
                                backgroundColor: '#fff',
                                borderRadius: '0',
                                border: '2px solid #1f2937',
                                boxShadow: '3px 3px 0px 0px rgba(0,0,0,1)'
                            }}
                            labelStyle={{ color: '#374151', marginBottom: '4px', fontWeight: 'bold' }}
                            itemStyle={{ color: '#1f2937', fontWeight: 'bold' }}
                            formatter={(value) => {
                                const displayValue = Array.isArray(value) ? value.join(', ') : (value ?? 0)
                                return [`${displayValue} Poin`, 'Skor Total']
                            }}
                            labelFormatter={(label) => `Tryout #${label}`}
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
