import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatSubjectName(name: string | undefined): string {
    if (!name) return ''
    return name.replace(/Bahasa Indonesia/gi, 'B. Indo')
}

export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

export function calculateCurrentStreak(streakCount: number | null | undefined, lastActivityDate: string | null | undefined): number {
    if (!streakCount || streakCount === 0 || !lastActivityDate) return 0;

    // Parse lastActivity as UTC midnight to match DB date assuming dates are YYYY-MM-DD
    const lastActivity = new Date(lastActivityDate);
    // Use local time for 'today' and normalize to midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastActivity.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - lastActivity.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
        return 0; // Streak is broken if hasn't been active for > 1 day
    }

    return streakCount;
}
