"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/#produk", label: "Program" },
    { href: "/#beda", label: "Kenapa berbeda" },
    { href: "/#cara-belajar", label: "Cara kerja" },
    { href: "/#fitur", label: "Fitur" },
    { href: "/blog", label: "Artikel" },
] as const;

const programItems = [
    { href: "/cpns", label: "CPNS" },
    { href: "/tka", label: "TKA" },
    { href: "/cpns/mini-tryout", label: "Mini Tryout" },
    { href: "/cpns/full-tryout", label: "Full Tryout" },
    { href: "/cpns/drilling-materi", label: "Drilling Materi" },
] as const;

function NavLink({ href, label, active }: { href: string; label: string; active?: boolean }) {
    return (
        <Link
            href={href}
            className={cn(
                "st-focus rounded-xl px-3 py-2 text-sm font-black text-gray-700 hover:bg-blue-50 hover:text-blue-700",
                active && "bg-blue-50 text-blue-700"
            )}
        >
            {label}
        </Link>
    );
}

type ProgramLabel = "CPNS" | "TKA";

export default function SeoNavbarClient({
    isAuthenticated,
    programLabel,
}: {
    isAuthenticated: boolean;
    programLabel?: ProgramLabel;
}) {
    const pathname = usePathname();
    const currentPath = pathname || "/";
    const authHref = isAuthenticated ? "/cpns/dashboard" : `/login?returnTo=${encodeURIComponent(currentPath)}`;
    const authLabel = isAuthenticated ? "Dashboard" : "Masuk";
    const primaryHref = isAuthenticated ? "/cpns/dashboard" : `/register?returnTo=${encodeURIComponent(currentPath)}`;
    const primaryLabel = isAuthenticated ? "Lanjut belajar" : "Mulai belajar gratis";

    return (
        <header className="st-product fixed left-0 right-0 top-0 z-50 !bg-transparent px-4 py-3 md:px-8 md:py-4">
            <div className="relative mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 rounded-2xl border-2 border-[var(--st-ink)] bg-white/90 px-4 shadow-[3px_3px_0_var(--st-ink)] backdrop-blur-md supports-[backdrop-filter]:bg-white/80 md:px-5">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <Link href="/" className="st-focus shrink-0 font-handwriting text-2xl font-black tracking-tight md:text-3xl">
                        Siap<span className="text-blue-600 underline decoration-wavy decoration-2 underline-offset-2">Tempur</span>.
                    </Link>
                    {programLabel ? (
                        <span
                            className={cn(
                                "inline-flex shrink-0 rounded-full border-2 border-[var(--st-ink)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em]",
                                programLabel === "TKA"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-blue-100 text-blue-800",
                            )}
                        >
                            {programLabel}
                        </span>
                    ) : null}
                </div>

                <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigasi utama">
                    {navItems.map((item) => (
                        <NavLink key={item.href} href={item.href} label={item.label} active={item.href === currentPath} />
                    ))}
                </nav>

                <div className="flex items-center gap-2">
                    <Link href={authHref} className="st-focus hidden min-h-11 items-center rounded-xl px-3 text-sm font-black text-gray-700 hover:bg-gray-100 sm:inline-flex">
                        {authLabel}
                    </Link>

                    <Link href={primaryHref} className="st-button hidden min-h-11 items-center justify-center bg-blue-600 px-4 py-2 text-sm font-black text-white sm:inline-flex">
                        {primaryLabel}
                    </Link>

                    <details className="group relative lg:hidden">
                        <summary className="st-focus flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl border-2 border-[var(--st-ink)] bg-white marker:hidden" aria-label="Buka navigasi">
                            <Menu size={20} />
                        </summary>
                        <div className="absolute right-0 top-full mt-3 w-[min(21rem,calc(100vw-2rem))] rounded-2xl border-2 border-[var(--st-ink)] bg-white p-3 shadow-[4px_4px_0_var(--st-ink)]">
                            <nav className="grid gap-1 text-sm font-black" aria-label="Navigasi mobile">
                                {navItems.map((item) => (
                                    <Link key={item.href} href={item.href} className="st-focus rounded-xl px-3 py-3 hover:bg-blue-50">
                                        {item.label}
                                    </Link>
                                ))}
                            </nav>
                            <div className="mt-2 grid gap-1 border-t border-gray-200 pt-3 text-sm font-black">
                                {programItems.map((item) => (
                                    <Link key={item.href} href={item.href} className="st-focus rounded-xl px-3 py-3 text-gray-700 hover:bg-amber-50 hover:text-blue-700">
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                            <div className="mt-2 grid gap-2 border-t border-gray-200 pt-3 sm:hidden">
                                <Link href={authHref} className="st-focus flex min-h-11 items-center justify-center rounded-xl font-black hover:bg-gray-100">
                                    {authLabel}
                                </Link>
                                <Link href={primaryHref} className="st-button flex min-h-11 items-center justify-center bg-blue-600 px-4 py-2 text-sm font-black text-white">
                                    {primaryLabel}
                                </Link>
                            </div>
                        </div>
                    </details>
                </div>
            </div>
        </header>
    );
}
