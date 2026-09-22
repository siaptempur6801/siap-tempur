'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/utils/supabase/client'
import {
    QUESTION_IMAGE_ACCEPT,
    QUESTION_IMAGE_BUCKET,
    questionImagePath,
    validateQuestionImage,
} from '@/lib/question-media'
import { adminSecondaryButtonClass } from '@/components/admin/AdminUi'
import { cn } from '@/lib/utils'

/**
 * Tombol unggah gambar soal/opsi.
 *
 * Validasi (tipe + ukuran) dan penyusunan path ada di `lib/question-media`
 * (murni, teruji); komponen ini hanya memilih berkas, mengunggah, lalu
 * menyerahkan URL publik ke pemanggil. Menampilkan pratinjau + tombol hapus
 * ketika URL sudah ada.
 */
export default function QuestionImageButton({
    onUploaded,
    onClear,
    value,
    ariaLabel,
    label,
    compact = false,
    disabled = false,
    testId,
}: {
    onUploaded: (url: string) => void
    onClear?: () => void
    value?: string | null
    ariaLabel: string
    label?: string
    compact?: boolean
    disabled?: boolean
    /** Penanda untuk E2E (`data-upload-target`). */
    testId?: string
}) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)

    async function handleFile(file: File) {
        const invalid = validateQuestionImage(file)
        if (invalid) {
            toast.error(invalid)
            return
        }
        try {
            setUploading(true)
            const supabase = createClient()
            const { data: { user }, error: userError } = await supabase.auth.getUser()
            if (userError || !user) throw new Error('Sesi login tidak valid. Masuk ulang lalu coba lagi.')
            const path = questionImagePath(user.id, file, crypto.randomUUID())
            const { error: uploadError } = await supabase.storage.from(QUESTION_IMAGE_BUCKET).upload(path, file, {
                cacheControl: '31536000',
                upsert: false,
            })
            if (uploadError) throw new Error(uploadError.message)
            const { data } = supabase.storage.from(QUESTION_IMAGE_BUCKET).getPublicUrl(path)
            onUploaded(data.publicUrl)
            toast.success('Gambar diunggah.')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Gagal mengunggah gambar.')
        } finally {
            setUploading(false)
            if (inputRef.current) inputRef.current.value = ''
        }
    }

    return (
        <span className="inline-flex shrink-0 items-center gap-1.5">
            <input
                ref={inputRef}
                type="file"
                accept={QUESTION_IMAGE_ACCEPT}
                className="hidden"
                aria-label={ariaLabel}
                data-upload-target={testId}
                onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void handleFile(file)
                }}
            />
            <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => inputRef.current?.click()}
                aria-label={ariaLabel}
                className={compact
                    ? 'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/5 disabled:cursor-not-allowed disabled:opacity-40'
                    : adminSecondaryButtonClass}
            >
                {uploading ? <Loader2 className="animate-spin" size={15}/> : <ImagePlus size={15}/>}
                {label && !compact ? <span>{label}</span> : null}
            </button>
            {value ? (
                <>
                    <Image
                        src={value}
                        alt={`Pratinjau ${ariaLabel}`}
                        width={36}
                        height={36}
                        unoptimized
                        className={cn('rounded-lg border border-slate-200 object-cover', compact ? 'h-9 w-9' : 'h-10 w-10')}
                    />
                    {onClear ? (
                        <button
                            type="button"
                            onClick={onClear}
                            aria-label={`Hapus gambar: ${ariaLabel}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 text-red-500 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-500/10"
                        >
                            <Trash2 size={14}/>
                        </button>
                    ) : null}
                </>
            ) : null}
        </span>
    )
}
