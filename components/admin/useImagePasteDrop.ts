'use client'

import { useState, type ClipboardEvent, type DragEvent } from 'react'
import { toast } from 'sonner'
import { uploadQuestionImage } from '@/lib/question-media-client'

/**
 * Tempel (Ctrl/Cmd+V) & tarik-lepas gambar ke textarea soal/opsi.
 *
 * Keduanya memakai jalur unggah yang sama dengan tombol gambar (validasi +
 * kompresi + storage), jadi tidak ada aturan ganda. Event non-gambar
 * dibiarkan lewat agar perilaku normal (tempel teks, drop teks) tidak berubah.
 */
export function useImagePasteDrop(onUploaded: (url: string) => void) {
    const [dragging, setDragging] = useState(false)

    async function handleFile(file: File) {
        try {
            onUploaded(await uploadQuestionImage(file))
            toast.success('Gambar diunggah.')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Gagal mengunggah gambar.')
        }
    }

    const firstImage = (files: FileList | null | undefined) => Array.from(files ?? []).find((file) => file.type.startsWith('image/'))

    return {
        dragging,
        handlers: {
            onPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => {
                const file = firstImage(event.clipboardData?.files)
                if (!file) return
                event.preventDefault()
                void handleFile(file)
            },
            onDrop: (event: DragEvent<HTMLTextAreaElement>) => {
                const file = firstImage(event.dataTransfer?.files)
                if (!file) return
                event.preventDefault()
                setDragging(false)
                void handleFile(file)
            },
            onDragOver: (event: DragEvent<HTMLTextAreaElement>) => {
                if (!Array.from(event.dataTransfer?.items ?? []).some((item) => item.kind === 'file')) return
                event.preventDefault()
                setDragging(true)
            },
            onDragLeave: () => setDragging(false),
        },
    }
}
