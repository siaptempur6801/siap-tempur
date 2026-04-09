import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const DEFAULT_APP_TIME_ZONE = 'Asia/Jakarta'

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

export function getDateKeyInTimeZone(dateInput: Date | string | number, timeZone = DEFAULT_APP_TIME_ZONE): string {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    })
    const parts = formatter.formatToParts(date)
    const year = parts.find((part) => part.type === 'year')?.value
    const month = parts.find((part) => part.type === 'month')?.value
    const day = parts.find((part) => part.type === 'day')?.value

    if (!year || !month || !day) {
        throw new Error(`Unable to format date key for timezone ${timeZone}`)
    }

    return `${year}-${month}-${day}`
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
