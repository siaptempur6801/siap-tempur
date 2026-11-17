import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * Maskot brand SiapTempur.
 *
 * Tama & Tara adalah bagian identitas brand (lihat `docs/PRODUCT_DESIGN_SYSTEM_V1_1.md`).
 * Panduan pemakaian:
 * - marketing: boleh ekspresif (hero, highlight fitur), maksimal 1–2 maskot per layar;
 * - learning: untuk sapaan, empty state, dan momen sukses — jangan di dalam tabel data padat;
 * - exam: **tidak dipakai** agar peserta tetap fokus.
 *
 * Default `decorative` (alt kosong + aria-hidden) karena maskot bersifat ilustratif; isi `alt`
 * hanya bila maskot benar-benar menyampaikan informasi.
 */
export type MascotName = 'tama' | 'tara'

const MASCOTS: Record<MascotName, { src: string; label: string }> = {
    tama: { src: '/tamapng.png', label: 'Tama' },
    tara: { src: '/tarapng.png', label: 'Tara' },
}

/** Aset maskot 1080×1350 (rasio 4:5). */
const ASPECT = 1080 / 1350

export type MascotSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const SIZES: Record<MascotSize, number> = {
    xs: 64,
    sm: 96,
    md: 144,
    lg: 208,
    xl: 288,
}

export type MascotTone = 'plain' | 'soft' | 'paper'

const TONES: Record<MascotTone, string> = {
    plain: '',
    soft: 'bg-gradient-to-br from-[var(--brand-peach-100)] via-[var(--brand-blue-50)] to-white',
    paper: 'bg-[var(--brand-paper)] ring-2 ring-[var(--brand-ink)] shadow-[var(--px-shadow-md)]',
}

export function Mascot({
    name,
    size = 'md',
    tone = 'plain',
    alt,
    priority = false,
    className,
    imgClassName,
}: {
    name: MascotName
    size?: MascotSize
    tone?: MascotTone
    alt?: string
    priority?: boolean
    className?: string
    imgClassName?: string
}) {
    const mascot = MASCOTS[name]
    const width = SIZES[size]
    const height = Math.round(width / ASPECT)
    const decorative = alt === undefined

    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-end justify-center overflow-hidden',
                tone !== 'plain' && 'rounded-st-2xl p-3',
                TONES[tone],
                className,
            )}
        >
            <Image
                src={mascot.src}
                alt={decorative ? '' : alt}
                aria-hidden={decorative || undefined}
                width={width}
                height={height}
                priority={priority}
                sizes={`${width}px`}
                className={cn('h-auto w-full max-w-full select-none object-contain', imgClassName)}
            />
        </span>
    )
}

/**
 * Tama + Tara berdampingan. Dipakai untuk hero marketing dan empty state agar
 * kedua maskot tampil berimbang tanpa duplikasi markup.
 */
export function MascotPair({
    size = 'md',
    tone = 'plain',
    priority = false,
    className,
}: {
    size?: MascotSize
    tone?: MascotTone
    priority?: boolean
    className?: string
}) {
    return (
        <span className={cn('inline-flex items-end gap-1 sm:gap-3', className)}>
            <Mascot name="tama" size={size} tone={tone} priority={priority} />
            <Mascot name="tara" size={size} tone={tone} priority={priority} className="translate-y-1" />
        </span>
    )
}

export default Mascot
