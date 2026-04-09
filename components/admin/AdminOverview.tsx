import type { QuestionType } from '@/lib/admin-dashboard'

interface AdminOverviewProps {
    totalQuestions: number
    filteredQuestions: number
    activeCategories: number
    totalCategories: number
    selectedType: QuestionType
}

export default function AdminOverview({
    totalQuestions,
    filteredQuestions,
    activeCategories,
    totalCategories,
    selectedType,
}: AdminOverviewProps) {
    const cards = [
        {
            label: 'Total Bank Soal',
            value: totalQuestions,
            description: 'Semua soal yang tersimpan',
        },
        {
            label: 'Hasil Ditampilkan',
            value: filteredQuestions,
            description: 'Sesuai filter aktif, maksimal 100 item terbaru',
        },
        {
            label: `Topik Aktif ${selectedType}`,
            value: activeCategories,
            description: `${totalCategories} topik tersedia untuk tipe ini`,
        },
    ]

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {cards.map((card) => (
                <div
                    key={card.label}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                    <p className="text-sm font-medium text-slate-500">{card.label}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
                    <p className="mt-2 text-sm text-slate-600">{card.description}</p>
                </div>
            ))}
        </div>
    )
}
