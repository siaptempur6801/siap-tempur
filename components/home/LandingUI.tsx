"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";

import Link from "next/link";
import { Target, Timer, BarChart3, ArrowRight, HelpCircle, Sparkles, Menu, X, Flame, Rocket, Eye, Monitor, Flag, Clock, ChevronDown, MessageCircleQuestion } from "lucide-react";
import PaperBackground from "@/components/PaperBackground";
import CheckDoodle from "@/components/CheckDoodle";
import StructuredData from "@/components/StructuredData";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { cn } from "@/lib/utils";





export default function Home({ user: initialUser }: { user: User | null }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [selectedOption, setSelectedOption] = useState<string>('C');
    const user = initialUser;
    const router = useRouter();

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    const faqItems = [
        {
            q: "Apa itu Token dan bagaimana cara kerjanya?",
            a: "Token = 1x akses tryout SKD lengkap (110 soal TWK+TIU+TKP). Beli → pilih tryout → langsung kerjain. Simpel. Dan yang paling penting: token kamu gak pernah expired, jadi bisa dipakai kapanpun kamu siap."
        },
        {
            q: "Seberapa akurat soal dan sistem penilaiannya?",
            a: "Soal disusun berdasarkan kisi-kisi resmi SKD BKN dengan bobot penilaian yang sama persis (TWK 5-5-5, TIU 5-5-5, TKP 1-2-3-4-5). Passing grade juga sesuai standar BKN, jadi kamu bisa benar-benar ukur kesiapanmu."
        },
        {
            q: "Bisa diakses dari HP?",
            a: "Bisa! Kamu bisa latihan dari HP, tablet, atau laptop. Tapi kalau mau simulasi yang paling mendekati situasi ujian nyata, kami sarankan pakai laptop/PC karena hari H juga pakai komputer."
        },
        {
            q: "Bagaimana cara pembayaran?",
            a: "Cukup scan QRIS — bisa pakai GoPay, OVO, Dana, ShopeePay, atau m-banking apapun. Bayar selesai, token langsung aktif dalam hitungan detik. Tanpa ribet!"
        },
        {
            q: "Apakah ada pembahasan setiap soal?",
            a: "Ada! Setelah tryout selesai, kamu langsung dapat: pembahasan lengkap setiap soal, analisis skor per subtes (TWK/TIU/TKP), plus ranking kamu dibanding peserta lain se-Indonesia."
        },
        {
            q: "Kenapa harus beli paket, bukan satuan?",
            a: "Riset menunjukkan butuh minimal 3-5x latihan untuk benar-benar siap SKD. Paket 5x token cuma Rp 8k/tryout (hemat Rp 10.000 dari harga satuan). Investasi kecil untuk masa depan ASN-mu!"
        }
    ];

    const cpnsSchema = {
        "@context": "https://schema.org",
        "@type": "Course",
        "name": "Tryout SKD CPNS 2026 Siap Tempur",
        "description": "Simulasi ujian SKD CPNS dengan sistem CAT BKN asli. Materi TWK, TIU, TKP, dan ranking nasional.",
        "provider": {
            "@type": "Organization",
            "name": "Siap Tempur",
            "sameAs": "https://siaptempur.id"
        },
        "offers": {
            "@type": "Offer",
            "category": "Education",
            "price": "8000.00",
            "priceCurrency": "IDR",
            "availability": "https://schema.org/InStock"
        }
    };

    return (
        <main className="font-body min-h-screen bg-[#fdfbf7] text-gray-800 selection:bg-yellow-200 selection:text-black overflow-x-hidden">
            <StructuredData data={cpnsSchema} />

            {/* --- NAVBAR (Binder Style) --- */}
            <header className="fixed top-0 w-full z-50 bg-[#fdfbf7]/90 backdrop-blur-sm border-b-4 border-gray-800/10">
                <nav className="container mx-auto px-4 h-20 flex items-center justify-between relative">


                    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Scroll ke atas" className="flex flex-col items-start group cursor-pointer pl-0 md:pl-0">
                        <span className="text-2xl font-handwriting font-bold text-gray-800 rotate-[-1deg] group-hover:rotate-0 transition-transform leading-tight">
                            CPNS & KEDINASAN
                        </span>
                        <span className="text-sm font-handwriting font-bold text-gray-500 ml-1 -mt-1 group-hover:text-gray-900 transition-colors">
                            by Siap<span className="text-blue-600 underline decoration-wavy decoration-2">Tempur</span>.
                        </span>
                    </button>

                    {/* Desktop Navigation (Centered) */}
                    <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex gap-6 font-handwriting text-xl text-gray-700">
                        <button onClick={() => scrollToSection("features")} className="hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">Fitur</button>
                        <button onClick={() => scrollToSection("exam-preview")} className="hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">Intip Simulasi</button>
                        <button onClick={() => scrollToSection("products")} className="hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">Harga</button>
                        <button onClick={() => scrollToSection("memorials")} className="hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">Kata Mereka</button>
                    </div>

                    <div className="flex items-center gap-4">
                        {user ? (
                            <Button
                                onClick={() => router.push("/cpns/dashboard")}
                                className="hidden md:block"
                            >
                                Dashboard
                            </Button>
                        ) : (
                            <Button
                                onClick={() => router.push("/login?returnTo=/cpns")}
                                variant="secondary"
                                className="hidden md:block"
                            >
                                Masuk / Daftar
                            </Button>
                        )}

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
                            <button onClick={() => { scrollToSection("features"); setIsMenuOpen(false); }} className="font-handwriting text-2xl text-gray-700 hover:text-blue-600 text-left py-2 border-b border-gray-200">Fitur</button>
                            <button onClick={() => { scrollToSection("exam-preview"); setIsMenuOpen(false); }} className="font-handwriting text-2xl text-gray-700 hover:text-blue-600 text-left py-2 border-b border-gray-200">Intip Simulasi</button>
                            <button onClick={() => { scrollToSection("products"); setIsMenuOpen(false); }} className="font-handwriting text-2xl text-gray-700 hover:text-blue-600 text-left py-2 border-b border-gray-200">Harga</button>
                            <button onClick={() => { scrollToSection("memorials"); setIsMenuOpen(false); }} className="font-handwriting text-2xl text-gray-700 hover:text-blue-600 text-left py-2 border-b border-gray-200">Kata Mereka</button>
                            {user ? (
                                <Button
                                    onClick={() => { router.push("/cpns/dashboard"); setIsMenuOpen(false); }}
                                    className="text-2xl py-3 mt-2"
                                >
                                    Dashboard
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => { router.push("/login?returnTo=/cpns"); setIsMenuOpen(false); }}
                                    variant="secondary"
                                    className="text-2xl py-3 mt-2"
                                >
                                    Masuk / Daftar
                                </Button>
                            )}
                        </div>
                    )}
                </nav>
            </header>

            {/* --- HERO SECTION (Kertas Ujian) --- */}
            <Section paper className="pt-32 pb-32">
                <div className="text-center relative z-10">
                    {/* Label Stabilo */}
                    <Badge variant="yellow" className="mb-6">
                        🎯 Persiapan CPNS & Kedinasan 2026
                    </Badge>

                    <h1 className="font-handwriting text-5xl md:text-7xl font-bold mb-6 leading-tight">
                        Latihan SKD Sampai Lulus, <br />
                        <span className="text-blue-600">Bukan</span> Sampai <br />
                        <span className="relative inline-block mt-2">
                            Dompet Habis.
                            {/* Coretan bawah */}
                            <svg className="absolute w-full h-3 -bottom-1 left-0 text-blue-500/50" viewBox="0 0 100 10" preserveAspectRatio="none">
                                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                            </svg>
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-gray-700 max-w-2xl mx-auto mb-10 font-handwriting leading-relaxed">
                        Tryout SKD dengan <strong>sistem penilaian standar CAT BKN</strong> — mulai dari
                        <span className="bg-green-200 px-1 mx-1">Rp 8.000/tryout.</span>
                        Beli ketengan, langsung latihan. Tanpa langganan, tanpa ribet.
                    </p>

                    <div className="flex flex-col items-center gap-8">
                        <div className="flex flex-col sm:flex-row justify-center gap-4 w-full">
                            <Button
                                size="lg"
                                onClick={() => scrollToSection("products")}
                                className="w-full sm:w-auto"
                            >
                                Mulai Latihan Sekarang <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                            </Button>

                            <Button
                                size="lg"
                                variant="outline"
                                onClick={() => scrollToSection("exam-preview")}
                                className="w-full sm:w-auto"
                            >
                                Lihat Dulu Tampilannya <Eye className="w-6 h-6" />
                            </Button>
                        </div>
                    </div>
                </div>
            </Section>

            {/* --- KEUNGGULAN (Doodle Icons) --- */}
            <Section id="features" dashedBorder="both" pattern="grid" className="bg-white">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="font-handwriting text-5xl font-bold mb-4">Kenapa Ribuan Peserta Pilih Sini?</h2>
                    <p className="font-handwriting text-2xl text-gray-600">Karena yang kaget di hari H itu yang gak pernah latihan serius.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Card 1 */}
                    <Card interactive className="p-6">
                        <div className="mb-4 group-hover:scale-110 transition-transform duration-300">
                            <Target className="w-12 h-12 text-blue-600 -rotate-6" strokeWidth={2.5} />
                        </div>
                        <h3 className="font-handwriting text-2xl font-bold mb-2">Penilaian Standar BKN</h3>
                        <p className="text-gray-700">Bobot skor & passing grade <strong>100% sesuai aturan BKN</strong>. Kamu bisa tahu persis posisimu: lulus atau belum — sebelum hari H tiba.</p>
                    </Card>

                    {/* Card 2 */}
                    <Card interactive className="p-6">
                        <div className="mb-4 group-hover:scale-110 transition-transform duration-300">
                            <Timer className="w-12 h-12 text-red-500 rotate-6" strokeWidth={2.5} />
                        </div>
                        <h3 className="font-handwriting text-2xl font-bold mb-2">Timer 100 Menit Berjalan</h3>
                        <p className="text-gray-700">110 soal, 100 menit. Latihan di sini = latihan manajemen waktu yang menentukan lolos atau gagal di CAT BKN nanti.</p>
                    </Card>

                    {/* Card 3 */}
                    <Card interactive className="p-6">
                        <div className="mb-4 group-hover:scale-110 transition-transform duration-300">
                            <BarChart3 className="w-12 h-12 text-green-600 -rotate-3" strokeWidth={2.5} />
                        </div>
                        <h3 className="font-handwriting text-2xl font-bold mb-2">Tahu Kelemahanmu</h3>
                        <p className="text-gray-700">Analisis skor TWK, TIU, TKP + ranking nasional. Langsung tahu bagian mana yang harus diperbaiki sebelum tes sesungguhnya.</p>
                    </Card>
                </div>
            </Section>

            {/* --- INTIP TAMPILAN SIMULASI (Exam Preview) --- */}
            <Section id="exam-preview" paper className="bg-[#fdfbf7]">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <Badge variant="blue" className="mb-4">
                        <Eye className="w-5 h-5" /> Sneak Peek!
                    </Badge>
                        <h2 className="font-handwriting text-5xl font-bold mb-4">Begini Rasanya Latihan di Sini</h2>
                        <p className="font-handwriting text-2xl text-gray-600">Sistem penilaian sama persis dengan CAT BKN. Bedanya, ini latihan — salah di sini gratis, salah di sana hilang kursi ASN.</p>
                    </div>

                    {/* Exam Mockup Container */}
                    <div className="max-w-5xl mx-auto relative">

                        {/* Floating Annotations */}
                        <div className="hidden md:block absolute -top-6 -right-4 lg:-right-16 z-30">
                            <div className="bg-yellow-200 border-2 border-gray-900 px-4 py-2 rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-handwriting font-bold text-sm -rotate-3 animate-float-annotation">
                                <Clock className="w-4 h-4 inline -mt-0.5 mr-1 text-red-500" />
                                Timer real-time persis CAT BKN!
                            </div>
                        </div>

                        <div className="hidden md:block absolute bottom-24 -left-4 lg:-left-24 z-30">
                            <div className="bg-green-200 border-2 border-gray-900 px-4 py-2 rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-handwriting font-bold text-sm rotate-2 animate-float-annotation" style={{ animationDelay: '1s' }}>
                                <Flag className="w-4 h-4 inline -mt-0.5 mr-1 text-orange-500" />
                                Tandai soal ragu-ragu!
                            </div>
                        </div>

                        <div className="hidden md:block absolute -bottom-4 -right-4 lg:-right-12 z-30">
                            <div className="bg-pink-200 border-2 border-gray-900 px-4 py-2 rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-handwriting font-bold text-sm rotate-1 animate-float-annotation" style={{ animationDelay: '2s' }}>
                                <Monitor className="w-4 h-4 inline -mt-0.5 mr-1 text-blue-600" />
                                Navigasi soal satu layar!
                            </div>
                        </div>

                        {/* Main Mockup Card */}
                        <div className="bg-white/90 backdrop-blur-sm border-2 border-gray-900 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">

                            {/* Mock Header */}
                            <div className="border-b-2 border-dashed border-gray-300 bg-yellow-50/50 p-3 md:p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-baseline gap-1">
                                                <span className="font-handwriting font-bold text-xl md:text-2xl text-gray-900">Soal #15</span>
                                                <span className="font-handwriting text-sm text-gray-500 md:text-lg">/ 110</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="px-1.5 py-0.5 bg-gray-900 text-white text-[10px] md:text-[11px] font-bold rounded uppercase tracking-wider">TWK</span>
                                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 text-[10px] md:text-xs font-bold font-handwriting rounded shadow-sm">Pancasila</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="px-2 py-1 md:px-4 md:py-1 rounded-full text-xs md:text-sm font-mono flex items-center gap-1.5 bg-blue-50 text-blue-700 border-2 border-blue-900 shadow-[2px_2px_0px_0px_rgba(30,58,138,1)]">
                                            <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                            <span className="blink-timer">01:25:30</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Mock Content Area */}
                            <div className="flex flex-col lg:flex-row">

                                {/* Question Panel */}
                                <div className="flex-1 p-4 md:p-6">
                                    <div className="mb-6">
                                        <p className="text-lg md:text-2xl leading-relaxed font-handwriting font-bold text-gray-900">
                                            Pancasila sebagai dasar negara mengandung nilai-nilai yang menjadi pedoman dalam kehidupan bermasyarakat, berbangsa, dan bernegara. Sila ke-3 Pancasila berbunyi...
                                        </p>
                                    </div>

                                    <div className="space-y-2 md:space-y-3">
                                        {[
                                            { key: 'A', text: 'Ketuhanan Yang Maha Esa' },
                                            { key: 'B', text: 'Kemanusiaan yang Adil dan Beradab' },
                                            { key: 'C', text: 'Persatuan Indonesia' },
                                            { key: 'D', text: 'Kerakyatan yang Dipimpin oleh Hikmat Kebijaksanaan' },
                                            { key: 'E', text: 'Keadilan Sosial bagi Seluruh Rakyat Indonesia' },
                                        ].map((opt) => {
                                            const isSelected = selectedOption === opt.key;
                                            return (
                                                <button
                                                    key={opt.key}
                                                    type="button"
                                                    onClick={() => setSelectedOption(opt.key)}
                                                    className={`w-full p-3 md:p-4 rounded-xl border-2 flex items-start gap-4 transition-all duration-200 cursor-pointer text-left ${isSelected
                                                        ? 'border-blue-600 bg-blue-50 shadow-[2px_2px_0px_0px_rgba(37,99,235,1)] translate-x-[1px] translate-y-[1px] relative overflow-hidden'
                                                        : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/30'
                                                        }`}
                                                >
                                                    {isSelected && <div className="absolute inset-x-0 bottom-2 top-2 bg-blue-400/20 -z-10" />}
                                                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 font-handwriting font-bold text-lg transition-all duration-200 ${isSelected
                                                        ? 'border-blue-600 bg-blue-600 text-white scale-110'
                                                        : 'border-gray-400 text-gray-400'
                                                        }`}>{opt.key}</div>
                                                    <span className={`text-base md:text-lg leading-relaxed font-handwriting transition-colors duration-200 ${isSelected
                                                        ? 'text-blue-900 font-bold'
                                                        : 'text-gray-600 font-medium'
                                                        }`}>{opt.text}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Navigation Panel (visible on md+) */}
                                <div className="hidden lg:flex w-72 shrink-0 flex-col bg-white/90 border-l-2 border-gray-900">
                                    <div className="p-4 border-b-2 border-dashed border-gray-300 font-handwriting font-bold text-lg flex items-center gap-2 text-gray-800">
                                        Navigasi Soal
                                    </div>
                                    <div className="p-4 flex-1 overflow-y-auto">
                                        <div className="grid grid-cols-5 gap-2">
                                            {Array.from({ length: 30 }, (_, i) => {
                                                const num = i + 1;
                                                // Simulate some answered (blue), some marked (yellow), active (ring)
                                                const isActive = num === 15;
                                                const isAnswered = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 15].includes(num);
                                                const isMarked = [6, 14].includes(num);
                                                return (
                                                    <div
                                                        key={num}
                                                        className={`aspect-square rounded-lg font-handwriting font-bold text-sm flex items-center justify-center border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] ${isActive ? 'ring-2 ring-blue-400 ring-offset-1 border-blue-600 z-10' : ''
                                                            } ${isMarked
                                                                ? 'bg-yellow-500 text-yellow-950 border-yellow-700'
                                                                : isAnswered
                                                                    ? 'bg-blue-700 text-white border-blue-900'
                                                                    : 'bg-white text-gray-600 border-gray-300'
                                                            }`}
                                                    >
                                                        {num}
                                                    </div>
                                                );
                                            })}
                                            {/* More indicator */}
                                            <div className="col-span-5 text-center font-handwriting text-gray-400 text-sm mt-1">... sampai 110</div>
                                        </div>
                                    </div>
                                    <div className="p-3 border-t-2 border-dashed border-gray-300 bg-gray-50/50">
                                        <div className="p-2 bg-white border-2 border-gray-200 text-xs text-gray-600 space-y-1 rounded-lg font-handwriting font-bold shadow-sm">
                                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500 border border-blue-700"></div><span>Dijawab</span></div>
                                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-600"></div><span>Ragu-ragu</span></div>
                                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-white border-2 border-gray-300"></div><span>Belum dijawab</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Mock Footer Nav */}
                            <div className="hidden sm:flex p-4 border-t-2 border-dashed border-gray-300 justify-between items-center bg-white/50">
                                <div className="flex items-center gap-2 px-5 py-2 rounded-lg border-2 border-gray-900 font-handwriting font-bold bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                    ← Sebelumnya
                                </div>
                                <div className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white border-2 border-gray-900 rounded-lg font-handwriting font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]">
                                    Selanjutnya →
                                </div>
                            </div>
                        </div>

                        {/* Decorative "DEMO" Label */}
                        <div className="absolute top-4 left-4 bg-red-700 text-white font-handwriting text-xs font-bold px-3 py-1 rounded-full -rotate-12 shadow-lg z-30 border-2 border-red-900">
                            DEMO
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="text-center mt-12">
                        <button
                            onClick={() => user ? router.push("/cpns/dashboard") : router.push("/login?returnTo=/cpns")}
                            className="group px-8 py-4 font-handwriting text-2xl font-bold bg-blue-600 text-white rounded-lg border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all cursor-pointer inline-flex items-center gap-3"
                        >
                            Coba Sekarang! <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <p className="font-handwriting text-lg text-gray-500 mt-4">Mulai dari Rp 8.000/tryout. Lebih murah dari kopi, tapi bisa ubah masa depanmu.</p>
                    </div>
                </Section>

            {/* --- PRICING SECTION --- */}
            <Section id="products" pattern="dots" dashedBorder="both" className="bg-[#f0f4f8]">
                <div className="text-center mb-16 relative z-10">
                    <Badge variant="red" className="mb-4">BISA SCAN QRIS</Badge>
                    <h2 className="font-handwriting text-5xl font-bold mb-4">Investasi ASN Sekali Bayar</h2>
                    <p className="font-handwriting text-2xl text-gray-600">Tanpa biaya bulanan. Beli token sesuai kebutuhan tempurmu.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
                    {/* Paket 1 */}
                    <Card variant="standard" interactive className="p-8 bg-white border-4 border-gray-900 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
                        <span className="font-handwriting font-bold text-gray-500 mb-2 block">PAKET PERINTIS</span>
                        <div className="flex items-end gap-1 mb-6">
                            <span className="text-2xl font-bold mb-2">Rp</span>
                            <span className="text-6xl font-bold text-gray-900">10k</span>
                        </div>
                        <Badge variant="pink" className="mb-8">1x TOKEN TRYOUT</Badge>
                        <ul className="space-y-4 mb-8 w-full font-handwriting text-lg text-gray-700">
                            <li className="flex items-center gap-3"><Flag size={20} className="text-blue-600" /> 110 Soal Prediksi</li>
                            <li className="flex items-center gap-3"><Clock size={20} className="text-blue-600" /> Waktu 100 Menit</li>
                            <li className="flex items-center gap-3"><Monitor size={20} className="text-blue-600" /> CAT BKN Interface</li>
                            <li className="flex items-center gap-3"><BarChart3 size={20} className="text-blue-600" /> Pembahasan Lengkap</li>
                        </ul>
                        <Button
                            className="w-full text-xl py-6 mt-auto"
                            onClick={() => router.push("/login?returnTo=/cpns")}
                        >
                            Beli Sekarang
                        </Button>
                    </Card>

                    {/* Paket 2 (Featured) */}
                    <Card variant="standard" interactive className="p-10 bg-blue-600 border-4 border-gray-900 relative overflow-hidden group scale-105 z-20">
                        <div className="absolute top-4 right-4 bg-yellow-400 text-gray-900 font-bold px-4 py-1 rounded-full text-sm shadow-md z-10 animate-pulse">PALING LARIS!</div>
                        <span className="font-handwriting font-bold text-blue-100 mb-2 block">PAKET PEJUANG</span>
                        <div className="flex items-end gap-1 mb-6">
                            <span className="text-2xl font-bold mb-2 text-white">Rp</span>
                            <span className="text-6xl font-bold text-yellow-400">40k</span>
                        </div>
                        <Badge variant="yellow" className="mb-8">5x TOKEN TRYOUT</Badge>
                        <ul className="space-y-4 mb-8 w-full font-handwriting text-xl font-bold text-white">
                            <li className="flex items-center gap-3"><Sparkles size={24} className="text-yellow-400" /> Semua Fitur Tryout</li>
                            <li className="flex items-center gap-3"><Sparkles size={24} className="text-yellow-400" /> Lebih Hemat Rp 10rb</li>
                            <li className="flex items-center gap-3"><Sparkles size={24} className="text-yellow-400" /> Ranking Nasional</li>
                            <li className="flex items-center gap-3"><Sparkles size={24} className="text-yellow-400" /> Token Selamanya</li>
                        </ul>
                        <Button
                            size="lg"
                            className="w-full text-2xl py-6 bg-yellow-400 text-gray-900 hover:bg-yellow-300 mt-auto"
                            onClick={() => router.push("/login?returnTo=/cpns")}
                        >
                            Ambil Paket Ini <Rocket className="ml-2 animate-bounce" />
                        </Button>
                    </Card>

                    {/* Paket 3 */}
                    <Card variant="standard" interactive className="p-8 bg-white border-4 border-gray-900 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
                        <span className="font-handwriting font-bold text-gray-500 mb-2 block">PAKET PASUKAN</span>
                        <div className="flex items-end gap-1 mb-6">
                            <span className="text-2xl font-bold mb-2">Rp</span>
                            <span className="text-6xl font-bold text-gray-900">75k</span>
                        </div>
                        <Badge variant="green" className="mb-8">10x TOKEN TRYOUT</Badge>
                        <ul className="space-y-4 mb-8 w-full font-handwriting text-lg text-gray-700">
                            <li className="flex items-center gap-3 text-green-600 font-bold"><Sparkles size={20} /> Persiapan Maksimal</li>
                            <li className="flex items-center gap-3"><Sparkles size={20} className="text-green-600" /> Latihan Tiap Minggu</li>
                            <li className="flex items-center gap-3"><Sparkles size={20} className="text-green-600" /> Ranking Terupdate</li>
                            <li className="flex items-center gap-3"><Sparkles size={20} className="text-green-600" /> Hemat Rp 25.000!</li>
                        </ul>
                        <Button
                            className="w-full text-xl py-6 mt-auto"
                            onClick={() => router.push("/login?returnTo=/cpns")}
                        >
                            Hajar Gaskeun!
                        </Button>
                    </Card>
                </div>
            </Section>

            {/* --- TESTIMONIALS (Sketsa Orang) --- */}
            <Section id="memorials" className="bg-white" dashedBorder="top" pattern="dots">
                <div className="text-center max-w-4xl mx-auto mb-16">
                    <h2 className="font-handwriting text-5xl font-bold mb-4">"Gak Nyangka, Soalnya Mirip Banget!"</h2>
                    <p className="font-handwriting text-2xl text-gray-600">Kata mereka yang udah "tempur" duluan dan sekarang udah pakai seragam.</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Testi 1 */}
                    <Card interactive className="p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-blue-100 border-2 border-gray-900 rounded-full flex items-center justify-center text-3xl">👨‍💼</div>
                            <div>
                                <h4 className="font-handwriting text-xl font-bold">Rizky - Bekasi</h4>
                                <div className="flex text-yellow-500"><Sparkles size={16} fill="currentColor" /><Sparkles size={16} fill="currentColor" /><Sparkles size={16} fill="currentColor" /><Sparkles size={16} fill="currentColor" /><Sparkles size={16} fill="currentColor" /></div>
                            </div>
                        </div>
                        <p className="font-handwriting text-xl text-gray-700 italic leading-relaxed">
                            "Membantu banget pas manajemen waktu. Pas hari H beneran gak kaget lagi sama timer yang jalan terus. Skor TIU-ku naik drastis!"
                        </p>
                    </Card>

                    {/* Testi 2 */}
                    <Card interactive className="p-8 rotate-1">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-pink-100 border-2 border-gray-900 rounded-full flex items-center justify-center text-3xl">👩‍🏫</div>
                            <div>
                                <h4 className="font-handwriting text-xl font-bold">Dina - Surabaya</h4>
                                <div className="flex text-yellow-500"><Sparkles size={16} fill="currentColor" /><Sparkles size={16} fill="currentColor" /><Sparkles size={16} fill="currentColor" /><Sparkles size={16} fill="currentColor" /><Sparkles size={16} fill="currentColor" /></div>
                            </div>
                        </div>
                        <p className="font-handwriting text-xl text-gray-700 italic leading-relaxed">
                            "Pembahasannya gampang dimengerti, gak bertele-tele. Fitur ranking nasionalnya bikin makin semangat buat ngejar skor tertinggi."
                        </p>
                    </Card>

                    {/* Testi 3 */}
                    <Card interactive className="p-8 rotate-[-1deg]">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-green-100 border-2 border-gray-900 rounded-full flex items-center justify-center text-3xl">🧑‍💻</div>
                            <div>
                                <h4 className="font-handwriting text-xl font-bold">Fajar - Medan</h4>
                                <div className="flex text-yellow-500"><Sparkles size={16} fill="currentColor" /><Sparkles size={16} fill="currentColor" /><Sparkles size={16} fill="currentColor" /><Sparkles size={16} fill="currentColor" /><Sparkles size={16} fill="currentColor" /></div>
                            </div>
                        </div>
                        <p className="font-handwriting text-xl text-gray-700 italic leading-relaxed">
                            "Sistem CAT-nya mirip banget sama aslinya. Pas tes beneran kerasa kayak lagi ngerjain tryout di Siap Tempur aja. Akhirnya lolos tahun ini!"
                        </p>
                    </Card>
                </div>
            </Section>

            {/* --- FAQ SECTION --- */}
            <Section dashedBorder="top" className="bg-white">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                        <Badge variant="blue" className="mb-4">Tanya Jawab</Badge>
                        <h2 className="font-handwriting text-5xl font-bold">Bingung Soal Tempur?</h2>
                    </div>

                    <div className="space-y-4">
                        {faqItems.map((item, i) => (
                            <Card key={i} className="overflow-hidden">
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between p-6 text-left cursor-pointer group"
                                >
                                    <span className="font-handwriting text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                                        {item.q}
                                    </span>
                                    <ChevronDown className={cn("w-6 h-6 transition-transform text-gray-400", openFaq === i && "rotate-180 text-blue-600")} />
                                </button>
                                {openFaq === i && (
                                    <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-200">
                                        <div className="h-0.5 w-full bg-gray-100 mb-4" />
                                        <p className="font-handwriting text-xl text-gray-600 leading-relaxed italic">
                                            {item.a}
                                        </p>
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                </div>
            </Section>

            {/* --- CPNS FOOTER --- */}
            <footer className="bg-gray-900 text-white py-20 relative overflow-hidden">
                {/* Scribble decoration */}
                <div className="absolute top-10 right-10 opacity-10 rotate-12">
                    <Rocket size={120} />
                </div>

                <div className="max-w-4xl mx-auto text-center relative z-10 px-4">
                    <h2 className="font-handwriting text-4xl font-bold mb-6 italic">"Jangan Tempur Tanpa Amunisi."</h2>
                    <p className="text-gray-400 mb-8 max-w-lg mx-auto font-handwriting text-xl">Lolos CPNS bukan soal pintar saja, tapi soal siapa yang paling siap menghadapi sistem CAT yang aslinya.</p>

                    <Button
                        variant="white"
                        size="lg"
                        onClick={() => scrollToSection("products")}
                    >
                        Ambil Amunisi Sekarang
                    </Button>

                    <div className="mt-16 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-6 font-handwriting text-lg text-gray-500">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-white">Siap Tempur</span> © 2026
                        </div>
                        <div className="flex flex-wrap justify-center gap-6">
                            <Link href="/syarat-ketentuan" className="hover:text-white transition-colors">Syarat & Ketentuan</Link>
                            <Link href="/kebijakan-privasi" className="hover:text-white transition-colors">Kebijakan Privasi</Link>
                            <Link href="/kebijakan-pengembalian" className="hover:text-white transition-colors">Kebijakan Pengembalian</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </main>
    );
}