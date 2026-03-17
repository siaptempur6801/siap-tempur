import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import DashboardShell from "@/components/dashboard/DashboardShell"
import { signout } from "@/app/auth/actions"
import Script from "next/script"

export const dynamic = 'force-dynamic'

export default async function ToeflDashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

    const isAdmin = profile?.role === 'admin'

    return (
        <>
            <Script
                src="https://app.midtrans.com/snap/snap.js"
                data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
                strategy="afterInteractive"
            />
            <DashboardShell 
                user={user} 
                profile={profile} 
                signoutAction={signout}
                isAdmin={isAdmin}
                portal="toefl"
            >
                {children}
            </DashboardShell>
        </>
    )
}
