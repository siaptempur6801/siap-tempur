import { Target, CheckCircle, Smartphone } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";

export default function UniversalWhyUs() {
    return (
        <Section id="features" dashedBorder="both" pattern="grid" className="bg-white">
            <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="font-handwriting text-5xl font-bold mb-4">Satu Platform, Banyak Benefit</h2>
                <p className="font-handwriting text-2xl text-gray-600">Apapun ujian yang kamu pilih, fasilitas premium ini bakal selalu nemenin kamu.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {/* Card 1 */}
                <Card interactive className="p-8 rotate-[-1deg] hover:rotate-0">
                    <div className="mb-6 group-hover:scale-110 transition-transform duration-300">
                        <Target className="w-14 h-14 text-orange-600 -rotate-6" strokeWidth={2.5} />
                    </div>
                    <h3 className="font-handwriting text-3xl font-bold mb-3 border-b-2 border-orange-200 pb-2">Akurat Sesuai Aslinya</h3>
                    <p className="text-gray-700 text-lg">Dari jumlah soal, alokasi waktu, sampai sistem penilaian passing grade dibuat <span className="underline decoration-wavy decoration-orange-400 font-bold">persis seperti</span> ujian resminya.</p>
                </Card>

                {/* Card 2 */}
                <Card interactive className="p-8 rotate-[1deg] hover:rotate-0">
                    <div className="mb-6 group-hover:scale-110 transition-transform duration-300">
                        <CheckCircle className="w-14 h-14 text-green-600 rotate-6" strokeWidth={2.5} />
                    </div>
                    <h3 className="font-handwriting text-3xl font-bold mb-3 border-b-2 border-green-200 pb-2">Pembahasan & Ranking</h3>
                    <p className="text-gray-700 text-lg">Setelah selesai nge-test, kamu gak bakal ditinggal bingung. Kami kasih penjelasan per soal dan posisimu (ranking) se-Indonesia.</p>
                </Card>

                {/* Card 3 */}
                <Card interactive className="p-8 rotate-[-0.5deg] hover:rotate-0">
                    <div className="mb-6 group-hover:scale-110 transition-transform duration-300">
                        <Smartphone className="w-14 h-14 text-blue-600 -rotate-3" strokeWidth={2.5} />
                    </div>
                    <h3 className="font-handwriting text-3xl font-bold mb-3 border-b-2 border-blue-200 pb-2">Akses Kapan Pun</h3>
                    <p className="text-gray-700 text-lg">Beli sekarang, pakainya bisa kapan aja. Sistem kami berbasis token yang <span className="bg-yellow-200 px-1 font-bold">tidak akan pernah kedaluwarsa</span>.</p>
                </Card>
            </div>
        </Section>
    );
}
