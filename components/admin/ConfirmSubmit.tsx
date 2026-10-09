'use client'

import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog'
import { adminDangerButtonClass,adminSecondaryButtonClass } from '@/components/admin/AdminUi'
import { cloneElement,isValidElement,useEffect,useRef,useState,type ReactElement } from 'react'

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
 *
 * Kerangka dialog (overlay, focus trap, Escape) ada di `AdminConfirmDialog`
 * agar alur non-form memakai bentuk yang sama.
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
    const triggerRef = useRef<HTMLElement | null>(null)

    // Fokus dikembalikan ke trigger saat dialog tertutup — tanpa ini keyboard
    // users "jatuh" ke <body>. Fokus awal tombol konfirmasi ditangani
    // `AdminConfirmDialog` lewat `data-autofocus`.
    useEffect(() => {
        if (open) {
            triggerRef.current = document.activeElement as HTMLElement | null
        } else if (triggerRef.current?.isConnected) {
            triggerRef.current.focus()
            triggerRef.current = null
        }
    }, [open])

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

            <AdminConfirmDialog open={open} title={title} message={message} detail={detail} onCancel={() => setOpen(false)}>
                <button type="button" data-autofocus onClick={() => setOpen(false)} className={adminSecondaryButtonClass}>
                    Batal
                </button>
                <button
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
                        event.preventDefault()
                        setOpen(false)
                        event.currentTarget.form?.requestSubmit()
                    }}
                >
                    {confirmLabel}
                </button>
            </AdminConfirmDialog>
        </>
    )
}
