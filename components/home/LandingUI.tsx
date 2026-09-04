"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import Link from "next/link";
import { Target, Timer, BarChart3, ArrowRight, Sparkles, Menu, X, Rocket, Eye, Monitor, Flag, Clock, ChevronDown, ChevronLeft, ChevronRight, Award, BookOpen, Trophy, ShieldCheck, Layers, MapPin, Zap } from "lucide-react";
import StructuredData from "@/components/StructuredData";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { cn } from "@/lib/utils";
import { faqItems, cpnsSchema, testimonials, trustBadges, leaderboardWinners } from "@/lib/data/landing";





type LandingUser = { id: string } | null;
type ActiveEvent = {
    id: string;
    title: string;
    description: string | null;
    starts_at: string;
    ends_at: string;
    start_grace_minutes: number;
    duration_minutes: number;
    max_participants: number | null;
    requires_code: boolean;
    is_paid: boolean;
    price: number;
    status: "scheduled" | "live" | "closed";
    flyer_image_url: string | null;
    documentation_url: string | null;
};

type ArticleSummary = {
    id: string;
    title: string;
    slug: string;
    cover_image_url: string | null;
    published_at: string | null;
    excerpt: string | null;
};

const BATCH_2_FLYER_PATH = "/images/flyer-batch-2.jpeg";
const BATCH_1_FLYER_PATH = "/images/flyer-batch-1.jpeg";
const YOUTUBE_DOCUMENTATION_BY_TITLE: Array<{ pattern: RegExp; url: string }> = [
    { pattern: /batch\s*1/i, url: "https://youtu.be/7adUHwlFzks" },
];

const eventTimeFormatter = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Jakarta",
});

function formatEventStartTime(event: ActiveEvent) {
    return `${eventTimeFormatter.format(new Date(event.starts_at))} WIB`;
}

function formatEventPrice(event: ActiveEvent) {
    if (!event.is_paid || event.price <= 0) return "Gratis";

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(event.price);
}

function formatEventPriceCompact(event: ActiveEvent) {
    return formatEventPrice(event).replace(/\s/g, "");
}

