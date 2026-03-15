"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { 
    Headphones, 
    BookOpen, 
    PencilLine, 
    Flame, 
    Clock, 
    CheckCircle2, 
    ChevronDown, 
    HelpCircle, 
    ArrowRight, 
    Sparkles, 
    Menu, 
    X, 
    Timer, 
    BarChart3, 
    MessageCircleQuestion,
    Rocket,
    Eye,
    Monitor,
    Flag
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import StructuredData from "@/components/StructuredData";
import { cn } from "@/lib/utils";

export default function ToeflLandingUI({ user: initialUser }: { user: User | null }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const user = initialUser;
    const router = useRouter();

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    const toeflSchema = {
        "@context": "https://schema.org",
        "@type": "Course",
        "name": "Tryout TOEFL ITP Siap Tempur",
        "description": "Simulasi ujian TOEFL ITP dengan sistem scoring akurat (310-677). Materi Listening, Structure, dan Reading.",
        "provider": {
            "@type": "Organization",
            "name": "Siap Tempur",
            "sameAs": "https://siaptempur.id"
        },
        "offers": {
            "@type": "Offer",
            "category": "Education",
            "price": "15000.00",
            "priceCurrency": "IDR",
            "availability": "https://schema.org/InStock"
        }
    };

    const faqItems = [
        {
            q: "Bagaimana sistem penilaian (scoring) nya?",
            a: "Kami menggunakan algoritma konversi skor TOEFL ITP standar (310-677). Setiap section (Listening, Structure, Reading) memiliki bobot tersendiri yang kemudian dikonversi menjadi skor akhir. Hasil simulasi kami dirancang sedekat mungkin dengan skor tes aslimu."
        },
        {
            q: "Apakah audio listening bisa diputar berulang?",
            a: "Untuk menjaga realisme ujian, audio Listening Comprehension hanya akan diputar satu kali per soal sesuai dengan prosedur tes TOEFL ITP resmi. Pastikan koneksi internet dan audio device kamu dalam kondisi baik sebelum memulai."
        },
        {
            q: "Apakah token TOEFL berbeda dengan token CPNS?",
            a: "Ya, karena materi dan sistem pengolahannya berbeda, Token TOEFL khusus digunakan untuk paket TOEFL ITP. Namun, kamu bisa membeli keduanya dari satu akun yang sama di Siap Tempur."
        },
        {
            q: "Kapan saya akan menerima hasil tryout?",
            a: "Detik itu juga! Setelah kamu menekan tombol 'Selesai', sistem akan langsung menghitung skormu, memberikan pembahasan lengkap tiap soal, dan menampilkan grafik kekuatanmu di tiap section."
        }
    ];

    return (
        <main className="font-body min-h-screen bg-[#fdfbf7] text-gray-800 selection:bg-yellow-200 selection:text-black overflow-x-hidden">
            <StructuredData data={toeflSchema} />
            
            {/* --- NAVBAR --- */}
            <header className="fixed top-0 w-full z-50 bg-[#fdfbf7]/90 backdrop-blur-sm border-b-4 border-gray-800/10">
                <nav className="container mx-auto px-4 h-20 flex items-center justify-between relative">
                    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex flex-col items-start group">
                        <span className="text-2xl font-handwriting font-bold text-gray-800 rotate-[-1deg] group-hover:rotate-0 transition-transform leading-tight text-left">
                            TOEFL ITP Portal
                        </span>
                        <span className="text-sm font-handwriting font-bold text-gray-500 ml-1 -mt-1 group-hover:text-gray-900 transition-colors">
                            by Siap<span className="text-blue-600 underline decoration-wavy decoration-2">Tempur</span>.
                        </span>
                    </button>

                    <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex gap-6 font-handwriting text-xl text-gray-700">
                        <button onClick={() => scrollToSection('features')} className="hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">Fitur</button>
                        <button onClick={() => scrollToSection('pricing')} className="hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">Harga</button>
                        <button onClick={() => scrollToSection('faq')} className="hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">FAQ</button>
                    </div>

                    <div className="flex items-center gap-4">
                        {user ? (
                            <Button
                                onClick={() => router.push("/toefl/dashboard")}
                                className="hidden md:block"
                            >
                                Dashboard
                            </Button>
                        ) : (
                            <Button
                                onClick={() => router.push("/login?returnTo=/toefl")}
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

                    {/* Mobile Menu */}
                    {isMenuOpen && (
                        <div className="absolute top-20 left-0 w-full bg-[#fdfbf7] border-b-4 border-gray-800/10 shadow-lg p-6 flex flex-col gap-4 md:hidden z-40">
                            <button onClick={() => { scrollToSection("features"); setIsMenuOpen(false); }} className="font-handwriting text-2xl text-gray-700 hover:text-blue-600 text-left py-2 border-b border-gray-200">Fitur</button>
                            <button onClick={() => { scrollToSection("pricing"); setIsMenuOpen(false); }} className="font-handwriting text-2xl text-gray-700 hover:text-blue-600 text-left py-2 border-b border-gray-200">Harga</button>
                            <button onClick={() => { scrollToSection("faq"); setIsMenuOpen(false); }} className="font-handwriting text-2xl text-gray-700 hover:text-blue-600 text-left py-2 border-b border-gray-200">FAQ</button>
                            {user ? (
                                <Button
                                    onClick={() => { router.push("/toefl/dashboard"); setIsMenuOpen(false); }}
                                    className="text-2xl py-3 mt-2"
                                >
                                    Dashboard
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => { router.push("/login?returnTo=/toefl"); setIsMenuOpen(false); }}
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

            {/* --- HERO SECTION --- */}
            <Section paper className="pt-32 pb-32">
                <div className="text-center relative z-10 flex flex-col items-center">
                    {/* Balanced Decorative Elements */}
                    <div className="absolute top-1/4 left-10 opacity-10 -rotate-12 hidden xl:block pointer-events-none">
                        <Headphones size={180} className="text-blue-600" />
                    </div>
                    <div className="absolute bottom-1/4 right-10 opacity-10 rotate-12 hidden xl:block pointer-events-none">
                        <BookOpen size={200} className="text-blue-600" />
                    </div>

                    <Badge variant="yellow" className="mb-8">
                        🎯 Target Skor 550+ Starts Here
                    </Badge>
                    
                    <h1 className="text-5xl md:text-8xl font-handwriting font-bold mb-8 text-gray-900 leading-[1.05] max-w-5xl tracking-tight">
                        Simulasi <span className="relative inline-block px-4 italic text-blue-600">
                            TOEFL ITP
                            {/* Coretan bawah */}
                            <svg className="absolute w-full h-3 -bottom-1 left-0 text-blue-500/50" viewBox="0 0 100 10" preserveAspectRatio="none">
                                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                            </svg>
                        </span> Terakurat.
                    </h1>
                    
                    <p className="text-2xl md:text-3xl font-handwriting text-gray-600 max-w-3xl mb-14 leading-relaxed">
                        Ukur kemampuan diri sebelum tes asli. Audio jernih, scoring standar internasional, dan pembahasan yang masuk di akal.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-8 relative z-10">
                        <Button size="xl" onClick={() => scrollToSection('pricing')}>
                            Mulai Simulasi Sekarang →
                        </Button>
                        <Button variant="outline" size="xl" onClick={() => scrollToSection('features')}>
                            Lihat Kisi-Kisi
                        </Button>
                    </div>
                </div>
            </Section>

            {/* --- CORE SECTIONS (Listening, Structure, Reading) --- */}
            <Section id="features" dashedBorder="both" pattern="grid" className="bg-white">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="font-handwriting text-5xl font-bold mb-4">Bedah Tuntas 3 Section Utama</h2>
                    <p className="font-handwriting text-2xl text-gray-600">Karena yang kaget di hari H itu yang gak pernah latihan serius.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    <Card interactive className="p-8 group">
                        <div className="w-16 h-16 bg-blue-100 rounded-xl border-2 border-blue-600 text-blue-600 flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                            <Headphones className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-handwriting font-bold mb-4">Listening Comprehension</h3>
                        <p className="text-lg font-handwriting text-gray-600 leading-relaxed">
                            Latih telingamu dengan dialek American English melalui soal Part A, B, dan C yang bervariasi.
                        </p>
                    </Card>

                    <Card variant="binder" interactive className="p-8 group">
                        <div className="w-16 h-16 bg-green-100 rounded-xl border-2 border-green-600 text-green-600 flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                            <PencilLine className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-handwriting font-bold mb-4">Structure & Expression</h3>
                        <p className="text-lg font-handwriting text-gray-600 leading-relaxed">
                            Kuasai tatanan bahasa (grammar) tingkat lanjut untuk menyelesaikan 40 soal hanya dalam 25 menit.
                        </p>
                    </Card>

                    <Card variant="binder" interactive className="p-8 group">
                        <div className="w-16 h-16 bg-yellow-100 rounded-xl border-2 border-yellow-600 text-yellow-600 flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                            <BookOpen className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-handwriting font-bold mb-4">Reading Comprehension</h3>
                        <p className="text-lg font-handwriting text-gray-600 leading-relaxed">
                            Simulasi membaca teks akademik yang menantang dengan pertanyaan main idea hingga inference.
                        </p>
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
                        <p className="font-handwriting text-2xl text-gray-600">Sistem scoring 310-677 akurat. Audio listening jernih, navigasi soal lancar jaya.</p>
                    </div>

                    {/* TOEFL Mockup Container */}
                    <div className="max-w-5xl mx-auto relative">
                        {/* Floating Annotations */}
                        <div className="hidden md:block absolute -top-6 -right-4 lg:-right-16 z-30">
                            <div className="bg-yellow-200 border-2 border-gray-900 px-4 py-2 rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-handwriting font-bold text-sm -rotate-3 animate-float-annotation">
                                <Headphones size={16} className="inline -mt-0.5 mr-1 text-blue-600" />
                                Audio Listening High Quality!
                            </div>
                        </div>

                        <div className="hidden md:block absolute bottom-24 -left-4 lg:-left-24 z-30">
                            <div className="bg-green-200 border-2 border-gray-900 px-4 py-2 rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-handwriting font-bold text-sm rotate-2 animate-float-annotation" style={{ animationDelay: '1s' }}>
                                <BarChart3 size={16} className="inline -mt-0.5 mr-1 text-orange-500" />
                                Scoring Standard ETS!
                            </div>
                        </div>

                        {/* Main Mockup Card */}
                        <div className="bg-white/90 backdrop-blur-sm border-2 border-gray-900 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                            {/* Mock Header */}
                            <div className="border-b-2 border-dashed border-gray-300 bg-blue-50/50 p-4 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="font-handwriting font-bold text-2xl text-gray-900">Listening Section</span>
                                    <span className="text-sm font-bold text-blue-600 uppercase tracking-widest">Part A: Short Dialogues</span>
                                </div>
                                <div className="px-4 py-1 rounded-full bg-white border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-mono text-sm flex items-center gap-2">
                                    <Clock size={14} /> 00:34:12
                                </div>
                            </div>

                            {/* TOEFL Content Area */}
                            <div className="p-8">
                                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6 mb-8 flex items-center justify-center gap-6">
                                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white cursor-pointer hover:scale-110 transition-transform">
                                        <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1"></div>
                                    </div>
                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="w-1/3 h-full bg-blue-600"></div>
                                    </div>
                                    <span className="font-mono text-xs text-gray-400">01:12 / 03:45</span>
                                </div>

                                <div className="space-y-4">
                                    <p className="font-handwriting text-2xl font-bold mb-6 text-gray-900">What does the woman imply about the project?</p>
                                    {['She has already finished it.', 'She needs more time to complete it.', 'She hasn\'t started working on it.', 'She will skip the project entirely.'].map((opt, i) => (
                                        <div key={i} className={`p-4 rounded-lg border-2 font-handwriting text-xl flex items-center gap-4 transition-all ${i === 1 ? 'border-blue-600 bg-blue-50 shadow-[2px_2px_0px_0px_rgba(37,99,235,1)]' : 'border-gray-200'}`}>
                                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold ${i === 1 ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-400 border-gray-200'}`}>{String.fromCharCode(65 + i)}</div>
                                            <span className="font-handwriting">{opt}</span>
                                        </div>
                                    ))}
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
                        <Button
                            size="xl"
                            onClick={() => user ? router.push("/toefl/dashboard") : router.push("/login?returnTo=/toefl")}
                        >
                            Coba Simulasi Gratis! <ArrowRight className="w-6 h-6 ml-2" />
                        </Button>
                        <p className="font-handwriting text-lg text-gray-500 mt-4">Lebih baik salah di sini daripada nangis pas lihat skor asli.</p>
                    </div>
            </Section>

            {/* --- PRICING SECTION --- */}
            <Section id="pricing" pattern="dots" dashedBorder="both" className="bg-[#f0f4f8]">
                <div className="text-center mb-16">
                    <Badge variant="red" className="mb-4">BISA SCAN QRIS</Badge>
                    <h2 className="text-5xl font-handwriting font-bold mb-4">Pilih Paket Token Kamu</h2>
                    <p className="text-2xl font-handwriting text-gray-600 max-w-2xl mx-auto">
                        Token berlaku selamanya. Sekali bayar, akses tryout lengkap kapan saja.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <Card variant="standard" interactive className="p-10 bg-white border-4 border-gray-900 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] transition-all duration-300">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-3xl font-handwriting font-bold text-gray-900">1x Token</h3>
                                <p className="text-gray-500 font-handwriting text-xl">Paket Satuan</p>
                            </div>
                            <div className="text-right">
                                <span className="text-3xl font-bold font-mono text-gray-900">Rp 15k</span>
                            </div>
                        </div>
                        <ul className="space-y-4 mb-10">
                            {['1x Akses Tes Lengkap', 'Scoring 310-677', 'Pembahasan Full', 'Audio Listening Jernih'].map((item, idx) => (
                                <li key={idx} className="flex items-center gap-3 font-handwriting text-xl">
                                    <CheckCircle2 className="w-6 h-6 text-blue-600" /> {item}
                                </li>
                            ))}
                        </ul>
                        <Button
                            size="lg"
                            className="w-full text-2xl py-6"
                            onClick={() => router.push("/login?returnTo=/toefl")}
                        >
                            Pilih Paket →
                        </Button>
                    </Card>

                    <Card variant="standard" interactive className="p-10 bg-blue-600 border-4 border-gray-900 relative overflow-hidden group">
                        <div className="absolute top-4 right-4 bg-yellow-400 text-gray-900 font-bold px-4 py-1 rounded-full text-sm shadow-md z-10">BEST VALUE</div>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-3xl font-handwriting font-bold text-white">5x Token</h3>
                                <p className="text-blue-100 font-handwriting text-xl opacity-80 italic">Simulasi Berkala</p>
                            </div>
                            <div className="text-right">
                                <div className="text-blue-200 line-through text-lg font-mono">Rp 75k</div>
                                <span className="text-3xl font-bold font-mono text-yellow-400">Rp 50k</span>
                            </div>
                        </div>
                        <ul className="space-y-4 mb-10">
                            {['5x Akses Tes Lengkap', 'Scoring Terperinci', 'Pembahasan Mendalam', 'Unlimited Review Score'].map((item, idx) => (
                                <li key={idx} className="flex items-center gap-3 font-handwriting text-xl text-white">
                                    <CheckCircle2 className="w-6 h-6 text-yellow-400" /> {item}
                                </li>
                            ))}
                        </ul>
                        <Button
                            size="lg"
                            className="w-full text-2xl py-6 bg-yellow-400 text-gray-900 hover:bg-yellow-300"
                            onClick={() => router.push("/login?returnTo=/toefl")}
                        >
                            Dapatkan Promo → <Rocket className="ml-2 animate-bounce flex-shrink-0" />
                        </Button>
                    </Card>
                </div>
            </Section>

            {/* --- TESTIMONIALS (Sketsa Orang) --- */}
            <Section id="memorials" className="bg-white" dashedBorder="top" pattern="dots">
                <div className="text-center max-w-4xl mx-auto mb-16">
                    <h2 className="font-handwriting text-5xl font-bold mb-4">"Gak Nyangka, Audio-nya Jernih Banget!"</h2>
                    <p className="font-handwriting text-2xl text-gray-600">Kata mereka yang udah "tempur" duluan dan sekarang udah kantongi sertifikat.</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Testi 1 */}
                    <Card interactive className="p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-blue-100 border-2 border-gray-900 rounded-full flex items-center justify-center text-3xl">🎓</div>
                            <div>
                                <h4 className="font-handwriting text-xl font-bold">Andi - Jakarta</h4>
                                <div className="flex text-yellow-500"><Sparkles size={16} fill="currentColor" /><Sparkles size={16} fill="currentColor" /><Sparkles size={16} fill="currentColor" /><Sparkles size={16} fill="currentColor" /><Sparkles size={16} fill="currentColor" /></div>
                            </div>
                        </div>
                        <p className="font-handwriting text-xl text-gray-700 italic leading-relaxed">
                            "Membantu banget pas section Listening. Pas hari H beneran gak kaget lagi sama pace soalnya. Skor naik dari 480 ke 560!"
                        </p>
                    </Card>

                    {/* Testi 2 */}
                    <Card interactive className="p-8 rotate-1">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-pink-100 border-2 border-gray-900 rounded-full flex items-center justify-center text-3xl">🌍</div>
                            <div>
                                <h4 className="font-handwriting text-xl font-bold">Budi - Bandung</h4>
                                <div className="flex text-yellow-500"><Sparkles size={16} fill="currentColor" /><Sparkles size={16} fill="currentColor" /><Sparkles size={16} fill="currentColor" /><Sparkles size={16} fill="currentColor" /><Sparkles size={16} fill="currentColor" /></div>
                            </div>
                        </div>
                        <p className="font-handwriting text-xl text-gray-700 italic leading-relaxed">
                            "Structure section-nya juara. Pembahasannya clear banget. Akhirnya dapet syarat skor buat apply beasiswa keluar negeri."
                        </p>
                    </Card>

                    {/* Testi 3 */}
                    <Card interactive className="p-8 rotate-[-1deg]">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-green-100 border-2 border-gray-900 rounded-full flex items-center justify-center text-3xl">🚀</div>
                            <div>
                                <h4 className="font-handwriting text-xl font-bold">Citra - Semarang</h4>
                                <div className="flex text-yellow-500"><Sparkles size={16} fill="currentColor" /><Sparkles size={16} fill="currentColor" /><Sparkles size={16} fill="currentColor" /><Sparkles size={16} fill="currentColor" /><Sparkles size={16} fill="currentColor" /></div>
                            </div>
                        </div>
                        <p className="font-handwriting text-xl text-gray-700 italic leading-relaxed">
                            "Reading passage-nya menantang tapi seru. Simulasi di sini bikin saya makin pede ngerjain soal-soal sulit di tes resmi."
                        </p>
                    </Card>
                </div>
            </Section>

            {/* --- FAQ SECTION --- */}
            <Section id="faq" dashedBorder="top" className="bg-white">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                        <Badge variant="blue" className="mb-4">Tanya Jawab</Badge>
                        <h2 className="font-handwriting text-5xl font-bold">Bingung Soal Tempur?</h2>
                    </div>

                    <div className="space-y-4">
                        {faqItems.map((item, idx) => (
                            <Card key={idx} className="overflow-hidden">
                                <button
                                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                                    className="w-full flex items-center justify-between p-6 text-left cursor-pointer group"
                                >
                                    <span className="font-handwriting text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                                        {item.q}
                                    </span>
                                    <ChevronDown className={cn("w-6 h-6 transition-transform text-gray-400", openFaq === idx && "rotate-180 text-blue-600")} />
                                </button>
                                {openFaq === idx && (
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


            {/* --- TOEFL FOOTER --- */}
            <footer className="bg-gray-900 text-white py-20 relative overflow-hidden">
                {/* Scribble decoration */}
                <div className="absolute top-10 right-10 opacity-10 rotate-12">
                    <Headphones size={120} />
                </div>

                <div className="max-w-4xl mx-auto text-center relative z-10 px-4">
                    <h2 className="font-handwriting text-4xl font-bold mb-6 italic">"Skor TOEFL Bukan Sekadar Angka."</h2>
                    <p className="text-gray-400 mb-8 max-w-lg mx-auto font-handwriting text-xl">
                        Ia adalah tiketmu menuju beasiswa impian dan karier internasional. Persiapkan amunisimu sekarang sebelum hari ujian tiba.
                    </p>

                    <Button
                        variant="white"
                        size="lg"
                        onClick={() => scrollToSection("pricing")}
                    >
                        Ambil Token TOEFL Sekarang
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
