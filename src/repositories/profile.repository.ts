import { createAdminClient } from '@/lib/utils/supabase/server'

export type ProfileRecord = {
    id: string
    fullName: string
    displayName: string | null
    avatarUrl: string | null
    phone: string | null
    birthDate: string | null
    gender: string | null
    onboardingCompleted: boolean
    status: string
}

export class ProfileRepository {
    async findById(userId: string): Promise<ProfileRecord | null> {
        const supabase = await createAdminClient()
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, display_name, avatar_url, phone, birth_date, gender, onboarding_completed, status')
            .eq('id', userId)
            .maybeSingle()

        if (error) throw error
        if (!data) return null

        return {
            id: data.id,
            fullName: data.full_name,
            displayName: data.display_name,
            avatarUrl: data.avatar_url,
            phone: data.phone,
            birthDate: data.birth_date,
            gender: data.gender,
            onboardingCompleted: data.onboarding_completed,
            status: data.status,
        }
    }
}

export const profileRepository = new ProfileRepository()
