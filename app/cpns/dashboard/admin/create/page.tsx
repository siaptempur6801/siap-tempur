'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { ArrowLeft, Save, Loader2, Info, AlertCircle, ImageIcon, X } from 'lucide-react'
import { toast } from 'sonner'
import { createQuestion } from '@/app/actions/admin'
import { cn } from '@/lib/utils'

export default function CreateQuestionPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [type, setType] = useState('TWK')
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [selectedCategory, setSelectedCategory] = useState("")
    const [categories, setCategories] = useState<Record<string, string[]>>({
        'TWK': [],
        'TIU': [],
        'TKP': []
    })

    React.useEffect(() => {
        const fetchCategories = async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('tryout_configurations')
                .select('type, sub_category')
                .eq('is_active', true)
                .order('sort_order', { ascending: true })

            if (data && !error) {
                const catMap: Record<string, string[]> = {
                    'TWK': [],
                    'TIU': [],
                    'TKP': []
                }
                data.forEach(item => {
                    if (catMap[item.type]) {
                        catMap[item.type].push(item.sub_category)
                    }
                })
                setCategories(catMap)
            }
        }
        fetchCategories()
    }, [])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        formData.append('type', type)

        try {
            if (imageFile) {
                const supabase = createClient()
                const fileExt = imageFile.name.split('.').pop()
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

                const { error: uploadError } = await supabase.storage
                    .from('question-images')
                    .upload(fileName, imageFile)

                if (uploadError) {
                    throw new Error("Gagal mengupload gambar: " + uploadError.message)
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('question-images')
                    .getPublicUrl(fileName)

                formData.append('image_url', publicUrl)
            }

            const res = await createQuestion(formData)

            if (res.success) {
                toast.success(res.message)
                router.push('/cpns/dashboard/admin')
                router.refresh()
            } else {
                toast.error(res.message)
            }

        } catch (error: any) {
            console.error(error)
            toast.error("Gagal membuat soal")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full pb-10">
            <Link href="/cpns/dashboard/admin" className="inline-flex items-center text-gray-400 hover:text-gray-900 mb-6 font-bold transition-colors group">
                <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Kembali ke Manager
            </Link>

            <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border-2 border-gray-900 overflow-hidden">
                {/* Header Section */}
                <div className="p-8 border-b-2 border-gray-900 bg-gray-50/50 flex justify-between items-center">
                    <div>
                        <h1 className="font-handwriting text-3xl font-bold text-gray-900">Buat Soal Baru</h1>
                        <p className="text-gray-500 text-sm font-medium mt-1">Tambahkan konten eksklusif untuk Pejuang CPNS.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
                    {/* Admin Alert Header */}
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 m-4 sm:m-8 rounded-r-lg flex gap-3">
                        <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
                        <div>
                            <p className="text-sm font-bold text-blue-800">Mode Kontributor</p>
                            <p className="text-[11px] sm:text-xs text-blue-700">Soal akan langsung tersedia di Bank Soal setelah disimpan. Dukung rumus matematika dengan format <code>$rumus$</code> (inline) atau <code>$$rumus$$</code> (block).</p>
                        </div>
                    </div>

                    <div className="p-5 sm:p-8 space-y-8 sm:space-y-10">
                        {/* Tipe & Sub-Kategori Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Tipe Soal</label>
                                <div className="flex gap-2">
                                    {['TWK', 'TIU', 'TKP'].map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => {
                                                setType(t)
                                                setSelectedCategory("")
                                            }}
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
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full p-3.5 bg-white border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:outline-none font-bold text-gray-700 transition-all cursor-pointer"
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
                            <textarea
                                name="content"
                                required
                                rows={6}
                                className="w-full p-5 sm:p-6 text-lg sm:text-xl bg-white border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:outline-none font-medium leading-relaxed shadow-sm transition-all resize-none paper-lines"
                                placeholder="Tulis pertanyaan di sini..."
                            ></textarea>
                        </div>

                        {/* Image Upload Area */}
                        <div className="space-y-3">
                            <label className="block text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Gambar Soal (Opsional)</label>
                            {imagePreview ? (
                                <div className="relative inline-block border-2 border-gray-200 rounded-xl p-2 bg-gray-50 max-w-sm">
                                    <img src={imagePreview} alt="Preview" className="max-h-48 w-full object-contain rounded-lg" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImageFile(null)
                                            setImagePreview(null)
                                        }}
                                        className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-md transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative border-2 border-dashed border-gray-300 rounded-2xl p-8 hover:bg-gray-50 transition-colors flex flex-col items-center justify-center text-center group cursor-pointer max-w-sm">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                if (file.size > 2 * 1024 * 1024) {
                                                    toast.error("Ukuran gambar maksimal 2MB")
                                                    return
                                                }
                                                setImageFile(file)
                                                setImagePreview(URL.createObjectURL(file))
                                            }
                                        }}
                                    />
                                    <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-100 transition-all mb-4">
                                        <ImageIcon size={28} />
                                    </div>
                                    <div className="font-bold text-gray-700 text-sm">Klik atau drag gambar ke sini</div>
                                    <div className="text-xs text-gray-400 mt-1">PNG, JPG, JPEG (Maks. 2MB)</div>
                                </div>
                            )}
                        </div>

                        {/* Pilihan Jawaban Section */}
                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Pilihan & Kunci Jawaban</label>
                                <span className="text-[10px] text-gray-400 font-bold italic">* Pilih radio untuk menetapkan kunci jawaban</span>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                                    <div key={opt} className="group flex gap-4 items-center">
                                        {/* Radio Circle */}
                                        <div className="relative flex items-center justify-center">
                                            <input
                                                type="radio"
                                                name="correct_answer"
                                                value={opt}
                                                id={`key-${opt}`}
                                                required
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
                                                        defaultValue={0}
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
                                        <strong>Catatan TKP:</strong> Masukkan poin (1-5) untuk tiap pilihan. Sistem akan menyimpan sesuai input Anda.
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
                                className="w-full p-6 bg-blue-50/30 border-2 border-dashed border-blue-200 rounded-2xl focus:border-blue-500 focus:bg-white focus:outline-none font-medium transition-all leading-relaxed"
                                placeholder="Berikan konteks atau alasan kenapa jawaban tersebut benar..."
                            ></textarea>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-5 sm:p-8 bg-gray-50/50 flex justify-end items-center rounded-b-[2rem] border-t-2 border-gray-100">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full sm:w-auto bg-gray-900 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] hover:bg-gray-800 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Save size={22} />}
                            Simpan Soal Baru
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
