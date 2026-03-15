import Link from "next/link";
import { Flame, Clock, Landmark } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function UniversalPrograms() {
    return (
        <Section id="programs" className="bg-[#f0f4f8] flex flex-col items-center" pattern="dots">
            <div className="text-center mb-16 relative z-10">
                <h2 className="font-handwriting text-5xl font-bold mb-4 text-gray-900">Solusi Ekosistem Belajar</h2>
                <p className="font-handwriting text-2xl text-gray-600 max-w-2xl mx-auto">Satu platform, beragam solusi. Pilih program yang sesuai dengan tujuan karir Anda saat ini.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto w-full px-6 relative z-10">
                
                {/* 1. CPNS / Kedinasan Card (Active) */}
                <Link href="/cpns" className="group block h-full">
                    <Card variant="binder" interactive className="h-full p-8 flex flex-col relative overflow-visible">
                        {/* Pin Effect */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 shadow-sm border border-red-700 z-10"></div>
                        
                        <Badge variant="red" animated className="absolute top-4 right-4 px-3 py-1 flex items-center gap-1 shadow-lg">
                            <Flame className="w-4 h-4 fill-current" /> HOT
                        </Badge>

                        <div className="w-20 h-20 bg-blue-100 border-2 border-blue-600 text-blue-700 rounded-xl flex items-center justify-center mb-6 text-4xl font-bold font-serif shadow-sm">
                            <Landmark className="w-10 h-10" />
                        </div>
                        
                        <h3 className="text-3xl font-handwriting font-bold mb-3 text-gray-900 line-clamp-1 border-b-2 border-blue-200 pb-2">
                            SKD CPNS
                        </h3>
                        <p className="text-lg text-gray-700 font-handwriting mb-6 flex-grow leading-relaxed">
                            Simulasi CAT BKN terlengkap. Ribuan soal TWK, TIU, dan TKP terupdate dengan ranking nasional.
                        </p>
                        
                        <Button className="mt-auto w-full py-3 text-xl">
                            Masuk Portal CPNS →
                        </Button>
                    </Card>
                </Link>

                {/* 2. BUMN Card (Soon) */}
                <Card className="relative bg-white/60 h-full p-8 flex flex-col opacity-80 border-2 border-gray-300 shadow-[2px_2px_0px_0px_rgba(37,99,235,0.1)]">
                    <div className="absolute top-4 right-4 bg-gray-200 text-gray-600 font-handwriting text-sm font-bold px-3 py-1 rotate-3 rounded border border-gray-300 flex items-center gap-1">
                        <Clock className="w-4 h-4" /> Segera Hadir
                    </div>

                    <div className="w-20 h-20 bg-gray-100 border-2 border-gray-300 text-gray-400 rounded-xl flex items-center justify-center mb-6 text-4xl font-bold font-serif blur-[1px]">
                        B
                    </div>
                    
                    <h3 className="text-2xl font-handwriting font-bold mb-3 text-gray-500 line-clamp-1 border-b-2 border-gray-200 pb-2">
                        TKD BUMN
                    </h3>
                    <p className="text-lg text-gray-500 font-handwriting mb-6 flex-grow leading-relaxed">
                        Persiapan Rekrutmen Bersama BUMN dengan fokus Tes Kemampuan Dasar dan Core Values AKHLAK.
                    </p>
                    
                    <div className="mt-auto w-full py-3 text-center bg-gray-200 text-gray-500 font-handwriting text-xl font-bold rounded-lg border border-dashed border-gray-400 cursor-not-allowed">
                        Coming Soon
                    </div>
                </Card>

                {/* 3. TOEFL Card (Soon) */}
                <Card className="relative bg-white/60 h-full p-8 flex flex-col opacity-80 border-2 border-gray-300 shadow-[2px_2px_0px_0px_rgba(37,99,235,0.1)]">
                    <div className="absolute top-4 right-4 bg-gray-200 text-gray-600 font-handwriting text-sm font-bold px-3 py-1 rotate-2 rounded border border-gray-300 flex items-center gap-1">
                        <Clock className="w-4 h-4" /> Segera Hadir
                    </div>

                    <div className="w-20 h-20 bg-gray-100 border-2 border-gray-300 text-gray-400 rounded-xl flex items-center justify-center mb-6 text-4xl font-bold font-serif blur-[1px]">
                        T
                    </div>
                    
                    <h3 className="text-2xl font-handwriting font-bold mb-3 text-gray-500 line-clamp-1 border-b-2 border-gray-200 pb-2">
                        TOEFL ITP
                    </h3>
                    <p className="text-lg text-gray-500 font-handwriting mb-6 flex-grow leading-relaxed">
                        Tingkatkan skor TOEFL kamu untuk mendaftar beasiswa atau syarat sidang skripsi.
                    </p>
                    
                    <div className="mt-auto w-full py-3 text-center bg-gray-200 text-gray-500 font-handwriting text-xl font-bold rounded-lg border border-dashed border-gray-400 cursor-not-allowed">
                        Coming Soon
                    </div>
                </Card>

                {/* 4. UTBK / SNBT Card (Soon) */}
                <Card className="relative bg-white/60 h-full p-8 flex flex-col opacity-80 border-2 border-gray-300 shadow-[2px_2px_0px_0px_rgba(37,99,235,0.1)]">
                    {/* Tape Effect */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-6 bg-white/40 rotate-1 shadow-sm border-x border-gray-200"></div>

                    <div className="absolute top-4 right-4 bg-gray-200 text-gray-600 font-handwriting text-sm font-bold px-3 py-1 rotate-3 rounded border border-gray-300 flex items-center gap-1">
                        <Clock className="w-4 h-4" /> Segera Hadir
                    </div>

                    <div className="w-20 h-20 bg-gray-100 border-2 border-gray-300 text-gray-400 rounded-xl flex items-center justify-center mb-6 text-2xl font-bold font-serif blur-[1px]">
                        UTBK
                    </div>
                    
                    <h3 className="text-2xl font-handwriting font-bold mb-3 text-gray-500 line-clamp-1 border-b-2 border-gray-200 pb-2">
                        UTBK / SNBT
                    </h3>
                    <p className="text-lg text-gray-500 font-handwriting mb-6 flex-grow leading-relaxed">
                        Persiapan masuk kampus impian dengan bank soal SNBT terupdate dan sistem penilaian IRT.
                    </p>
                    
                    <div className="mt-auto w-full py-3 text-center bg-gray-200 text-gray-500 font-handwriting text-xl font-bold rounded-lg border border-dashed border-gray-400 cursor-not-allowed">
                        Coming Soon
                    </div>
                </Card>

            </div>
        </Section>
    );
}
