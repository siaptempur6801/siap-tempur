import { cn } from '@/lib/utils'
import { Mascot, type MascotName, type MascotSize } from '@/components/brand/Mascot'

/**
 * Primitif "fun & friendly" SiapTempur.
 *
 * Dipakai sesuai experience mode (lihat `docs/PRODUCT_DESIGN_SYSTEM_V1_1.md` §2):
 * - **marketing**: ekspresif — sticker, tape, doodle, gelembung maskot boleh banyak;
 * - **learning**: ramah tapi tenang — maksimal satu aksen per layar;
 * - **exam**: TIDAK dipakai sama sekali (peserta harus fokus).
 *
 * Semua komponen di sini server-safe (tanpa state) dan animasinya CSS-only sehingga
 * otomatis menghormati `prefers-reduced-motion`.
 */

export type StickerTone = 'blue' | 'amber' | 'peach' | 'paper' | 'green'

const STICKER_TONES: Record<StickerTone, string> = {
    blue: 'bg-blue-100 text-blue-900',
    amber: 'bg-[var(--brand-amber-200)] text-[var(--brand-ink)]',
    peach: 'bg-[var(--brand-peach-100)] text-[var(--brand-peach-800)]',
    paper: 'bg-white text-[var(--brand-ink)]',
    green: 'bg-emerald-100 text-emerald-900',
}

/** Label miring bergaya stiker dengan border + hard shadow brand. */
export function Sticker({
    children,
    tone = 'amber',
    rotate = 'left',
    className,
}: {
    children: React.ReactNode
    tone?: StickerTone
    rotate?: 'left' | 'right' | 'none'
    className?: string
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--st-ink)] px-3 py-1 text-xs font-black uppercase tracking-wide st-shadow-sm',
                rotate === 'left' && '-rotate-2',
                rotate === 'right' && 'rotate-2',
                STICKER_TONES[tone],
                className,
            )}
        >
            {children}
        </span>
    )
}

/** Strip "washi tape" untuk menempelkan kartu ke kanvas. */
export function WashiTape({
    tone = 'amber',
    className,
}: {
    tone?: 'amber' | 'blue' | 'peach'
    className?: string
}) {
    const tones = {
        amber: 'bg-[var(--brand-amber-200)]/85',
        blue: 'bg-blue-200/80',
        peach: 'bg-[var(--brand-peach-200)]/85',
    }
    return (
        <span
            aria-hidden="true"
            className={cn('pointer-events-none absolute h-7 w-28 -rotate-2 border-x border-white/60', tones[tone], className)}
        />
    )
}

/** Doodle dekoratif (blob/squiggle/star) — selalu aria-hidden, tidak pernah informatif. */
export function Doodle({
    variant = 'blob',
    className,
}: {
    variant?: 'blob' | 'squiggle' | 'star' | 'dots'
    className?: string
}) {
    if (variant === 'squiggle') {
        return (
            <svg aria-hidden="true" viewBox="0 0 120 20" className={cn('h-4 w-28 text-[var(--brand-blue)]', className)} fill="none">
                <path d="M2 12c10-10 20 10 30 0s20-10 30 0 20 10 30 0 18-8 26-2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
        )
    }
    if (variant === 'star') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24" className={cn('h-6 w-6 text-[var(--brand-amber)]', className)} fill="currentColor">
                <path d="M12 2l2.2 6.3L21 10l-5.3 4 1.6 7-5.3-3.6L6.7 21l1.6-7L3 10l6.8-1.7z" />
            </svg>
        )
    }
    if (variant === 'dots') {
        return (
            <svg aria-hidden="true" viewBox="0 0 60 30" className={cn('h-6 w-14 text-[var(--brand-ink)]/25', className)} fill="currentColor">
                {[0, 1, 2, 3, 4].map((row) => [0, 1, 2].map((col) => (
                    <circle key={`${row}-${col}`} cx={8 + row * 11} cy={8 + col * 7} r="1.6" />
                )))}
            </svg>
        )
    }
    return (
        <span
            aria-hidden="true"
            className={cn(
                'pointer-events-none block rounded-full border-2 border-dashed border-[var(--brand-amber)]/70 bg-[var(--brand-amber-50)]',
                'h-40 w-40',
                className,
            )}
        />
    )
}

