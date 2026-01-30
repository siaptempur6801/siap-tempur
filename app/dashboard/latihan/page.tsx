'use client'

import { startPractice, startTryout } from '@/app/actions/practice'
// import { Card } from '@/components/ui/card'
import { BookOpen, Brain, Users, ArrowRight, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// Fallback Card if not exists component
const PracticeCard = ({ title, type, description, icon: Icon, color, onClick, loading }: any) => (
    <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden" onClick={() => !loading && onClick(type)}>
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
            <Icon size={120} />
        </div>

        <div className="relative z-10 space-y-4">
            <div className={`w-12 h-12 rounded-lg ${color} bg-opacity-10 flex items-center justify-center`}>
                <Icon size={24} className={color.replace('bg-', 'text-')} />
            </div>

            <div>
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="text-muted-foreground text-sm mt-1">{description}</p>
            </div>

            <button disabled={loading} className="w-full mt-4 flex items-center justify-between text-sm font-medium p-2 rounded-lg hover:bg-secondary transition-colors">
                <span>Mulai Latihan</span>
                {loading ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
            </button>
        </div>
    </div>
)

export default function PracticeListingPage() {
    const [loadingType, setLoadingType] = useState<string | null>(null)
    const [loadingTryout, setLoadingTryout] = useState(false)
    const router = useRouter()

    const handleStart = async (type: 'TWK' | 'TIU' | 'TKP') => {
        try {
            setLoadingType(type)
            const result = await startPractice(type)

            if (result?.error) {
                toast.error(result.error)
                return
            }

            if (result?.success && result?.sessionId) {
                toast.success('Sesi latihan dibuat!')
                router.push(`/dashboard/latihan/${result.sessionId}`)
            } else {
                toast.error('Gagal mendapatkan ID sesi')
            }
        } catch (error) {
            console.error('Error in handleStart:', error)
            toast.error('Terjadi kesalahan sistem')
        } finally {
            setLoadingType(null)
        }
    }

    const handleStartTryout = async () => {
        try {
            setLoadingTryout(true)
            const result = await startTryout()

            if (result?.error) {
                toast.error(result.error)
                return
            }

            if (result?.success && result?.sessionId) {
                toast.success('Simulasi SKD dimulai!')
                router.push(`/dashboard/latihan/${result.sessionId}`)
            }
        } catch (error) {
            toast.error('Gagal memulai simulasi')
        } finally {
            setLoadingTryout(false)
        }
    }

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Latihan & Simulasi</h1>
                <p className="text-muted-foreground mt-2">
                    Pilih mode latihan parsial atau simulasi lengkap (Tryout) sesuai standar CAT BKN.
                </p>
            </div>

            {/* Tryout Banner */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Brain size={200} />
                </div>
                <div className="relative z-10 max-w-2xl space-y-4">
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium border border-white/20">
                        <Loader2 className="animate-spin" size={14} /> Simulasi SKD Lengkap
                    </div>
                    <h2 className="text-3xl font-bold">Simulasi SKD CPNS Mandiri</h2>
                    <p className="text-indigo-100 text-lg">
                        Simulasi lengkap 110 Soal (TWK, TIU, TKP) yang dapat dikerjakan kapan saja. Durasi dan penilaian sesuai standar resmi.
                    </p>
                    <button
                        onClick={handleStartTryout}
                        disabled={loadingTryout}
                        className="mt-4 bg-white text-indigo-600 hover:bg-indigo-50 px-6 py-3 rounded-lg font-bold shadow-lg transition-all flex items-center gap-2"
                    >
                        {loadingTryout ? 'Menyiapkan Soal...' : 'Mulai Simulasi SKD'}
                        {!loadingTryout && <ArrowRight size={18} />}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PracticeCard
                    title="Tes Wawasan Kebangsaan"
                    type="TWK"
                    description="Nasionalisme, Integritas, Bela Negara, Pilar Negara."
                    icon={BookOpen}
                    color="text-red-500"
                    loading={loadingType === 'TWK'}
                    onClick={handleStart}
                />
                <PracticeCard
                    title="Tes Intelegensi Umum"
                    type="TIU"
                    description="Verbal, Numerik, Figural, Logika Analitis."
                    icon={Brain}
                    color="text-blue-500"
                    loading={loadingType === 'TIU'}
                    onClick={handleStart}
                />
                <PracticeCard
                    title="Tes Karakteristik Pribadi"
                    type="TKP"
                    description="Pelayanan Publik, Jejaring Kerja, Sosial Budaya."
                    icon={Users}
                    color="text-green-500"
                    loading={loadingType === 'TKP'}
                    onClick={handleStart}
                />
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-4 text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-semibold mb-1">Catatan:</p>
                <ul className="list-disc list-inside space-y-1 opacity-90">
                    <li>Mode latihan ini tidak memiliki batasan waktu (Timer hanya sebagai penunjuk).</li>
                    <li>Skor akan dihitung setelah Anda menekan tombol "Selesai".</li>
                    <li>Jawaban tersimpan otomatis setiap kali Anda memilih opsi.</li>
                </ul>
            </div>
        </div>
    )
}
