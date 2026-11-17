import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSubjectName(name: string | undefined): string {
  if (!name) return ''
  return name.replace(/Bahasa Indonesia/gi, 'B. Indo')
}
