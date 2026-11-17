'use client'

import Modal from '@/components/ui/Modal'

/**
 * Konfirmasi "selesaikan bagian ini" untuk sesi ujian TKA.
 *
 * Dibuat sebagai komponen bersama supaya tiga klien sesi TKA (full exam, practice/mini,
 * dan diagnostik) memakai satu UI yang sama, bukan `window.confirm()` native yang
 * tidak bisa di-style, tidak konsisten dengan modal CPNS, dan memblokir main thread.
 */
export default function TkaSectionConfirmModal({
    message,
    title = 'Selesaikan bagian ini?',
    confirmLabel = 'Ya, lanjutkan',
    processing = false,
    onCancel,
    onConfirm,
}: {
    message: string | null
    title?: string
    confirmLabel?: string
    processing?: boolean
    onCancel: () => void
    onConfirm: () => void
}) {
    return (
        <Modal
            isOpen={message !== null}
            onClose={onCancel}
            title={title}
            className="max-w-md"
        >
            <p className="text-sm font-medium leading-relaxed text-slate-700">{message}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                    type="button"
                    data-testid="tka-section-cancel"
                    onClick={onCancel}
                    className="min-h-11 rounded-xl border-2 border-slate-900 bg-white px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-50 active:scale-[0.98]"
                >
                    Batal
                </button>
                <button
                    type="button"
                    data-testid="tka-section-confirm"
                    disabled={processing}
                    onClick={onConfirm}
                    className="min-h-11 rounded-xl border-2 border-indigo-800 bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
                >
                    {processing ? 'Memproses...' : confirmLabel}
                </button>
            </div>
        </Modal>
    )
}
