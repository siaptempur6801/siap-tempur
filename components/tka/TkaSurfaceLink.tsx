import type { AnchorHTMLAttributes, ReactNode } from 'react'

/**
 * Tautan TKA yang memaksa **navigasi dokumen penuh** saat berpindah permukaan.
 *
 * Kenapa perlu: permukaan marketing (`/tka`, `/tka/sd`, `/tka/sma`) dan permukaan aplikasi
 * (`/tka/smp`, `/tka/smp/*`) memakai segmen layout `/tka` yang **sama**. Saat berpindah di antara
 * keduanya lewat navigasi client-side, Next memakai ulang layout yang sudah ter-mount sehingga
 * chrome-nya salah: sidebar tetap muncul di halaman marketing, atau hilang di halaman aplikasi.
 *
 * Tautan ini melakukan permintaan dokumen biasa sehingga server merender ulang layout sesuai path.
 * Dipakai hanya untuk perpindahan antar-permukaan; navigasi di dalam permukaan yang sama tetap
 * memakai `next/link` (tetap instan, tanpa reload).
 */
export default function TkaSurfaceLink({
    href,
    children,
    ...rest
}: { href: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
    return (
        <a href={href} {...rest}>
            {children}
        </a>
    )
}
