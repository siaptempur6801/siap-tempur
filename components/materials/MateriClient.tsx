'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lock, PlayCircle, BookOpen, Filter } from 'lucide-react'

type Material = {
    id: string
    title: string
    slug: string
    description: string
    category: string
    is_premium: boolean
    video_url: string | null
}

export default function MateriClient({ materials }: { materials: Material[] }) {
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

    const filteredMaterials = selectedCategory === 'ALL'
        ? materials
        : materials.filter(m => m.category === selectedCategory)

    const categories = [
        { id: 'ALL', name: 'Semua Materi', color: 'text-foreground' },
        { id: 'TWK', name: 'TWK', color: 'text-red-500' },
        { id: 'TIU', name: 'TIU', color: 'text-blue-500' },
        { id: 'TKP', name: 'TKP', color: 'text-green-500' }
    ]

    const stats = {
        total: materials.length,
        twk: materials.filter(m => m.category === 'TWK').length,
        tiu: materials.filter(m => m.category === 'TIU').length,
        tkp: materials.filter(m => m.category === 'TKP').length,
        premium: materials.filter(m => m.is_premium).length,
        free: materials.filter(m => !m.is_premium).length
    }

    return (
        <div className="space-y-6 md:space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-1 md:mb-2">Materi Belajar</h2>
                <p className="text-sm md:text-base text-muted-foreground">Pelajari materi SKD terupdate dan trik cepat pengerjaan.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
                <div className="p-3 md:p-4 rounded-lg border border-border bg-secondary/10">
                    <div className="text-xl md:text-2xl font-bold">{stats.total}</div>
                    <div className="text-xs md:text-sm text-muted-foreground">Total</div>
                </div>
                <div className="p-3 md:p-4 rounded-lg border border-red-500/20 bg-red-500/5">
                    <div className="text-xl md:text-2xl font-bold text-red-500">{stats.twk}</div>
                    <div className="text-xs md:text-sm text-muted-foreground">TWK</div>
                </div>
                <div className="p-3 md:p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
                    <div className="text-xl md:text-2xl font-bold text-blue-500">{stats.tiu}</div>
                    <div className="text-xs md:text-sm text-muted-foreground">TIU</div>
                </div>
                <div className="p-3 md:p-4 rounded-lg border border-green-500/20 bg-green-500/5">
                    <div className="text-xl md:text-2xl font-bold text-green-500">{stats.tkp}</div>
                    <div className="text-xs md:text-sm text-muted-foreground">TKP</div>
                </div>
                <div className="p-3 md:p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 col-span-2 sm:col-span-1">
                    <div className="text-xl md:text-2xl font-bold text-yellow-500">{stats.premium}</div>
                    <div className="text-xs md:text-sm text-muted-foreground">Premium</div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2">
                <Filter size={16} className="text-muted-foreground flex-shrink-0 md:w-[18px] md:h-[18px]" />
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${selectedCategory === cat.id
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {cat.name}
                        {cat.id !== 'ALL' && (
                            <span className="ml-1.5 md:ml-2 opacity-70">
                                ({cat.id === 'TWK' ? stats.twk : cat.id === 'TIU' ? stats.tiu : stats.tkp})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Materials Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredMaterials.map((item) => (
                    <Link href={`/dashboard/materi/${item.slug}`} key={item.id} className="group">
                        <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all h-full flex flex-col">
                            {/* Thumbnail */}
                            <div className={`h-32 md:h-40 flex items-center justify-center relative ${item.category === 'TWK' ? 'bg-red-500/10' :
                                item.category === 'TIU' ? 'bg-blue-500/10' :
                                    'bg-green-500/10'
                                }`}>
                                <span className="text-6xl">
                                    {item.category === 'TWK' ? '📖' :
                                        item.category === 'TIU' ? '🧮' : '🧠'}
                                </span>

                                {/* Premium Badge */}
                                {item.is_premium && (
                                    <div className="absolute top-2 md:top-3 right-2 md:right-3 bg-yellow-500/20 text-yellow-500 px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold flex items-center gap-1 md:gap-1.5 border border-yellow-500/50 shadow-lg">
                                        <Lock size={10} className="md:w-3 md:h-3" />
                                        <span className="hidden xs:inline">PREMIUM</span>
                                        <span className="xs:hidden">PRO</span>
                                    </div>
                                )}

                                {/* Free Badge */}
                                {!item.is_premium && (
                                    <div className="absolute top-2 md:top-3 right-2 md:right-3 bg-green-500/20 text-green-500 px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold border border-green-500/50">
                                        FREE
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex items-center gap-2 mb-2 md:mb-3">
                                    <span className={`text-[10px] md:text-xs font-bold px-2 md:px-2.5 py-0.5 md:py-1 rounded-full border ${item.category === 'TWK' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                        item.category === 'TIU' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                            'bg-green-500/10 text-green-500 border-green-500/20'
                                        }`}>
                                        {item.category}
                                    </span>
                                    {item.video_url && (
                                        <div className="flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground">
                                            <PlayCircle size={12} className="md:w-3.5 md:h-3.5" />
                                            <span className="hidden sm:inline">Video</span>
                                        </div>
                                    )}
                                </div>

                                <h3 className="font-bold text-base md:text-lg mb-1.5 md:mb-2 group-hover:text-primary transition-colors line-clamp-2">
                                    {item.title}
                                </h3>

                                <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mb-3 md:mb-4 flex-1">
                                    {item.description}
                                </p>

                                <div className="flex items-center justify-between mt-auto pt-3 md:pt-4 border-t border-border">
                                    <div className="text-xs md:text-sm font-medium text-primary flex items-center gap-1 md:gap-1.5">
                                        <BookOpen size={14} className="md:w-4 md:h-4" />
                                        Pelajari
                                    </div>
                                    <div className="text-lg md:text-xl text-primary group-hover:translate-x-1 transition-transform">
                                        →
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}

                {filteredMaterials.length === 0 && (
                    <div className="col-span-full py-16 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/50 mb-4">
                            <BookOpen size={32} className="text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Belum Ada Materi</h3>
                        <p className="text-muted-foreground">
                            {selectedCategory === 'ALL'
                                ? 'Belum ada materi tersedia.'
                                : `Belum ada materi untuk kategori ${selectedCategory}.`}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
