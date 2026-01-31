import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function PracticeSessionLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className="h-screen overflow-hidden bg-background">
            {/* Full-screen layout without sidebar for practice sessions */}
            <main className="h-full overflow-y-auto">
                <div className="p-4 md:p-6 max-w-5xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}
