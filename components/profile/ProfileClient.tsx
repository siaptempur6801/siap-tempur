'use client'

import { useState, useTransition } from 'react'
import { User, Mail, Calendar, Shield, Crown, Trophy, Target, Zap, TrendingUp, Award, Clock, Edit, Camera, Save, X, Eye, Bell, AlertTriangle } from 'lucide-react'
import { updateProfileInfo, updatePassword } from '@/app/actions/profile'
import { deleteAccount } from '@/app/actions/delete-account'
import { signout } from '@/app/auth/actions'
import { toast } from 'sonner'

type Profile = {
    id: string
    full_name: string | null
    avatar_url: string | null
    bio: string | null
    subscription_status: string
}

type UserData = {
    email: string
    created_at: string
}

export default function ProfileClient({ profile: initialProfile, user }: { profile: Profile, user: UserData }) {
    const [activeTab, setActiveTab] = useState<'profile' | 'stats' | 'history' | 'settings'>('profile')
    const [isEditing, setIsEditing] = useState(false)
    const [editedName, setEditedName] = useState(initialProfile.full_name || '')
    const [editedBio, setEditedBio] = useState(initialProfile.bio || '')
    const [showImagePreview, setShowImagePreview] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [profile, setProfile] = useState(initialProfile)

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
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [confirmDeleteText, setConfirmDeleteText] = useState('')
    const [isDeletingAccount, setIsDeletingAccount] = useState(false)

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
        <div className="space-y-6">
            {/* Header with Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Profil Saya</h2>
                    <p className="text-sm md:text-base text-muted-foreground">Kelola akun dan lihat progress belajar Anda</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 border-b border-border">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
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
                    {/* Profile Card */}
                    <div className="rounded-xl border border-border bg-card p-6 md:p-8">
                        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                            {/* Avatar Section */}
                            <div className="flex-shrink-0">
                                <div className="relative w-32 h-32 mx-auto md:mx-0 group">
                                    <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-4xl font-bold overflow-hidden cursor-pointer">
                                        {profile.avatar_url ? (
                                            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-primary">{user.email[0].toUpperCase()}</span>
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

                                    <button className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition z-10">
                                        <Camera size={18} />
                                    </button>
                                </div>
                                {/* Level Badge */}
                                <div className="mt-4 text-center">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
                                        <Zap size={14} className="text-yellow-500" />
                                        <span className="text-sm font-bold">Level {stats.level}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Info Section */}
                            <div className="flex-1 space-y-4">
                                {isEditing ? (
                                    <>
                                        {/* Edit Mode */}
                                        <div>
                                            <label className="text-sm text-muted-foreground mb-2 block">Nama Lengkap</label>
                                            <input
                                                type="text"
                                                value={editedName}
                                                onChange={(e) => setEditedName(e.target.value)}
                                                className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="Masukkan nama lengkap"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm text-muted-foreground mb-2 block">Bio</label>
                                            <textarea
                                                value={editedBio}
                                                onChange={(e) => setEditedBio(e.target.value)}
                                                className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                                rows={3}
                                                placeholder="Ceritakan tentang diri Anda..."
                                            />
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <button
                                                onClick={handleSave}
                                                disabled={isPending}
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-secondary transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                <h3 className="text-2xl font-bold mb-1">{profile.full_name || 'Belum diatur'}</h3>
                                                <p className="text-sm text-muted-foreground">{profile.bio || 'Belum ada bio'}</p>
                                            </div>
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="p-2 rounded-lg border border-border hover:bg-secondary transition"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-secondary">
                                                    <Mail size={18} className="text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted-foreground">Email</div>
                                                    <div className="font-medium text-sm">{user.email}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-secondary">
                                                    <Calendar size={18} className="text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted-foreground">Bergabung</div>
                                                    <div className="font-medium text-sm">{createdAt}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Subscription Card */}
                    <div className="rounded-xl border border-border bg-gradient-to-br from-yellow-500/5 to-orange-500/5 p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-full bg-yellow-500/20">
                                    <Crown size={24} className="text-yellow-500" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">
                                        {profile.subscription_status === 'premium' ? 'Premium Member' : 'Free Member'}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {profile.subscription_status === 'premium'
                                            ? 'Akses penuh ke semua fitur'
                                            : 'Upgrade untuk akses penuh'}
                                    </p>
                                </div>
                            </div>
                            {profile.subscription_status !== 'premium' && (
                                <button className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold hover:shadow-lg transition">
                                    Upgrade
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Achievements Preview */}
                    <div className="rounded-xl border border-border bg-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-lg flex items-center gap-2">
                                <Award className="text-primary" size={20} />
                                Achievements
                            </h4>
                            <span className="text-sm text-muted-foreground">{achievements.filter(a => a.unlocked).length}/{achievements.length}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {achievements.map(ach => (
                                <div
                                    key={ach.id}
                                    className={`p-4 rounded-lg border text-center transition ${ach.unlocked
                                        ? 'border-primary/30 bg-primary/5'
                                        : 'border-border bg-secondary/20 opacity-50'
                                        }`}
                                >
                                    <div className="text-3xl mb-2">{ach.icon}</div>
                                    <div className="font-semibold text-sm mb-1">{ach.name}</div>
                                    <div className="text-xs text-muted-foreground">{ach.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Statistics Tab */}
            {activeTab === 'stats' && (
                <div className="space-y-6">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-6 rounded-xl border border-border bg-gradient-to-br from-blue-500/10 to-blue-500/5">
                            <div className="text-3xl font-bold text-blue-500 mb-2">{stats.totalPractice}</div>
                            <div className="text-sm text-muted-foreground">Latihan</div>
                        </div>
                        <div className="p-6 rounded-xl border border-border bg-gradient-to-br from-green-500/10 to-green-500/5">
                            <div className="text-3xl font-bold text-green-500 mb-2">{stats.totalTryout}</div>
                            <div className="text-sm text-muted-foreground">Tryout</div>
                        </div>
                        <div className="p-6 rounded-xl border border-border bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
                            <div className="text-3xl font-bold text-yellow-500 mb-2">{stats.avgScore}</div>
                            <div className="text-sm text-muted-foreground">Rata-rata</div>
                        </div>
                        <div className="p-6 rounded-xl border border-border bg-gradient-to-br from-orange-500/10 to-orange-500/5">
                            <div className="text-3xl font-bold text-orange-500 mb-2">{stats.studyStreak}</div>
                            <div className="text-sm text-muted-foreground">Hari Streak</div>
                        </div>
                    </div>

                    {/* Progress per Category */}
                    <div className="rounded-xl border border-border bg-card p-6">
                        <h4 className="font-bold text-lg mb-6">Progress per Kategori</h4>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium">TWK (Tes Wawasan Kebangsaan)</span>
                                    <span className="text-sm text-muted-foreground">75%</span>
                                </div>
                                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full" style={{ width: '75%' }} />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium">TIU (Tes Intelegensi Umum)</span>
                                    <span className="text-sm text-muted-foreground">82%</span>
                                </div>
                                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" style={{ width: '82%' }} />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium">TKP (Tes Karakteristik Pribadi)</span>
                                    <span className="text-sm text-muted-foreground">68%</span>
                                </div>
                                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full" style={{ width: '68%' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-card p-6">
                        <h4 className="font-bold text-lg mb-4">Aktivitas Terkini</h4>
                        <div className="space-y-3">
                            {recentActivity.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                            <Trophy size={18} className="text-primary" />
                                        </div>
                                        <div>
                                            <div className="font-medium">{item.activity}</div>
                                            <div className="text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                        </div>
                                    </div>
                                    {item.score !== null && (
                                        <div className="text-lg font-bold text-primary">{item.score}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="space-y-6">
                    <div className="rounded-xl border border-border bg-card p-6">
                        <h4 className="font-bold text-lg mb-4">Pengaturan Akun</h4>
                        <div className="space-y-4">
                            <button
                                onClick={() => setShowPasswordModal(true)}
                                className="w-full text-left p-4 rounded-lg border border-border hover:bg-secondary transition"
                            >
                                <div className="font-medium mb-1">Ubah Password</div>
                                <div className="text-sm text-muted-foreground">Update password akun Anda</div>
                            </button>
                            <button
                                onClick={() => setShowNotificationModal(true)}
                                className="w-full text-left p-4 rounded-lg border border-border hover:bg-secondary transition"
                            >
                                <div className="font-medium mb-1">Notifikasi</div>
                                <div className="text-sm text-muted-foreground">Atur preferensi notifikasi</div>
                            </button>
                            <button className="w-full text-left p-4 rounded-lg border border-red-500/20 hover:bg-red-500/5 transition text-red-500">
                                <div className="font-medium mb-1">Hapus Akun</div>
                                <div className="text-sm opacity-70">Hapus akun dan semua data Anda</div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Settings Modal */}
            {showNotificationModal && (
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
            )}

            {/* Password Change Modal */}
            {showPasswordModal && (
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
            )}

            {/* Image Preview Modal */}
            {showImagePreview && (
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
            )}
        </div>
    )
}
