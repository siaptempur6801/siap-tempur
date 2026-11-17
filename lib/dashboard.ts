import { LEVEL_THRESHOLDS } from './constants'
import { getGamificationProgress } from './gamification'

export function getLevel(xp: number) {
  const progress = getGamificationProgress(xp)
  return (
    LEVEL_THRESHOLDS.find((threshold) => threshold.level === progress.level) ?? LEVEL_THRESHOLDS[0]
  )
}

export function getGreeting(hour: number): { greeting: string; message: string } {
  if (hour >= 4 && hour < 11)
    return { greeting: 'Selamat Pagi', message: 'Pagi yang sempurna untuk memulai belajar!' }
  if (hour >= 11 && hour < 15)
    return { greeting: 'Selamat Siang', message: 'Semangat! Lanjutkan progres belajarmu.' }
  if (hour >= 15 && hour < 18)
    return { greeting: 'Selamat Sore', message: 'Waktu yang tepat untuk review materi.' }
  return { greeting: 'Selamat Malam', message: 'Tryout sebelum tidur bisa memperkuat ingatan!' }
}
