import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, ArrowLeft, Trophy } from 'lucide-react'
import ResultReviewClient from '@/components/practice/ResultReviewClient'

export default async function PracticeResultPage({ params }: { params: Promise<{ sessionId: string }> }) {
    const supabase = await createClient()
    const { sessionId } = await params

    // 1. Fetch Session Result
    const { data: session, error: sessionError } = await supabase
        .from('test_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

    if (sessionError || !session) {
        redirect('/dashboard/latihan')
    }

    if (session.status !== 'completed') {
        // If not completed, redirect back to practice
        // redirect(`/dashboard/latihan/${sessionId}`)
        // OR just show a message "Session not finished"
    }

    // 2. Fetch Detailed Answers for Review
    const { data: rawAnswers, error: answersError } = await supabase
        .from('test_answers')
        .select(`
            id,
            question_id,
            option_id,
            questions (
                id,
                content,
                explanation,
                type,
                category,
                options (
                    id,
                    content,
                    is_correct,
                    score_value
                )
            ),
            selected_option: options (
                id,
                content,
                is_correct,
                score_value
            )
        `)
        .eq('session_id', sessionId)

    // Normalize selected_option from array to single object
    const answers = rawAnswers?.map((ans: any) => ({
        ...ans,
        selected_option: Array.isArray(ans.selected_option) ? ans.selected_option[0] || null : ans.selected_option
    }))

    if (answersError) return <div>Error loading results</div>

    // Helper to determine if answer was "correct" (or high score for TKP)
    const getReviewStatus = (ans: any) => {
        const type = ans.questions.type
        if (type === 'TKP') {
            const score = ans.selected_option?.score_value || 0
            if (score === 5) return 'perfect'
            if (score >= 3) return 'good'
            return 'bad'
        } else {
            return ans.selected_option?.is_correct ? 'correct' : 'wrong'
        }
    }

    // Determine Display Mode
    const firstQ = answers?.[0]?.questions
    const qData = Array.isArray(firstQ) ? firstQ[0] : firstQ
    const practiceType = qData?.type

    const showAll = session.mode === 'tryout'

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-20">
            {/* Header / Score Card */}
            <div className="bg-card border border-border rounded-xl p-8 text-center shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-primary to-purple-500" />

                <h1 className="text-2xl font-bold mb-6">Hasil Latihan {session.mode === 'practice' ? '' : 'Tryout'}</h1>

                <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16">
                    {/* Total Score */}
                    <div className="relative">
                        <div className="w-32 h-32 rounded-full border-4 border-primary flex items-center justify-center bg-primary/5">
                            <div>
                                <span className="text-4xl font-extrabold text-primary">{session.total_score}</span>
                                <div className="text-xs text-muted-foreground uppercase font-bold mt-1">Total Skor</div>
                            </div>
                        </div>
                        {session.is_passed && (
                            <div className="absolute -top-2 -right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1">
                                <Trophy size={12} /> LULUS
                            </div>
                        )}
                    </div>

                    {/* Breakdown */}
                    <div className="flex gap-8 text-left justify-center flex-wrap">
                        {(showAll || practiceType === 'TWK') && (
                            <div>
                                <div className="text-sm text-muted-foreground">TWK</div>
                                <div className={`text-xl font-bold ${session.score_twk >= 65 ? 'text-green-600' : 'text-red-500'}`}>
                                    {session.score_twk} <span className="text-xs text-muted-foreground font-normal">/ {
                                        // Calculate max TWK score dynamically
                                        (answers?.filter((a: any) => (Array.isArray(a.questions) ? a.questions[0] : a.questions).type === 'TWK').length || 0) * 5
                                    }</span>
                                </div>
                            </div>
                        )}
                        {(showAll || practiceType === 'TIU') && (
                            <div>
                                <div className="text-sm text-muted-foreground">TIU</div>
                                <div className={`text-xl font-bold ${session.score_tiu >= 80 ? 'text-green-600' : 'text-red-500'}`}>
                                    {session.score_tiu} <span className="text-xs text-muted-foreground font-normal">/ {
                                        // Calculate max TIU score dynamically
                                        (answers?.filter((a: any) => (Array.isArray(a.questions) ? a.questions[0] : a.questions).type === 'TIU').length || 0) * 5
                                    }</span>
                                </div>
                            </div>
                        )}
                        {(showAll || practiceType === 'TKP') && (
                            <div>
                                <div className="text-sm text-muted-foreground">TKP</div>
                                <div className={`text-xl font-bold ${session.score_tkp >= 166 ? 'text-green-600' : 'text-red-500'}`}>
                                    {session.score_tkp} <span className="text-xs text-muted-foreground font-normal">/ {
                                        // Calculate max TKP score dynamically (questions * 5)
                                        (answers?.filter((a: any) => (Array.isArray(a.questions) ? a.questions[0] : a.questions).type === 'TKP').length || 0) * 5
                                    }</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border flex justify-center">
                    <Link href="/dashboard/latihan" className="flex items-center gap-2 text-primary hover:underline font-medium">
                        <ArrowLeft size={16} /> Kembali ke Daftar Latihan
                    </Link>
                </div>
            </div>

            {/* Answer Review Component */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <CheckCircle2 className="text-primary" /> Pembahasan Soal
                </h2>

                <ResultReviewClient answers={answers || []} />
            </div>
        </div>
    )
}
