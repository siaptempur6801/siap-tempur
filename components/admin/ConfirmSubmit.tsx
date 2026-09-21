'use client'

import { cloneElement, isValidElement, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactElement } from 'react'
import { AlertTriangle } from 'lucide-react'
import { adminDangerButtonClass, adminSecondaryButtonClass } from '@/components/admin/AdminUi'

/**
 * Konfirmasi proporsional untuk aksi destruktif.
 *
 * `docs/ADMIN_UI_UX_STANDARD.md` §8: "Destructive action perlu confirmation yang
 * proporsional; tindakan rutin tidak boleh dipenuhi dialog konfirmasi yang tidak
 * perlu." Sebelumnya hanya hapus artikel yang bertanya; mengarsipkan soal,
 * mengarsipkan produk/exam/event, menghapus pengaturan, mengeluarkan peserta,
 * merotasi tautan undangan, mencabut peran, dan menonaktifkan akun semuanya
 * berjalan sekali klik.
 *
 * ## Pola SLOT, bukan render prop
 *
 * Percobaan pertama memakai render prop (`{(confirm) => <button …/>}`) dan
 * gagal di runtime dengan:
 *
 *     Functions cannot be passed directly to Client Components unless you
 *     explicitly expose it by marking it with "use server".
 *
 * Halaman admin adalah Server Component, jadi fungsi apa pun yang dilewatkan ke
 * komponen klien akan ditolak React — pesan itu muncul saat halaman dirender,
 * dan akibatnya SELURUH halaman jatuh ke error boundary. Karena itu induk
 * mengirim **elemen** (bukan fungsi), dan komponen ini yang menggabungkan
 * handler-nya ke elemen tersebut lewat `cloneElement`.
 *
 * ```tsx
 * <form action={archiveQuestionAction}>
 *     <input type="hidden" name="id" value={id}/>
 *     <ConfirmSubmit
 *         message="Soal ini akan diarsipkan."
 *         trigger={<button type="button" className={adminDangerButtonClass}>Arsipkan</button>}
 *     />
 * </form>
 * ```
 *
 * ## Kenapa tombolnya harus tetap di dalam `<form>`
 *
 * Submit button itulah yang membawa seluruh nilai field form server action.
 * Komponen ini merender trigger di tempat aslinya (di dalam form) dan hanya
 * dialognya yang dipindahkan lewat portal visual (`fixed`), sehingga struktur
 * form tidak berubah.
 */
export default function ConfirmSubmit({
    message,
    detail,
    trigger,
    confirmLabel = 'Ya, lanjutkan',
    title = 'Konfirmasi tindakan',
}: {
    /** Kalimat konsekuensi: apa yang akan terjadi, bukan sekadar "yakin?". */
    message: string
    /** Rincian tambahan, mis. sifat ireversibel atau jumlah yang terdampak. */
    detail?: string
    /** Tombol pemicu. `onClick`-nya akan ditimpa oleh komponen ini. */
    trigger: ReactElement<{ onClick?: (event: unknown) => void }>
    confirmLabel?: string
    title?: string
}) {
    const [open, setOpen] = useState(false)
    const confirmRef = useRef<HTMLButtonElement>(null)
    const dialogRef = useRef<HTMLDivElement>(null)
    const titleId = useId()
    const triggerRef = useRef<HTMLElement | null>(null)

    // Fokus dipindahkan ke tombol konfirmasi saat dialog terbuka: pengguna
    // keyboard tidak boleh tertinggal di belakang dialog. Saat tertutup, fokus
    // dikembalikan ke trigger — tanpa ini keyboard users "jatuh" ke <body>.
    useEffect(() => {
        if (open) {
            triggerRef.current = document.activeElement as HTMLElement | null
            confirmRef.current?.focus()
        } else if (triggerRef.current?.isConnected) {
            triggerRef.current.focus()
            triggerRef.current = null
        }
    }, [open])

    // Trap Tab di dalam dialog: role="alertdialog" tanpa trap membuat fokus
    // melompat ke halaman di belakang overlay.
    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === 'Escape') {
            setOpen(false)
            return
        }
        if (event.key !== 'Tab' || !dialogRef.current) return
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const active = document.activeElement
        if (event.shiftKey && active === first) {
            event.preventDefault()
            last.focus()
        } else if (!event.shiftKey && active === last) {
            event.preventDefault()
            first.focus()
        }
    }

    const triggerNode = isValidElement(trigger)
        ? cloneElement(trigger, {
            onClick: (event: unknown) => {
                trigger.props.onClick?.(event)
                setOpen(true)
            },
        })
        : trigger

    return (
        <>
            {triggerNode}

            {open ? (
                <div
                    role="presentation"
                    className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) setOpen(false)
                    }}
                >
                    <div
                        ref={dialogRef}
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-lg"
                        onKeyDown={handleKeyDown}
                    >
                        <div className="flex items-start gap-3 p-5">
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700">
                                <AlertTriangle size={18}/>
                            </span>
                            <div className="min-w-0">
                                <h2 id={titleId} className="text-base font-black text-slate-950">{title}</h2>
                                <p className="mt-1.5 text-sm font-medium leading-6 text-slate-600">{message}</p>
                                {detail ? (
                                    <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">{detail}</p>
                                ) : null}
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 p-4">
                            <button type="button" onClick={() => setOpen(false)} className={adminSecondaryButtonClass}>
                                Batal
                            </button>
                            <button
                                ref={confirmRef}
                                // Tipe `submit` DIPERLUKAN, dan `requestSubmit()` dipanggil TANPA
                                // argumen. Dua kegagalan nyata yang membentuk baris ini:
                                //
                                // 1. Submit native ditolak React — atribut `action` form server
                                //    action diganti menjadi `javascript:throw new Error('A React
                                //    form was unexpectedly submitted…')`. Jadi klik biasa tidak
                                //    pernah menjalankan aksi.
                                // 2. `requestSubmit(tombol)` menolak tombol bertipe `button`
                                //    dengan *"The specified element is not a submit button"*.
                                //
                                // Karena itu: tombolnya `type="submit"` supaya sah sebagai
                                // submitter, dan `requestSubmit()` tanpa argumen supaya React
                                // yang memilih jalurnya. `event.currentTarget.form` dipakai,
                                // bukan `closest('form')` — pemilik form tetap benar sekalipun
                                // dialog dipindahkan ke luar form secara visual.
                                type="submit"
                                formNoValidate
                                className={adminDangerButtonClass}
                                onClick={(event) => {
                                    setOpen(false)
                                    event.currentTarget.form?.requestSubmit()
                                }}
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    )
}
