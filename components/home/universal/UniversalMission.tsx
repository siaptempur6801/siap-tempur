import { Target, Heart, Rocket } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export default function UniversalMission() {
    const points = [
        {
            icon: <Target className="w-8 h-8 text-blue-600" />,
            title: "Simulasi Realistis",
            desc: "Kami tidak sekadar memberi soal. Kami membangun sistem yang sama persis dengan aplikasi CAT resmi pemerintah maupun standar internasional."
        },
        {
            icon: <Heart className="w-8 h-8 text-pink-600" />,
            title: "Biaya Manusiawi",
            desc: "Pendidikan berkualitas tidak harus menguras kantong. Kami memangkas biaya operasional agar Anda bisa berlatih lebih banyak dengan harga lebih murah."
        },
        {
            icon: <Rocket className="w-8 h-8 text-orange-600" />,
            title: "Teknologi Terdepan",
            desc: "Analisis ranking nasional dan pembahasan interaktif membantu Anda memahami kelemahan dalam hitungan detik setelah ujian selesai."
        }
    ];

    return (
        <Section id="mission" className="bg-white">
            <div className="flex flex-col md:flex-row items-center gap-16">
                {/* Vision Text */}
                <div className="md:w-1/2 space-y-8">
                    <Badge variant="blue">
                        Filosofi Kami
                    </Badge>
                    <h2 className="font-handwriting text-5xl font-bold text-gray-900 leading-tight">
                        Karena setiap orang berhak atas <span className="text-blue-600 underline decoration-wavy">kesempatan kedua</span> yang dipersiapkan dengan baik.
                    </h2>
                    <p className="font-handwriting text-2xl text-gray-600 leading-relaxed">
                        Siap Tempur lahir dari kegelisahan akan mahalnya bimbel persiapan ujian di Indonesia. Kami hadir sebagai solusi jembatan bagi mereka yang ingin berjuang secara mandiri dan cerdas.
                    </p>
                </div>

                {/* Mission Points (Cards) */}
                <div className="md:w-1/2 grid gap-6">
                    {points.map((point, i) => (
                        <Card key={i} interactive className="bg-[#f0f4f8] p-6 flex gap-6 items-start">
                            <div className="shrink-0 p-3 bg-white border-2 border-gray-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                {point.icon}
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-handwriting text-2xl font-bold text-gray-900">{point.title}</h3>
                                <p className="font-handwriting text-lg text-gray-600 leading-relaxed">{point.desc}</p>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </Section>
    );
}
