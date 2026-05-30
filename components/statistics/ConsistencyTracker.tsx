'use client'

import { Flame } from 'lucide-react'

interface ConsistencyDay {
    date: Date | string
    active: boolean
    dayLabel: string
}

export default function ConsistencyTracker({ data, score, activeCount }: { data: ConsistencyDay[], score: number, activeCount: number }) {

    return (
        <div className="">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Flame className="w-5 h-5 text-orange-500 fill-orange-500" /> Konsistensi Belajar
                    </h3>
                    <p className="text-sm text-gray-600">Aktivitas belajar dalam 30 hari terakhir</p>
                </div>
                <div className="flex items-center gap-4 bg-green-200 border-2 border-gray-900 p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <div className="text-right">
                        <div className="text-2xl font-bold text-green-700">{score}%</div>
                        <div className="text-xs text-gray-700 uppercase font-bold tracking-wider">Consistency Score</div>
                    </div>
                </div>
            </div>

            {/* GitHub-like Calendar Grid (Simplified for mobile) */}
            <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
                {data.map((day, idx) => (
                    <div
                        key={idx}
                        title={`${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(day.date))}: ${day.active ? 'Belajar' : 'Tidak'}`}
                        className={`
                            w-4 h-4 md:w-5 md:h-5 transition-all hover:scale-125 border border-gray-400
                            ${day.active
                                ? 'bg-blue-500 border-gray-900'
                                : 'bg-gray-200'}
                        `}
                    />
                ))}
            </div>

            <div className="mt-6 flex items-center justify-between text-sm">
                <span className="text-gray-700">Total hari aktif: <strong className="text-gray-900">{activeCount} hari</strong></span>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-gray-200 border border-gray-400"></div>
                        <span>Tidak Aktif</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-500 border border-gray-900"></div>
                        <span>Aktif</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

