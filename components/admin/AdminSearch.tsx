'use client'

import { Search } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'

export default function AdminSearch() {
    const searchParams = useSearchParams()
    const { replace } = useRouter()

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams)
        if (term) {
            params.set('q', term)
        } else {
            params.delete('q')
        }
        replace(`/cpns/dashboard/admin?${params.toString()}`)
    }, 300)

    const handleCategory = (cat: string) => {
        const params = new URLSearchParams(searchParams)
        if (cat) {
            params.set('category', cat)
        } else {
            params.delete('category')
        }
        // Reset sub_category when category changes
        params.delete('sub_category')
        replace(`/cpns/dashboard/admin?${params.toString()}`)
    }

    const handleSubCategory = (subCat: string) => {
        const params = new URLSearchParams(searchParams)
        if (subCat) {
            params.set('sub_category', subCat)
        } else {
            params.delete('sub_category')
        }
        replace(`/cpns/dashboard/admin?${params.toString()}`)
    }

    const currentCategory = searchParams.get('category') || 'TWK'

    const VALID_SUB_CATEGORIES: Record<string, string[]> = {
        TWK: ['Nasionalisme', 'Integritas', 'Bela Negara', 'Pilar Negara', 'Bahasa Negara'],
        TIU: ['Analogi', 'Silogisme', 'Analitis', 'Berhitung', 'Deret Angka', 'Perbandingan Kuantitatif', 'Soal Cerita', 'Analogi Figural', 'Ketidaksamaan', 'Serial'],
        TKP: ['Pelayanan Publik', 'Jejaring Kerja', 'Sosial Budaya', 'Teknologi Informasi dan Komunikasi', 'Profesionalisme', 'Anti-Radikalisme'],
    }

    return (
        <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input
                    type="text"
                    placeholder="Cari pertanyaan atau ID..."
                    onChange={(e) => handleSearch(e.target.value)}
                    defaultValue={searchParams.get('q')?.toString()}
                    className="w-full pl-12 pr-4 py-3.5 sm:py-3 border-2 border-gray-100 rounded-2xl sm:rounded-xl focus:border-blue-500 focus:bg-white bg-gray-50/50 focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-gray-700 transition-all placeholder:font-medium"
                />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
                <select
                    onChange={(e) => handleCategory(e.target.value)}
                    value={currentCategory}
                    className="flex-1 sm:flex-none border-2 border-gray-100 rounded-2xl sm:rounded-xl px-5 py-3.5 sm:py-3 bg-white font-black text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer shadow-sm sm:shadow-none"
                >
                    <option value="TWK">TWK</option>
                    <option value="TIU">TIU</option>
                    <option value="TKP">TKP</option>
                </select>

                <select
                    onChange={(e) => handleSubCategory(e.target.value)}
                    value={searchParams.get('sub_category') || ''}
                    className="flex-[2] sm:flex-none max-w-[200px] border-2 border-gray-100 rounded-2xl sm:rounded-xl px-3 py-3.5 sm:py-3 bg-white font-bold text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer shadow-sm sm:shadow-none text-sm truncate"
                >
                    <option value="">Semua Materi</option>
                    {VALID_SUB_CATEGORIES[currentCategory]?.map(subCat => (
                        <option key={subCat} value={subCat}>{subCat}</option>
                    ))}
                </select>
            </div>
        </div>
    )
}
