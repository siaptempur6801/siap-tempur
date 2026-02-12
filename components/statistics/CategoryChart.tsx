'use client'

import React, { useEffect, useState } from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
    ResponsiveContainer,
} from 'recharts'
import { BarChart3 } from 'lucide-react'

interface CategoryData {
    subject: string
    score: number
    fullMark: number
    passing: number
}

export default function CategoryChart({ data }: { data: CategoryData[] }) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const getBarColor = (score: number, passing: number) => {
        if (score >= passing) return '#22c55e' // Green
        if (score >= passing * 0.8) return '#eab308' // Yellow
        return '#ef4444' // Red
    }

    if (!mounted) {
        return <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500">Memuat...</div>
    }

    if (!data || data.length === 0) {
        return <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500">Data tidak tersedia</div>
    }

    return (
        <div className="flex flex-col h-full min-h-[400px] p-2">
            <div className="mb-6 flex items-center gap-2">
                <div className="p-2 bg-yellow-100 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <BarChart3 className="w-5 h-5 text-gray-900" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-900">Analisis Kategori</h3>
                    <p className="text-sm text-gray-600">Skor Rata-rata</p>
                </div>
            </div>

            <div className="h-[250px] w-full py-4 bg-white border-2 border-gray-100 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="subject" tick={{ fill: '#4b5563', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="score" isAnimationActive={false}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getBarColor(entry.score, entry.passing)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-auto">
                {data.map((d) => {
                    const gap = d.passing - d.score
                    const isPassed = d.score >= d.passing
                    return (
                        <div key={d.subject} className="text-center p-2 bg-gray-50 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center min-h-[80px]">
                            <div className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1">{d.subject}</div>
                            <div className="text-3xl font-black mb-1">{d.score}</div>
                            <div className={`text-xs font-bold ${isPassed ? 'text-green-600' : 'text-red-500'}`}>
                                {isPassed ? `Lulus (+${Math.abs(gap)})` : `Kurang ${gap}`}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