/**
 * Maskot + gelembung bicara. Dipakai untuk menyapa atau menyemangati di learning mode
 * (bukan di exam mode). `bubbleTone` mengikuti tone kategori pada design system.
 */
export function MascotBubble({
    name = 'tama',
    size = 'sm',
    side = 'left',
    bubbleTone = 'paper',
    priority = false,
    children,
    className,
    bubbleClassName,
}: {
    name?: MascotName
    size?: MascotSize
    side?: 'left' | 'right'
    bubbleTone?: 'paper' | 'blue' | 'amber' | 'peach'
    priority?: boolean
    children: React.ReactNode
    className?: string
    bubbleClassName?: string
}) {
    // Warna bubble & ekor WAJIB memakai token yang sama supaya sambungannya mulus.
    // Catatan: `--brand-*-soft` bukan nama token yang valid (yang ada `--color-brand-*-soft`),
    // jadi pakai primitif skalanya langsung.
    const tones = {
        paper: 'bg-white',
        blue: 'bg-[var(--brand-blue-50)]',
        amber: 'bg-[var(--brand-amber-100)]',
        peach: 'bg-[var(--brand-peach-100)]',
    }
    const tailFills = {
        paper: '#ffffff',
        blue: 'var(--brand-blue-50)',
        amber: 'var(--brand-amber-100)',
        peach: 'var(--brand-peach-100)',
    }
    return (
        <div className={cn('flex items-end gap-3', side === 'right' && 'flex-row-reverse', className)}>
            <Mascot name={name} size={size} tone="plain" priority={priority} className="animate-bob" />
            {/* Pembungkus: bubble + ekor sebagai dua saudara, sehingga ekor dicat SETELAH bubble
                dan bisa menutup garis border tepat di titik tempelnya (kalau ekor jadi anak bubble,
                border bubble tetap terlihat menembus ekor). */}
            <div className="relative">
                <div
                    className={cn(
                        'relative max-w-sm rounded-2xl border-2 border-[var(--st-ink)] px-4 py-3 text-sm font-semibold leading-relaxed st-shadow-sm',
                        tones[bubbleTone],
                        bubbleClassName,
                    )}
                >
                    {children}
                </div>
                {/* Ekor gelembung: satu path melengkung untuk outline + bidang isi yang
                    menutup garis border bubble sampai ke bagian dalam, sehingga sambungannya
                    mulus (tanpa garis sisa) dan ujungnya membulat. */}
                <span
                    aria-hidden="true"
                    className={cn(
                        'pointer-events-none absolute top-1/2 z-[1] -translate-y-1/2',
                        side === 'left' ? 'left-[-13px]' : 'right-[-13px]',
                    )}
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        className={cn('block', side === 'right' && '-scale-x-100')}
                    >
                        <path
                            d="M15 2.2 C13.2 3.2 9.4 5.9 7.9 7.1 A 3.3 3.3 0 0 0 7.9 12.9 C9.4 14.1 13.2 16.8 15 17.8"
                            fill="none"
                            stroke="var(--st-ink)"
                            strokeWidth="2"
                            strokeLinecap="butt"
                            strokeLinejoin="round"
                        />
                        <path
                            d="M15 3.6 C13.6 4.5 10.1 6.9 8.6 8.1 A 2.2 2.2 0 0 0 8.6 11.9 C10.1 13.1 13.6 15.5 15 16.4 Z"
                            fill={tailFills[bubbleTone]}
                        />
                    </svg>
                </span>
            </div>
        </div>
    )
}
