import { CheckCircle2, List, Sparkles, XCircle } from 'lucide-react'
import { cn, formatSubjectName } from '@/lib/utils'
import type { Answer, Question } from './types'

interface ReviewHeaderProps {
    currentIndex: number
    question: Question
    currentAnswer: Answer
    status: 'perfect' | 'good' | 'bad' | 'correct' | 'wrong'
    showNav: boolean
    setShowNav: (show: boolean) => void
}

export default function ReviewHeader({
    currentIndex,
    question,
    currentAnswer,
    status,
    showNav,
    setShowNav,
}: ReviewHeaderProps) {
    const type = question.type

    return (
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Pembahasan soal {currentIndex + 1}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="st-pill bg-slate-900 text-white">{question.type}</span>
                    {question.category && (
                        <span className="st-pill bg-white text-slate-700">{formatSubjectName(question.category)}</span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex min-h-10 items-center gap-2 border border-slate-200 bg-white px-3 py-2 text-sm font-black">
                    {type === 'TKP' ? (
                        <span className={cn(
                            'flex items-center gap-1.5',
                            status === 'perfect' ? 'text-emerald-700' : status === 'good' ? 'text-blue-700' : 'text-amber-700'
                        )}>
                            <Sparkles size={15} /> {currentAnswer.selected_option?.score_value || 0} poin
                        </span>
                    ) : status === 'correct' ? (
                        <span className="flex items-center gap-1.5 text-emerald-700"><CheckCircle2 size={16} /> Benar</span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-red-700"><XCircle size={16} /> Salah</span>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => setShowNav(!showNav)}
                    aria-expanded={showNav}
                    aria-label={showNav ? 'Sembunyikan daftar soal' : 'Tampilkan daftar soal'}
                    className="st-button st-focus flex min-h-11 items-center justify-center gap-2 bg-white px-3 py-2 text-sm text-slate-900"
                >
                    <List size={17} />
                    <span className="hidden sm:inline">{showNav ? 'Tutup daftar' : 'Daftar soal'}</span>
                </button>
            </div>
        </div>
    )
}
