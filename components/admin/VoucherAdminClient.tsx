'use client'

import { useMemo, useState, useTransition } from 'react'
import { Check, Copy, Edit, Loader2, Plus, Save, Ticket, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { createVoucher, deleteVoucher, toggleVoucher, updateVoucher } from '@/app/actions/admin'

type VoucherClaim = {
    id: string
    user_email: string | null
    claimed_at: string
    profiles?: { full_name?: string | null } | { full_name?: string | null }[] | null
}

type Voucher = {
    id: string
    code: string
    quota_amount: number
    max_uses: number
    used_count: number
    expires_at: string | null
    is_active: boolean
    created_at: string
    voucher_claims?: VoucherClaim[]
}

interface VoucherAdminClientProps {
    vouchers: Voucher[]
}

function formatDate(value?: string | null) {
    if (!value) return 'Tidak ada'
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
    }).format(new Date(value))
}

function getClaimName(claim: VoucherClaim) {
    const profile = Array.isArray(claim.profiles) ? claim.profiles[0] : claim.profiles
    return profile?.full_name || claim.user_email || 'User'
}

function VoucherCreateButton({
    onClick,
}: {
    onClick: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-2 rounded-md border-2 border-gray-900 bg-gray-900 px-5 py-3 font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 hover:bg-gray-800"
        >
            <Plus size={18} />
            Buat Voucher
        </button>
    )
}

export function VoucherCreateModal({
    isOpen,
    isPending,
    onClose,
    action,
}: {
    isOpen: boolean
    isPending: boolean
    onClose: () => void
    action: (formData: FormData) => void
}) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-md border-2 border-gray-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 border-2 border-gray-900 bg-white p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5"
                >
                    <X size={16} />
                </button>
                <h2 className="pr-12 font-handwriting text-3xl font-black text-gray-900">Buat Voucher</h2>
                <p className="mt-1 text-sm font-medium text-gray-600">
                    Buat kode baru untuk menambahkan token tryout ke user.
                </p>

                <form action={action} className="mt-5 space-y-4">
                    <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Kode</label>
                        <input name="code" required placeholder="AKBAR2026" className="w-full rounded-md border-2 border-gray-300 px-4 py-3 font-mono font-black uppercase outline-none focus:border-gray-900" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Token</label>
                            <input name="quota_amount" type="number" min="1" defaultValue="1" required className="w-full rounded-md border-2 border-gray-300 px-4 py-3 font-bold outline-none focus:border-gray-900" />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Max</label>
                            <input name="max_uses" type="number" min="1" defaultValue="1" required className="w-full rounded-md border-2 border-gray-300 px-4 py-3 font-bold outline-none focus:border-gray-900" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Expired</label>
                        <input name="expires_at" type="datetime-local" className="w-full rounded-md border-2 border-gray-300 px-4 py-3 font-bold outline-none focus:border-gray-900" />
                    </div>
                    <label className="flex items-center gap-3 font-bold text-gray-800">
                        <input name="is_active" type="checkbox" defaultChecked className="h-5 w-5 accent-gray-900" />
                        Aktifkan langsung
                    </label>
                    <button disabled={isPending} className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-gray-900 bg-gray-900 px-5 py-3 font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 disabled:opacity-60">
                        {isPending ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                        Buat Voucher
                    </button>
                </form>
            </div>
        </div>
    )
}

export function VoucherCreateController() {
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    const handleCreate = (formData: FormData) => {
        startTransition(async () => {
            const result = await createVoucher(formData)
            if (result.success) {
                toast.success(result.message)
                setIsCreateOpen(false)
            } else {
                toast.error(result.message)
            }
        })
    }

    return (
        <>
            <VoucherCreateButton onClick={() => setIsCreateOpen(true)} />
            <VoucherCreateModal
                isOpen={isCreateOpen}
                isPending={isPending}
                onClose={() => setIsCreateOpen(false)}
                action={handleCreate}
            />
        </>
    )
}

