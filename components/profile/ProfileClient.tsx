'use client'

import { useEffect, useRef, startTransition, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Clock, ClipboardList, Shield, User } from 'lucide-react'
import { ProfileTab } from './ProfileTab'
import { HistoryTab } from './HistoryTab'
import { SettingsTab } from './SettingsTab'
import { cn } from '@/lib/utils'
import { useProfileNavigation } from './useProfileNavigation'
import tkaStyles from './TkaProfile.module.css'

type Profile = {
    id: string
    full_name: string | null
    avatar_url: string | null
    bio: string | null
    streak_count?: number
    tryout_quota?: number
    phone_number?: string | null
    birth_date?: string | null
    gender?: string | null
    education_level?: string | null
    target_instance?: string | null
}

type UserData = {
    id: string
    email: string
    created_at: string
}

type Transaction = {
    id: string
    created_at: string
    amount: number
    status: 'pending' | 'capture' | 'settlement' | 'expire' | 'cancel' | 'deny'
    package_name: string
    order_id: string
    snap_token?: string
}

type UsageSession = {
    id: string
    start_time: string
    mode: string
    label: string
    amount: number
    balance_after: number
}

type TokenCredit = {
    id: string
    created_at: string
    amount: number
    balance_after: number
    source_label: string
    source_detail: string
}

type HistoryPageInfo = {
    page: number
    pageSize: number
    total: number
    from: string
    to: string
}

interface ProfileClientProps {
    profile: Profile
    user: UserData
    transactions: Transaction[]
    usageSessions: UsageSession[]
    tokenCredits: TokenCredit[]
    transactionPage: HistoryPageInfo
    usagePage: HistoryPageInfo
    creditPage: HistoryPageInfo
    level: number
}

type ProfileTabId = 'profile' | 'history' | 'settings'

function parseProfileTab(value: string | null): ProfileTabId {
    return value === 'history' || value === 'settings' ? value : 'profile'
}

export default function ProfileClient({
    profile: initialProfile,
    user,
    transactions,
    usageSessions,
    tokenCredits,
    transactionPage,
    usagePage,
    creditPage,
    level,
}: ProfileClientProps) {
    const searchParams = useSearchParams()
    const { profilePath, isTka } = useProfileNavigation()
    const router = useRouter()
    const requestedTab = searchParams.get('tab')
    const [activeTab, setActiveTab] = useState<ProfileTabId>(() => parseProfileTab(requestedTab))
    const [profile, setProfile] = useState(initialProfile)
    const activeTabRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        startTransition(() => setActiveTab(parseProfileTab(requestedTab)))
    }, [requestedTab])

    useEffect(() => {
        activeTabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }, [activeTab])

    const handleTabChange = (tabId: ProfileTabId) => {
        setActiveTab(tabId)
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', tabId)
        router.push(`${profilePath}?${params.toString()}`, { scroll: false })
    }

    const tabs = [
        { id: 'profile', label: 'Profil', icon: <User size={18} /> },
        { id: 'history', label: 'Transaksi & penggunaan', icon: <Clock size={18} /> },
        { id: 'settings', label: 'Pengaturan', icon: <Shield size={18} /> },
    ] as const

    return (
        <div className={cn('st-product space-y-7 font-body text-[var(--st-ink)]', isTka && tkaStyles.profile)}>
            <header className="max-w-3xl">
                <div className="st-kicker"><ClipboardList size={15} /> Akun SiapTempur</div>
                <h1 className={isTka ? 'mt-2 text-2xl font-bold text-slate-950' : 'st-heading-display mt-5 text-4xl sm:text-5xl md:text-6xl'}>Profil dan pengaturan akunmu.</h1>
                <p className="st-muted mt-3 max-w-2xl text-base font-semibold leading-relaxed md:text-lg">
                    Perbarui informasi profil, lihat riwayat transaksi dan penggunaan token, serta kelola pengaturan akun dari satu tempat.
                </p>
            </header>

            <nav className="flex gap-2 overflow-x-auto pb-2" aria-label="Bagian profil">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        ref={activeTab === tab.id ? activeTabRef : undefined}
                        type="button"
                        onClick={() => handleTabChange(tab.id)}
                        aria-current={activeTab === tab.id ? 'page' : undefined}
                        className={cn(
                            'inline-flex min-h-11 shrink-0 items-center gap-2 border-2 border-[var(--st-ink)] px-4 py-2.5 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
                            isTka ? (activeTab === tab.id ? 'rounded-lg !border-indigo-200 bg-indigo-50 text-indigo-700 shadow-none' : 'rounded-lg !border-slate-200 bg-white text-slate-600 hover:bg-slate-50') : activeTab === tab.id
                                ? 'bg-[var(--st-yellow)] shadow-[3px_3px_0_var(--st-ink)]'
                                : 'bg-white text-gray-600 hover:bg-blue-50'
                        )}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </nav>

            {activeTab === 'profile' && (
                <ProfileTab profile={profile} setProfile={setProfile} user={user} level={level} />
            )}
            {activeTab === 'history' && (
                <HistoryTab
                    transactions={transactions}
                    usageSessions={usageSessions}
                    tokenCredits={tokenCredits}
                    transactionPage={transactionPage}
                    usagePage={usagePage}
                    creditPage={creditPage}
                />
            )}
            {activeTab === 'settings' && <SettingsTab />}
        </div>
    )
}
