'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { validateCsrf } from '@/lib/csrf'
import { createV2Client } from '@/lib/utils/supabase/server'
import { userTrackService } from '@/src/services/user-track.service'
import { parseTkaLevel, tkaContext, tkaLevelPath } from '@/src/tka/context'

function text(form: FormData, key: string) {
    const value = form.get(key)
    return typeof value === 'string' ? value.trim() : ''
}

export async function activateTkaTrackAction(form: FormData) {
    await validateCsrf()

    const level = parseTkaLevel(text(form, 'level'))
    if (!level) redirect('/tka?error=Jenjang+TKA+tidak+valid')

    const path = tkaLevelPath(level)
    const supabase = await createV2Client()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/login?returnTo=${encodeURIComponent(path)}`)

    const targetYearRaw = text(form, 'target_year')
    const targetYear = targetYearRaw ? Number(targetYearRaw) : null
    if (targetYear !== null && (!Number.isInteger(targetYear) || targetYear < 2025 || targetYear > 2100)) {
        redirect(`${path}?error=${encodeURIComponent('Tahun target tidak valid.')}`)
    }

    const schoolName = text(form, 'school_name') || null
    const schoolGrade = text(form, 'school_grade') || null

    await userTrackService.activateTrack({
        userId: user.id,
        context: tkaContext(level),
        targetYear,
        preference: {
            schoolName,
            schoolGrade,
            preferences: { source: 'tka_entry' },
        },
    })

    revalidatePath('/tka')
    revalidatePath(path)
    redirect(`${path}?activated=1`)
}
