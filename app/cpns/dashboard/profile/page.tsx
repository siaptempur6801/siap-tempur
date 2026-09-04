import { createAdminClient, createClient } from '@/lib/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import ProfileClient from '@/components/profile/ProfileClient'
import { getLevel } from '@/lib/dashboard'

type JsonObject = Record<string, unknown>
type QueryParams = Record<string, string | string[] | undefined>

const HISTORY_PAGE_SIZE = 5

function queryValue(params: QueryParams, key: string) {
    const value = params[key]
    return Array.isArray(value) ? value[0] || '' : value || ''
}

function dateValue(params: QueryParams, key: string) {
    const value = queryValue(params, key)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return ''
    const parsed = new Date(`${value}T00:00:00.000Z`)
    return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? '' : value
}

function pageValue(params: QueryParams, key: string) {
    const value = Number.parseInt(queryValue(params, key), 10)
    return Number.isInteger(value) && value > 0 ? value : 1
}

function firstPageIndex(page: number) {
    return (page - 1) * HISTORY_PAGE_SIZE
}

function endOfJakartaDate(value: string) {
    return `${value}T23:59:59.999+07:00`
}

function startOfJakartaDate(value: string) {
    return `${value}T00:00:00.000+07:00`
}

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

function relationObject(value: unknown) {
    return firstRelation(Array.isArray(value) ? value : value ? [value] : []) as JsonObject | null
}

function tokenUsageLabel(metadata: JsonObject | null, sourceType: string) {
    const kind = readString(metadata?.practiceKind)?.replaceAll('-', '_')
    const subject = readString(metadata?.subjectCode)

    if (kind === 'full_tryout') return 'Full Tryout SKD'
    if (kind === 'mini_tryout') return 'Mini Tryout'
    if (kind === 'drill') return subject ? `Drill ${subject}` : 'Drill materi'
    if (kind === 'diagnostic') return 'Tes diagnostik'
    if (sourceType === 'exam_attempt') return 'Sesi ujian'
    return 'Penggunaan token'
}

