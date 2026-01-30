import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Lock } from 'lucide-react'

export default async function MaterialDetailPage({ params }: { params: { slug: string } }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: item } = await supabase.from('materials').select('*').eq('slug', params.slug).single()

    if (!item) {
        redirect('/dashboard/materi')
    }

    // Check generic profile for premium status
    const { data: profile } = await supabase.from('profiles').select('subscription_status').eq('id', user?.id).single()
    const isPremium = profile?.subscription_status === 'premium'

    if (item.is_premium && !isPremium) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center text-muted-foreground">
                    <Lock size={40} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold">Materi Premium</h2>
                    <p className="text-muted-foreground max-w-md mx-auto mt-2">
                        Materi <strong>"{item.title}"</strong> hanya tersedia untuk member Premium.
                    </p>
                </div>
                <button className="px-8 py-3 rounded-lg bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition">
                    Upgrade & Buka Akses
                </button>
                <Link href="/dashboard/materi" className="text-sm hover:underline">
                    Kembali ke Daftar Materi
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto">
            <Link href="/dashboard/materi" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali
            </Link>

            <div className="space-y-6">
                <div>
                    <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full mb-3 ${item.category === 'TWK' ? 'bg-red-500/20 text-red-500' :
                            item.category === 'TIU' ? 'bg-blue-500/20 text-blue-500' :
                                'bg-green-500/20 text-green-500'
                        }`}>
                        {item.category}
                    </span>
                    <h1 className="text-4xl font-extrabold tracking-tight">{item.title}</h1>
                </div>

                {item.video_url && (
                    <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-border">
                        <iframe
                            width="100%"
                            height="100%"
                            src={item.video_url}
                            title={item.title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                )}

                <div className="prose dark:prose-invert max-w-none text-lg leading-relaxed">
                    {/* Very basic markdown rendering placeholder. In real app use react-markdown */}
                    {item.content?.split('\n').map((line: string, i: number) => {
                        if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold mt-8 mb-4">{line.replace('## ', '')}</h2>
                        if (line.trim() === '') return <br key={i} />
                        return <p key={i}>{line}</p>
                    })}
                </div>
            </div>
        </div>
    )
}
