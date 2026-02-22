"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";

import Link from "next/link";
import { Target, Timer, BarChart3, ArrowRight, HelpCircle, Sparkles, Menu, X, Flame, Rocket, Eye, Monitor, Flag, Clock, ChevronDown, MessageCircleQuestion } from "lucide-react";
import PaperBackground from "@/components/PaperBackground";
import CheckDoodle from "@/components/CheckDoodle";





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

    return (
        <main className="font-body min-h-screen bg-[#fdfbf7] text-gray-800 selection:bg-yellow-200 selection:text-black overflow-x-hidden">

            {/* --- NAVBAR (Binder Style) --- */}
            <header className="fixed top-0 w-full z-50 bg-[#fdfbf7]/90 backdrop-blur-sm border-b-4 border-gray-800/10">
                <nav className="container mx-auto px-4 h-20 flex items-center justify-between relative">


                    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Scroll ke atas" className="text-3xl font-handwriting font-bold text-gray-800 rotate-[-2deg] cursor-pointer hover:rotate-0 transition-transform pl-0 md:pl-0">
                        Siap<span className="text-blue-600 underline decoration-wavy decoration-2">Tempur</span>.
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
                            <button
                                onClick={() => router.push("/dashboard")}
                                className="hidden md:block px-6 py-2 font-handwriting text-xl font-bold text-white bg-blue-600 rounded-md border-2 border-transparent hover:bg-white hover:text-blue-600 hover:border-blue-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer">
                                Dashboard
                            </button>
                        ) : (
                            <button
                                onClick={() => router.push("/login")}
                                className="hidden md:block px-6 py-2 font-handwriting text-xl font-bold text-white bg-gray-900 rounded-md border-2 border-transparent hover:bg-white hover:text-gray-900 hover:border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer">
                                Masuk / Daftar
                            </button>
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
                                <button
                                    onClick={() => { router.push("/dashboard"); setIsMenuOpen(false); }}
                                    className="font-handwriting text-2xl font-bold text-white bg-blue-600 px-6 py-3 rounded-md text-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] mt-2">
                                    Dashboard
                                </button>
                            ) : (
                                <button
                                    onClick={() => { router.push("/login"); setIsMenuOpen(false); }}
                                    className="font-handwriting text-2xl font-bold text-white bg-gray-900 px-6 py-3 rounded-md text-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] mt-2">
                                    Masuk / Daftar
                                </button>
                            )}
                        </div>
                    )}
                </nav>
            </header>

            {/* --- HERO SECTION (Kertas Ujian) --- */}
            <section className="relative pt-32 pb-32 overflow-hidden">
                <PaperBackground />

                <div className="container mx-auto px-4 text-center relative z-10">
                    {/* Label Stabilo */}
                    <span className="inline-block px-4 py-1 mb-6 font-handwriting text-xl font-bold bg-yellow-200 -rotate-2 border-2 border-gray-800 rounded-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        🎯 Persiapan CPNS & Kedinasan 2026
                    </span>

                    <h1 className="font-handwriting text-5xl md:text-7xl font-bold mb-6 leading-[0.9]">
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
                            <button
                                onClick={() => scrollToSection("products")}
                                className="group px-8 py-4 font-handwriting text-2xl font-bold bg-blue-600 text-white rounded-lg border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all cursor-pointer flex items-center justify-center gap-3">
                                Mulai Latihan Sekarang <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                            </button>

                            <button
                                onClick={() => scrollToSection("exam-preview")}
                                className="px-8 py-4 font-handwriting text-2xl font-bold bg-white text-gray-900 rounded-lg border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all cursor-pointer flex items-center justify-center gap-3">
                                Lihat Dulu Tampilannya <Eye className="w-6 h-6" />
                            </button>
                        </div>


                    </div>
                </div>
            </section>

            {/* --- KEUNGGULAN (Doodle Icons) --- */}
            <section id="features" className="py-24 bg-white border-y-4 border-gray-900 border-dashed relative">
                {/* Pattern Grid Background */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>

                <div className="container mx-auto px-4 relative z-10">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="font-handwriting text-5xl font-bold mb-4">Kenapa Ribuan Peserta Pilih Sini?</h2>
                        <p className="font-handwriting text-2xl text-gray-600">Karena yang kaget di hari H itu yang gak pernah latihan serius.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Card 1 */}
                        <div className="group p-6 bg-[#fdfbf7] border-2 border-gray-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
                            <div className="mb-4 group-hover:scale-110 transition-transform duration-300">
                                <Target className="w-12 h-12 text-blue-600 -rotate-6" strokeWidth={2.5} />
                            </div>
                            <h3 className="font-handwriting text-2xl font-bold mb-2">Penilaian Standar BKN</h3>
                            <p className="text-gray-700">Bobot skor & passing grade <strong>100% sesuai aturan BKN</strong>. Kamu bisa tahu persis posisimu: lulus atau belum — sebelum hari H tiba.</p>
                        </div>

                        {/* Card 2 */}
                        <div className="group p-6 bg-[#fdfbf7] border-2 border-gray-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
                            <div className="mb-4 group-hover:scale-110 transition-transform duration-300">
                                <Timer className="w-12 h-12 text-red-500 rotate-6" strokeWidth={2.5} />
                            </div>
                            <h3 className="font-handwriting text-2xl font-bold mb-2">Timer 100 Menit Berjalan</h3>
                            <p className="text-gray-700">110 soal, 100 menit. Latihan di sini = latihan manajemen waktu yang menentukan lolos atau gagal di CAT BKN nanti.</p>
                        </div>

                        {/* Card 3 */}
                        <div className="group p-6 bg-[#fdfbf7] border-2 border-gray-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
                            <div className="mb-4 group-hover:scale-110 transition-transform duration-300">
                                <BarChart3 className="w-12 h-12 text-green-600 -rotate-3" strokeWidth={2.5} />
                            </div>
                            <h3 className="font-handwriting text-2xl font-bold mb-2">Tahu Kelemahanmu</h3>
                            <p className="text-gray-700">Analisis skor TWK, TIU, TKP + ranking nasional. Langsung tahu bagian mana yang harus diperbaiki sebelum tes sesungguhnya.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- INTIP TAMPILAN SIMULASI (Exam Preview) --- */}
            <section id="exam-preview" className="py-24 bg-[#fdfbf7] relative overflow-hidden">
                <PaperBackground />

                <div className="container mx-auto px-4 relative z-10">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="inline-block px-4 py-1 mb-4 font-handwriting text-lg font-bold bg-blue-100 text-blue-700 rotate-1 border-2 border-blue-300 rounded-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]">
                            <Eye className="w-5 h-5 inline -mt-0.5 mr-1" /> Sneak Peek!
                        </span>
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
                                                                    : 'bg-white text-gray-400 border-gray-300'
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
                            onClick={() => user ? router.push("/dashboard") : router.push("/login")}
                            className="group px-8 py-4 font-handwriting text-2xl font-bold bg-blue-600 text-white rounded-lg border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all cursor-pointer inline-flex items-center gap-3"
                        >
                            Coba Sekarang! <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <p className="font-handwriting text-lg text-gray-500 mt-4">Mulai dari Rp 8.000/tryout. Lebih murah dari kopi, tapi bisa ubah masa depanmu.</p>
                    </div>
                </div>
            </section>

            {/* --- PRODUK (Index Cards / Sticky Notes) --- */}
            <section id="products" className="py-24 bg-[#f0f4f8] relative overflow-hidden">
                {/* Background Corrugated Paper Look via CSS */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: "radial-gradient(#000 1px, transparent 1px)",
                        backgroundSize: "10px 10px"
                    }}>
                </div>

                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="font-handwriting text-5xl font-bold mb-4">Pilih Paket Latihanmu</h2>
                        <p className="font-handwriting text-2xl text-gray-600">Tanpa langganan bulanan. Beli sekali, pakai kapanpun. <span className="bg-yellow-200 px-1">Token gak pernah expired!</span></p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-10 lg:gap-8 max-w-6xl mx-auto">

                        {/* PRODUK 1: SKD Satuan */}
                        <div className="relative bg-white p-6 border border-gray-300 shadow-xl rotate-[1deg] hover:rotate-0 transition-transform duration-300 flex flex-col">
                            {/* Tape Effect */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-yellow-100/80 border-l border-r border-white/50 shadow-sm rotate-2"></div>

                            <h3 className="font-handwriting text-2xl font-bold text-gray-800 border-b-2 border-indigo-200 pb-2 mb-2">
                                SKD Satuan
                            </h3>

                            <div className="mb-4 font-handwriting">
                                <span className="text-4xl font-bold text-indigo-600">Rp 10k</span>
                                <span className="text-gray-600 text-lg">/ 1 Token</span>
                            </div>

                            <div className="space-y-2 mb-6 font-handwriting text-lg text-gray-700 flex-grow">
                                <div className="flex items-start gap-2">
                                    <CheckDoodle /> <span>Tryout SKD Premium</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckDoodle /> <span>Pembahasan Lengkap</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckDoodle /> <span>Perankingan Nasional</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckDoodle /> <span>Token Aktif Selamanya</span>
                                </div>
                            </div>

                            <button
                                onClick={() => router.push('/dashboard/beli-paket')}
                                className="w-full py-2 font-handwriting text-xl font-bold bg-indigo-50 text-indigo-700 border-2 border-indigo-200 border-dashed rounded-lg hover:bg-indigo-100 hover:border-indigo-400 transition cursor-pointer">
                                Mulai dengan 1 Token
                            </button>
                        </div>

                        {/* PRODUK 2: SKD Paket 3x */}
                        <div className="relative bg-white p-6 border border-gray-300 shadow-xl rotate-[-1deg] hover:rotate-0 transition-transform duration-300 flex flex-col">
                            {/* Tape Effect */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-yellow-101/80 border-l border-r border-white/50 shadow-sm rotate-1"></div>

                            <h3 className="font-handwriting text-2xl font-bold text-gray-800 border-b-2 border-indigo-200 pb-2 mb-2">
                                SKD Paket 3x
                            </h3>

                            <div className="mb-1 font-handwriting">
                                <span className="text-4xl font-bold text-indigo-600">Rp 25k</span>
                                <span className="text-gray-600 text-lg">/ 3 Token</span>
                            </div>
                            <p className="font-handwriting text-green-900 text-sm mb-6 bg-green-100 inline-flex px-4 py-1 rounded-full items-center gap-2">
                                Hemat Rp 5k! <Sparkles className="w-4 h-4" />
                            </p>

                            <div className="space-y-2 mb-6 font-handwriting text-lg text-gray-700 flex-grow">
                                <div className="flex items-start gap-2">
                                    <CheckDoodle /> <span>Tryout SKD Premium</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckDoodle /> <span>Pembahasan Lengkap</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckDoodle /> <span>Perankingan Nasional</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckDoodle /> <span>Token Aktif Selamanya</span>
                                </div>
                            </div>

                            <button
                                onClick={() => router.push('/dashboard/beli-paket')}
                                className="w-full py-2 font-handwriting text-xl font-bold bg-indigo-50 text-indigo-700 border-2 border-indigo-200 border-dashed rounded-lg hover:bg-indigo-100 hover:border-indigo-400 transition cursor-pointer">
                                Ambil 3 Token — Hemat 17%
                            </button>
                        </div>

                        {/* PRODUK 3: SKD Paket 5x + PDF (BEST SELLER) */}
                        <div className="relative bg-[#fffdeb] p-8 border-4 border-indigo-600 shadow-2xl rotate-[0deg] transition-transform duration-300 scale-110 z-20 flex flex-col rounded-xl">
                            {/* Paper Clip Effect */}
                            <div className="absolute -top-6 left-10 w-8 h-12 bg-gray-300/80 rounded-full border-2 border-gray-400 rotate-12 flex items-center justify-center pt-4">
                                <div className="w-2 h-6 bg-gray-400/50 rounded-full"></div>
                            </div>

                            <div className="absolute -top-4 right-4 bg-red-600 text-white font-handwriting text-sm font-bold px-4 py-1.5 -rotate-6 rounded shadow-lg animate-pulse flex items-center gap-1">
                                BEST SELLER <Flame className="w-4 h-4 fill-current" />
                            </div>

                            <h3 className="font-handwriting text-3xl font-bold text-gray-900 border-b-2 border-indigo-300 pb-2 mb-4 flex items-center gap-2">
                                SKD Paket 5x
                            </h3>

                            <div className="mb-2 font-handwriting">
                                <span className="text-5xl font-bold text-indigo-700">Rp 40k</span>
                                <span className="text-gray-600 text-xl">/ 5 Token</span>
                            </div>
                            <p className="font-handwriting text-green-900 text-md mb-8 bg-green-200 inline-flex px-6 py-2 rounded-full items-center gap-2 w-fit shadow-md">
                                Hemat Rp 10k! <Sparkles className="w-6 h-6 fill-current" />
                            </p>

                            <div className="space-y-3 mb-8 font-handwriting text-xl text-gray-800 flex-grow">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1"><CheckDoodle /></div>
                                    <span className="font-bold underline decoration-wavy decoration-indigo-400">Tryout SKD Premium</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="mt-1"><CheckDoodle /></div>
                                    <span>Pembahasan Lengkap</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="mt-1"><CheckDoodle /></div>
                                    <span>Perankingan Nasional</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="mt-1"><CheckDoodle /></div>
                                    <span className="font-bold">Token Aktif Selamanya</span>
                                </div>
                            </div>

                            <button
                                onClick={() => router.push('/dashboard/beli-paket')}
                                className="w-full py-4 font-handwriting text-2xl font-bold bg-indigo-600 text-white border-2 border-gray-900 rounded-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all cursor-pointer">
                                Ambil 5 Token — Paling Hemat!
                            </button>
                        </div>

                    </div>
                </div>
            </section>

            {/* --- TESTIMONI (Sticky Notes) --- */}
            <section id="memorials" className="py-24 bg-[#fdfbf7]">
                <div className="container mx-auto px-4">
                    <h2 className="font-handwriting text-4xl font-bold text-center mb-12">Mereka Udah Buktiin, Kamu Kapan?</h2>

                    <div className="flex flex-wrap justify-center gap-8">
                        {/* Note 1 - Yellow */}
                        <div className="w-full md:w-80 bg-[#fff740] p-6 shadow-md rotate-[-2deg] font-handwriting text-xl text-gray-800 relative">
                            {/* Pin */}
                            <div className="absolute -top-3 left-1/2 w-4 h-4 rounded-full bg-red-500 shadow-sm border border-red-700 z-10"></div>
                            <p className="mb-4">"Kemarin tes CPNS beneran, gue kaget karena tipe soalnya udah sering ketemu pas latihan di sini. Hasilnya? Alhamdulillah lolos passing grade!"</p>
                            <p className="font-bold text-right">- Andi, Lolos SKD 2025</p>
                        </div>

                        {/* Note 2 - Pink */}
                        <div className="w-full md:w-80 bg-[#ff7eb9] p-6 shadow-md rotate-[3deg] font-handwriting text-xl text-gray-900 relative">
                            {/* Tape */}
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-20 h-6 bg-white/40 rotate-2"></div>
                            <p className="mb-4">"Dulu selalu kehabisan waktu di TIU. Setelah 5x tryout di sini, akhirnya bisa selesai tepat waktu dan skor TIU naik 30 poin!"</p>
                            <p className="font-bold text-right">- Sarah, Pejuang NIP 2026</p>
                        </div>

                        {/* Note 3 - Green */}
                        <div className="w-full md:w-80 bg-[#7afcff] p-6 shadow-md rotate-[-1deg] font-handwriting text-xl text-gray-900 relative">
                            {/* Pin */}
                            <div className="absolute -top-3 left-1/2 w-4 h-4 rounded-full bg-black shadow-sm z-10"></div>
                            <p className="mb-4">"Gak perlu bayar langganan mahal. Beli 1 token dulu buat coba, ternyata cocok, langsung borong paket 5. Worth it banget!"</p>
                            <p className="font-bold text-right">- Budi, Fresh Graduate 2025</p>
                        </div>

                        {/* Note 4 - Lavender */}
                        <div className="w-full md:w-80 bg-[#e8d5f5] p-6 shadow-md rotate-[2deg] font-handwriting text-xl text-gray-900 relative">
                            {/* Tape */}
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-20 h-6 bg-white/40 -rotate-1"></div>
                            <p className="mb-4">"Mau masuk STAN atau CPNS, SKD-nya sama aja. Di sini penilaiannya persis standar BKN. Jadi latihan sekali, siap untuk dua jalur sekaligus!"</p>
                            <p className="font-bold text-right">- Rizky, Calon Taruna STAN</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FAQ (Accordion) --- */}
            <section id="faq" className="py-24 bg-white border-t-4 border-gray-900 border-dashed relative">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>

                <div className="container mx-auto px-4 relative z-10">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="inline-block px-4 py-1 mb-4 font-handwriting text-lg font-bold bg-orange-100 text-orange-700 -rotate-1 border-2 border-orange-300 rounded-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]">
                            <MessageCircleQuestion className="w-5 h-5 inline -mt-0.5 mr-1" /> Sering Ditanya
                        </span>
                        <h2 className="font-handwriting text-5xl font-bold mb-4">Masih Ragu? Baca Dulu</h2>
                        <p className="font-handwriting text-2xl text-gray-600">Jawaban untuk pertanyaan yang sering ditanya sebelum membeli.</p>
                    </div>

                    <div className="max-w-3xl mx-auto space-y-4">
                        {faqItems.map((item, i) => (
                            <div
                                key={i}
                                className="bg-[#fdfbf7] border-2 border-gray-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-all"
                            >
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between p-5 md:p-6 text-left font-handwriting font-bold text-lg md:text-xl text-gray-900 hover:bg-yellow-50/50 transition-colors"
                                >
                                    <span className="flex items-center gap-3">
                                        <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 border-2 border-blue-400 rounded-full text-blue-600 font-bold text-sm shrink-0">
                                            {i + 1}
                                        </span>
                                        {item.q}
                                    </span>
                                    <ChevronDown
                                        className={`w-6 h-6 text-gray-500 shrink-0 ml-4 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''
                                            }`}
                                    />
                                </button>
                                <div
                                    className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                                        }`}
                                >
                                    <div className="px-5 md:px-6 pb-5 md:pb-6 pt-0">
                                        <div className="border-t-2 border-dashed border-gray-300 pt-4">
                                            <p className="font-handwriting text-lg text-gray-700 leading-relaxed">
                                                {item.a}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- FOOTER (Doodle Border) --- */}
            <footer className="bg-gray-900 text-white py-12 border-t-8 border-gray-800 border-dashed relative overflow-hidden">
                <div className="container mx-auto px-4 text-center relative z-10">
                    <h2 className="font-handwriting text-4xl font-bold mb-6">Formasi CPNS 2026 Sudah di Depan Mata</h2>
                    <p className="text-gray-300 mb-8 max-w-lg mx-auto">Yang mulai latihan dari sekarang, mereka yang punya kursi nanti. Jangan sampai nyesel karena telat persiapan.</p>

                    <button
                        onClick={() => user ? router.push("/dashboard") : router.push("/login")}
                        className="px-10 py-3 font-handwriting text-2xl font-bold text-gray-900 bg-white rounded-md border-b-4 border-gray-400 active:border-b-0 active:translate-y-1 transition-all cursor-pointer flex items-center justify-center gap-2 mx-auto">
                        Mulai Latihan dari Rp 8.000 <Rocket className="w-6 h-6" />
                    </button>

                    <div className="mt-16 flex flex-col md:flex-row items-center justify-center gap-6 text-sm text-gray-300 font-handwriting text-lg">
                        <Link href="/syarat-ketentuan" className="hover:text-white transition-colors">Syarat & Ketentuan</Link>
                        <Link href="/kebijakan-privasi" className="hover:text-white transition-colors">Kebijakan Privasi</Link>
                        <Link href="/kebijakan-pengembalian" className="hover:text-white transition-colors">Kebijakan Pengembalian</Link>
                        <span>&copy; 2026 Siap Tempur.</span>
                    </div>
                </div>
            </footer>
        </main>
    );
}