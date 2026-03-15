import { ArrowRight, UserPlus, CreditCard, Laptop, Trophy } from "lucide-react";
import { Section } from "@/components/ui/Section";

export default function UniversalHowItWorks() {
    const steps = [
        {
            icon: <UserPlus className="w-8 h-8 text-blue-600" />,
            title: "1. Daftar / Masuk",
            desc: "Bikin akun gratis cuma pakai email. Gak ada biaya bulanan yang sembunyi-sembunyi."
        },
        {
            icon: <CreditCard className="w-8 h-8 text-green-600" />,
            title: "2. Pilih & Beli Token",
            desc: "Beli token eceran atau paketan. Bayar pakai QRIS (GoPay/Shopee/dll) langsung aktif detik itu juga."
        },
        {
            icon: <Laptop className="w-8 h-8 text-orange-600" />,
            title: "3. Ujian Real-Time",
            desc: "Pilih tipe tes (SKD CPNS / BUMN dll). Rasakan sensasi ujian sesungguhnya dengan timer & interface asli."
        },
        {
            icon: <Trophy className="w-8 h-8 text-yellow-500" />,
            title: "4. Evaluasi Hasil",
            desc: "Lihat letak kesalahanmu di pembahasan komprehensif. Pantau posisimu di ranking nasional."
        }
    ];

    return (
        <Section className="bg-[#fdfbf7]">
            <div className="text-center mb-16 relative z-10">
                <h2 className="font-handwriting text-5xl font-bold mb-4">Gimana Cara Mulainya?</h2>
                <p className="font-handwriting text-2xl text-gray-600">Simpel, gak ribet, gak dipaksa langganan. Latihan mandiri yang paling *fair*.</p>
            </div>

            <div className="max-w-5xl mx-auto">
                <div className="grid md:grid-cols-4 gap-6 relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-[44px] left-[10%] right-[10%] h-1 bg-gray-300 border-b-2 border-dashed border-gray-400 z-0"></div>

                    {steps.map((step, idx) => (
                        <div key={idx} className="relative z-10 flex flex-col items-center text-center group">
                            <div className="w-24 h-24 rounded-full bg-white border-4 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-6 transition-transform">
                                {step.icon}
                            </div>
                            <h3 className="font-handwriting text-2xl font-bold mb-2">{step.title}</h3>
                            <p className="text-gray-600 font-handwriting text-lg">{step.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </Section>
    );
}
