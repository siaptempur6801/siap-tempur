'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2, AlertCircle, Info } from 'lucide-react'
import { toast } from 'sonner'
import { updateQuestion } from '@/app/actions/admin'
import { cn } from '@/lib/utils'

export default function EditQuestionForm({ question }: { question: any }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [type, setType] = useState(question.type || 'TWK')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        formData.append('type', type)

        try {
            const res = await updateQuestion(question.id, formData)

            if (res.success) {
                toast.success(res.message)
                router.push('/dashboard/admin')
                router.refresh()
            } else {
                toast.error(res.message)
            }

        } catch (error: any) {
            console.error(error)
            toast.error("Gagal mengupdate soal")
        } finally {
            setLoading(false)
        }
    }

    const correctOption = question.options?.find((opt: any) => opt.is_correct)
    // Find index of correct option to determine A, B, C, D, E
    const correctLabel = ['A', 'B', 'C', 'D', 'E'][question.options?.indexOf(correctOption)] || 'A'

    const categories: Record<string, string[]> = {
        'TWK': ['Nasionalisme', 'Integritas', 'Bela Negara', 'Pilar Negara', 'Bahasa Indonesia'],
        'TIU': ['Analogi', 'Silogisme', 'Analitis', 'Berhitung', 'Deret Angka', 'Perbandingan Kuantitatif', 'Soal Cerita', 'Analogi Figural', 'Ketidaksamaan', 'Serial'],
        'TKP': ['Pelayanan Publik', 'Jejaring Kerja', 'Sosial Budaya', 'TIK', 'Profesionalisme', 'Anti Radikalisme']
    }

    return (
        <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
            {/* Admin Alert Header */}
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 m-4 sm:m-6 rounded-r-lg flex gap-3">
                <Info className="text-amber-500 shrink-0 mt-0.5" size={18} />
                <div>
                    <p className="text-sm font-bold text-amber-800">Admin Mode Aktif</p>
                    <p className="text-[11px] sm:text-xs text-amber-700">Mengedit ID: <code className="bg-amber-100 px-1 rounded">{question.id}</code>. Dampak langsung ke seluruh pengguna.</p>
                </div>
            </div>

            <div className="p-5 sm:p-8 space-y-8 sm:y-10">
                {/* Tipe & Sub-Kategori Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Tipe Soal</label>
                        <div className="flex gap-2">
                            {['TWK', 'TIU', 'TKP'].map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setType(t)}
                                    className={cn(
                                        "flex-1 py-3 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-2",
                                        type === t
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-[4px_4px_0px_0px_rgba(37,99,235,0.2)]'
                                            : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                                    )}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Materi / Sub-Kategori</label>
                        <select
                            name="category"
                            required
                            defaultValue={question.category}
                            className="w-full p-3.5 bg-gray-50/50 border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-none font-bold text-gray-700 transition-all cursor-pointer"
                        >
                            <option value="" disabled>Pilih Sub-Kategori...</option>
                            {categories[type]?.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Pertanyaan Section */}
                <div className="space-y-3">
                    <label className="block text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Narasi Pertanyaan</label>
                    <div className="relative group">
                        <textarea
                            name="content"
                            required
                            rows={6}
                            defaultValue={question.content}
                            className="w-full p-5 sm:p-6 text-lg sm:text-xl bg-white border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:outline-none font-medium leading-relaxed shadow-sm transition-all resize-none paper-lines"
                            placeholder="Tulis pertanyaan di sini..."
                        ></textarea>
                    </div>
                </div>

                {/* Pilihan Jawaban Section */}
                <div className="space-y-6">
                    <div className="flex justify-between items-end">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Pilihan & Kunci Jawaban</label>
                        <span className="text-[10px] text-gray-400 font-bold italic">* Pilih radio untuk menetapkan kunci jawaban</span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {['A', 'B', 'C', 'D', 'E'].map((opt, idx) => (
                            <div key={opt} className="group flex gap-4 items-center">
                                {/* Radio Circle */}
                                <div className="relative flex items-center justify-center">
                                    <input
                                        type="radio"
                                        name="correct_answer"
                                        value={opt}
                                        id={`key-${opt}`}
                                        required
                                        defaultChecked={correctLabel === opt}
                                        className="peer sr-only"
                                    />
                                    <label
                                        htmlFor={`key-${opt}`}
                                        className="w-10 h-10 rounded-xl border-2 border-gray-200 bg-white flex items-center justify-center font-black text-gray-400 cursor-pointer transition-all peer-checked:bg-green-500 peer-checked:border-green-600 peer-checked:text-white peer-checked:shadow-[4px_4px_0px_0px_rgba(34,197,94,0.2)] hover:border-gray-400"
                                    >
                                        {opt}
                                    </label>
                                </div>

                                {/* Text Input */}
                                <div className="flex-1 relative space-y-2">
                                    <textarea
                                        name={`option_${opt.toLowerCase()}`}
                                        required
                                        rows={1}
                                        defaultValue={question.options?.[idx]?.content || ''}
                                        className="w-full p-4 pl-5 bg-white border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:outline-none font-medium transition-all"
                                        placeholder={`Teks pilihan ${opt}...`}
                                    ></textarea>

                                    {type === 'TKP' && (
                                        <div className="flex items-center gap-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase">Poin:</label>
                                            <input
                                                type="number"
                                                name={`score_${opt.toLowerCase()}`}
                                                min="1"
                                                max="5"
                                                required
                                                defaultValue={question.options?.[idx]?.score_value || 0}
                                                className="w-16 p-1 text-sm font-bold bg-blue-50 border border-blue-100 rounded focus:border-blue-500 focus:outline-none text-blue-700"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {type === 'TKP' && (
                        <div className="p-4 bg-blue-50 border-2 border-blue-100 rounded-xl flex items-start gap-3">
                            <AlertCircle className="text-blue-500 shrink-0" size={18} />
                            <p className="text-xs font-medium text-blue-800 leading-relaxed">
                                <strong>Catatan TKP:</strong> Kunci yang dipilih akan mendapatkan poin maksimal (5). Poin lain akan diatur otomatis (4, 3, 2, 1) berdasarkan urutan default untuk menjaga integritas simulasi.
                            </p>
                        </div>
                    )}
                </div>

                {/* Pembahasan Section */}
                <div className="space-y-3">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Penjelasan & Pembahasan</label>
                    <textarea
                        name="explanation"
                        required
                        rows={6}
                        defaultValue={question.explanation}
                        className="w-full p-6 bg-blue-50/30 border-2 border-dashed border-blue-200 rounded-2xl focus:border-blue-500 focus:bg-white focus:outline-none font-medium transition-all leading-relaxed"
                        placeholder="Berikan konteks atau alasan kenapa jawaban tersebut benar..."
                    ></textarea>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-5 sm:p-8 bg-gray-50/50 flex flex-col-reverse sm:flex-row justify-between items-center gap-4 rounded-b-xl border-t-2 border-gray-100">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-full sm:w-auto text-gray-400 font-bold hover:text-gray-600 transition py-2"
                >
                    Batalkan
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto bg-gray-900 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] hover:bg-gray-800 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Save size={22} />}
                    Update Soal
                </button>
            </div>
        </form>
    )
}
