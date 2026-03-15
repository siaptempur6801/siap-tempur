import Link from "next/link";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function UniversalFooter() {
    return (
        <footer className="bg-gray-900 text-white py-12 border-t-8 border-gray-800 border-dashed relative overflow-hidden">
            <div className="container mx-auto px-4 text-center relative z-10">
                <h2 className="font-handwriting text-4xl font-bold mb-6">Masa Depanmu Dimulai dari Sini</h2>
                <p className="text-gray-300 mb-8 max-w-lg mx-auto">Pilih medan tempurmu sekarang, sebelum kompetitor mengambil alih kursimu. Jangan ditunda sampai besok.</p>

                <Button
                    variant="white"
                    size="lg"
                    onClick={() => {
                        const progSection = document.getElementById('programs');
                        if (progSection) progSection.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="mx-auto"
                >
                    Pilih Program Ujian <Rocket className="w-6 h-6" />
                </Button>

                <div className="mt-16 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-gray-400 font-handwriting text-lg">
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
    );
}
