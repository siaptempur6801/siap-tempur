export const faqItems = [
    {
        q: "Apa itu Token dan bagaimana cara kerjanya?",
        a: "Token = 1x akses tryout SKD lengkap (110 soal TWK+TIU+TKP). Beli → pilih tryout → langsung kerjain. Simpel. Dan yang paling penting: token kamu gak pernah expired, jadi bisa dipakai kapanpun kamu siap."
    },
    {
        q: "Seberapa akurat soal dan sistem penilaiannya?",
        a: "Soal disusun berdasarkan kisi-kisi resmi SKD BKN dengan bobot penilaian yang sama persis (TWK 5-5-5, TIU 5-5-5, TKP 1-2-3-4-5). Passing grade juga sesuai standar BKN, jadi kamu bisa benar-benar ukur kesiapanmu."
    },
    {
        q: "Bisa diakses dari HP?",
        a: "Bisa! Kamu bisa tryout dari HP, tablet, atau laptop. Tapi kalau mau simulasi yang paling mendekati situasi tryout nyata, kami sarankan pakai laptop/PC karena hari H juga pakai komputer."
    },
    {
        q: "Bagaimana cara pembayaran?",
        a: "Cukup scan QRIS — bisa pakai GoPay, OVO, Dana, ShopeePay, atau m-banking apapun. Bayar selesai, token langsung aktif dalam hitungan detik. Tanpa ribet!"
    },
    {
        q: "Apakah ada pembahasan setiap soal?",
        a: "Ada! Setelah tryout selesai, kamu langsung dapat: pembahasan lengkap setiap soal, analisis skor per subtes (TWK/TIU/TKP), plus ranking kamu dibanding peserta lain se-Indonesia."
    },
    {
        q: "Kenapa harus beli paket, bukan satuan?",
        a: "Riset menunjukkan butuh minimal 3-5x tryout untuk benar-benar siap SKD. Paket 5x token cuma Rp 8k/tryout (hemat Rp 10.000 dari harga satuan). Investasi kecil untuk masa depan ASN-mu!"
    }
];

export const cpnsSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": "Tryout SKD CPNS 2026 Siap Tempur",
    "description": "Simulasi tryout SKD CPNS dengan sistem CAT BKN asli. Materi TWK, TIU, TKP, dan ranking nasional.",
    "provider": {
        "@type": "Organization",
        "name": "Siap Tempur",
        "sameAs": "https://siaptempur.id"
    },
    "offers": {
        "@type": "Offer",
        "category": "Education",
        "price": "8000.00",
        "priceCurrency": "IDR",
        "availability": "https://schema.org/InStock"
    }
};

export const testimonials = [
    {
        name: "Rizky - Bekasi",
        avatar: "👨‍💼",
        bgClass: "bg-blue-100",
        text: "\"Membantu banget pas manajemen waktu. Pas hari H beneran gak kaget lagi sama timer yang jalan terus. Skor TIU-ku naik drastis!\"",
        rotateClass: "rotate-0"
    },
    {
        name: "Dina - Surabaya",
        avatar: "👩‍🏫",
        bgClass: "bg-pink-100",
        text: "\"Pembahasannya gampang dimengerti, gak bertele-tele. Fitur ranking nasionalnya bikin makin semangat buat ngejar skor tertinggi.\"",
        rotateClass: "rotate-1"
    },
    {
        name: "Fajar - Medan",
        avatar: "🧑‍💻",
        bgClass: "bg-green-100",
        text: "\"Sistem CAT-nya mirip banget sama aslinya. Pas tes beneran kerasa kayak lagi ngerjain tryout di Siap Tempur aja. Akhirnya lolos tahun ini!\"",
        rotateClass: "rotate-[-1deg]"
    }
];