function readableSourceType(value: string) {
    return value
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
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

export default async function ProfilePage({ searchParams }: { searchParams: Promise<QueryParams> }) {
    // This page still has nested commerce relations missing from the generated
    // type snapshot. The authenticated client keeps all reads protected by RLS.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const params = await searchParams
    const transactionPageNumber = pageValue(params, 'tx_page')
    const usagePageNumber = pageValue(params, 'usage_page')
    const creditPageNumber = pageValue(params, 'credit_page')
    const transactionFrom = dateValue(params, 'tx_from')
    const transactionTo = dateValue(params, 'tx_to')
    const usageFrom = dateValue(params, 'usage_from')
    const usageTo = dateValue(params, 'usage_to')
    const creditFrom = dateValue(params, 'credit_from')
    const creditTo = dateValue(params, 'credit_to')

    const [profileResult, completedScoresResult, walletResult] = await Promise.all([
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
            .from('wallets')
            .select('id, balance')
            .eq('user_id', user.id)
            .eq('wallet_type', 'exam_token')
            .maybeSingle(),
    ])

    if (profileResult.error) throw profileResult.error
    if (completedScoresResult.error) throw completedScoresResult.error
    if (walletResult.error) throw walletResult.error

    let ordersQuery = supabase
        .from('orders')
        .select(`
            id,
            order_number,
            status,
            total_amount,
            created_at,
            payments(status, raw_response),
            order_items!inner(product_id, products!inner(name, product_type))
        `, { count: 'exact' })
        .eq('user_id', user.id)
        .eq('order_items.products.product_type', 'TOKEN_PACK')
        .order('created_at', { ascending: false })
        .range(firstPageIndex(transactionPageNumber), firstPageIndex(transactionPageNumber) + HISTORY_PAGE_SIZE - 1)
    if (transactionFrom) ordersQuery = ordersQuery.gte('created_at', startOfJakartaDate(transactionFrom))
    if (transactionTo) ordersQuery = ordersQuery.lte('created_at', endOfJakartaDate(transactionTo))

    const walletId = walletResult.data?.id ? String(walletResult.data.id) : null
    const emptyHistoryResult = { data: [] as JsonObject[], count: 0, error: null }
    let usageQuery = walletId
        ? supabase
            .from('wallet_transactions')
            .select('id, amount, source_type, source_id, balance_after, created_at', { count: 'exact' })
            .eq('wallet_id', walletId)
            .eq('type', 'debit')
            .order('created_at', { ascending: false })
            .range(firstPageIndex(usagePageNumber), firstPageIndex(usagePageNumber) + HISTORY_PAGE_SIZE - 1)
        : null
    if (usageQuery && usageFrom) usageQuery = usageQuery.gte('created_at', startOfJakartaDate(usageFrom))
    if (usageQuery && usageTo) usageQuery = usageQuery.lte('created_at', endOfJakartaDate(usageTo))

    let creditQuery = walletId
        ? supabase
            .from('wallet_transactions')
            .select('id, amount, source_type, source_id, balance_after, created_at', { count: 'exact' })
            .eq('wallet_id', walletId)
            .eq('type', 'credit')
            .order('created_at', { ascending: false })
            .range(firstPageIndex(creditPageNumber), firstPageIndex(creditPageNumber) + HISTORY_PAGE_SIZE - 1)
        : null
    if (creditQuery && creditFrom) creditQuery = creditQuery.gte('created_at', startOfJakartaDate(creditFrom))
    if (creditQuery && creditTo) creditQuery = creditQuery.lte('created_at', endOfJakartaDate(creditTo))

    const [ordersResult, usageResult, creditResult] = await Promise.all([
        ordersQuery,
        usageQuery || Promise.resolve(emptyHistoryResult),
        creditQuery || Promise.resolve(emptyHistoryResult),
    ])
    if (ordersResult.error) throw ordersResult.error
    if (usageResult.error) throw usageResult.error
    if (creditResult.error) throw creditResult.error

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

    const usageRows = (usageResult.data || []) as JsonObject[]
    const creditRows = (creditResult.data || []) as JsonObject[]
    const attemptIds = usageRows.flatMap((row) =>
        row.source_type === 'exam_attempt' && typeof row.source_id === 'string' ? [row.source_id] : []
    )
    const orderItemIds = creditRows.flatMap((row) =>
        row.source_type === 'order_item' && typeof row.source_id === 'string' ? [row.source_id] : []
    )
    const redemptionIds = creditRows.flatMap((row) =>
        ['promotion_redemption', 'voucher', 'voucher_claim'].includes(String(row.source_type)) && typeof row.source_id === 'string'
            ? [row.source_id]
            : []
    )

    const [attemptDetailsResult, orderItemDetailsResult, directRedemptionsResult] = await Promise.all([
        attemptIds.length > 0
            ? supabase.from('exam_attempts').select('id, metadata').in('id', attemptIds)
            : Promise.resolve({ data: [], error: null }),
        orderItemIds.length > 0
            ? supabase.from('order_items').select('id, order_id, products(name)').in('id', orderItemIds)
            : Promise.resolve({ data: [], error: null }),
        redemptionIds.length > 0
            ? supabase.from('promotion_redemptions').select('id, order_id, promotion_id, promotions(code)').in('id', redemptionIds)
            : Promise.resolve({ data: [], error: null }),
    ])
    if (attemptDetailsResult.error) throw attemptDetailsResult.error
    if (orderItemDetailsResult.error) throw orderItemDetailsResult.error
    if (directRedemptionsResult.error) throw directRedemptionsResult.error

    const orderItemRows = (orderItemDetailsResult.data || []) as JsonObject[]
    const creditedOrderIds = orderItemRows.flatMap((row) => typeof row.order_id === 'string' ? [row.order_id] : [])
    const orderRedemptionsResult = creditedOrderIds.length > 0
        ? await supabase
            .from('promotion_redemptions')
            .select('id, order_id, promotion_id, promotions(code)')
            .eq('user_id', user.id)
            .in('order_id', creditedOrderIds)
        : { data: [], error: null }
    if (orderRedemptionsResult.error) throw orderRedemptionsResult.error

    const attemptById = new Map(
        ((attemptDetailsResult.data || []) as JsonObject[]).map((row) => [String(row.id), row])
    )
    const orderItemById = new Map(orderItemRows.map((row) => [String(row.id), row]))
    const redemptions = [
        ...((directRedemptionsResult.data || []) as JsonObject[]),
        ...((orderRedemptionsResult.data || []) as JsonObject[]),
    ]
    const redemptionById = new Map(redemptions.map((row) => [String(row.id), row]))
    const redemptionByOrderId = new Map(redemptions.map((row) => [String(row.order_id), row]))

    const usageSessions = usageRows.map((row) => {
        const sourceType = String(row.source_type || '')
        const attempt = typeof row.source_id === 'string' ? attemptById.get(row.source_id) : null
        const metadata = readObject(attempt?.metadata)
        return {
            id: String(row.id),
            start_time: String(row.created_at),
            mode: readString(metadata?.practiceKind) || sourceType,
            label: tokenUsageLabel(metadata, sourceType),
            amount: Math.abs(Number(row.amount || 0)),
            balance_after: Number(row.balance_after || 0),
        }
    })

    const tokenCredits = creditRows.map((row) => {
        const sourceType = String(row.source_type || '')
        const sourceId = typeof row.source_id === 'string' ? row.source_id : ''
        let sourceLabel = 'Sumber lainnya'
        let sourceDetail = readableSourceType(sourceType || 'Kredit token')

        if (sourceType === 'order_item') {
            const orderItem = orderItemById.get(sourceId)
            const product = relationObject(orderItem?.products)
            const redemption = orderItem?.order_id ? redemptionByOrderId.get(String(orderItem.order_id)) : null
            const promotion = relationObject(redemption?.promotions)
            const voucherCode = readString(promotion?.code)
            sourceLabel = redemption ? 'Pembelian dengan voucher' : 'Pembelian'
            sourceDetail = readString(product?.name) || 'Paket token'
            if (voucherCode) sourceDetail += ` - Voucher ${voucherCode}`
        } else if (['promotion', 'promotion_redemption', 'voucher', 'voucher_claim'].includes(sourceType)) {
            const redemption = redemptionById.get(sourceId)
            const promotion = relationObject(redemption?.promotions)
            sourceLabel = 'Voucher'
            sourceDetail = readString(promotion?.code) ? `Kode ${readString(promotion?.code)}` : 'Klaim voucher atau promosi'
        } else if (['admin_adjustment', 'admin_credit', 'manual_adjustment'].includes(sourceType)) {
            sourceLabel = 'Penyesuaian admin'
            sourceDetail = 'Token ditambahkan oleh admin'
        } else if (['qa_seed', 'seed', 'initial_balance', 'signup_bonus'].includes(sourceType)) {
            sourceLabel = 'Bonus akun'
            sourceDetail = 'Saldo awal atau bonus pendaftaran'
        } else if (sourceType.includes('reward') || sourceType.includes('referral')) {
            sourceLabel = 'Hadiah'
            sourceDetail = readableSourceType(sourceType)
        }

        return {
            id: String(row.id),
            created_at: String(row.created_at),
            amount: Math.abs(Number(row.amount || 0)),
            balance_after: Number(row.balance_after || 0),
            source_label: sourceLabel,
            source_detail: sourceDetail,
        }
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
                tokenCredits={tokenCredits}
                transactionPage={{ page: transactionPageNumber, pageSize: HISTORY_PAGE_SIZE, total: ordersResult.count || 0, from: transactionFrom, to: transactionTo }}
                usagePage={{ page: usagePageNumber, pageSize: HISTORY_PAGE_SIZE, total: usageResult.count || 0, from: usageFrom, to: usageTo }}
                creditPage={{ page: creditPageNumber, pageSize: HISTORY_PAGE_SIZE, total: creditResult.count || 0, from: creditFrom, to: creditTo }}
                level={levelInfo.level}
            />
        </Suspense>
    )
}
