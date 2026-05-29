import { Loader2 } from 'lucide-react'

export default function ResultLoading() {
    return (
        <div className="w-full flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
                <h3 className="text-xl font-bold font-handwriting text-gray-900">Memuat Hasil...</h3>
                <p className="text-gray-600 font-handwriting">Sedang menghitung skor Anda</p>
            </div>
        </div>
    )
}
