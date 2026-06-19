"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function SeoNavbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="fixed top-0 w-full z-50 bg-[#fdfbf7]/90 backdrop-blur-sm border-b-4 border-gray-800/10">
            <nav className="container mx-auto px-4 h-20 flex items-center justify-between relative">
                <Link href="/" className="flex items-center group cursor-pointer pl-0 md:pl-0">
                    <span className="text-3xl font-handwriting font-bold text-gray-800 -rotate-1 group-hover:rotate-0 transition-transform leading-tight">
                        Siap<span className="text-blue-600 underline decoration-wavy decoration-2">Tempur</span>.
                    </span>
                </Link>

                {/* Desktop Navigation (Centered) */}
                <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex gap-6 font-handwriting text-xl text-gray-700">
                    <Link href="/#features" className="hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">Fitur</Link>
                    <Link href="/#products" className="hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">Harga</Link>
                    <Link href="/cpns#active-event" className="hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">Event</Link>
                    <Link href="/cpns/mini-tryout" className="hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">Mini Tryout</Link>
                    <Link href="/cpns/full-tryout" className="hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">Full Tryout</Link>
                </div>

                <div className="flex items-center gap-4">
                    <Button
                        onClick={() => window.location.href='/login'}
                        variant="secondary"
                        className="hidden md:block"
                    >
                        Masuk / Daftar
                    </Button>

                    {/* Hamburger Menu Button */}
                    <button
                        className="md:hidden p-2 text-gray-800 hover:bg-gray-200 rounded-md transition"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label={isMenuOpen ? 'Tutup menu' : 'Buka menu'}
                        aria-expanded={isMenuOpen}
                    >
                        {isMenuOpen ? <X size={32} /> : <Menu size={32} />}
                    </button>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMenuOpen && (
                    <div className="absolute top-20 left-0 w-full bg-[#fdfbf7] border-b-4 border-gray-800/10 shadow-lg p-6 flex flex-col gap-4 md:hidden z-40">
                        <Link href="/#features" onClick={() => setIsMenuOpen(false)} className="font-handwriting text-2xl text-gray-700 hover:text-blue-600 text-left py-2 border-b border-gray-200">Fitur</Link>
                        <Link href="/#products" onClick={() => setIsMenuOpen(false)} className="font-handwriting text-2xl text-gray-700 hover:text-blue-600 text-left py-2 border-b border-gray-200">Harga</Link>
                        <Link href="/cpns#active-event" onClick={() => setIsMenuOpen(false)} className="font-handwriting text-2xl text-gray-700 hover:text-blue-600 text-left py-2 border-b border-gray-200">Event</Link>
                        <Link href="/cpns/mini-tryout" onClick={() => setIsMenuOpen(false)} className="font-handwriting text-2xl text-gray-700 hover:text-blue-600 text-left py-2 border-b border-gray-200">Mini Tryout</Link>
                        <Link href="/cpns/full-tryout" onClick={() => setIsMenuOpen(false)} className="font-handwriting text-2xl text-gray-700 hover:text-blue-600 text-left py-2 border-b border-gray-200">Full Tryout</Link>
                        <Button
                            onClick={() => { window.location.href='/login'; setIsMenuOpen(false); }}
                            className="text-2xl py-3 mt-2"
                        >
                            Masuk / Daftar
                        </Button>
                    </div>
                )}
            </nav>
        </header>
    );
}
