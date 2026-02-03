'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { User, Mail, Calendar, Shield, Crown, Trophy, Zap, TrendingUp, Award, Clock, Edit, Camera, Save, X, Eye, Bell, Loader2, Sparkles } from 'lucide-react'
import { updateProfileInfo, updatePassword } from '@/app/actions/profile'
import { signout } from '@/app/auth/actions'
import { toast } from 'sonner'
import { Patrick_Hand, Work_Sans } from 'next/font/google'

const handwriting = Patrick_Hand({
    subsets: ['latin'],
    weight: '400',
    variable: '--font-handwriting'
})

const bodyFont = Work_Sans({
    subsets: ['latin'],
    variable: '--font-body'
})

type Profile = {
    id: string
    full_name: string | null
    avatar_url: string | null
    bio: string | null
    streak_count?: number
    tryout_quota?: number
}

type UserData = {
    email: string
    created_at: string
}

import { createClient } from '@/utils/supabase/client'
import StatOverview from '@/components/statistics/StatOverview'
import TrendChart from '@/components/statistics/TrendChart'
import CategoryChart from '@/components/statistics/CategoryChart'
import ConsistencyTracker from '@/components/statistics/ConsistencyTracker'

// ... imports

export default function ProfileClient({ profile: initialProfile, user, statsData }: { profile: Profile, user: UserData, statsData: any }) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'profile' | 'stats' | 'history' | 'settings'>('profile')
    const [isEditing, setIsEditing] = useState(false)
    const [editedName, setEditedName] = useState(initialProfile.full_name || '')
    const [editedBio, setEditedBio] = useState(initialProfile.bio || '')
    const [showImagePreview, setShowImagePreview] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [profile, setProfile] = useState(initialProfile)

    // Avatar upload state
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [statsFilter, setStatsFilter] = useState<'all' | 'tryout' | 'twk' | 'tiu' | 'tkp'>('tryout')
    const [statsProgram, setStatsProgram] = useState<'cpns' | 'utbk'>('cpns')

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Limit file size (e.g., 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Ukuran file maksimal 2MB')
            return
        }

        setIsUploading(true)
        const supabase = createClient()

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.email?.replace('@', '_')}_${Math.random()}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            const result = await updateProfileInfo({ avatar_url: publicUrl })

            if (result.success) {
                setProfile({ ...profile, avatar_url: publicUrl })
                toast.success('Foto profil berhasil diperbarui!')
                router.refresh() // Refresh layout to update sidebar
            } else {
                toast.error('Gagal memperbarui database')
            }
        } catch (error: any) {
            console.error('Upload error:', error)
            toast.error('Gagal mengupload foto. Pastikan format sesuai.')
        } finally {
            setIsUploading(false)
        }
    }

    // Password change state
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isChangingPassword, setIsChangingPassword] = useState(false)

    // Notification settings state
    const [showNotificationModal, setShowNotificationModal] = useState(false)
    const [notificationSettings, setNotificationSettings] = useState({
        emailNotifications: true,
        reminderNotifications: true,
        achievementNotifications: true,
        weeklyReport: false
    })
    const [isSavingNotifications, setIsSavingNotifications] = useState(false)

    // Delete account state


    const createdAt = new Date(user.created_at).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    const tabs = [
        { id: 'profile', label: 'Profil', icon: <User size={18} /> },
        { id: 'stats', label: 'Statistik', icon: <TrendingUp size={18} /> },
        { id: 'history', label: 'Riwayat', icon: <Clock size={18} /> },
        { id: 'settings', label: 'Pengaturan', icon: <Shield size={18} /> }
    ] as const

    // Mock data - replace with real data later
    const stats = {
        totalPractice: 24,
        totalTryout: 5,
        avgScore: 78,
        studyStreak: 7,
        totalXP: 1250,
        level: 5,
        achievements: 12
    }

    const achievements = [
        { id: 1, name: 'First Step', desc: 'Selesaikan latihan pertama', icon: '🎯', unlocked: true },
        { id: 2, name: 'Speed Demon', desc: 'Jawab 10 soal < 30 detik', icon: '⚡', unlocked: true },
        { id: 3, name: 'Perfect Score', desc: 'Dapatkan nilai 100', icon: '💯', unlocked: false },
        { id: 4, name: 'Week Warrior', desc: 'Belajar 7 hari berturut', icon: '🔥', unlocked: true },
    ]

    const recentActivity = [
        { date: '2024-01-29', activity: 'Latihan TWK - Pancasila', score: 85 },
        { date: '2024-01-28', activity: 'Tryout SKD Batch 3', score: 78 },
        { date: '2024-01-27', activity: 'Latihan TIU - Deret Angka', score: 92 },
        { date: '2024-01-26', activity: 'Materi: UUD 1945', score: null },
    ]

    const handleSave = async () => {
        startTransition(async () => {
            const result = await updateProfileInfo({
                full_name: editedName,
                bio: editedBio
            })

            if (result.success) {
                // Update local state optimistically
                setProfile({
                    ...profile,
                    full_name: editedName,
                    bio: editedBio
                })
                setIsEditing(false)
                toast.success('Profil berhasil diperbarui!')
                router.refresh() // Refresh layout to update sidebar
            } else {
                toast.error(result.error || 'Gagal memperbarui profil')
            }
        })
    }

    const handleChangePassword = async () => {
        // Validation
        if (!newPassword || !confirmPassword) {
            toast.error('Harap isi semua field')
            return
        }

        if (newPassword.length < 6) {
            toast.error('Password minimal 6 karakter')
            return
        }

        if (newPassword !== confirmPassword) {
            toast.error('Password baru tidak cocok')
            return
        }

        setIsChangingPassword(true)

        const result = await updatePassword({ newPassword })

        setIsChangingPassword(false)

        if (result.success) {
            toast.success('Password berhasil diubah! Silakan login kembali.')
            setShowPasswordModal(false)
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')

            // Logout user after password change for security
            setTimeout(async () => {
                await signout()
                window.location.href = '/'
            }, 1500) // Delay to show toast message
        } else {
            toast.error(result.error || 'Gagal mengubah password')
        }
    }

    const handleSaveNotifications = async () => {
        setIsSavingNotifications(true)

        // Simulate saving to database
        await new Promise(resolve => setTimeout(resolve, 1000))

        setIsSavingNotifications(false)
        toast.success('Pengaturan notifikasi berhasil disimpan!')
        setShowNotificationModal(false)
    }

    return (
        <div className={`${handwriting.variable} ${bodyFont.variable} font-handwriting space-y-6`}>
            {/* Header with Tabs - Notebook Style */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="transform -rotate-1">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">📋 Profil Saya</h2>
                    <p className="text-lg text-gray-600">Kelola akun dan lihat progress belajar kamu</p>
                </div>
            </div>

            {/* Tabs - Notebook Paper Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
                {tabs.map((tab, idx) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-3 text-base font-bold whitespace-nowrap transition-all border-2 border-gray-900 ${activeTab === tab.id
                            ? 'bg-yellow-300 text-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-y-1'
                            : 'bg-white text-gray-600 hover:bg-gray-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]'
                            }`}
                    >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <div className="space-y-6">
                    {/* Profile Card - Notebook Style */}
                    <div className="bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 md:p-8 relative transform rotate-0 hover:rotate-0">
                        {/* Tape decoration */}
                        <div className="absolute -top-3 left-8 w-16 h-6 bg-yellow-200/80 rotate-[-5deg] shadow-sm"></div>
                        <div className="absolute -top-3 right-8 w-16 h-6 bg-blue-200/80 rotate-[5deg] shadow-sm"></div>

                        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                            {/* Avatar Section */}
                            <div className="flex-shrink-0">
                                <div className="relative w-32 h-32 mx-auto md:mx-0 group">
                                    <div className="w-full h-full rounded-full border-4 border-gray-900 bg-gradient-to-br from-yellow-100 to-pink-100 flex items-center justify-center text-4xl font-bold overflow-hidden cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                        {profile.avatar_url ? (
                                            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-gray-900">{user.email[0].toUpperCase()}</span>
                                        )}
                                    </div>

                                    {/* Eye Icon Overlay - Shows on Hover */}
                                    {(profile.avatar_url || user.email) && (
                                        <div
                                            onClick={() => setShowImagePreview(true)}
                                            className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        >
                                            <Eye size={32} className="text-white" />
                                        </div>
                                    )}

                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="absolute bottom-0 right-0 p-2 rounded-full bg-pink-400 text-white border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-pink-500 transition z-10 disabled:opacity-50"
                                    >
                                        {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                                    </button>
                                </div>
                                {/* Level Badge */}
                                <div className="mt-4 text-center">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-300 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rotate-1">
                                        <Zap size={16} className="text-orange-600" />
                                        <span className="text-base font-bold text-gray-900">Level {stats.level}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Info Section */}
                            <div className="flex-1 space-y-4">
                                {isEditing ? (
                                    <>
                                        {/* Edit Mode */}
                                        <div>
                                            <label className="text-base text-gray-700 mb-2 block font-bold">Nama Lengkap</label>
                                            <input
                                                type="text"
                                                value={editedName}
                                                onChange={(e) => setEditedName(e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-900 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-lg"
                                                placeholder="Masukkan nama lengkap"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-base text-gray-700 mb-2 block font-bold">Bio</label>
                                            <textarea
                                                value={editedBio}
                                                onChange={(e) => setEditedBio(e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-900 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-lg"
                                                rows={3}
                                                placeholder="Ceritakan tentang diri Anda..."
                                            />
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <button
                                                onClick={handleSave}
                                                disabled={isPending}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-green-400 text-gray-900 font-bold border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Save size={16} />
                                                {isPending ? 'Menyimpan...' : 'Simpan'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsEditing(false)
                                                    setEditedName(profile.full_name || '')
                                                    setEditedBio(profile.bio || '')
                                                }}
                                                disabled={isPending}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 font-bold border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <X size={16} />
                                                Batal
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* View Mode */}
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="text-2xl font-bold mb-1 text-gray-900">{profile.full_name || 'Belum diatur'}</h3>
                                                <p className="text-base text-gray-600">{profile.bio || 'Belum ada bio'}</p>
                                            </div>
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="p-2 bg-blue-300 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-400 transition"
                                            >
                                                <Edit size={16} className="text-gray-900" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                                            <div className="flex items-center gap-3 p-3 bg-gray-50 border-2 border-gray-300">
                                                <div className="p-2 bg-pink-200 border-2 border-gray-900">
                                                    <Mail size={18} className="text-gray-900" />
                                                </div>
                                                <div>
                                                    <div className="text-sm text-gray-500 font-bold">Email</div>
                                                    <div className="font-bold text-base text-gray-900">{user.email}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-3 bg-gray-50 border-2 border-gray-300">
                                                <div className="p-2 bg-green-200 border-2 border-gray-900">
                                                    <Calendar size={18} className="text-gray-900" />
                                                </div>
                                                <div>
                                                    <div className="text-sm text-gray-500 font-bold">Bergabung</div>
                                                    <div className="font-bold text-base text-gray-900">{createdAt}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quota Card - Sticky Note Style */}
                    <div className="bg-green-200 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 relative transform rotate-1">
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-4 bg-blue-400 rounded-b-sm shadow-sm"></div>
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-yellow-300 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    <span className="text-3xl">🎫</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-xl text-gray-900">Kuota Tryout</h4>
                                    <p className="text-base text-gray-700">
                                        Sisa tiket untuk mengerjakan tryout
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-center px-6 py-3 bg-white border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                    <div className="text-3xl font-bold text-green-600">{profile.tryout_quota ?? 0}</div>
                                    <div className="text-sm text-gray-600 font-bold">Tiket</div>
                                </div>
                                <a href="/dashboard/beli-paket" className="px-5 py-3 bg-orange-400 text-gray-900 font-bold border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all">
                                    + Beli Kuota
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Achievements Preview - Notebook Style */}
                    <div className="bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 relative">
                        {/* Tape decoration */}
                        <div className="absolute -top-3 left-6 w-12 h-5 bg-green-200/80 rotate-[-3deg] shadow-sm"></div>

                        <div className="flex items-center justify-between mb-6">
                            <h4 className="font-bold text-xl flex items-center gap-2 text-gray-900">
                                <Award className="text-pink-500" size={24} />
                                🏆 Achievements
                            </h4>
                            <span className="px-3 py-1 bg-pink-300 text-gray-900 font-bold border-2 border-gray-900 text-sm">
                                {achievements.filter(a => a.unlocked).length}/{achievements.length}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {achievements.map((ach, idx) => (
                                <div
                                    key={ach.id}
                                    className={`p-4 border-2 text-center transition ${ach.unlocked
                                        ? 'border-gray-900 bg-gradient-to-br from-yellow-50 to-pink-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                        : 'border-gray-300 bg-gray-100 opacity-60'
                                        } ${idx % 2 === 0 ? 'rotate-1' : '-rotate-1'}`}
                                >
                                    <div className="text-4xl mb-2">{ach.icon}</div>
                                    <div className="font-bold text-base mb-1 text-gray-900">{ach.name}</div>
                                    <div className="text-sm text-gray-600">{ach.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )
            }

            {/* Statistics Tab */}
            {activeTab === 'stats' && (
                <div className="space-y-6">
                    {/* Program Toggle - CPNS / UTBK - Notebook Style */}
                    <div className="flex gap-3 p-2 bg-gray-100 border-2 border-gray-900 w-fit shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                        <button
                            onClick={() => setStatsProgram('cpns')}
                            className={`flex items-center gap-2 px-5 py-2.5 text-base font-bold transition-all border-2 border-gray-900 ${statsProgram === 'cpns'
                                ? 'bg-indigo-400 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <Shield size={18} />
                            CPNS
                        </button>
                        <button
                            onClick={() => setStatsProgram('utbk')}
                            className={`flex items-center gap-2 px-5 py-2.5 text-base font-bold transition-all border-2 border-gray-900 ${statsProgram === 'utbk'
                                ? 'bg-pink-400 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <Trophy size={18} />
                            UTBK
                        </button>
                    </div>

                    {/* CPNS Statistics */}
                    {statsProgram === 'cpns' && (
                        <>

                            {(() => {
                                const currentStats = statsData ? (statsData.all ? statsData[statsFilter] : statsData) : null

                                if (!currentStats || (statsData.all && !currentStats.summary.totalSessions && statsFilter !== 'all')) {
                                    // Empty state handling - Notebook Style
                                    return (
                                        <div className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-gray-400 p-8 text-center bg-gray-50 relative">
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-5 bg-yellow-200 rotate-1 shadow-sm"></div>
                                            <div className="w-20 h-20 bg-blue-200 border-2 border-gray-900 flex items-center justify-center mb-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                                <TrendingUp className="w-10 h-10 text-blue-700" />
                                            </div>
                                            <h3 className="text-2xl font-bold mb-2 text-gray-900">📊 Belum Ada Data</h3>
                                            <p className="text-lg text-gray-600 mb-6 max-w-md">
                                                Kamu belum menyelesaikan sesi tryout apapun. Ayo mulai latihan!
                                            </p>
                                            <a href="/dashboard/latihan" className="px-5 py-2.5 bg-green-400 text-gray-900 font-bold border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all">
                                                Mulai Tryout 🚀
                                            </a>
                                        </div>
                                    )
                                }

                                return (
                                    <>
                                        {/* 1. OVERVIEW CARDS */}
                                        <StatOverview data={currentStats} streak={profile.streak_count || 0} type={statsFilter} />

                                        {/* AI INSIGHT BOX - Notebook Style */}
                                        <div className="bg-yellow-100 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 relative">
                                            <div className="absolute -top-3 left-6 w-12 h-5 bg-pink-200/80 rotate-[-2deg] shadow-sm"></div>
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="p-2 bg-purple-300 border-2 border-gray-900">
                                                    <Sparkles className="text-purple-700 w-5 h-5" />
                                                </div>
                                                <h3 className="font-bold text-xl text-gray-900">💡 Insight Tryout</h3>
                                            </div>
                                            <div className="space-y-2">
                                                {currentStats.insights.map((insight: string, idx: number) => (
                                                    <p key={idx} className="text-base text-gray-700 leading-relaxed">
                                                        • <span dangerouslySetInnerHTML={{ __html: insight.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900">$1</strong>') }} />
                                                    </p>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 2. CHARTS ROW - Notebook Style */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div className="min-h-[400px] bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 relative">
                                                <div className="absolute -top-3 left-8 w-14 h-5 bg-blue-200/80 rotate-[-1deg] shadow-sm"></div>
                                                <TrendChart
                                                    data={currentStats.trendData}
                                                    trendDirection={currentStats.trendDirection}
                                                    trendPercentage={currentStats.trendPercentage}
                                                    shortTermTrend={currentStats.shortTermTrend}
                                                    shortTermPercentage={currentStats.shortTermPercentage}
                                                />
                                            </div>
                                            <div className="min-h-[400px] bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 relative">
                                                <div className="absolute -top-3 right-8 w-14 h-5 bg-green-200/80 rotate-[1deg] shadow-sm"></div>
                                                <CategoryChart
                                                    data={
                                                        statsFilter === 'tryout' || statsFilter === 'all'
                                                            ? currentStats.categoryStats
                                                            : currentStats.categoryStats.filter((c: any) => c.subject.toLowerCase() === statsFilter)
                                                    }
                                                />
                                            </div>
                                        </div>

                                        {/* 3. CONSISTENCY - Wrapped in notebook style */}
                                        <div className="bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 relative">
                                            <div className="absolute -top-3 left-10 w-16 h-5 bg-orange-200/80 rotate-[-1deg] shadow-sm"></div>
                                            <ConsistencyTracker
                                                data={currentStats.consistencyData}
                                                score={currentStats.consistencyScore}
                                                activeCount={currentStats.activeInPeriod}
                                            />
                                        </div>
                                    </>
                                )
                            })()}
                        </>
                    )}

                    {/* UTBK Statistics - Coming Soon - Notebook Style */}
                    {statsProgram === 'utbk' && (
                        <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-pink-400 p-8 text-center bg-gradient-to-br from-pink-50 to-yellow-50 relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-6 bg-pink-200 rotate-1 shadow-sm"></div>
                            <div className="w-24 h-24 bg-pink-300 border-4 border-gray-900 flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-3">
                                <Trophy className="w-12 h-12 text-pink-700" />
                            </div>
                            <h3 className="text-3xl font-bold mb-3 text-pink-700">🎓 UTBK Statistics</h3>
                            <p className="text-lg text-gray-600 mb-6 max-w-md">
                                Fitur statistik UTBK sedang dalam pengembangan. Segera hadir untuk melacak progress tryout UTBK kamu!
                            </p>
                            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-pink-300 text-gray-900 font-bold border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <Sparkles size={18} />
                                ✨ Segera Hadir
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* History Tab - Quota History */}
            {activeTab === 'history' && (
                <div className="space-y-6">
                    {/* Riwayat Pembelian Kuota */}
                    <div className="bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 relative">
                        {/* Tape decoration */}
                        <div className="absolute -top-3 left-8 w-14 h-5 bg-green-200/80 rotate-[-2deg] shadow-sm"></div>

                        <h4 className="font-bold text-xl mb-6 text-gray-900">💳 Riwayat Pembelian Kuota</h4>

                        {/* Empty state - will be populated from database later */}
                        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-300 bg-gray-50">
                            <div className="w-16 h-16 bg-green-200 border-2 border-gray-900 flex items-center justify-center mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <span className="text-3xl">🛒</span>
                            </div>
                            <p className="text-lg font-bold text-gray-700 mb-2">Belum ada pembelian</p>
                            <p className="text-sm text-gray-500 mb-4">Riwayat pembelian kuota akan muncul di sini</p>
                            <a href="/dashboard/beli-paket" className="px-5 py-2.5 bg-green-400 text-gray-900 font-bold border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all">
                                Beli Kuota Sekarang
                            </a>
                        </div>
                    </div>

                    {/* Riwayat Pemakaian Kuota */}
                    <div className="bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 relative">
                        {/* Tape decoration */}
                        <div className="absolute -top-3 right-8 w-14 h-5 bg-orange-200/80 rotate-[2deg] shadow-sm"></div>

                        <h4 className="font-bold text-xl mb-6 text-gray-900">🎫 Riwayat Pemakaian Kuota</h4>

                        {/* Show usage from test_sessions */}
                        {recentActivity.length > 0 ? (
                            <div className="space-y-3">
                                {recentActivity.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 border-2 border-gray-300 hover:border-gray-900 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-orange-200 border-2 border-gray-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                <span className="text-xl">📝</span>
                                            </div>
                                            <div>
                                                <div className="font-bold text-base text-gray-900">{item.activity}</div>
                                                <div className="text-sm text-gray-500">{new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                            </div>
                                        </div>
                                        <div className="text-base font-bold text-red-500 bg-red-100 px-3 py-1 border-2 border-gray-900">
                                            -1 Tiket
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-300 bg-gray-50">
                                <div className="w-16 h-16 bg-orange-200 border-2 border-gray-900 flex items-center justify-center mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    <span className="text-3xl">📋</span>
                                </div>
                                <p className="text-lg font-bold text-gray-700 mb-2">Belum ada pemakaian</p>
                                <p className="text-sm text-gray-500">Riwayat pemakaian kuota akan muncul di sini</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="space-y-6">
                    <div className="bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 relative">
                        {/* Tape decoration */}
                        <div className="absolute -top-3 right-8 w-14 h-5 bg-purple-200/80 rotate-[3deg] shadow-sm"></div>

                        <h4 className="font-bold text-xl mb-6 text-gray-900">⚙️ Pengaturan Akun</h4>
                        <div className="space-y-4">
                            <button
                                onClick={() => setShowPasswordModal(true)}
                                className="w-full text-left p-4 bg-gray-50 border-2 border-gray-300 hover:border-gray-900 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all group"
                            >
                                <div className="font-bold text-base mb-1 text-gray-900 group-hover:text-blue-600">🔐 Ubah Password</div>
                                <div className="text-sm text-gray-600">Update password akun Anda</div>
                            </button>
                            <button
                                onClick={() => setShowNotificationModal(true)}
                                className="w-full text-left p-4 bg-gray-50 border-2 border-gray-300 hover:border-gray-900 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all group"
                            >
                                <div className="font-bold text-base mb-1 text-gray-900 group-hover:text-green-600">🔔 Notifikasi</div>
                                <div className="text-sm text-gray-600">Atur preferensi notifikasi</div>
                            </button>
                            <button className="w-full text-left p-4 bg-red-50 border-2 border-red-300 hover:border-red-600 hover:shadow-[2px_2px_0px_0px_rgba(220,38,38,1)] transition-all group">
                                <div className="font-bold text-base mb-1 text-red-600">🗑️ Hapus Akun</div>
                                <div className="text-sm text-red-400">Hapus akun dan semua data Anda</div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Settings Modal */}
            {
                showNotificationModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                        onClick={() => setShowNotificationModal(false)}
                    >
                        <div
                            className="relative max-w-md w-full bg-card rounded-2xl p-6 border border-border"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <Bell size={20} className="text-primary" />
                                    <h3 className="text-xl font-bold">Pengaturan Notifikasi</h3>
                                </div>
                                <button
                                    onClick={() => setShowNotificationModal(false)}
                                    className="p-2 rounded-lg hover:bg-secondary transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Settings */}
                            <div className="space-y-4">
                                {/* Email Notifications */}
                                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                                    <div className="flex-1">
                                        <div className="font-medium mb-1">Email Notifikasi</div>
                                        <div className="text-sm text-muted-foreground">Terima notifikasi melalui email</div>
                                    </div>
                                    <button
                                        onClick={() => setNotificationSettings(prev => ({ ...prev, emailNotifications: !prev.emailNotifications }))}
                                        className={`relative w-12 h-6 rounded-full transition ${notificationSettings.emailNotifications ? 'bg-primary' : 'bg-secondary'
                                            }`}
                                    >
                                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${notificationSettings.emailNotifications ? 'translate-x-6' : 'translate-x-0'
                                            }`} />
                                    </button>
                                </div>

                                {/* Reminder Notifications */}
                                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                                    <div className="flex-1">
                                        <div className="font-medium mb-1">Pengingat Belajar</div>
                                        <div className="text-sm text-muted-foreground">Ingatkan untuk belajar setiap hari</div>
                                    </div>
                                    <button
                                        onClick={() => setNotificationSettings(prev => ({ ...prev, reminderNotifications: !prev.reminderNotifications }))}
                                        className={`relative w-12 h-6 rounded-full transition ${notificationSettings.reminderNotifications ? 'bg-primary' : 'bg-secondary'
                                            }`}
                                    >
                                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${notificationSettings.reminderNotifications ? 'translate-x-6' : 'translate-x-0'
                                            }`} />
                                    </button>
                                </div>

                                {/* Achievement Notifications */}
                                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                                    <div className="flex-1">
                                        <div className="font-medium mb-1">Notifikasi Achievement</div>
                                        <div className="text-sm text-muted-foreground">Dapatkan pemberitahuan pencapaian baru</div>
                                    </div>
                                    <button
                                        onClick={() => setNotificationSettings(prev => ({ ...prev, achievementNotifications: !prev.achievementNotifications }))}
                                        className={`relative w-12 h-6 rounded-full transition ${notificationSettings.achievementNotifications ? 'bg-primary' : 'bg-secondary'
                                            }`}
                                    >
                                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${notificationSettings.achievementNotifications ? 'translate-x-6' : 'translate-x-0'
                                            }`} />
                                    </button>
                                </div>

                                {/* Weekly Report */}
                                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                                    <div className="flex-1">
                                        <div className="font-medium mb-1">Laporan Mingguan</div>
                                        <div className="text-sm text-muted-foreground">Ringkasan progress belajar mingguan</div>
                                    </div>
                                    <button
                                        onClick={() => setNotificationSettings(prev => ({ ...prev, weeklyReport: !prev.weeklyReport }))}
                                        className={`relative w-12 h-6 rounded-full transition ${notificationSettings.weeklyReport ? 'bg-primary' : 'bg-secondary'
                                            }`}
                                    >
                                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${notificationSettings.weeklyReport ? 'translate-x-6' : 'translate-x-0'
                                            }`} />
                                    </button>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-6">
                                <button
                                    onClick={handleSaveNotifications}
                                    disabled={isSavingNotifications}
                                    className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSavingNotifications ? 'Menyimpan...' : 'Simpan Pengaturan'}
                                </button>
                                <button
                                    onClick={() => setShowNotificationModal(false)}
                                    disabled={isSavingNotifications}
                                    className="px-4 py-2.5 rounded-lg border border-border hover:bg-secondary transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Batal
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Password Change Modal */}
            {
                showPasswordModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                        onClick={() => setShowPasswordModal(false)}
                    >
                        <div
                            className="relative max-w-md w-full bg-card rounded-2xl p-6 border border-border"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold">Ubah Password</h3>
                                <button
                                    onClick={() => setShowPasswordModal(false)}
                                    className="p-2 rounded-lg hover:bg-secondary transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Form */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-muted-foreground mb-2 block">Password Baru</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="Minimal 6 karakter"
                                        disabled={isChangingPassword}
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-muted-foreground mb-2 block">Konfirmasi Password Baru</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="Ketik ulang password baru"
                                        disabled={isChangingPassword}
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={handleChangePassword}
                                        disabled={isChangingPassword}
                                        className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isChangingPassword ? 'Mengubah...' : 'Ubah Password'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowPasswordModal(false)
                                            setNewPassword('')
                                            setConfirmPassword('')
                                        }}
                                        disabled={isChangingPassword}
                                        className="px-4 py-2.5 rounded-lg border border-border hover:bg-secondary transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Batal
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Image Preview Modal */}
            {
                showImagePreview && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                        onClick={() => setShowImagePreview(false)}
                    >
                        <div className="relative max-w-2xl w-full">
                            {/* Close Button */}
                            <button
                                onClick={() => setShowImagePreview(false)}
                                className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                            >
                                <X size={24} />
                            </button>

                            {/* Image */}
                            <div
                                className="rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {profile.avatar_url ? (
                                    <img
                                        src={profile.avatar_url}
                                        alt="Avatar Preview"
                                        className="w-full h-auto max-h-[80vh] object-contain"
                                    />
                                ) : (
                                    <div className="w-96 h-96 flex items-center justify-center">
                                        <span className="text-9xl font-bold text-primary">{user.email[0].toUpperCase()}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
