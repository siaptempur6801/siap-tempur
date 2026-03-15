"use client";
import { useState } from "react";
import { ChevronDown, MessageCircleQuestion } from "lucide-react";

export default function UniversalFAQ() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const faqItems = [
        {
            q: "Apa itu Token dan bagaimana cara kerjanya?",
            a: "Token adalah mata uang dalam SiapTempur. 1 Token = 1x akses ke satu modul tryout secara penuh (misal: 1 paket lengkap SKD CPNS). Beli → pilih tryout → langsung kerjakan."
        },
        {
            q: "Apakah Token saya bisa hangus / kedaluwarsa?",
            a: "Sama sekali tidak! Semua token yang sudah kamu beli akan aktif SEUMUR HIDUP selama platform SiapTempur berjalan. Beli hari ini, pakai tahun depan juga bisa."
        },
        {
            q: "Saya mau ikut CPNS sekaligus BUMN, apakah akunnya beda?",
            a: "Cukup 1 akun untuk semuanya. Nanti di halaman depan (Home), kamu tinggal pilih portal (CPNS/BUMN/dsb) lalu sistem akan memunculkan menu dashboard yang sesuai."
        },
        {
            q: "Apakah ada aplikasi Android atau iOS?",
            a: "Saat ini SiapTempur berbasis website super-ringan agar bisa diakses dari perangkat apapun tanpa memenuhi memori (storage) HP kamu. Buka dari browser Safari/Chrome langsung jalan!"
        },
        {
            q: "Pembayarannya pakai apa saja?",
            a: "Bisa scan QRIS langsung lunas pakai aplikasi payment apapun (BCA, Mandiri, GoPay, OVO, Dana, ShopeePay). Proses aktivasi seketika otomatis saat itu juga."
        }
    ];

    return (
        <section id="faq" className="py-24 bg-white border-t-4 border-gray-900 border-dashed relative">
            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <span className="inline-block px-4 py-1 mb-4 font-handwriting text-lg font-bold bg-orange-100 text-orange-700 -rotate-1 border-2 border-orange-300 rounded-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]">
                        <MessageCircleQuestion className="w-5 h-5 inline -mt-0.5 mr-1" /> FAQ Cepat
                    </span>
                    <h2 className="font-handwriting text-5xl font-bold mb-4">Masih Punya Pertanyaan?</h2>
                </div>

                <div className="max-w-3xl mx-auto space-y-4">
                    {faqItems.map((item, i) => (
                        <div key={i} className="bg-[#fdfbf7] border-2 border-gray-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-all">
                            <button
                                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                className="w-full flex items-center justify-between p-5 md:p-6 text-left font-handwriting font-bold text-lg md:text-xl text-gray-900 hover:bg-yellow-50/50 transition-colors"
                            >
                                <span className="flex items-center gap-3">
                                    <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 border-2 border-blue-400 rounded-full text-blue-600 font-bold text-sm shrink-0">
                                        Q
                                    </span>
                                    {item.q}
                                </span>
                                <ChevronDown
                                    className={`w-6 h-6 text-gray-500 shrink-0 ml-4 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`}
                                />
                            </button>
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="px-5 md:px-6 pb-5 md:pb-6 pt-0">
                                    <div className="border-t-2 border-dashed border-gray-300 pt-4">
                                        <p className="font-handwriting text-lg text-gray-700 leading-relaxed">
                                            {item.a}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
