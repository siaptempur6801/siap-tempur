export const faqItems = [
    {
        q: "Apa itu token SiapTempur?",
        a: "Token SiapTempur adalah tiket akses atau mata uang yang digunakan untuk mengikuti tryout di platform ini. Token yang sudah dibeli tidak memiliki masa kedaluwarsa, jadi bisa dipakai kapanpun kamu siap tempur."
    },
    {
        q: "1 token bisa digunakan untuk apa?",
        a: "1 token = 1 kali akses tryout, baik untuk Mini Tryout maupun Full Tryout SKD (110 soal). Jika kamu membeli paket 5 Token, berarti kamu bisa mengikuti tryout sebanyak 5 kali."
    },
    {
        q: "Apa bedanya Mini Tryout dan Full Tryout?",
        a: "Mini Tryout adalah latihan cepat yang fokus pada satu bagian saja, misalnya TWK, TIU, atau TKP. Sedangkan Full Tryout adalah simulasi lengkap ujian SKD selama 100 menit yang menggabungkan ketiga materi tersebut dengan bobot nilai standar BKN."
    },
    {
        q: "Apakah ada pembahasan setelah tryout?",
        a: "Tentu saja! Setelah kamu menyelesaikan tryout, kamu akan langsung mendapatkan kunci jawaban lengkap dengan pembahasannya. Selain itu, ada juga fitur analisis skor untuk melihat sejauh mana progres belajarmu."
    },
    {
        q: "Apakah bisa dikerjakan lewat HP?",
        a: "Bisa banget! Sistem kami dirancang responsif dan mobile-friendly. Kamu tetap bisa mengerjakan soal tryout dengan nyaman lewat HP kapanpun dan di manapun."
    },
    {
        q: "Apa bedanya event aktif dengan tryout reguler?",
        a: "Event aktif biasanya adalah tryout akbar serentak nasional dengan batas waktu tertentu, yang diikuti ribuan peserta sekaligus untuk simulasi perankingan nasional secara masif. Sementara tryout reguler bisa kamu kerjakan kapan saja secara individu."
    },
    {
        q: "Bagaimana jika token belum masuk setelah pembayaran?",
        a: "Biasanya token akan masuk secara instan setelah pembayaran berhasil. Namun, jika dalam 5 menit token belum bertambah, silakan hubungi tim support kami melalui email atau chat bantuan yang tersedia, kami akan segera membantumu."
    }
];

export const cpnsSchema = [
    {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Siap Tempur",
        "url": "https://siaptempur.id",
        "logo": "https://siaptempur.id/favicon.ico",
        "sameAs": [
            "https://www.youtube.com/@siaptempurID"
        ]
    },
    {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "url": "https://siaptempur.id/",
        "name": "Siap Tempur"
    },
    {
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
            "price": "10000.00",
            "priceCurrency": "IDR",
            "availability": "https://schema.org/InStock",
            "name": "Token Tryout CPNS"
        }
    },
    {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqItems.map(item => ({
            "@type": "Question",
            "name": item.q,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": item.a
            }
        }))
    },
    {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Beranda",
                "item": "https://siaptempur.id"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Tryout CPNS",
                "item": "https://siaptempur.id/cpns"
            }
        ]
    }
];

export const testimonials = [
    {
        name: "Rizky",
        region: "Bekasi",
        event: "Tryout Akbar SKD Batch 1",
        avatar: "👨‍💼",
        bgClass: "bg-blue-100",
        text: "\"Membantu banget pas manajemen waktu. Pas hari H beneran gak kaget lagi sama timer yang jalan terus. Skor TIU-ku naik drastis!\"",
        scoreBefore: 310,
        scoreAfter: 425,
        rotateClass: "rotate-0"
    },
    {
        name: "Dina",
        region: "Surabaya",
        event: "Mini Tryout Challenge",
        avatar: "👩‍🏫",
        bgClass: "bg-pink-100",
        text: "\"Pembahasannya gampang dimengerti, gak bertele-tele. Latihan TWK harian di sini bikin hafal pasal-pasal tanpa sadar.\"",
        scoreBefore: 350,
        scoreAfter: 440,
        rotateClass: "rotate-1"
    },
    {
        name: "Fajar",
        region: "Medan",
        event: "Simulasi Full Tryout Nasional",
        avatar: "🧑‍💻",
        bgClass: "bg-green-100",
        text: "\"Sistem CAT-nya mirip banget sama aslinya. Pas tes beneran kerasa kayak lagi ngerjain tryout di Siap Tempur aja. Akhirnya lolos!\"",
        scoreBefore: 380,
        scoreAfter: 465,
        rotateClass: "rotate-[-1deg]"
    }
];

export const trustBadges = [
    { label: "Sertifikat Event", icon: "Award" },
    { label: "Pembahasan Lengkap", icon: "BookOpen" },
    { label: "Ranking Nasional", icon: "Trophy" },
    { label: "Token Tidak Hangus", icon: "ShieldCheck" },
    { label: "Sistem CAT", icon: "Monitor" },
    { label: "TWK TIU TKP", icon: "Layers" }
];

export const eventHistory = [
    {
        name: "Tryout Akbar SKD CPNS Batch 1",
        date: "Minggu, 12 Mei 2026",
        participants: "12.450",
        benefit: "Ranking Nasional & Pembahasan Live",
        status: "Selesai",
        flyerImageUrl: "/images/flyer-batch-1.jpeg",
        youtubeUrl: "https://youtu.be/7adUHwlFzks"
    },
    {
        name: "Mini Tryout Challenge TWK",
        date: "Rabu, 22 Mei 2026",
        participants: "8.200",
        benefit: "E-Certificate & PDF Materi",
        status: "Selesai",
        flyerImageUrl: null,
        youtubeUrl: null
    },
    {
        name: "Simulasi Full Tryout Nasional",
        date: "Minggu, 2 Juni 2026",
        participants: "15.100",
        benefit: "Tryout CAT & Analisis Butir Soal",
        status: "Selesai",
        flyerImageUrl: null,
        youtubeUrl: null
    }
];

export const leaderboardWinners = [
    { name: "Budi Santoso", region: "Jakarta", score: 485, rank: 1 },
    { name: "Siti Aminah", region: "Bandung", score: 478, rank: 2 },
    { name: "Andi Saputra", region: "Yogyakarta", score: 472, rank: 3 },
    { name: "Rina Wati", region: "Surabaya", score: 468, rank: 4 },
    { name: "Ahmad Fauzi", region: "Medan", score: 465, rank: 5 }
];
