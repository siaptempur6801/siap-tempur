"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

import Link from "next/link";
import { Target, Timer, BarChart3, ChevronDown, ArrowRight, HelpCircle, Sparkles, Menu, X, AlertCircle, Flame, Rocket } from "lucide-react";
import { toast } from 'sonner'
import PaperBackground from "@/components/PaperBackground";
import CheckDoodle from "@/components/CheckDoodle";





export default function Home({ user: initialUser }: { user: User | null }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [user, setUser] = useState<User | null>(initialUser);
    const router = useRouter();

    useEffect(() => {
        // If initialUser is not provided, we can still check client-side
        if (!initialUser) {
            const fetchUser = async () => {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);
            };
            fetchUser();
        }
    }, [initialUser]);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <main className="font-body min-h-screen bg-[#fdfbf7] text-gray-800 selection:bg-yellow-200 selection:text-black overflow-x-hidden">

            {/* --- NAVBAR (Binder Style) --- */}
            <header className="fixed top-0 w-full z-50 bg-[#fdfbf7]/90 backdrop-blur-sm border-b-4 border-gray-800/10">
                <nav className="container mx-auto px-4 h-20 flex items-center justify-between relative">


                    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-3xl font-handwriting font-bold text-gray-800 rotate-[-2deg] cursor-pointer hover:rotate-0 transition-transform pl-0 md:pl-0">
                        Siap<span className="text-blue-600 underline decoration-wavy decoration-2">Tempur</span>.
                    </button>

                    {/* Desktop Navigation (Centered) */}
                    <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex gap-6 font-handwriting text-xl text-gray-700">
                        <button onClick={() => scrollToSection("features")} className="hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">Fitur</button>
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
                        >
                            {isMenuOpen ? <X size={32} /> : <Menu size={32} />}
                        </button>
                    </div>

                    {/* Mobile Menu Dropdown */}
                    {isMenuOpen && (
                        <div className="absolute top-20 left-0 w-full bg-[#fdfbf7] border-b-4 border-gray-800/10 shadow-lg p-6 flex flex-col gap-4 md:hidden z-40">
                            <button onClick={() => { scrollToSection("features"); setIsMenuOpen(false); }} className="font-handwriting text-2xl text-gray-700 hover:text-blue-600 text-left py-2 border-b border-gray-200">Fitur</button>
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
                        #CalonASN #Kedinasan
                    </span>

                    <h1 className="font-handwriting text-5xl md:text-7xl font-bold mb-6 leading-[0.9]">
                        Lulus SKD CPNS <br />
                        <span className="text-blue-600">&</span> Kedinasan <br />
                        <span className="relative inline-block mt-2">
                            Tanpa Drama.
                            {/* Coretan bawah */}
                            <svg className="absolute w-full h-3 -bottom-1 left-0 text-blue-500/50" viewBox="0 0 100 10" preserveAspectRatio="none">
                                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                            </svg>
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-gray-700 max-w-2xl mx-auto mb-10 font-handwriting leading-relaxed">
                        Platform tryout CAT SKD <strong>CPNS & Sekolah Kedinasan</strong> paling
                        <span className="bg-green-200 px-1 mx-1">realistis.</span>
                        Beli ketengan, sekali bayar langsung sikat soalnya. Gak pake langganan ribet!
                    </p>

                    <div className="flex flex-col items-center gap-8">
                        <div className="flex flex-col sm:flex-row justify-center gap-4 w-full">
                            <button
                                onClick={() => scrollToSection("products")}
                                className="group px-8 py-4 font-handwriting text-2xl font-bold bg-blue-600 text-white rounded-lg border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all cursor-pointer flex items-center justify-center gap-3">
                                Mulai Latihan SKD Sekarang! <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                            </button>

                            <button
                                onClick={() => scrollToSection("features")}
                                className="px-8 py-4 font-handwriting text-2xl font-bold bg-white text-gray-900 rounded-lg border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all cursor-pointer flex items-center justify-center gap-3">
                                Lihat Simulasi CAT <HelpCircle className="w-6 h-6" />
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
                        <h2 className="font-handwriting text-5xl font-bold mb-4">Kenapa Harus di Sini?</h2>
                        <p className="font-handwriting text-2xl text-gray-600">Karena kita gak mau kamu kaget pas hari H.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Card 1 */}
                        <div className="group p-6 bg-[#fdfbf7] border-2 border-gray-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
                            <div className="mb-4 group-hover:scale-110 transition-transform duration-300">
                                <Target className="w-12 h-12 text-blue-600 -rotate-6" strokeWidth={2.5} />
                            </div>
                            <h3 className="font-handwriting text-2xl font-bold mb-2">Sistem Terstandar</h3>
                            <p className="text-gray-700">Simulasi pengerjaan & sistem penilaian sesuai standar CAT BKN. Cocok untuk persiapan <strong>CPNS</strong> maupun <strong>Sekolah Kedinasan</strong>.</p>
                        </div>

                        {/* Card 2 */}
                        <div className="group p-6 bg-[#fdfbf7] border-2 border-gray-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
                            <div className="mb-4 group-hover:scale-110 transition-transform duration-300">
                                <Timer className="w-12 h-12 text-red-500 rotate-6" strokeWidth={2.5} />
                            </div>
                            <h3 className="font-handwriting text-2xl font-bold mb-2">Simulasi Real-time</h3>
                            <p className="text-gray-700">Latihan manajemen waktu. Gak bisa santai-santai karena ada timer yang terus berjalan!</p>
                        </div>

                        {/* Card 3 */}
                        <div className="group p-6 bg-[#fdfbf7] border-2 border-gray-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
                            <div className="mb-4 group-hover:scale-110 transition-transform duration-300">
                                <BarChart3 className="w-12 h-12 text-green-600 -rotate-3" strokeWidth={2.5} />
                            </div>
                            <h3 className="font-handwriting text-2xl font-bold mb-2">Analisis SKD</h3>
                            <p className="text-gray-700">Dapet skor per subtes (TWK, TIU, TKP) & perankingan nasional real-time. Format sama untuk CPNS & Kedinasan!</p>
                        </div>
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
                        <h2 className="font-handwriting text-5xl font-bold mb-4">Menu "Ketengan"</h2>
                        <p className="font-handwriting text-2xl text-gray-600">Pilih menu latihanmu hari ini. Cocok untuk <span className="bg-blue-100 px-1">CPNS</span> & <span className="bg-green-100 px-1">Kedinasan</span>!</p>
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
                                Coba Latihan Satuan
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
                            <p className="font-handwriting text-green-700 text-sm mb-6 bg-green-100 inline-flex px-4 py-1 rounded-full items-center gap-2">
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
                                Pilih Paket Hemat
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
                            <p className="font-handwriting text-green-700 text-md mb-8 bg-green-200 inline-flex px-6 py-2 rounded-full items-center gap-2 w-fit shadow-md">
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
                                Ambil Paket Hemat 5x Token
                            </button>
                        </div>

                    </div>
                </div>
            </section>

            {/* --- TESTIMONI (Sticky Notes) --- */}
            <section id="memorials" className="py-24 bg-[#fdfbf7]">
                <div className="container mx-auto px-4">
                    <h2 className="font-handwriting text-4xl font-bold text-center mb-12">Kata Teman Belajar Lain</h2>

                    <div className="flex flex-wrap justify-center gap-8">
                        {/* Note 1 - Yellow */}
                        <div className="w-full md:w-80 bg-[#fff740] p-6 shadow-md rotate-[-2deg] font-handwriting text-xl text-gray-800 relative">
                            {/* Pin */}
                            <div className="absolute -top-3 left-1/2 w-4 h-4 rounded-full bg-red-500 shadow-sm border border-red-700 z-10"></div>
                            <p className="mb-4">"Woi parah sih mirip banget sama asli! Kemarin simulasi kaget soalnya tipe-tipenya sama persis kayak latihan disini."</p>
                            <p className="font-bold text-right">- Andi, Calon ASN</p>
                        </div>

                        {/* Note 2 - Pink */}
                        <div className="w-full md:w-80 bg-[#ff7eb9] p-6 shadow-md rotate-[3deg] font-handwriting text-xl text-gray-900 relative">
                            {/* Tape */}
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-20 h-6 bg-white/40 rotate-2"></div>
                            <p className="mb-4">"Buat yang mau tes SKD, latihan Time Management disini ngebantu banget. Soal TKP-nya menjebak abis!"</p>
                            <p className="font-bold text-right">- Sarah, Pejuang NIP</p>
                        </div>

                        {/* Note 3 - Green */}
                        <div className="w-full md:w-80 bg-[#7afcff] p-6 shadow-md rotate-[-1deg] font-handwriting text-xl text-gray-900 relative">
                            {/* Pin */}
                            <div className="absolute -top-3 left-1/2 w-4 h-4 rounded-full bg-black shadow-sm z-10"></div>
                            <p className="mb-4">"Enak banget bisa beli ketengan. Pas lagi bokek tapi pengen tryout, tinggal beli satu token aja. Makasih min!"</p>
                            <p className="font-bold text-right">- Budi, Pejuang CPNS</p>
                        </div>

                        {/* Note 4 - Lavender */}
                        <div className="w-full md:w-80 bg-[#e8d5f5] p-6 shadow-md rotate-[2deg] font-handwriting text-xl text-gray-900 relative">
                            {/* Tape */}
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-20 h-6 bg-white/40 -rotate-1"></div>
                            <p className="mb-4">"Gue mau masuk STAN, soal SKD-nya sama persis sama CPNS. Latihan disini bener-bener ngebantu buat persiapan Kedinasan!"</p>
                            <p className="font-bold text-right">- Rizky, Calon Taruna</p>
                        </div>
                    </div>
                </div>
            </section>


            {/* --- FOOTER (Doodle Border) --- */}
            <footer className="bg-gray-900 text-white py-12 border-t-8 border-gray-800 border-dashed relative overflow-hidden">
                <div className="container mx-auto px-4 text-center relative z-10">
                    <h2 className="font-handwriting text-4xl font-bold mb-6">Siap Tempur CPNS & Kedinasan?</h2>
                    <p className="text-gray-300 mb-8 max-w-lg mx-auto">Mau CPNS atau Kedinasan? Format SKD-nya sama. Latihan sekarang!</p>

                    <button
                        onClick={() => user ? router.push("/dashboard") : router.push("/login")}
                        className="px-10 py-3 font-handwriting text-2xl font-bold text-gray-900 bg-white rounded-md border-b-4 border-gray-400 active:border-b-0 active:translate-y-1 transition-all cursor-pointer flex items-center justify-center gap-2 mx-auto">
                        Gas Tempur Sekarang! <Rocket className="w-6 h-6" />
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