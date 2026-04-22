'use client'

import { Search } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'
import { ADMIN_BASE_PATH, ADMIN_PAGE_SIZES, type CategoryMap } from '@/lib/admin-dashboard'

export default function AdminSearch({ categoryMap }: { categoryMap: CategoryMap }) {
    const searchParams = useSearchParams()
    const { replace } = useRouter()

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams)
        if (term) {
            params.set('q', term)
        } else {
            params.delete('q')
        }
        params.set('page', '1')
        replace(`${ADMIN_BASE_PATH}?${params.toString()}`)
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
        params.set('page', '1')
        replace(`${ADMIN_BASE_PATH}?${params.toString()}`)
    }

    const handleSubCategory = (subCat: string) => {
        const params = new URLSearchParams(searchParams)
        if (subCat) {
            params.set('sub_category', subCat)
        } else {
            params.delete('sub_category')
        }
        params.set('page', '1')
        replace(`${ADMIN_BASE_PATH}?${params.toString()}`)
    }

    const handlePageSize = (pageSize: string) => {
        const params = new URLSearchParams(searchParams)
        params.set('page_size', pageSize)
        params.set('page', '1')
        replace(`${ADMIN_BASE_PATH}?${params.toString()}`)
    }

    const currentCategory = searchParams.get('category') || 'TWK'
    const currentSubCategories = categoryMap[currentCategory as keyof CategoryMap] || []
    const currentPageSize = searchParams.get('page_size') || '10'

    return (
        <div className="border-2 border-gray-900 bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Cari isi soal atau kode soal..."
                        onChange={(e) => handleSearch(e.target.value)}
                        defaultValue={searchParams.get('q')?.toString()}
                        className="w-full rounded-md border-2 border-gray-300 bg-gray-50 py-3 pl-11 pr-4 font-bold text-gray-800 outline-none transition focus:border-gray-900 focus:bg-white"
                    />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_minmax(0,220px)_100px] sm:items-center">
                    <select
                        onChange={(e) => handleCategory(e.target.value)}
                        value={currentCategory}
                        className="rounded-md border-2 border-gray-300 bg-white px-4 py-3 font-bold text-gray-800 outline-none transition focus:border-gray-900"
                    >
                        <option value="TWK">TWK</option>
                        <option value="TIU">TIU</option>
                        <option value="TKP">TKP</option>
                    </select>

                    <select
                        onChange={(e) => handleSubCategory(e.target.value)}
                        value={searchParams.get('sub_category') || ''}
                        className="rounded-md border-2 border-gray-300 bg-white px-4 py-3 font-bold text-gray-800 outline-none transition focus:border-gray-900"
                    >
                        <option value="">Semua materi</option>
                        {currentSubCategories.map((subCategory) => (
                            <option key={subCategory} value={subCategory}>
                                {subCategory}
                            </option>
                        ))}
                    </select>

                    <select
                        onChange={(e) => handlePageSize(e.target.value)}
                        value={currentPageSize}
                        className="rounded-md border-2 border-gray-300 bg-white px-4 py-3 font-bold text-gray-800 outline-none transition focus:border-gray-900"
                    >
                        {ADMIN_PAGE_SIZES.map((pageSize) => (
                            <option key={pageSize} value={pageSize}>
                                {pageSize}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    )
}
