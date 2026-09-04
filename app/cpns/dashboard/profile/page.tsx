import { createAdminClient, createClient } from '@/lib/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import ProfileClient from '@/components/profile/ProfileClient'
import { getLevel } from '@/lib/dashboard'

type JsonObject = Record<string, unknown>

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
    if (Array.isArray(value)) return value[0] ?? null
    return value ?? null
}

function readObject(value: unknown): JsonObject | null {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : null
}

function readString(value: unknown) {
    return typeof value === 'string' ? value : null
}

function paymentStatus(orderStatus: unknown, providerStatus: unknown) {
    if (typeof providerStatus === 'string' && providerStatus) return providerStatus
    switch (String(orderStatus || '').toLowerCase()) {
        case 'paid': return 'settlement'
        case 'expired': return 'expire'
        case 'cancelled': return 'cancel'
        case 'failed': return 'deny'
        default: return 'pending'
    }
}

function legacyGenderLabel(value: unknown) {
    if (value === 'male') return 'Laki-laki'
    if (value === 'female') return 'Perempuan'
    if (value === 'other') return ''
    return typeof value === 'string' ? value : ''
}

export default async function ProfilePage() {
    // This page still has nested commerce relations missing from the generated
    // type snapshot. The authenticated client keeps all reads protected by RLS.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [profileResult, completedScoresResult, recentAttemptsResult, ordersResult, walletResult] = await Promise.all([
        supabase
            .from('profiles')
            .select('id, full_name, avatar_url, phone, birth_date, gender, bio, education_level, target_instance')
            .eq('id', user.id)
            .maybeSingle(),
        supabase
            .from('exam_attempts')
            .select('total_score')
            .eq('user_id', user.id)
            .eq('status', 'completed'),
        supabase
            .from('exam_attempts')
            .select('id, started_at, metadata, status')
            .eq('user_id', user.id)
            .order('started_at', { ascending: false })
            .limit(100),
        supabase
            .from('orders')
            .select(`
                id,
                order_number,
                status,
                total_amount,
                created_at,
                payments(status, raw_response),
                order_items(product_id, products(name, product_type))
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(100),
        supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', user.id)
            .eq('wallet_type', 'exam_token')
            .maybeSingle(),
    ])

    if (profileResult.error) throw profileResult.error
    if (completedScoresResult.error) throw completedScoresResult.error
    if (recentAttemptsResult.error) throw recentAttemptsResult.error
    if (ordersResult.error) throw ordersResult.error
    if (walletResult.error) throw walletResult.error

    let profile = profileResult.data
    if (!profile) {
        const admin = await createAdminClient()
        const fallbackName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Pejuang'
        const { data: inserted, error } = await admin
            .from('profiles')
            .insert({
                id: user.id,
                full_name: fallbackName,
                display_name: fallbackName,
                status: 'active',
                onboarding_completed: false,
            })
            .select('id, full_name, avatar_url, phone, birth_date, gender, bio, education_level, target_instance')
            .single()
        if (error) throw error
        profile = inserted
    }

    const totalXP = (completedScoresResult.data || []).reduce(
        (sum, attempt) => sum + Number(attempt.total_score || 0),
        0
    )
    const levelInfo = getLevel(totalXP)

    const transactions = (ordersResult.data || []).flatMap((order) => {
        const item = firstRelation(order.order_items)
        const product = firstRelation(item?.products)
        if (!product || String(product.product_type).toUpperCase() !== 'TOKEN_PACK') return []

        const payment = firstRelation(order.payments)
        const raw = readObject(payment?.raw_response)
        const snapToken = readString(raw?.snapToken)

        return [{
            id: String(order.id),
            created_at: String(order.created_at),
            amount: Number(order.total_amount || 0),
            status: paymentStatus(order.status, payment?.status) as 'pending' | 'capture' | 'settlement' | 'expire' | 'cancel' | 'deny',
            package_name: String(product.name || 'Paket Token'),
            order_id: String(order.id),
            snap_token: snapToken || undefined,
        }]
    })

    const usageSessions = (recentAttemptsResult.data || []).flatMap((attempt) => {
        const metadata = readObject(attempt.metadata)
        const kind = readString(metadata?.practiceKind)
        if (kind !== 'full-tryout' && kind !== 'mini-tryout') return []
        if (!attempt.started_at) return []
        return [{
            id: String(attempt.id),
            start_time: String(attempt.started_at),
            mode: kind === 'full-tryout' ? 'tryout' : 'practice',
        }]
    })

    const compatibleProfile = {
        id: String(profile.id),
        full_name: profile.full_name ? String(profile.full_name) : null,
        avatar_url: profile.avatar_url ? String(profile.avatar_url) : null,
        bio: profile.bio ? String(profile.bio) : null,
        phone_number: profile.phone ? String(profile.phone) : null,
        birth_date: profile.birth_date ? String(profile.birth_date) : null,
        gender: legacyGenderLabel(profile.gender),
        education_level: profile.education_level ? String(profile.education_level) : null,
        target_instance: profile.target_instance ? String(profile.target_instance) : null,
        tryout_quota: Number(walletResult.data?.balance || 0),
    }

    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center font-handwriting text-2xl">Memuat Profil...</div>}>
            <ProfileClient
                profile={compatibleProfile}
                user={{ id: user.id, email: user.email!, created_at: user.created_at! }}
                transactions={transactions}
                usageSessions={usageSessions}
                level={levelInfo.level}
            />
        </Suspense>
    )
}
