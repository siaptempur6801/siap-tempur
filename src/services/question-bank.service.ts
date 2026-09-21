import type { Json } from '@/types/database.types'
import 'server-only'
import { createV2Client } from '@/lib/utils/supabase/server'
import { authorizationService } from '@/src/services/authorization.service'
import { PERMISSIONS } from '@/src/auth/permissions'
import type { QuestionBankDetail } from '@/lib/question-bank'

export const questionBankService = {
    async editor(program: string, track: string, id: string | null): Promise<QuestionBankDetail> {
        await authorizationService.requirePermission(PERMISSIONS.QUESTION_MANAGE)
        const client = await createV2Client()
        const { data, error } = await client.rpc('get_question_bank_editor', { p_program: program, p_track: track, p_id: id })
        if (error) throw new Error(error.message)
        if (!data || typeof data !== 'object') throw new Error('QUESTION_EDITOR_UNAVAILABLE')
        return data as unknown as QuestionBankDetail
    },
    async mutate(payload: Record<string, unknown>) {
        // Session client: database derives the actor from auth.uid(), never from input.
        await authorizationService.requirePermission(PERMISSIONS.QUESTION_MANAGE)
        const client = await createV2Client()
        const { data, error } = await client.rpc('mutate_question_bank', { p_payload: payload as Json })
        if (error) throw new Error(error.message)
        return data as { id: string; version: number; status: string; updated_at: string }
    },
}
