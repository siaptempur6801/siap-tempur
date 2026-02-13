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
        replace(`/dashboard/admin?${params.toString()}`)
    }, 300)

    const handleCategory = (cat: string) => {
        const params = new URLSearchParams(searchParams)
        if (cat) {
            params.set('category', cat)
        } else {
            params.delete('category')
        }
        replace(`/dashboard/admin?${params.toString()}`)
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
            <select
                onChange={(e) => handleCategory(e.target.value)}
                value={searchParams.get('category') || 'TWK'}
                className="border-2 border-gray-100 rounded-2xl sm:rounded-xl px-5 py-3.5 sm:py-3 bg-white font-black text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer shadow-sm sm:shadow-none"
            >
                <option value="TWK">TWK</option>
                <option value="TIU">TIU</option>
                <option value="TKP">TKP</option>
            </select>
        </div>
    )
}
