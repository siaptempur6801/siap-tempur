import { profileRepository } from '@/src/repositories/profile.repository'
import { userTrackRepository } from '@/src/repositories/user-track.repository'

export class ProfileService {
    async getUserContext(userId: string) {
        const [profile, activeTracks] = await Promise.all([
            profileRepository.findById(userId),
            userTrackRepository.listActiveByUser(userId),
        ])

        return { profile, activeTracks }
    }
}

export const profileService = new ProfileService()
