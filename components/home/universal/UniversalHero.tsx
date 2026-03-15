import { ArrowRight, Sparkles } from "lucide-react";
import PaperBackground from "@/components/PaperBackground";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";

export default function UniversalHero() {
    return (
        <Section paper dashedBorder="bottom" pattern="grid" className="pt-32 pb-32">
            <div className="max-w-4xl mx-auto text-center">
                {/* Highlight Badge */}
                <div className="flex justify-center mb-6">
                    <Badge variant="white" className="shadow-[3px_3px_0px_0px_rgba(37,99,235,1)]">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                        Pendamping Belajar No. 1 di Indonesia
                    </Badge>
                </div>

                {/* Main Headline */}
                <h1 className="font-handwriting text-5xl md:text-7xl font-bold mb-8 leading-tight text-gray-900">
                    Kami Membangun <br />
                    <span className="text-blue-600 relative inline-block">
                        Standar Baru
                        {/* Wavy underline */}
                        <svg className="absolute w-full h-3 -bottom-1 left-0 text-yellow-400" viewBox="0 0 100 10" preserveAspectRatio="none">
                            <path d="M0 5 Q 25 10 50 5 T 100 5" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" />
                        </svg>
                    </span><br />
                    Pendidikan Digital.
                </h1>

                {/* Corporate Mission Intro */}
                <Card variant="sketch" className="p-8 mb-12 bg-white/50">
                    <p className="text-2xl md:text-3xl font-handwriting text-gray-800 leading-relaxed font-bold italic">
                        "Misi kami sederhana: Memberikan akses latihan ujian kelas dunia dengan biaya yang masuk akal bagi setiap anak bangsa."
                    </p>
                </Card>

                {/* Secondary Intro */}
                <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto mb-12 font-handwriting leading-relaxed">
                    Siap Tempur menyederhanakan persiapan ujian yang rumit menjadi simulasi yang nyata dan sistematis.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                    <Button
                        size="xl"
                        onClick={() => {
                            const progSection = document.getElementById('programs');
                            if (progSection) progSection.scrollIntoView({ behavior: 'smooth' });
                        }}
                    >
                        Lihat Program Kami <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
                    </Button>
                </div>
            </div>
        </Section>
    );
}
