'use client'

import { format } from 'date-fns'
import { id } from 'date-fns/locale'

export default function ConsistencyTracker({ data, score, activeCount }: { data: any[], score: number, activeCount: number }) {

    return (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h3 className="text-lg font-bold">Konsistensi Belajar</h3>
                    <p className="text-sm text-muted-foreground">Aktivitas belajar dalam 30 hari terakhir</p>
                </div>
                <div className="flex items-center gap-4 bg-secondary/30 p-2 rounded-lg">
                    <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{score}%</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Consistency Score</div>
                    </div>
                </div>
            </div>

            {/* GitHub-like Calendar Grid (Simplified for mobile) */}
            <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
                {data.map((day: any, idx: number) => (
                    <div
                        key={idx}
                        title={`${format(new Date(day.date), 'd MMM yyyy', { locale: id })}: ${day.active ? 'Belajar' : 'Tidak'}`}
                        className={`
                            w-3 h-3 md:w-4 md:h-4 rounded-sm transition-all hover:scale-125
                            ${day.active
                                ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]'
                                : 'bg-secondary/50'}
                        `}
                    />
                ))}
            </div>

            <div className="mt-6 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total hari aktif: <strong className="text-foreground">{activeCount} hari</strong></span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Kurang</span>
                    <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-sm bg-secondary/50"></div>
                        <div className="w-2 h-2 rounded-sm bg-primary/40"></div>
                        <div className="w-2 h-2 rounded-sm bg-primary"></div>
                    </div>
                    <span>Sering</span>
                </div>
            </div>
        </div>
    )
}
