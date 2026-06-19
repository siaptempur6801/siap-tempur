'use client'

import { useState, useEffect, startTransition } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { User, Clock, Shield, ClipboardList } from 'lucide-react'
import { PageAnimateContainer, PageAnimateItem } from '@/components/ui/PageAnimate'
import PaperBackground from '@/components/PaperBackground'

import { ProfileTab } from './ProfileTab'
import { HistoryTab } from './HistoryTab'
import { SettingsTab } from './SettingsTab'

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
}

interface ProfileClientProps {
    profile: Profile
    user: UserData
    transactions: Transaction[]
    usageSessions: UsageSession[]
    level: number
}

export default function ProfileClient({
    profile: initialProfile,
    user,
    transactions,
    usageSessions,
    level
}: ProfileClientProps) {
    const searchParams = useSearchParams()
    const router = useRouter()
    
    // Support direct linking to tabs e.g. ?tab=history
    const initialTab = (searchParams.get('tab') as 'profile' | 'history' | 'settings') || 'profile'
    
    const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'settings'>(initialTab)
    const [profile, setProfile] = useState(initialProfile)

    // Sync state if URL changes
    useEffect(() => {
        const tab = searchParams.get('tab') as 'profile' | 'history' | 'settings' | null
        if (tab && ['profile', 'history', 'settings'].includes(tab)) {
            startTransition(() => {
                setActiveTab(tab)
            })
        }
    }, [searchParams])

    const handleTabChange = (tabId: 'profile' | 'history' | 'settings') => {
        setActiveTab(tabId)
        // Update URL to reflect active tab without causing a full reload
        router.push(`/cpns/dashboard/profile?tab=${tabId}`, { scroll: false })
    }

    const tabs = [
        { id: 'profile', label: 'Profil', icon: <User size={18} /> },
        { id: 'history', label: 'Riwayat', icon: <Clock size={18} /> },
        { id: 'settings', label: 'Pengaturan', icon: <Shield size={18} /> }
    ] as const

    return (
        <div className="w-full min-h-screen relative font-body">
            <PaperBackground />
            <PageAnimateContainer className="font-handwriting space-y-6 pb-20 relative z-10">
                {/* Header with Tabs - Notebook Style */}
                <PageAnimateItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="transform -rotate-1 flex items-center gap-3">
                        <ClipboardList className="w-8 h-8 md:w-10 md:h-10 text-gray-900" />
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">Profil Saya</h2>
                            <p className="text-lg text-gray-600">Kelola akun dan lihat progress belajar kamu</p>
                        </div>
                    </div>
                </PageAnimateItem>

                {/* Tabs - Notebook Paper Tabs */}
                <PageAnimateItem className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id as 'profile' | 'history' | 'settings')}
                            className={`flex items-center gap-2 px-5 py-3 text-base font-bold whitespace-nowrap transition-all border-2 border-gray-900 ${activeTab === tab.id
                                ? 'bg-yellow-300 text-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-y-1'
                                : 'bg-white text-gray-600 hover:bg-gray-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]'
                                }`}
                        >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </PageAnimateItem>

                {activeTab === 'profile' && (
                    <ProfileTab profile={profile} setProfile={setProfile} user={user} level={level} />
                )}

                {activeTab === 'history' && (
                    <HistoryTab transactions={transactions} usageSessions={usageSessions} />
                )}

                {activeTab === 'settings' && (
                    <SettingsTab />
                )}
            </PageAnimateContainer>
        </div>
    )
}
