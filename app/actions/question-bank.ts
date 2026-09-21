'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { validateCsrf } from '@/lib/csrf'
import { questionBankSchema, questionBankWorkflowSchema, questionBankReturnUrl, validateBankOptions, type QuestionBankState } from '@/lib/question-bank'
import { questionBankService } from '@/src/services/question-bank.service'
import { authorizationService } from '@/src/services/authorization.service'
import { PERMISSIONS } from '@/src/auth/permissions'
import { logger } from '@/lib/logger'

function errorState(error: unknown): QuestionBankState {
    const code = error instanceof Error ? error.message : ''
    const messages: Record<string, string> = {
        QUESTION_VERSION_CONFLICT: 'Soal sudah berubah sejak dibuka. Input Anda tetap tersimpan di form ini. Salin perubahan Anda, lalu muat ulang soal sebelum menyimpan kembali.',
        QUESTION_ACCESS_DENIED: 'Anda tidak memiliki akses untuk tindakan ini, atau akun sudah tidak aktif.',
        QUESTION_WORKFLOW_LOCKED: 'Soal sedang direview atau sudah disetujui/terbit. Kembalikan ke draf sebelum mengedit.',
        QUESTION_NOT_FOUND: 'Soal tidak ditemukan pada program dan jenjang ini.',
        QUESTION_LOCKED_BY_ACTIVE_ATTEMPT: 'Soal sedang dikerjakan peserta. Coba simpan kembali setelah pengerjaan selesai.',
        QUESTION_CATALOG_MISMATCH: 'Program dan jenjang tidak cocok.',
        QUESTION_STIMULUS_MISMATCH: 'Stimulus harus sesuai mapel soal.',
        QUESTION_NODE_MISMATCH: 'Materi harus sesuai mapel soal.',
        QUESTION_REASON_REQUIRED: 'Alasan perubahan wajib diisi.',
        SUBJECT_INVALID: 'Mapel tidak tersedia pada jenjang ini.',
        QUESTION_OPTIONS_INVALID: 'Periksa isi, skor, kategori, dan URL gambar pada opsi.',
        'Only approved questions can be published': 'Selesaikan review terlebih dahulu sebelum menerbitkan.',
        'Pending review still exists': 'Masih ada review yang belum diselesaikan.',
    }
    logger.error('Question Bank action failed', error)
    return { error: messages[code] ?? 'Perubahan belum disimpan. Periksa input dan akses Anda, lalu coba lagi.', conflict: code === 'QUESTION_VERSION_CONFLICT' }
}

export async function saveQuestionBankAction(_previous: QuestionBankState, form: FormData): Promise<QuestionBankState> {
    try {
        await validateCsrf()
        await authorizationService.requirePermission(PERMISSIONS.QUESTION_MANAGE)
        const parsed = questionBankSchema.safeParse(Object.fromEntries(form))
        if (!parsed.success) return { error: 'Periksa isian yang ditandai.', fields: Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])) }
        let options
        try { options = validateBankOptions(parsed.data.questionType, parsed.data.options) }
        catch (error) { return { error: 'Periksa pilihan jawaban.', fields: { options: error instanceof Error ? error.message : 'Opsi tidak valid.' } } }
        await questionBankService.mutate({ ...parsed.data, options, operation: 'save' })
    } catch (error) { return errorState(error) }
    revalidatePath('/admin/content/questions')
    revalidatePath('/admin/content/review')
    redirect(questionBankReturnUrl(form, 'Draf soal tersimpan.'))
}

export async function questionBankWorkflowAction(_previous: QuestionBankState, form: FormData): Promise<QuestionBankState> {
    try {
        await validateCsrf()
        await authorizationService.requirePermission(PERMISSIONS.QUESTION_MANAGE)
        const parsed = questionBankWorkflowSchema.safeParse(Object.fromEntries(form))
        if (!parsed.success) return { error: 'Data tindakan tidak valid. Muat ulang soal sebelum mencoba lagi.' }
        const input = parsed.data
        if (input.operation === 'publish') await authorizationService.requirePermission(PERMISSIONS.CONTENT_PUBLISH)
        await questionBankService.mutate(input)
    } catch (error) { return errorState(error) }
    revalidatePath('/admin/content/questions')
    revalidatePath('/admin/content/review')
    redirect(questionBankReturnUrl(form, 'Status soal diperbarui.'))
}
