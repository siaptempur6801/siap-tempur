import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default async function ResultPage({ params }: { params: { id: string } }) {
    const supabase = await createClient()
    const { data: session } = await supabase
        .from('test_sessions')
        .select('*')
        .eq('id', params.id)
        .single()

    if (!session) redirect('/dashboard')

    // Example Passing Grades
    const PASS_TWK = 65
    const PASS_TIU = 80
    const PASS_TKP = 166

    const passedTWK = session.score_twk >= PASS_TWK
    const passedTIU = session.score_tiu >= PASS_TIU
    const passedTKP = session.score_tkp >= PASS_TKP
    const isPassed = passedTWK && passedTIU && passedTKP

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold">Hasil Ujian</h2>
                <p className="text-muted-foreground">{session.mode === 'tryout' ? 'Tryout Akbar' : 'Latihan Mandiri'}</p>
            </div>

            <div className={`p-8 rounded-2xl border-2 text-center ${isPassed ? 'bg-green-500/10 border-green-500' : 'bg-red-500/10 border-red-500'}`}>
                <h3 className="text-4xl font-extrabold mb-2 text-foreground">
                    {isPassed ? 'MEMENUHI SYARAT' : 'TIDAK MEMENUHI SYARAT'}
                </h3>
                <p className="text-lg opacity-80">Total SKD: {session.total_score}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ScoreCard
                    title="TWK"
                    score={session.score_twk}
                    threshold={PASS_TWK}
                    passed={passedTWK}
                    fullTitle="Tes Wawasan Kebangsaan"
                />
                <ScoreCard
                    title="TIU"
                    score={session.score_tiu}
                    threshold={PASS_TIU}
                    passed={passedTIU}
                    fullTitle="Tes Intelegensia Umum"
                />
                <ScoreCard
                    title="TKP"
                    score={session.score_tkp}
                    threshold={PASS_TKP}
                    passed={passedTKP}
                    fullTitle="Tes Karakteristik Pribadi"
                />
            </div>

            <div className="flex justify-center pt-8">
                <Link
                    href="/dashboard"
                    className="px-8 py-3 rounded-lg bg-secondary hover:bg-secondary/80 font-medium transition"
                >
                    Kembali ke Dashboard
                </Link>
            </div>
        </div>
    )
}

function ScoreCard({ title, score, threshold, passed, fullTitle }: any) {
    return (
        <div className="p-6 rounded-xl bg-secondary/20 border border-border">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="text-2xl font-bold">{title}</h4>
                    <p className="text-xs text-muted-foreground">{fullTitle}</p>
                </div>
                {passed ?
                    <CheckCircle className="text-green-500 w-6 h-6" /> :
                    <XCircle className="text-red-500 w-6 h-6" />
                }
            </div>
            <div className="text-4xl font-mono font-bold mb-2">
                {score}
            </div>
            <div className="text-sm flex items-center gap-2">
                <span className="text-muted-foreground">Passing Grade:</span>
                <span className="font-bold">{threshold}</span>
            </div>
        </div>
    )
}
