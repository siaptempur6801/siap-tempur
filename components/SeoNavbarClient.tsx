"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, Zap, Monitor, Target } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export default function SeoNavbarClient({ isAuthenticated }: { isAuthenticated: boolean }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isTryoutOpen, setIsTryoutOpen] = useState(false);
    const pathname = usePathname();
    const authHref = isAuthenticated ? "/cpns/dashboard" : `/login?returnTo=${encodeURIComponent(pathname || "/cpns")}`;
    const authLabel = isAuthenticated ? "Dashboard" : "Masuk / Daftar";

    return (
        <header className="fixed top-0 w-full z-50 bg-[#fdfbf7]/90 backdrop-blur-sm border-b-4 border-gray-800/10">
            <nav className="container mx-auto px-4 h-20 flex items-center justify-between relative">
                <Link href="/" className="flex items-center group cursor-pointer pl-0 md:pl-0">
                    <span className="text-3xl font-handwriting font-bold text-gray-800 -rotate-1 group-hover:rotate-0 transition-transform leading-tight">
                        Siap<span className="text-blue-600 underline decoration-wavy decoration-2">Tempur</span>.
                    </span>
                </Link>

                <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-6 font-handwriting text-xl text-gray-700">
                    <Link href="/#features" className="hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">Fitur</Link>
                    <Link href="/#products" className="hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">Harga</Link>
                    <Link href="/cpns#active-event" className="hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">Event</Link>

                    <div className="relative" onMouseEnter={() => setIsTryoutOpen(true)} onMouseLeave={() => setIsTryoutOpen(false)}>
                        <button className="flex items-center gap-1 hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">
                            Tryout <ChevronDown size={16} className={cn("transition-transform", isTryoutOpen && "rotate-180")} />
                        </button>
                        {isTryoutOpen && (
                            <>
                                <div className="absolute top-full left-0 w-full h-3" />
                                <div className="absolute top-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2 w-52 bg-[#fdfbf7] border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-md overflow-hidden z-50">
                                    <Link href="/cpns/mini-tryout" className="flex items-center gap-2 px-4 py-3 hover:bg-yellow-50 border-b border-gray-200 font-handwriting text-lg text-gray-800 hover:text-blue-600 transition-colors">
                                        <Zap size={16} className="text-yellow-500" /> Mini Tryout
                                    </Link>
                                    <Link href="/cpns/full-tryout" className="flex items-center gap-2 px-4 py-3 hover:bg-blue-50 border-b border-gray-200 font-handwriting text-lg text-gray-800 hover:text-blue-600 transition-colors">
                                        <Monitor size={16} className="text-blue-500" /> Full Tryout
                                    </Link>
                                    <Link href="/cpns/drilling-materi" className="flex items-center gap-2 px-4 py-3 hover:bg-red-50 border-b border-gray-200 font-handwriting text-lg text-gray-800 hover:text-blue-600 transition-colors">
                                        <Target size={16} className="text-red-500" /> Drilling Materi
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>

                    <Link href="/blog" className="hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">Artikel</Link>
                </div>

                <div className="flex items-center gap-4">
                    <Button asChild variant="secondary" className="hidden md:block">
                        <Link href={authHref}>{authLabel}</Link>
                    </Button>

                    <button
                        className="md:hidden p-2 text-gray-800 hover:bg-gray-200 rounded-md transition"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label={isMenuOpen ? 'Tutup menu' : 'Buka menu'}
                        aria-expanded={isMenuOpen}
                    >
                        {isMenuOpen ? <X size={32} /> : <Menu size={32} />}
                    </button>
                </div>

                {isMenuOpen && (
                    <div className="absolute top-20 left-0 w-full bg-[#fdfbf7] border-b-4 border-gray-800/10 shadow-lg p-6 flex flex-col gap-4 md:hidden z-40">
                        <Link href="/#features" onClick={() => setIsMenuOpen(false)} className="font-handwriting text-2xl text-gray-700 hover:text-blue-600 text-left py-2 border-b border-gray-200">Fitur</Link>
                        <Link href="/#products" onClick={() => setIsMenuOpen(false)} className="font-handwriting text-2xl text-gray-700 hover:text-blue-600 text-left py-2 border-b border-gray-200">Harga</Link>
                        <Link href="/cpns#active-event" onClick={() => setIsMenuOpen(false)} className="font-handwriting text-2xl text-gray-700 hover:text-red-600 text-left py-2 border-b border-gray-200">Event</Link>
                        <Link href="/cpns/mini-tryout" onClick={() => setIsMenuOpen(false)} className="font-handwriting text-2xl text-gray-700 hover:text-blue-600 text-left py-2 border-b border-gray-200">Mini Tryout</Link>
                        <Link href="/cpns/full-tryout" onClick={() => setIsMenuOpen(false)} className="font-handwriting text-2xl text-gray-700 hover:text-blue-600 text-left py-2 border-b border-gray-200">Full Tryout</Link>
                        <Link href="/cpns/drilling-materi" onClick={() => setIsMenuOpen(false)} className="font-handwriting text-2xl text-gray-700 hover:text-blue-600 text-left py-2 border-b border-gray-200">Drilling Materi</Link>
                        <Link href="/blog" onClick={() => setIsMenuOpen(false)} className="font-handwriting text-2xl text-gray-700 hover:text-blue-600 text-left py-2 border-b border-gray-200">Artikel</Link>
                        <Button asChild className="text-2xl py-3 mt-2">
                            <Link href={authHref} onClick={() => setIsMenuOpen(false)}>{authLabel}</Link>
                        </Button>
                    </div>
                )}
            </nav>
        </header>
    );
}
