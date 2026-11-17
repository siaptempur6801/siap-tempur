'use client'

import { createClient } from '@/lib/utils/supabase/client'
import {
  QUESTION_IMAGE_BUCKET,
  compressedFileName,
  compressionScale,
  questionImagePath,
  shouldCompressQuestionImage,
  validateQuestionImage,
  validateQuestionImageInput,
} from '@/lib/question-media'

/**
 * Unggah gambar soal (sisi browser).
 *
 * Berkas besar (foto/screenshot) dikompres lebih dulu — diperkecil ke maksimal
 * 1600 px dan di-encode WebP — supaya hemat penyimpanan dan kuota peserta.
 * Bila kompresi gagal, berkas asli tetap dipakai selama lolos validasi final.
 */
async function decode(
  file: File,
): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file)
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('Gambar tidak dapat dibaca.'))
      element.src = url
    })
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

async function compressQuestionImage(file: File): Promise<File> {
  if (!shouldCompressQuestionImage(file)) return file
  try {
    const decoded = await decode(file)
    try {
      const scale = compressionScale(decoded.width, decoded.height)
      const width = Math.max(1, Math.round(decoded.width * scale))
      const height = Math.max(1, Math.round(decoded.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) return file
      context.drawImage(decoded.source, 0, 0, width, height)
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', 0.85),
      )
      if (!blob || blob.size >= file.size) return file
      return new File([blob], compressedFileName(file.name), { type: 'image/webp' })
    } finally {
      decoded.release()
    }
  } catch {
    // Dekode/kompresi gagal (mis. format tak didukung browser) — pakai aslinya.
    return file
  }
}

/** Validasi → kompres → validasi final → unggah. Mengembalikan URL publik. */
export async function uploadQuestionImage(file: File): Promise<string> {
  const inputError = validateQuestionImageInput(file)
  if (inputError) throw new Error(inputError)

  const prepared = await compressQuestionImage(file)
  const finalError = validateQuestionImage(prepared)
  if (finalError) {
    throw new Error(
      prepared === file
        ? finalError
        : 'Gambar masih terlalu besar setelah dikompres. Pilih gambar yang lebih kecil.',
    )
  }

  const supabase = createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Sesi login tidak valid. Masuk ulang lalu coba lagi.')

  const path = questionImagePath(user.id, prepared, crypto.randomUUID())
  const { error: uploadError } = await supabase.storage
    .from(QUESTION_IMAGE_BUCKET)
    .upload(path, prepared, {
      cacheControl: '31536000',
      upsert: false,
    })
  if (uploadError) throw new Error(uploadError.message)
  return supabase.storage.from(QUESTION_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
}