function getEventSessionLabel(event: ActiveEvent, index: number) {
    const match = event.title.match(/sesi\s*\d+/i);
    if (!match) return `Sesi ${index + 1}`;

    return match[0].replace(/\s+/, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getEventFlyerUrl(event: ActiveEvent | null) {
    if (!event) return null;
    if (event.flyer_image_url) return event.flyer_image_url;
    if (event.title.toLowerCase().includes("batch 1")) return BATCH_1_FLYER_PATH;
    if (event.title.toLowerCase().includes("batch 2")) return BATCH_2_FLYER_PATH;

    return null;
}

function getEventDocumentationUrl(event: ActiveEvent) {
    if (event.documentation_url) return event.documentation_url;

    return YOUTUBE_DOCUMENTATION_BY_TITLE.find(({ pattern }) => pattern.test(event.title))?.url || "https://www.youtube.com/@siaptempurID";
}

export default function Home({ user: initialUser, activeEvents = [], completedEvents = [], latestArticles = [] }: { user: LandingUser; activeEvents?: ActiveEvent[]; completedEvents?: ActiveEvent[]; latestArticles?: ArticleSummary[] }) {
    const eventHistoryScrollRef = useRef<HTMLDivElement | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isTryoutOpen, setIsTryoutOpen] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [selectedOption, setSelectedOption] = useState<string>('C');
    const [activeEventIndex, setActiveEventIndex] = useState(0);
    const user = initialUser;
    const router = useRouter();
    const activeEvent = activeEvents[activeEventIndex] || null;
    const activeEventFlyerUrl = getEventFlyerUrl(activeEvent);
    const hasMultipleActiveEvents = activeEvents.length > 1;
    const miniStats = [
        { label: "Biaya", value: activeEvent ? formatEventPriceCompact(activeEvent) : "Rp35.000" },
        { label: "Durasi", value: activeEvent ? `${activeEvent.duration_minutes} Menit` : "100 Menit" },
        { label: "Materi", value: "110 Soal" },
        { label: "Kuota", value: activeEvent?.max_participants ? `${activeEvent.max_participants.toLocaleString("id-ID")} Peserta` : "200 Peserta" },
    ];

    const showPreviousEvent = () => {
        setActiveEventIndex((current) => current === 0 ? activeEvents.length - 1 : current - 1);
    };

    const showNextEvent = () => {
        setActiveEventIndex((current) => current === activeEvents.length - 1 ? 0 : current + 1);
    };

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    const scrollEventHistory = (direction: "left" | "right") => {
        const container = eventHistoryScrollRef.current;
        if (!container) return;

        const firstCard = container.querySelector<HTMLElement>("[data-event-history-card]");
        const cardWidth = firstCard?.offsetWidth || 360;
        const gap = 24;

        container.scrollBy({
            left: (cardWidth + gap) * (direction === "left" ? -1 : 1),
            behavior: "smooth",
        });
    };

    return (
        <main className="font-body min-h-screen bg-[#fdfbf7] text-gray-800 selection:bg-yellow-200 selection:text-black overflow-x-hidden pb-32 md:pb-0">
            <StructuredData data={cpnsSchema} />

            {/* --- NAVBAR (Binder Style) --- */}
            <header className="fixed top-0 w-full z-50 bg-[#fdfbf7]/90 backdrop-blur-sm border-b-4 border-gray-800/10">
                <nav className="container mx-auto px-4 md:px-6 lg:px-8 h-20 flex items-center justify-between relative">

                    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Scroll ke atas" className="flex items-center group cursor-pointer">
                        <span className="text-3xl font-handwriting font-bold text-gray-800 -rotate-1 group-hover:rotate-0 transition-transform leading-tight">
                            Siap<span className="text-blue-600 underline decoration-wavy decoration-2 underline-offset-2">Tempur</span>.
                        </span>
                    </button>

                    {/* Desktop Navigation */}
                    <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-6 font-handwriting text-xl text-gray-700">
                        <button onClick={() => scrollToSection("features")} className="hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">Fitur</button>
                        <button onClick={() => scrollToSection("products")} className="hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">Harga</button>
                        <button onClick={() => scrollToSection("active-event")} className="hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">Event</button>

                        {/* Tryout Dropdown */}
                        <div className="relative" onMouseEnter={() => setIsTryoutOpen(true)} onMouseLeave={() => setIsTryoutOpen(false)}>
                            <button className="flex items-center gap-1 hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">
                                Tempur <ChevronDown size={16} className={cn("transition-transform", isTryoutOpen && "rotate-180")} />
                            </button>
                            {isTryoutOpen && (
                                <>
                                    {/* Jembatan transparan agar dropdown tidak nutup saat hover ke menu */}
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
                            <button onClick={() => { scrollToSection("products"); setIsMenuOpen(false); }} className="font-handwriting text-2xl text-gray-700 hover:text-blue-600 text-left py-2 border-b border-gray-200">Harga</button>
                            <button onClick={() => { scrollToSection("active-event"); setIsMenuOpen(false); }} className="font-handwriting text-2xl text-gray-700 hover:text-red-600 text-left py-2 border-b border-gray-200">Event</button>
                            <Link href="/cpns/mini-tryout" onClick={() => setIsMenuOpen(false)} className="font-handwriting text-2xl text-gray-700 hover:text-blue-600 text-left py-2 border-b border-gray-200">Mini Tryout</Link>
                            <Link href="/cpns/full-tryout" onClick={() => setIsMenuOpen(false)} className="font-handwriting text-2xl text-gray-700 hover:text-blue-600 text-left py-2 border-b border-gray-200">Full Tryout</Link>
                            <Link href="/cpns/drilling-materi" onClick={() => setIsMenuOpen(false)} className="font-handwriting text-2xl text-gray-700 hover:text-blue-600 text-left py-2 border-b border-gray-200">Drilling Materi</Link>
                            <Link href="/blog" onClick={() => setIsMenuOpen(false)} className="font-handwriting text-2xl text-gray-700 hover:text-blue-600 text-left py-2 border-b border-gray-200">Artikel</Link>
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

            {/* --- HERO SECTION (Kertas Tryout) --- */}
            <Section paper className="pt-32 pb-32 relative overflow-hidden">
                <div className="text-center relative z-10 max-w-5xl mx-auto">
                    {/* Mascots - Desktop Only - Anchored to Center Text */}
                    <div className="hidden lg:block absolute right-full mr-[-60px] xl:mr-[-40px] bottom-0 z-0 pointer-events-none opacity-90 w-[300px] xl:w-[450px] 2xl:w-[550px]">
                        <Image src="/tamapng.png" alt="Mascot Boy" width={600} height={800} className="w-full h-auto drop-shadow-2xl translate-y-10 xl:translate-y-16" priority />
                    </div>
                    <div className="hidden lg:block absolute left-full ml-[-60px] xl:ml-[-40px] bottom-0 z-0 pointer-events-none opacity-90 w-[300px] xl:w-[450px] 2xl:w-[550px]">
                        <Image src="/tarapng.png" alt="Mascot Girl" width={600} height={800} className="w-full h-auto drop-shadow-2xl translate-y-10 xl:translate-y-16" priority />
                    </div>
                    {/* Label Stabilo */}
                    <Badge variant="yellow" className="mb-6">
                        🎯 Persiapan CPNS 2026 Dimulai!
                    </Badge>

                    <h1 className="font-handwriting text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                        Jangan Kaget di Hari H.<br />
                        <span className="text-blue-600">Simulasikan SKD-mu Sekarang</span><br />
                        <span className="relative inline-block mt-2">
                            dengan Sistem Standar CAT BKN Asli.
                            {/* Coretan bawah */}
                            <svg className="absolute w-full h-3 -bottom-1 left-0 text-blue-500/50" viewBox="0 0 100 10" preserveAspectRatio="none">
                                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                            </svg>
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto mb-10 font-handwriting leading-relaxed px-4">
                        Latih manajemen waktumu dalam 100 menit. Dilengkapi soal akurat TWK, TIU, TKP, pembahasan tuntas, dan perankingan nasional. Cuma 
                        <span className="bg-green-200 px-1 mx-1 font-bold">Rp 10.000</span>
                        bayar per tryout tanpa langganan.
                    </p>

                    <div className="flex flex-col items-center justify-center gap-2 w-full max-w-md mx-auto mt-8">
                        <Button
                            size="lg"
                            onClick={() => scrollToSection("products")}
                            className="w-full text-xl py-6"
                        >
                            Buat Akun & Mulai Tryout <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <span className="text-sm font-handwriting font-bold text-gray-500 bg-white/80 px-3 py-1 rounded-full border border-gray-200">
                            ⭐ 1 Token = 1x Tryout Full/Mini/Drilling. Tidak ada biaya langganan bulanan.
                        </span>
                    </div>
                </div>
            </Section>

            {/* --- TRUST BADGES --- */}
            <section className="bg-white py-6 border-b-4 border-gray-900/10 overflow-hidden">
                <div className="container mx-auto px-4 md:px-6 lg:px-8">
                    <div className="flex overflow-x-auto pb-4 md:pb-0 hide-scrollbar gap-4 md:gap-8 justify-start md:justify-center items-center">
                        {trustBadges.map((badge, i) => {
                            const IconMap: Record<string, typeof Award> = { Award, BookOpen, Trophy, ShieldCheck, Monitor, Layers };
                            const IconComponent = IconMap[badge.icon] || Award;
                            return (
                                <div key={i} className="flex items-center gap-2 bg-gray-100 px-4 py-2.5 rounded-full border-2 border-gray-200 shrink-0 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-default">
                                    <IconComponent className="w-5 h-5 text-blue-600" />
                                    <span className="font-handwriting font-bold text-gray-700 whitespace-nowrap text-sm md:text-base">{badge.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* --- KEUNGGULAN (Doodle Icons) --- */}
            <Section id="features" dashedBorder="both" pattern="grid" className="bg-white">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="font-handwriting text-5xl font-bold mb-4">Kenapa Ribuan Peserta Pilih Sini?</h2>
                    <p className="font-handwriting text-2xl text-gray-600">Karena yang kaget di hari H itu yang gak pernah tryout serius.</p>
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
                        <p className="text-gray-700">110 soal, 100 menit. Tryout di sini = simulasi manajemen waktu yang menentukan lolos atau gagal di CAT BKN nanti.</p>
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
                    <h2 className="font-handwriting text-5xl font-bold mb-4">Begini Rasanya Tryout di Sini</h2>
                    <p className="font-handwriting text-2xl text-gray-600">Sistem penilaian sama persis dengan CAT BKN. Bedanya, ini tryout — salah di sini gratis, salah di sana hilang kursi ASN.</p>
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
                                                    ? 'border-blue-600 bg-blue-50 shadow-[2px_2px_0px_0px_rgba(37,99,235,1)] translate-x-px translate-y-px relative overflow-hidden'
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
                    <p className="font-handwriting text-lg text-gray-500 mt-4">Mulai dari Rp 7.500/token. Lebih murah dari kopi, tapi bisa ubah masa depanmu.</p>
                </div>
            </Section>

            {/* --- TIGA PILIHAN TEMPUR --- */}
            <Section id="tryout-types" dashedBorder="both" className="bg-[#f0f4f8]">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <Badge variant="blue" className="mb-4">Pilih Cara Belajarmu</Badge>
                    <h2 className="font-handwriting text-5xl font-bold mb-4">Satu Token, Tiga Pilihan Tempur</h2>
                    <p className="font-handwriting text-2xl text-gray-600">Sesuaikan dengan waktu dan target belajarmu hari ini.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
                    {/* Drilling Materi */}
                    <Card interactive className="p-8 bg-white border-4 border-gray-900 flex flex-col">
                        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6 border-2 border-gray-900">
                            <Layers className="w-8 h-8 text-red-600" />
                        </div>
                        <h3 className="font-handwriting text-3xl font-bold mb-4">Drilling Materi</h3>
                        <p className="text-gray-600 mb-6 min-h-[80px]">Fokus latihan ke 1 materi spesifik (misal: hanya materi Analogi TIU atau Nasionalisme TWK) untuk memperbaiki titik lemahmu.</p>

                        <ul className="space-y-3 mb-8 font-handwriting text-lg text-gray-700 flex-1">
                            <li className="flex items-center gap-3"><span className="text-green-500 font-bold">✓</span> 30 Soal spesifik per sub-materi</li>
                            <li className="flex items-center gap-3"><span className="text-green-500 font-bold">✓</span> Evaluasi detail kelemahan</li>
                            <li className="flex items-center gap-3"><span className="text-green-500 font-bold">✓</span> Cepat tingkatkan skor spesifik</li>
                        </ul>

                        <Button variant="outline" className="w-full py-6 text-xl mt-auto" onClick={() => scrollToSection("products")}>
                            Coba Drilling
                        </Button>
                    </Card>

                    {/* Mini Tryout */}
                    <Card interactive className="p-8 bg-white border-4 border-gray-900 flex flex-col">
                        <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mb-6 border-2 border-gray-900">
                            <Target className="w-8 h-8 text-yellow-600" />
                        </div>
                        <h3 className="font-handwriting text-3xl font-bold mb-4">Mini Tryout</h3>
                        <p className="text-gray-600 mb-6 min-h-[80px]">Latihan cepat dan fokus per bagian tes. Cocok buat kamu yang lagi sibuk tapi tetap mau nyicil belajar setiap hari.</p>

                        <ul className="space-y-3 mb-8 font-handwriting text-lg text-gray-700 flex-1">
                            <li className="flex items-center gap-3"><span className="text-green-500 font-bold">✓</span> Fokus 1 subtes (TWK/TIU/TKP)</li>
                            <li className="flex items-center gap-3"><span className="text-green-500 font-bold">✓</span> Waktu pengerjaan singkat</li>
                            <li className="flex items-center gap-3"><span className="text-green-500 font-bold">✓</span> Pembahasan per soal</li>
                        </ul>

                        <Button variant="outline" className="w-full py-6 text-xl mt-auto" onClick={() => scrollToSection("products")}>
                            Coba Mini Tryout
                        </Button>
                    </Card>

                    {/* Full Tryout */}
                    <Card interactive className="p-8 bg-blue-50 border-4 border-gray-900 flex flex-col relative overflow-hidden">
                        <div className="absolute top-4 right-4 bg-yellow-400 text-gray-900 font-bold px-3 py-1 rounded-full text-xs shadow-sm z-10 border-2 border-gray-900">RECOMMENDED</div>
                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 border-2 border-gray-900">
                            <Monitor className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="font-handwriting text-3xl font-bold mb-4">Full Tryout SKD</h3>
                        <p className="text-gray-600 mb-6 min-h-[80px]">Simulasi ujian SKD CPNS yang sesungguhnya. Latih manajemen waktu dan mentalmu sebelum hari H tiba.</p>

                        <ul className="space-y-3 mb-8 font-handwriting text-lg text-gray-700 flex-1">
                            <li className="flex items-center gap-3"><span className="text-green-500 font-bold">✓</span> 110 Soal (TWK + TIU + TKP)</li>
                            <li className="flex items-center gap-3"><span className="text-green-500 font-bold">✓</span> Waktu 100 menit berjalan</li>
                            <li className="flex items-center gap-3"><span className="text-green-500 font-bold">✓</span> Perankingan Nasional</li>
                        </ul>

                        <Button className="w-full py-6 text-xl mt-auto" onClick={() => scrollToSection("products")}>
                            Mulai Full Tryout
                        </Button>
                    </Card>
                </div>
            </Section>

            {/* --- EVENT AKTIF --- */}
            <Section id="active-event" dashedBorder="both" className="bg-[#fffdf0]">
                <div className="text-center mb-10 relative z-10">
                    <div className="inline-flex items-center gap-2 bg-red-100 text-red-600 font-bold px-4 py-2 rounded-full border-2 border-red-200 mb-5 animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-red-600" />
                        {activeEvent ? "Event Aktif Sekarang" : "Belum Ada Event Aktif"}
                    </div>
                    <h2 className="font-handwriting text-4xl md:text-5xl font-bold mb-3 text-gray-950">Event Tryout Aktif</h2>
                    <p className="font-body text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                        Ikuti tryout terjadwal untuk mengukur kesiapanmu, melihat ranking nasional, dan mendapatkan evaluasi hasil secara lebih realistis.
                    </p>
                </div>

                <div className="max-w-6xl mx-auto">
                    <div className="relative">
                        {activeEvent ? (
                            <>
                                <Card className="p-0 overflow-hidden border-4 border-gray-900 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] grid grid-cols-1 md:grid-cols-[0.92fr_1.08fr]">
                                    <div className="bg-blue-600 p-4 md:p-5 text-white flex items-center justify-center">
                                        <div className="flex h-full w-full max-w-md flex-col items-center justify-center">
                                            {activeEventFlyerUrl ? (
                                                <Image
                                                    src={activeEventFlyerUrl}
                                                    alt={`Poster ${activeEvent?.title || "event aktif"}`}
                                                    width={480}
                                                    height={600}
                                                    className="aspect-4/5 h-auto w-full rounded-lg object-contain"
                                                />
                                            ) : (
                                                <div className="flex aspect-4/5 w-full items-center justify-center rounded-lg bg-blue-700">
                                                    <Clock className="h-20 w-20 text-yellow-400" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 md:p-8">
                                        <div className="flex flex-col gap-4">
                                            <div>
                                                <p className="font-body text-sm font-extrabold uppercase tracking-[0.12em] text-blue-600">Event Aktif</p>
                                                <h4 className="mt-1 font-handwriting text-3xl font-bold leading-tight text-gray-950">{activeEvent.title.replace(/\s*-?\s*Sesi\s*\d+/i, '').trim()}</h4>
                                                <p className="mt-2 font-body text-sm leading-6 text-gray-600">
                                                    Simulasi Full SKD dengan sistem CAT, analisis nilai, ranking nasional, sertifikat, dan hadiah untuk Top 3.
                                                </p>
                                            </div>

                                            <div>
                                                <p className="mb-2 font-body text-sm font-bold text-gray-800">Pilih sesi</p>
                                                {activeEvents.length > 0 ? (
                                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                        {activeEvents.map((event, index) => {
                                                            const isSelected = index === activeEventIndex;
                                                            return (
                                                                <button
                                                                    key={event.id}
                                                                    type="button"
                                                                    onClick={() => setActiveEventIndex(index)}
                                                                    className={cn(
                                                                        "rounded-lg border-2 px-4 py-3 text-left font-body transition-all",
                                                                        isSelected
                                                                            ? "border-blue-700 bg-blue-600 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                                                                            : "border-gray-200 bg-[#fdfbf7] text-gray-800 hover:border-blue-500"
                                                                    )}
                                                                >
                                                                    <span className="block text-sm font-extrabold">{getEventSessionLabel(event, index)}</span>
                                                                    <span className={cn("mt-1 block text-xs font-semibold", isSelected ? "text-blue-100" : "text-gray-500")}>
                                                                        {formatEventStartTime(event)}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-[#fdfbf7] px-4 py-4 font-body text-sm font-semibold text-gray-600">
                                                        Belum ada event aktif yang dibuka. Jadwal baru akan tampil otomatis di sini saat admin membuat event.
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                                {miniStats.map((stat) => (
                                                    <div key={stat.label} className="rounded-lg border-2 border-gray-900 bg-[#fdfbf7] px-3 py-3 text-center">
                                                        <p className="font-body text-[11px] font-bold uppercase tracking-wide text-gray-500">{stat.label}</p>
                                                        <p className="mt-1 font-body text-base font-black text-gray-950">{stat.value}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-3 font-body text-sm text-gray-700">
                                                    <Target className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                                                    <span><strong className="text-gray-950">Materi:</strong> TWK, TIU, TKP dengan 110 soal.</span>
                                                </div>
                                                <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-3 font-body text-sm text-gray-700">
                                                    <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                                                    <span><strong className="text-gray-950">Sistem:</strong> simulasi CAT dan timer ujian.</span>
                                                </div>
                                                <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-3 font-body text-sm text-gray-700">
                                                    <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                                                    <span><strong className="text-gray-950">Evaluasi:</strong> analisis nilai dan ranking nasional.</span>
                                                </div>
                                                <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-3 font-body text-sm text-gray-700">
                                                    <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                                                    <span><strong className="text-gray-950">Bonus:</strong> sertifikat dan hadiah Top 3.</span>
                                                </div>
                                            </div>

                                            <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
                                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                                    <div className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 font-body text-sm font-extrabold text-red-600">
                                                        <span className="h-2 w-2 rounded-full bg-red-500" />
                                                        {activeEvent ? "Pendaftaran Dibuka" : "Belum Ada Event Aktif"}
                                                    </div>
                                                    <p className="font-body text-sm font-bold text-gray-700">
                                                        {activeEvent ? `Kuota terbatas untuk ${miniStats[3].value}` : "Cek kembali saat jadwal event dibuka"}
                                                    </p>
                                                </div>
                                                <Button size="lg" className="w-full justify-center bg-blue-600 py-4 font-body text-lg font-black" disabled={!activeEvent} onClick={() => router.push(user ? "/cpns/dashboard/event" : "/login?returnTo=/cpns/dashboard/event")}>
                                                    {activeEvent ? "Daftar Event Sekarang" : "Menunggu Event Berikutnya"} <ArrowRight className="ml-1 h-5 w-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                {hasMultipleActiveEvents && (
                                    <div className="mt-6 flex items-center justify-center gap-3">
                                        <button
                                            type="button"
                                            onClick={showPreviousEvent}
                                            className="inline-flex h-11 w-11 items-center justify-center rounded-md border-2 border-gray-900 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                                            aria-label="Lihat event sebelumnya"
                                        >
                                            <ChevronLeft className="h-6 w-6" />
                                        </button>
                                        <div className="min-w-24 rounded-full border-2 border-gray-900 bg-white px-4 py-2 text-center font-handwriting text-lg font-bold">
                                            {activeEventIndex + 1} / {activeEvents.length}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={showNextEvent}
                                            className="inline-flex h-11 w-11 items-center justify-center rounded-md border-2 border-gray-900 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                                            aria-label="Lihat event berikutnya"
                                        >
                                            <ChevronRight className="h-6 w-6" />
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <Card className="mx-auto max-w-3xl border-4 border-gray-900 bg-white p-8 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                                <Clock className="mx-auto mb-4 h-12 w-12 text-blue-600" />
                                <h3 className="font-handwriting text-3xl font-bold text-gray-950">Belum Ada Event Aktif</h3>
                                <p className="mx-auto mt-3 max-w-xl font-body text-base leading-relaxed text-gray-600">
                                    Saat admin membuka event baru, jadwal dan tombol pendaftaran akan otomatis tampil di landing page ini.
                                </p>
                            </Card>
                        )}
                    </div>
                </div>
            </Section>

            {/* --- HISTORI EVENT --- */}
            <Section id="event-history" dashedBorder="both" className="bg-white">
                <div className="text-center mb-12">
                    <h2 className="font-handwriting text-4xl md:text-5xl font-bold mb-4">Jejak Event SiapTempur</h2>
                    <p className="font-handwriting text-xl md:text-2xl text-gray-600">Terbukti selalu ramai dan jadi ajang pemanasan nasional.</p>
                </div>

                {completedEvents.length > 0 ? (
                    <div className="relative mx-auto max-w-7xl px-16">
                        <button
                            type="button"
                            onClick={() => scrollEventHistory("left")}
                            className="absolute left-2 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center border-2 border-gray-900 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors hover:bg-yellow-100 md:inline-flex"
                            aria-label="Geser jejak event ke kiri"
                        >
                            <ChevronLeft className="h-7 w-7" />
                        </button>

                        <div
                            ref={eventHistoryScrollRef}
                            className="mx-auto flex max-w-6xl snap-x snap-mandatory gap-6 overflow-x-auto pb-4 scroll-smooth hide-scrollbar"
                        >
                            {completedEvents.map((event) => {
                                const flyerUrl = getEventFlyerUrl(event);
                                return (
                                    <Card
                                        key={event.id}
                                        data-event-history-card
                                        className="flex w-[82vw] shrink-0 snap-start flex-col overflow-hidden border-2 border-gray-900 bg-[#fdfbf7] transition-transform hover:-translate-y-1 md:w-[calc((100%-3rem)/3)]"
                                    >
                                        {flyerUrl ? (
                                            <div className="relative aspect-4/5 w-full border-b-2 border-gray-900 bg-blue-600">
                                                <Image
                                                    src={flyerUrl}
                                                    alt={`Flyer ${event.title}`}
                                                    fill
                                                    sizes="370px"
                                                    className="object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex aspect-4/3 w-full items-center justify-center border-b-2 border-gray-900 bg-blue-50 px-6 text-center">
                                                <div>
                                                    <Trophy className="mx-auto mb-3 h-10 w-10 text-blue-600" />
                                                    <p className="font-handwriting text-2xl font-bold text-gray-900">Dokumentasi Event</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex flex-1 flex-col p-6">
                                            <h3 className="mb-6 flex-1 font-handwriting text-2xl font-bold leading-tight text-gray-900">{event.title}</h3>
                                            <Button variant="outline" className="w-full border-2 border-gray-900 text-sm font-bold text-gray-800 hover:bg-gray-100" asChild>
                                                <a href={getEventDocumentationUrl(event)} target="_blank" rel="noopener noreferrer">
                                                    Lihat Dokumentasi
                                                </a>
                                            </Button>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={() => scrollEventHistory("right")}
                            className="absolute right-2 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center border-2 border-gray-900 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors hover:bg-yellow-100 md:inline-flex"
                            aria-label="Geser jejak event ke kanan"
                        >
                            <ChevronRight className="h-7 w-7" />
                        </button>
                    </div>
                ) : (
                    <Card className="mx-auto max-w-2xl border-2 border-dashed border-gray-300 bg-[#fdfbf7] p-8 text-center">
                        <Trophy className="mx-auto mb-3 h-10 w-10 text-blue-600" />
                        <h3 className="font-handwriting text-2xl font-bold text-gray-900">Belum Ada Event Selesai</h3>
                        <p className="mt-2 font-body text-sm text-gray-600">Event yang sudah selesai akan otomatis tampil di sini.</p>
                    </Card>
                )}
            </Section>

            {/* --- PRICING SECTION --- */}
            <Section id="products" pattern="dots" dashedBorder="both" className="bg-[#f0f4f8]">
                <div className="text-center mb-16 relative z-10">
                    <Badge variant="red" className="mb-4">BISA SCAN QRIS</Badge>
                    <h2 className="font-handwriting text-5xl font-bold mb-4">Investasi ASN Sekali Bayar</h2>
                    <p className="font-handwriting text-2xl text-gray-600">1 Token = 1x Tryout. Tanpa batas masa berlaku.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
                    {/* Paket 1 */}
                    <Card variant="standard" interactive className="p-8 bg-white border-4 border-gray-900 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[20px_20px] flex flex-col">
                        <span className="font-handwriting font-bold text-gray-500 mb-2 block">PAKET PERINTIS</span>
                        <div className="flex items-end gap-1 mb-2">
                            <span className="text-2xl font-bold mb-2">Rp</span>
                            <span className="text-6xl font-bold text-gray-900">10.000</span>
                            <span className="text-xl text-gray-500 mb-2">/token</span>
                        </div>
                        <div className="text-gray-700 font-handwriting text-lg mb-6 font-bold">Total Bayar: Rp 10.000 (Dapat 1 Token)</div>
                        <Badge variant="pink" className="mb-8 w-max">1x TOKEN TRYOUT</Badge>
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
                        <div className="text-center mt-3 text-sm font-bold text-gray-500 flex items-center justify-center gap-1">
                            <ShieldCheck size={16} className="text-green-600" /> Pembayaran Otomatis via QRIS
                        </div>
                    </Card>

                    {/* Paket 2 (Featured) */}
                    <Card variant="standard" interactive className="p-10 bg-blue-600 border-4 border-gray-900 relative overflow-hidden group scale-105 z-20 flex flex-col">
                        <div className="absolute top-4 right-4 bg-yellow-400 text-gray-900 font-bold px-4 py-1 rounded-full text-sm shadow-md z-10 animate-pulse">PALING LARIS!</div>
                        <span className="font-handwriting font-bold text-blue-100 mb-2 block">PAKET PEJUANG</span>
                        <div className="flex items-end gap-1 mb-2">
                            <span className="text-2xl font-bold mb-2 text-white">Rp</span>
                            <span className="text-6xl font-bold text-yellow-400">8.000</span>
                            <span className="text-xl text-blue-200 mb-2">/token</span>
                        </div>
                        <div className="text-white font-handwriting text-lg mb-6 font-bold">Total Bayar: Rp 40.000 (Dapat 5 Token)</div>
                        <Badge variant="yellow" className="mb-8 w-max">5x TOKEN TRYOUT</Badge>
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
                        <div className="text-center mt-3 text-sm font-bold text-blue-200 flex items-center justify-center gap-1">
                            <ShieldCheck size={16} className="text-yellow-400" /> Pembayaran Otomatis via QRIS
                        </div>
                    </Card>

                    {/* Paket 3 */}
                    <Card variant="standard" interactive className="p-8 bg-white border-4 border-gray-900 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[20px_20px] flex flex-col">
                        <span className="font-handwriting font-bold text-gray-500 mb-2 block">PAKET PASUKAN</span>
                        <div className="flex items-end gap-1 mb-2">
                            <span className="text-2xl font-bold mb-2">Rp</span>
                            <span className="text-6xl font-bold text-gray-900">7.500</span>
                            <span className="text-xl text-gray-500 mb-2">/token</span>
                        </div>
                        <div className="text-gray-700 font-handwriting text-lg mb-6 font-bold">Total Bayar: Rp 75.000 (Dapat 10 Token)</div>
                        <Badge variant="green" className="mb-8 w-max">10x TOKEN TRYOUT</Badge>
                        <ul className="space-y-4 mb-8 w-full font-handwriting text-lg text-gray-700">
                            <li className="flex items-center gap-3 text-green-600 font-bold"><Sparkles size={20} /> Persiapan Maksimal</li>
                            <li className="flex items-center gap-3"><Sparkles size={20} className="text-green-600" /> Tryout Tiap Minggu</li>
                            <li className="flex items-center gap-3"><Sparkles size={20} className="text-green-600" /> Ranking Terupdate</li>
                            <li className="flex items-center gap-3"><Sparkles size={20} className="text-green-600" /> Hemat Rp 25.000!</li>
                        </ul>
                        <Button
                            className="w-full text-xl py-6 mt-auto"
                            onClick={() => router.push("/login?returnTo=/cpns")}
                        >
                            Hajar Gaskeun!
                        </Button>
                        <div className="text-center mt-3 text-sm font-bold text-gray-500 flex items-center justify-center gap-1">
                            <ShieldCheck size={16} className="text-green-600" /> Pembayaran Otomatis via QRIS
                        </div>
                    </Card>
                </div>
            </Section>

            {/* --- ARTIKEL TERBARU --- */}
            {latestArticles && latestArticles.length > 0 && (
                <Section id="articles" dashedBorder="both" className="bg-[#fffdf0]">
                    <div className="text-center mb-12">
                        <Badge variant="yellow" className="mb-4">Info Penting & Tips</Badge>
                        <h2 className="font-handwriting text-4xl md:text-5xl font-bold mb-4">Artikel & Update Terbaru</h2>
                        <p className="font-handwriting text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto">Jangan ketinggalan info seputar CPNS, tips lulus, dan update kebijakan dari BKN.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {latestArticles.map((article) => (
                            <article key={article.id} className="group relative">
                                <Link
                                    href={`/blog/${article.slug}`}
                                    className="absolute inset-0 z-10"
                                    aria-label={`Baca artikel ${article.title}`}
                                />
                                <Card className="p-0 overflow-hidden h-full flex flex-col hover:-translate-y-2 transition-transform border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
                                    {article.cover_image_url ? (
                                        <div className="relative aspect-video w-full border-b-4 border-gray-900 bg-gray-100 overflow-hidden">
                                            <Image 
                                                src={article.cover_image_url} 
                                                alt={article.title} 
                                                fill 
                                                className="object-cover group-hover:scale-105 transition-transform duration-500" 
                                            />
                                        </div>
                                    ) : (
                                        <div className="relative aspect-video w-full border-b-4 border-gray-900 bg-blue-100 flex items-center justify-center overflow-hidden">
                                            <BookOpen className="w-16 h-16 text-blue-300 group-hover:scale-110 transition-transform duration-500" />
                                        </div>
                                    )}
                                    <div className="p-6 flex flex-col flex-1">
                                        {article.published_at && (
                                            <div className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                {new Date(article.published_at).toLocaleDateString("id-ID", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric"
                                                })}
                                            </div>
                                        )}
                                        <h3 className="font-handwriting text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                                            {article.title}
                                        </h3>
                                        <p className="text-gray-600 line-clamp-3 mb-4 flex-1">
                                            {article.excerpt || "Baca selengkapnya artikel ini untuk mendapatkan informasi detail terkait persiapan CPNS."}
                                        </p>
                                        <div className="font-bold text-blue-600 flex items-center gap-2 group-hover:gap-3 transition-all mt-auto" aria-hidden="true">
                                            Baca Selengkapnya <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </Card>
                            </article>
                        ))}
                    </div>
                    
                    <div className="text-center mt-12">
                        <Button variant="outline" size="lg" className="text-xl" asChild>
                            <Link href="/blog">Lihat Semua Artikel</Link>
                        </Button>
                    </div>
                </Section>
            )}

            {/* --- LEADERBOARD --- */}
            <Section id="leaderboard" dashedBorder="both" className="bg-[#f0f4f8]" pattern="grid">
                <div className="text-center mb-12">
                    <h2 className="font-handwriting text-4xl md:text-5xl font-bold mb-4">Pemenang dan Ranking Terbaik</h2>
                    <p className="font-handwriting text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto">Ranking membantu peserta membandingkan kemampuan secara sehat dan mengetahui posisi mereka secara nasional.</p>
                </div>

                <div className="max-w-4xl mx-auto">
                    <Card className="p-0 overflow-hidden border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
                        <div className="bg-blue-600 p-4 text-white font-handwriting text-xl font-bold flex items-center gap-2">
                            <Trophy className="text-yellow-400" /> Top 5 Simulasi Terakhir
                        </div>
                        <div className="flex flex-col">
                            {leaderboardWinners.map((winner, i) => (
                                <div key={i} className={`flex items-center p-4 md:p-5 border-b-2 border-dashed border-gray-200 last:border-b-0 hover:bg-blue-50 transition-colors ${i < 3 ? 'bg-yellow-50/30' : ''}`}>
                                    <div className="w-12 font-handwriting font-bold text-2xl text-center">
                                        {i === 0 ? <span className="text-yellow-500 text-3xl">🥇</span> :
                                            i === 1 ? <span className="text-gray-400 text-3xl">🥈</span> :
                                                i === 2 ? <span className="text-orange-600 text-3xl">🥉</span> :
                                                    <span className="text-gray-400">#{winner.rank}</span>}
                                    </div>
                                    <div className="flex-1 ml-4">
                                        <div className="font-handwriting font-bold text-lg md:text-xl text-gray-900">{winner.name}</div>
                                        <div className="text-sm text-gray-500 flex items-center gap-1"><MapPin size={12} /> {winner.region}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-handwriting font-bold text-3xl text-blue-600">{winner.score}</div>
                                        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Skor Akhir</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </Section>

            {/* --- TESTIMONIALS (Sketsa Orang) --- */}
            <Section id="memorials" className="bg-white" dashedBorder="top" pattern="dots">
                <div className="text-center max-w-4xl mx-auto mb-16">
                    <h2 className="font-handwriting text-5xl font-bold mb-4">Apa Kata Peserta?</h2>
                    <p className="font-handwriting text-2xl text-gray-600">Kata mereka yang udah "tempur" duluan dan merasakan manfaatnya secara langsung.</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {testimonials.map((testi, i) => (
                        <Card key={i} interactive className={`p-8 flex flex-col ${testi.rotateClass}`}>
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`w-16 h-16 ${testi.bgClass} border-2 border-gray-900 rounded-full flex items-center justify-center text-3xl shrink-0`}>
                                    {testi.avatar}
                                </div>
                                <div>
                                    <h4 className="font-handwriting text-xl font-bold leading-none mb-1">{testi.name}</h4>
                                    <span className="text-sm text-gray-500 font-handwriting">{testi.region} • {testi.event}</span>
                                </div>
                            </div>
                            <div className="mb-4 flex items-center justify-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <div className="text-center">
                                    <span className="text-xs text-gray-500 block">Sebelumnya</span>
                                    <span className="font-handwriting font-bold text-red-500">{testi.scoreBefore}</span>
                                </div>
                                <ArrowRight size={16} className="text-gray-300" />
                                <div className="text-center">
                                    <span className="text-xs text-gray-500 block">Sesudahnya</span>
                                    <span className="font-handwriting font-bold text-green-600 text-xl">{testi.scoreAfter}</span>
                                </div>
                            </div>
                            <p className="font-handwriting text-lg text-gray-700 italic leading-relaxed flex-1">
                                {testi.text}
                            </p>
                            <div className="flex text-yellow-500 mt-4">
                                {[...Array(5)].map((_, idx) => (
                                    <Sparkles key={idx} size={16} fill="currentColor" />
                                ))}
                            </div>
                        </Card>
                    ))}
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

                <div className="max-w-4xl mx-auto text-center relative z-10 px-4 md:px-6 lg:px-8">
                    <h2 className="font-handwriting text-4xl font-bold mb-6 italic">"Jangan Tempur Tanpa Amunisi."</h2>
                    <p className="text-gray-400 mb-8 max-w-lg mx-auto font-handwriting text-xl">Lolos CPNS bukan soal pintar saja, tapi soal siapa yang paling siap menghadapi sistem CAT yang aslinya.</p>

                    <Button
                        variant="white"
                        size="lg"
                        onClick={() => scrollToSection("products")}
                    >
                        Ambil Amunisi Sekarang
                    </Button>

                    <div className="mt-16 pt-8 border-t border-gray-800 text-left mb-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 font-body text-sm text-gray-400">
                            <div>
                                <h3 className="font-bold text-white mb-4">Layanan Utama</h3>
                                <ul className="space-y-2">
                                    <li><Link href="/cpns/full-tryout" className="hover:text-blue-400 transition-colors">Full Tryout CPNS</Link></li>
                                    <li><Link href="/cpns/mini-tryout" className="hover:text-blue-400 transition-colors">Mini Tryout CPNS</Link></li>
                                    <li><Link href="/cpns/event" className="hover:text-blue-400 transition-colors">Event Tryout Akbar</Link></li>
                                    <li><button onClick={() => scrollToSection("products")} className="hover:text-blue-400 transition-colors">Harga Token Tryout</button></li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-bold text-white mb-4">Latihan Subtes</h3>
                                <ul className="space-y-2">
                                    <li><Link href="/cpns/twk" className="hover:text-blue-400 transition-colors">Latihan Soal TWK</Link></li>
                                    <li><Link href="/cpns/tiu" className="hover:text-blue-400 transition-colors">Latihan Soal TIU</Link></li>
                                    <li><Link href="/cpns/tkp" className="hover:text-blue-400 transition-colors">Latihan Soal TKP</Link></li>
                                    <li><Link href="/cpns/dashboard" className="hover:text-blue-400 transition-colors">Simulasi CAT BKN</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-bold text-white mb-4">Informasi</h3>
                                <ul className="space-y-2">
                                    <li><Link href="/blog" className="hover:text-blue-400 transition-colors">Blog & Info CPNS</Link></li>
                                    <li><button onClick={() => scrollToSection("faq")} className="hover:text-blue-400 transition-colors">FAQ</button></li>
                                    <li><Link href="/syarat-ketentuan" className="hover:text-blue-400 transition-colors">Syarat & Ketentuan</Link></li>
                                    <li><Link href="/kebijakan-privasi" className="hover:text-blue-400 transition-colors">Kebijakan Privasi</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-bold text-white mb-4">Bantuan</h3>
                                <ul className="space-y-2">
                                    <li><Link href="/kebijakan-pengembalian" className="hover:text-blue-400 transition-colors">Kebijakan Pengembalian</Link></li>
                                    <li><a href="mailto:halo@siaptempur.id" className="hover:text-blue-400 transition-colors">Hubungi Kami</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-6 font-handwriting text-lg text-gray-500">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-white">Siap <span className="text-blue-400 underline decoration-wavy decoration-2 underline-offset-2">Tempur</span></span> © 2026
                        </div>
                    </div>
                </div>
            </footer>


        </main>
    );
}
