'use client'

import { useEffect, useRef, startTransition, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Clock, ClipboardList, Shield, User } from 'lucide-react'
import { ProfileTab } from './ProfileTab'
import { HistoryTab } from './HistoryTab'
import { SettingsTab } from './SettingsTab'
import { cn } from '@/lib/utils'
import { useProfileNavigation } from './useProfileNavigation'
import profileStyles from './TkaProfile.module.css'
import PageHeader from '@/components/ui/PageHeader'

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
  status: string
  package_name: string
  product_type: string
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
    {
      id: 'history',
      label: 'Transaksi & penggunaan',
      icon: <Clock size={18} />,
    },
    { id: 'settings', label: 'Pengaturan', icon: <Shield size={18} /> },
  ] as const

  return (
    <div
      data-experience-mode="learning"
      data-program={isTka ? 'tka' : 'cpns'}
      className={cn('st-product space-y-6 font-body text-foreground', profileStyles.profile)}
    >
      {isTka ? (
        <header className="border-b border-slate-200/80 pb-6 text-slate-950">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700 ring-1 ring-indigo-200/50">
            <User size={14} className="text-indigo-600" aria-hidden="true" />
            <span>Profil Siswa · TKA</span>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Profil & Pengaturan Akun
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Kelola identitas belajar, riwayat transaksi, dan keamanan akun SiapTempur
            dalam satu dashboard.
          </p>
        </header>
      ) : (
        <PageHeader
          eyebrow={
            <>
              <ClipboardList size={15} aria-hidden="true" /> Akun SiapTempur
            </>
          }
          title="Profil dan pengaturan akunmu."
          description="Perbarui informasi profil, lihat riwayat transaksi dan penggunaan token, serta kelola pengaturan akun dari satu tempat."
        />
      )}

      <nav className="grid grid-cols-3 gap-2 pb-1 sm:flex" aria-label="Bagian profil">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={activeTab === tab.id ? activeTabRef : undefined}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 min-w-0 flex-col items-center justify-center gap-1.5 px-2 py-2.5 text-center text-xs font-bold leading-snug transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 sm:flex-row sm:gap-2 sm:px-4 [&>svg]:shrink-0',
              isTka
                ? activeTab === tab.id
                  ? 'rounded-xl border border-primary bg-indigo-50 text-indigo-700 shadow-2xs'
                  : 'rounded-xl bg-white text-slate-600 hover:bg-slate-50 border border-border-strong shadow-2xs'
                : activeTab === tab.id
                  ? 'border-2 border-[var(--st-ink)] bg-[var(--st-yellow)] st-shadow-sm font-black text-sm'
                  : 'border-2 border-[var(--st-ink)] bg-white text-gray-600 hover:bg-blue-50 font-black text-sm',
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
