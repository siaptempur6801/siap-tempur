"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { Menu, X } from "lucide-react";
import Link from "next/link";

// Sections
import UniversalHero from "./UniversalHero";
import UniversalPrograms from "./UniversalPrograms";
import UniversalWhyUs from "./UniversalWhyUs";
import UniversalHowItWorks from "./UniversalHowItWorks";
import UniversalFAQ from "./UniversalFAQ";
import UniversalFooter from "./UniversalFooter";
import UniversalMission from "./UniversalMission";
import { Mail } from "lucide-react";
import StructuredData from "@/components/StructuredData";

export default function UniversalLandingUI() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const scrollToSection = (id: string) => {
        setIsMenuOpen(false);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    const organizationSchema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Siap Tempur",
        "url": "https://siaptempur.id",
        "logo": "https://siaptempur.id/logo.png",
        "description": "Portal persiapan ujian terlengkap di Indonesia untuk CPNS, BUMN, dan TOEFL.",
        "address": {
            "@type": "PostalAddress",
            "addressCountry": "ID"
        },
        "contactPoint": {
            "@type": "ContactPoint",
            "email": "halo@siaptempur.id",
            "contactType": "customer service"
        }
    };

    return (
        <main className="font-body min-h-screen bg-[#fdfbf7] text-gray-800 selection:bg-yellow-200 selection:text-black overflow-x-hidden">
            <StructuredData data={organizationSchema} />
            
            {/* --- NAVBAR --- */}
            <header className="fixed top-0 w-full z-50 bg-[#fdfbf7]/90 backdrop-blur-sm border-b-4 border-gray-800/10 shadow-sm">
                <nav className="container mx-auto px-4 h-20 flex items-center justify-between relative">
                    <button 
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
                        className="text-3xl font-handwriting font-bold text-gray-800 rotate-[-2deg] hover:rotate-0 transition-transform cursor-pointer"
                    >
                        Siap<span className="text-blue-600 underline decoration-wavy decoration-2">Tempur</span>.
                    </button>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 gap-6 font-handwriting text-xl text-gray-700">
                        <button onClick={() => scrollToSection("programs")} className="hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">Program</button>
                        <button onClick={() => scrollToSection("mission")} className="hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">Visi & Misi</button>
                        <button onClick={() => scrollToSection("faq")} className="hover:text-black hover:underline decoration-wavy decoration-2 cursor-pointer">FAQ</button>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link 
                            href="mailto:halo@siaptempur.id"
                            className="hidden md:flex items-center gap-2 px-5 py-2 font-handwriting text-xl font-bold bg-white text-gray-900 border-2 border-gray-900 rounded-md shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                        >
                            <Mail size={20} />
                            Hubungi Kami
                        </Link>
                         {/* Mobile Hamburger */}
                         <button
                            className="md:hidden p-2 text-gray-800 hover:bg-gray-200 rounded-md transition"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X size={32} /> : <Menu size={32} />}
                        </button>
                    </div>

                    {/* Mobile Menu */}
                    {isMenuOpen && (
                        <div className="absolute top-20 left-0 w-full bg-[#fdfbf7] border-b-4 border-gray-800/10 shadow-lg p-6 flex flex-col gap-4 md:hidden z-40">
                            <button onClick={() => scrollToSection("programs")} className="font-handwriting text-2xl text-left py-2 border-b">Program</button>
                            <button onClick={() => scrollToSection("mission")} className="font-handwriting text-2xl text-left py-2 border-b">Visi & Misi</button>
                            <button onClick={() => scrollToSection("faq")} className="font-handwriting text-2xl text-left py-2 border-b">FAQ</button>
                        </div>
                    )}
                </nav>
            </header>

            {/* SECTIONS */}
            <UniversalHero />
            <UniversalPrograms />
            <UniversalMission />
            <UniversalWhyUs />
            <UniversalHowItWorks />
            <UniversalFAQ />
            <UniversalFooter />

        </main>
    );
}
