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
        } catch {
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
        } catch {
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
        } catch {
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
        } catch {
            toast.error("Terjadi kesalahan sistem", { id: loadingToast })
        } finally {
            setIsAdding(false)
        }
    }

    return (
        <div className="grid grid-cols-1 gap-8 pb-12 lg:grid-cols-3">

            {/* Left: Configuration List */}
            <div className="lg:col-span-2 space-y-4">
                <div className="relative overflow-hidden border-2 border-gray-900 bg-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                    <PaperBackground />

                    <div className="sticky top-0 z-10 flex flex-col gap-3 border-b-2 border-gray-900 bg-gray-100/90 p-6 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
                        <h2 className="font-handwriting text-2xl font-black text-gray-900">Kategori Aktif</h2>
                        <span className={cn(
                            "w-fit border-2 px-4 py-2 text-sm font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                            isValidTotal ? "border-gray-900 bg-gray-900 text-white" : "border-gray-900 bg-white text-gray-900"
                        )}>
                            Total: {totalQuestions} Soal
                        </span>
                    </div>

                    <div className="relative z-10 max-h-[600px] space-y-3 overflow-y-auto p-4 sm:p-6">
                        {configs.map((config, idx) => (
                            <div
                                key={config.id}
                                className={cn(
                                    "flex flex-col gap-3 border-2 p-3 transition-all sm:flex-row sm:items-center",
                                    config.is_active
                                        ? "border-gray-900 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.12)] hover:-translate-y-0.5"
                                        : "border-gray-300 bg-gray-100 opacity-60 grayscale"
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
                                                "border px-2 py-0.5 text-[10px] font-black uppercase",
                                                "border-gray-900 bg-gray-100 text-gray-900"
                                            )}>
                                                {config.type}
                                            </span>
                                            <span className="text-xs font-bold text-gray-400">Urutan: #{config.sort_order}</span>
                                        </div>
                                        <h3 className="text-sm font-bold leading-tight text-gray-800 sm:text-base">
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
                                            className="w-16 rounded-md border-2 border-gray-300 p-2 text-center font-black focus:border-gray-900 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleToggleActive(config.id, config.is_active)}
                                            className={cn(
                                                "flex h-10 w-10 shrink-0 items-center justify-center border-2 transition-all",
                                                config.is_active
                                                    ? "border-gray-900 bg-white text-gray-900 hover:bg-gray-100"
                                                    : "border-gray-900 bg-gray-900 text-white hover:bg-gray-700"
                                            )}
                                            title={config.is_active ? "Nonaktifkan Kategori" : "Aktifkan Kategori"}
                                        >
                                            {config.is_active ? <X size={20} /> : <Check size={20} />}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(config.id, config.sub_category)}
                                            className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-gray-900 bg-white text-gray-900 transition-all hover:bg-gray-100"
                                            title="Hapus Kategori Permanen"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="relative z-10 flex justify-end border-t-2 border-gray-900 bg-gray-100 p-6">
                        <button
                            onClick={handleSaveOrder}
                            disabled={isSaving}
                            className="flex items-center gap-2 rounded-md border-2 border-gray-900 bg-gray-900 px-8 py-3 font-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.25)] transition-all hover:-translate-y-1 hover:bg-gray-800 active:translate-y-0 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Simpan Struktur Tryout
                        </button>
                    </div>
                </div>
            </div>

            {/* Right: Add New Category & Sidebar Rules */}
            <div className="space-y-6">
                <div className="relative overflow-hidden border-2 border-gray-900 bg-white p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] sm:p-8">
                    <PaperBackground />
                    <div className="relative z-10">
                        <h3 className="mb-4 border-b-2 border-gray-900 pb-2 font-handwriting text-2xl font-black text-gray-900">Tambah Kategori</h3>

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
                                                    ? "border-gray-900 bg-gray-900 text-white"
                                                    : "border-gray-900 bg-white text-gray-700 hover:bg-gray-100"
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
                                    className="w-full rounded-md border-2 border-gray-900 p-3 font-bold placeholder:font-normal placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isAdding}
                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border-2 border-gray-900 bg-white p-3 font-black text-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 hover:bg-gray-100 disabled:opacity-50"
                            >
                                {isAdding ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                                Tambahkan Topik
                            </button>
                        </form>
                    </div>
                </div>

                <div className="relative overflow-hidden border-2 border-gray-900 bg-gray-100 p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] sm:p-8">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-sm animate-in overflow-hidden border-2 border-gray-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] duration-200 zoom-in-95 sm:p-8">
                        <PaperBackground />
                        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                            <div className="flex h-16 w-16 items-center justify-center border-2 border-gray-900 bg-gray-100 text-gray-900">
                                <AlertTriangle size={32} />
                            </div>
                            <div>
                                <h3 className="font-handwriting font-black text-2xl text-gray-900 leading-tight">Hapus Kategori?</h3>
                                <p className="mt-2 font-medium text-gray-600">Anda yakin ingin menghapus <strong className="text-gray-900">{itemToDelete.name}</strong>? Aksi ini akan mempengaruhi pembuatan tryout selanjutnya.</p>
                            </div>
                            <div className="flex gap-3 w-full mt-4">
                                <button
                                    onClick={() => setItemToDelete(null)}
                                    disabled={isDeleting}
                                    className="flex-1 rounded-md border-2 border-gray-900 px-4 py-2.5 font-bold text-gray-900 transition-colors hover:bg-gray-100 focus:outline-none"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-md border-2 border-gray-900 bg-gray-900 px-4 py-2.5 font-bold text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.25)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none focus:outline-none"
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
