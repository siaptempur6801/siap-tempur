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
            dismissible={!processing}
        >
            <p className="text-sm font-medium leading-relaxed text-slate-700">{message}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                    type="button"
                    data-testid="tka-section-cancel"
                    data-autofocus
                    disabled={processing}
                    onClick={onCancel}
                    className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50"
                >
                    Batal
                </button>
                <button
                    type="button"
                    data-testid="tka-section-confirm"
                    disabled={processing}
                    onClick={onConfirm}
                    className="min-h-11 rounded-xl border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50"
                >
                    {processing ? 'Memproses...' : confirmLabel}
                </button>
            </div>
        </Modal>
    )
}