export default function VoucherAdminClient({ vouchers }: VoucherAdminClientProps) {
    const [selectedVoucherId, setSelectedVoucherId] = useState(vouchers[0]?.id || '')
    const [now] = useState(() => Date.now())
    const [isEditing, setIsEditing] = useState(false)
    const [voucherToDelete, setVoucherToDelete] = useState<Voucher | null>(null)
    const [isPending, startTransition] = useTransition()

    const selectedVoucher = useMemo(
        () => vouchers.find((voucher) => voucher.id === selectedVoucherId) || vouchers[0] || null,
        [selectedVoucherId, vouchers]
    )

    const summary = useMemo(() => {
        return {
            total: vouchers.length,
            active: vouchers.filter((voucher) => voucher.is_active).length,
            claims: vouchers.reduce((sum, voucher) => sum + (voucher.used_count || 0), 0),
            tokens: vouchers.reduce((sum, voucher) => sum + ((voucher.used_count || 0) * (voucher.quota_amount || 0)), 0),
        }
    }, [vouchers])

    const handleToggle = (id: string, nextActive: boolean) => {
        startTransition(async () => {
            const result = await toggleVoucher(id, nextActive)
            if (result.success) toast.success(result.message)
            else toast.error(result.message)
        })
    }

    const handleUpdate = (id: string, formData: FormData) => {
        startTransition(async () => {
            const result = await updateVoucher(id, formData)
            if (result.success) {
                toast.success(result.message)
                setIsEditing(false)
            } else {
                toast.error(result.message)
            }
        })
    }

    const handleDelete = () => {
        if (!voucherToDelete) return

        startTransition(async () => {
            const result = await deleteVoucher(voucherToDelete.id)
            if (result.success) {
                toast.success(result.message)
                setVoucherToDelete(null)
                setSelectedVoucherId('')
            } else {
                toast.error(result.message)
            }
        })
    }

    const copyCode = async (code: string) => {
        await navigator.clipboard.writeText(code)
        toast.success(`Kode ${code} disalin`)
    }

    return (
        <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-4">
                {[
                    ['Total Voucher', summary.total],
                    ['Voucher Aktif', summary.active],
                    ['Total Klaim', summary.claims],
                    ['Token Diberikan', summary.tokens],
                ].map(([label, value]) => (
                    <div key={label} className="border-2 border-gray-900 bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <p className="text-sm font-bold uppercase tracking-wide text-gray-500">{label}</p>
                        <p className="mt-2 font-handwriting text-4xl font-black text-gray-900">{value}</p>
                    </div>
                ))}
            </div>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-4">
                    {vouchers.length === 0 ? (
                        <div className="border-2 border-dashed border-gray-900 bg-white p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.12)]">
                            <Ticket className="mx-auto h-12 w-12 text-gray-500" />
                            <h2 className="mt-4 font-handwriting text-3xl font-black text-gray-900">Belum ada voucher</h2>
                            <p className="mt-2 text-sm font-medium text-gray-600">Klik tombol Buat Voucher di kanan atas untuk menambahkan kode baru.</p>
                        </div>
                    ) : (
                        vouchers.map((voucher) => {
                            const isSelected = selectedVoucher?.id === voucher.id
                            const isExpired = voucher.expires_at ? new Date(voucher.expires_at).getTime() < now : false
                            return (
                                <button
                                    key={voucher.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedVoucherId(voucher.id)
                                        setIsEditing(false)
                                    }}
                                    className={`w-full border-2 p-5 text-left transition-all ${
                                        isSelected
                                            ? 'translate-x-1 -translate-y-1 border-gray-900 bg-gray-900 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.25)]'
                                            : 'border-gray-900 bg-white text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5'
                                    }`}
                                >
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono text-xl font-black">{voucher.code}</span>
                                                <span className={`border px-2 py-0.5 text-[10px] font-black uppercase ${isSelected ? 'border-white' : 'border-gray-900'}`}>
                                                    {voucher.is_active ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                                {isExpired ? (
                                                    <span className={`border px-2 py-0.5 text-[10px] font-black uppercase ${isSelected ? 'border-white' : 'border-gray-900'}`}>
                                                        Expired
                                                    </span>
                                                ) : null}
                                            </div>
                                            <p className={`mt-2 text-sm font-medium ${isSelected ? 'text-gray-200' : 'text-gray-600'}`}>
                                                {voucher.quota_amount} token | {voucher.used_count}/{voucher.max_uses} klaim | Exp: {formatDate(voucher.expires_at)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-2xl font-black ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                                                {Math.max(0, voucher.max_uses - voucher.used_count)}
                                            </span>
                                            <span className={`text-xs font-bold uppercase ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                                                sisa
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            )
                        })
                    )}
                </div>

                <aside className="space-y-6">
                    {selectedVoucher ? (
                        <div className="border-2 border-gray-900 bg-gray-100 p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="font-handwriting text-3xl font-black text-gray-900">
                                        {isEditing ? 'Edit Voucher' : 'Detail Klaim'}
                                    </h2>
                                    <p className="mt-1 font-mono text-sm font-black text-gray-700">{selectedVoucher.code}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsEditing(!isEditing)} className="border-2 border-gray-900 bg-white p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        {isEditing ? <X size={16} /> : <Edit size={16} />}
                                    </button>
                                    <button onClick={() => copyCode(selectedVoucher.code)} className="border-2 border-gray-900 bg-white p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        <Copy size={16} />
                                    </button>
                                </div>
                            </div>

                            {isEditing ? (
                                <form action={(formData) => handleUpdate(selectedVoucher.id, formData)} className="mt-5 space-y-4">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Kode</label>
                                        <input name="code" required defaultValue={selectedVoucher.code} className="w-full rounded-md border-2 border-gray-300 px-4 py-3 font-mono font-black uppercase outline-none focus:border-gray-900" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Token</label>
                                            <input name="quota_amount" type="number" min="1" defaultValue={selectedVoucher.quota_amount} required className="w-full rounded-md border-2 border-gray-300 px-4 py-3 font-bold outline-none focus:border-gray-900" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Max</label>
                                            <input name="max_uses" type="number" min={Math.max(1, selectedVoucher.used_count)} defaultValue={selectedVoucher.max_uses} required className="w-full rounded-md border-2 border-gray-300 px-4 py-3 font-bold outline-none focus:border-gray-900" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Expired</label>
                                        <input
                                            name="expires_at"
                                            type="datetime-local"
                                            defaultValue={selectedVoucher.expires_at ? selectedVoucher.expires_at.slice(0, 16) : ''}
                                            className="w-full rounded-md border-2 border-gray-300 px-4 py-3 font-bold outline-none focus:border-gray-900"
                                        />
                                    </div>
                                    <label className="flex items-center gap-3 font-bold text-gray-800">
                                        <input name="is_active" type="checkbox" defaultChecked={selectedVoucher.is_active} className="h-5 w-5 accent-gray-900" />
                                        Voucher aktif
                                    </label>
                                    <button disabled={isPending} className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-gray-900 bg-gray-900 px-5 py-3 font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 disabled:opacity-60">
                                        {isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                        Simpan Perubahan
                                    </button>
                                </form>
                            ) : (
                                <>
                                    <div className="mt-4 flex gap-2">
                                        <button
                                            onClick={() => handleToggle(selectedVoucher.id, !selectedVoucher.is_active)}
                                            disabled={isPending}
                                            className="flex flex-1 items-center justify-center gap-2 rounded-md border-2 border-gray-900 bg-white px-4 py-2 font-bold text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 disabled:opacity-60"
                                        >
                                            {selectedVoucher.is_active ? <X size={16} /> : <Check size={16} />}
                                            {selectedVoucher.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                        </button>
                                        <button
                                            onClick={() => setVoucherToDelete(selectedVoucher)}
                                            disabled={isPending}
                                            className="flex flex-1 items-center justify-center gap-2 rounded-md border-2 border-gray-900 bg-white px-4 py-2 font-bold text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 disabled:opacity-60"
                                        >
                                            <Trash2 size={16} />
                                            Hapus
                                        </button>
                                    </div>

                                    <div className="mt-5 max-h-80 space-y-3 overflow-y-auto">
                                        {(selectedVoucher.voucher_claims || []).length === 0 ? (
                                            <p className="border-2 border-dashed border-gray-400 bg-white p-4 text-sm font-bold text-gray-500">
                                                Belum ada klaim.
                                            </p>
                                        ) : (
                                            selectedVoucher.voucher_claims?.map((claim) => (
                                                <div key={claim.id} className="border-2 border-gray-900 bg-white p-3">
                                                    <p className="font-bold text-gray-900">{getClaimName(claim)}</p>
                                                    <p className="text-xs font-medium text-gray-500">{claim.user_email || '-'}</p>
                                                    <p className="mt-1 text-xs font-bold text-gray-600">{formatDate(claim.claimed_at)}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : null}
                </aside>
            </div>

            {voucherToDelete ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-sm border-2 border-gray-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <h2 className="font-handwriting text-3xl font-black text-gray-900">Hapus Voucher?</h2>
                        <p className="mt-3 text-sm font-medium leading-relaxed text-gray-700">
                            Voucher <strong className="font-mono text-gray-900">{voucherToDelete.code}</strong> akan dihapus permanen.
                            {voucherToDelete.used_count > 0
                                ? ' Voucher ini sudah punya riwayat klaim, jadi sistem akan menolak penghapusan untuk menjaga data klaim.'
                                : ' Tindakan ini tidak bisa dibatalkan.'}
                        </p>
                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setVoucherToDelete(null)}
                                disabled={isPending}
                                className="rounded-md border-2 border-gray-900 bg-white px-4 py-2.5 font-bold text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 disabled:opacity-60"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isPending}
                                className="flex items-center justify-center gap-2 rounded-md border-2 border-gray-900 bg-gray-900 px-4 py-2.5 font-bold text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 disabled:opacity-60"
                            >
                                {isPending ? <Loader2 className="animate-spin" size={16} /> : null}
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
