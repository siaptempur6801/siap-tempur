'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Plus, Loader2, ArrowUp, ArrowDown, Trash2, Check, X, GripVertical, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { updateTryoutConfigurations, addTryoutConfiguration, toggleTryoutConfiguration, deleteTryoutConfiguration } from '@/app/actions/admin'
import { cn } from '@/lib/utils'
import PaperBackground from '@/components/PaperBackground'

interface TryoutConfig {
    id: string
    type: string
    sub_category: string
    question_count: number
    sort_order: number
    is_active: boolean
}

export default function TryoutConfigClient({ initialConfigs }: { initialConfigs: TryoutConfig[] }) {
    const router = useRouter()

    // We maintain a local state for the ordered items.
    const [configs, setConfigs] = useState<TryoutConfig[]>(initialConfigs)
    const [isSaving, setIsSaving] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<{ id: string, name: string } | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Form state for new category
    const [newType, setNewType] = useState('TWK')
    const [newCategory, setNewCategory] = useState('')

    // Reset local state if data from server changes
    useEffect(() => {
        setConfigs(initialConfigs)
    }, [initialConfigs])

    // Compute total selected questions
    const totalQuestions = configs.reduce((sum, c) => sum + (c.is_active ? c.question_count : 0), 0)
    const isValidTotal = totalQuestions === 110

    const moveItem = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return
        if (direction === 'down' && index === configs.length - 1) return

        const newConfigs = [...configs]
        const itemToMove = newConfigs[index]

        // Swap items
        newConfigs.splice(index, 1)
        newConfigs.splice(direction === 'up' ? index - 1 : index + 1, 0, itemToMove)

        // Re-assign sort_orders sequentially based on new array order
        const reordered = newConfigs.map((c, i) => ({ ...c, sort_order: i + 1 }))
        setConfigs(reordered)
    }

    const handleChangeCount = (id: string, count: number) => {
        setConfigs(configs.map(c => c.id === id ? { ...c, question_count: count } : c))
    }

    const handleToggleActive = async (id: string, currentlyActive: boolean) => {
        const loadingToast = toast.loading(`${currentlyActive ? 'Menonaktifkan' : 'Mengaktifkan'} kategori...`)

        // Optimistic update
        setConfigs(configs.map(c => c.id === id ? { ...c, is_active: !currentlyActive } : c))

        try {
            const res = await toggleTryoutConfiguration(id, !currentlyActive)
            if (res.success) {
                toast.success(res.message, { id: loadingToast })
            } else {
                toast.error(res.message, { id: loadingToast })
                // Revert optimistic update
                setConfigs(configs.map(c => c.id === id ? { ...c, is_active: currentlyActive } : c))
            }
        } catch (error) {
            toast.error("Gagal mengubah status kategori", { id: loadingToast })
            setConfigs(configs.map(c => c.id === id ? { ...c, is_active: currentlyActive } : c))
        }
    }

    const handleDeleteClick = (id: string, name: string) => {
        setItemToDelete({ id, name })
    }

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        setIsDeleting(true)
        const loadingToast = toast.loading(`Menghapus kategori...`)

        try {
            const res = await deleteTryoutConfiguration(itemToDelete.id)
            if (res.success) {
                toast.success(res.message, { id: loadingToast })
                setConfigs(configs.filter(c => c.id !== itemToDelete.id))
                router.refresh()
            } else {
                toast.error(res.message, { id: loadingToast })
            }
        } catch (error) {
            toast.error("Gagal menghapus kategori", { id: loadingToast })
        } finally {
            setIsDeleting(false)
            setItemToDelete(null)
        }
    }

    const handleSaveOrder = async () => {
        setIsSaving(true)
        const loadingToast = toast.loading("Menyimpan konfigurasi...")

        try {
            // Send the whole array of configs with their updated question_counts and sort_orders
            const payload = configs.map(c => ({
                id: c.id,
                type: c.type,
                sub_category: c.sub_category,
                question_count: c.question_count,
                sort_order: c.sort_order,
                is_active: c.is_active
            }))

            const res = await updateTryoutConfigurations(payload)
            if (res.success) {
                toast.success(res.message, { id: loadingToast })
                router.refresh()
            } else {
                toast.error(res.message, { id: loadingToast })
            }
        } catch (error) {
            toast.error("Gagal menyimpan konfigurasi", { id: loadingToast })
        } finally {
            setIsSaving(false)
        }
    }

    const handleAddNew = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newCategory.trim()) {
            toast.error("Nama materi tidak boleh kosong");
            return;
        }

        setIsAdding(true)
        const loadingToast = toast.loading("Menambahkan kategori...")

        try {
            const res = await addTryoutConfiguration(newType, newCategory.trim())
            if (res.success) {
                toast.success(res.message, { id: loadingToast })
                setNewCategory('') // Reset input
                router.refresh() // The server component will refetch and push new data via initialConfigs
            } else {
                toast.error(res.message, { id: loadingToast })
            }
        } catch (error) {
            toast.error("Terjadi kesalahan sistem", { id: loadingToast })
        } finally {
            setIsAdding(false)
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">

            {/* Left: Configuration List */}
            <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border-2 border-gray-900 overflow-hidden relative">
                    <PaperBackground />

                    <div className="p-6 sm:p-8 relative z-10 border-b-2 border-gray-900 bg-gray-50/80 backdrop-blur-sm flex justify-between items-center sticky top-0">
                        <h2 className="text-xl font-black font-handwriting">Kategori Aktif (110 Total Needed)</h2>
                        <span className={cn(
                            "px-4 py-2 text-sm font-bold rounded-xl border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                            isValidTotal ? "bg-green-300 text-green-900 border-green-800" : "bg-red-200 text-red-900 border-red-800"
                        )}>
                            Total: {totalQuestions} Soal
                        </span>
                    </div>

                    <div className="p-4 sm:p-6 relative z-10 space-y-3 max-h-[600px] overflow-y-auto">
                        {configs.map((config, idx) => (
                            <div
                                key={config.id}
                                className={cn(
                                    "flex flex-col sm:flex-row gap-3 sm:items-center p-3 rounded-2xl border-2 transition-all",
                                    config.is_active
                                        ? "bg-white border-gray-200 shadow-sm hover:border-blue-400"
                                        : "bg-gray-50 border-gray-200 opacity-60 grayscale"
                                )}
                            >
                                <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                                    <div className="flex flex-col gap-1 items-center shrink-0">
                                        <button
                                            onClick={() => moveItem(idx, 'up')}
                                            disabled={idx === 0 || !config.is_active}
                                            className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                        >
                                            <ArrowUp size={16} />
                                        </button>
                                        <button
                                            onClick={() => moveItem(idx, 'down')}
                                            disabled={idx === configs.length - 1 || !config.is_active}
                                            className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                        >
                                            <ArrowDown size={16} />
                                        </button>
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={cn(
                                                "text-[10px] font-black uppercase px-2 py-0.5 rounded border",
                                                config.type === 'TWK' ? 'bg-red-50 text-red-600 border-red-200' :
                                                    config.type === 'TIU' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                        'bg-green-50 text-green-600 border-green-200'
                                            )}>
                                                {config.type}
                                            </span>
                                            <span className="text-xs text-gray-400 font-bold">Urutan: #{config.sort_order}</span>
                                        </div>
                                        <h3 className="font-bold text-gray-800 text-sm sm:text-base leading-tight">
                                            {config.sub_category}
                                        </h3>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto shrink-0 pl-11 sm:pl-0">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-bold text-gray-500">Soal:</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="110"
                                            value={config.question_count}
                                            onChange={(e) => handleChangeCount(config.id, parseInt(e.target.value) || 0)}
                                            disabled={!config.is_active}
                                            className="w-16 p-2 text-center font-black border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleToggleActive(config.id, config.is_active)}
                                            className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all shrink-0",
                                                config.is_active
                                                    ? "bg-red-50 border-red-200 text-red-500 hover:bg-red-100 hover:border-red-300"
                                                    : "bg-green-50 border-green-200 text-green-600 hover:bg-green-100 hover:border-green-300"
                                            )}
                                            title={config.is_active ? "Nonaktifkan Kategori" : "Aktifkan Kategori"}
                                        >
                                            {config.is_active ? <X size={20} /> : <Check size={20} />}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(config.id, config.sub_category)}
                                            className="w-10 h-10 rounded-xl flex items-center justify-center border-2 border-red-200 bg-white text-red-500 hover:bg-red-50 hover:border-red-300 transition-all shrink-0"
                                            title="Hapus Kategori Permanen"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 bg-gray-50 border-t-2 border-gray-900 relative z-10 flex justify-end">
                        <button
                            onClick={handleSaveOrder}
                            disabled={isSaving}
                            className="bg-gray-900 text-white px-8 py-3 rounded-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:bg-gray-800 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Simpan Struktur Tryout
                        </button>
                    </div>
                </div>
            </div>

            {/* Right: Add New Category & Sidebar Rules */}
            <div className="space-y-6">
                <div className="bg-[#e0e7ff] rounded-[2rem] p-6 sm:p-8 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.2)] border-2 border-gray-900 relative overflow-hidden">
                    <PaperBackground />
                    <div className="relative z-10">
                        <h3 className="font-handwriting text-2xl font-black mb-4 text-gray-900 border-b-2 border-gray-900 pb-2">Tambah Kategori</h3>

                        <form onSubmit={handleAddNew} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-500 uppercase">Tipe Materi</label>
                                <div className="flex gap-2">
                                    {['TWK', 'TIU', 'TKP'].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setNewType(t)}
                                            className={cn(
                                                "flex-1 py-2 text-sm font-bold border-2 rounded-lg transition-all",
                                                newType === t
                                                    ? "bg-blue-600 text-white border-blue-600"
                                                    : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                                            )}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-500 uppercase">Nama Sub-Kategori / Topik</label>
                                <input
                                    type="text"
                                    required
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    placeholder="Cth: Penalaran Kritis"
                                    className="w-full p-3 border-2 border-gray-900 rounded-xl focus:border-blue-600 focus:outline-none font-bold placeholder:text-gray-400 placeholder:font-normal"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isAdding}
                                className="w-full mt-4 bg-white text-gray-900 border-2 border-gray-900 p-3 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-gray-50 hover:-translate-y-0.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
                            >
                                {isAdding ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                                Tambahkan Topik
                            </button>
                        </form>
                    </div>
                </div>

                <div className="bg-[#fff9c4] rounded-[2rem] p-6 sm:p-8 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.2)] border-2 border-gray-900 relative overflow-hidden">
                    <PaperBackground />
                    <div className="relative z-10 text-gray-800 space-y-3">
                        <h4 className="font-handwriting text-xl font-black mb-2 flex items-center gap-2">
                            <GripVertical size={20} className="text-gray-400" /> Aturan SKD CPNS
                        </h4>
                        <ul className="text-sm font-medium space-y-2 list-disc list-inside">
                            <li>TWK terdiri dari 30 Soal (Bobot: 5)</li>
                            <li>TIU terdiri dari 35 Soal (Bobot: 5)</li>
                            <li>TKP terdiri dari 45 Soal (Bobot 1-5)</li>
                            <li className="font-bold text-gray-900">Total soal keseluruhan: 110 Butir</li>
                            <li>Topik yang dinonaktifkan tidak akan ditarik ke dalam simulasi tryout.</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Custom Delete Confirmation Modal */}
            {itemToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2rem] p-6 sm:p-8 max-w-sm w-full border-2 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden animate-in zoom-in-95 duration-200">
                        <PaperBackground />
                        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center border-2 border-red-500 text-red-500">
                                <AlertTriangle size={32} />
                            </div>
                            <div>
                                <h3 className="font-handwriting font-black text-2xl text-gray-900 leading-tight">Hapus Kategori?</h3>
                                <p className="text-gray-600 mt-2 font-medium">Anda yakin ingin menghapus <strong className="text-red-500">{itemToDelete.name}</strong>? Aksi ini akan mempengaruhi pembuatan tryout selanjutnya.</p>
                            </div>
                            <div className="flex gap-3 w-full mt-4">
                                <button
                                    onClick={() => setItemToDelete(null)}
                                    disabled={isDeleting}
                                    className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-300 font-bold text-gray-600 hover:bg-gray-50 focus:outline-none transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="flex-1 px-4 py-2.5 rounded-xl border-2 border-red-600 bg-red-500 text-white font-bold hover:bg-red-600 shadow-[2px_2px_0px_0px_rgba(185,28,28,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] focus:outline-none transition-all flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? <Loader2 className="animate-spin" size={18} /> : 'Ya, Hapus'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
