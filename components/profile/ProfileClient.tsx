'use client'

import { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { User, Mail, Calendar, Shield, Trophy, Zap, Clock, Edit, Camera, Save, X, Loader2, ClipboardList, Ticket, Coins, Lock, Trash2, BookOpen, Eye, Target, CreditCard, ShoppingCart, FileText, Settings } from 'lucide-react'
import ImageCropper from '@/components/ui/ImageCropper'
import { updateProfileInfo, deleteAccount } from '@/app/actions/profile'
import { signout, updatePassword } from '@/app/auth/actions'
import { syncPaymentStatus } from '@/app/actions/payment'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import { PageAnimateContainer, PageAnimateItem } from '@/components/ui/PageAnimate'
import PaperBackground from '@/components/PaperBackground'
import VoucherClaim from '@/components/VoucherClaim'

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
    status: 'pending' | 'settlement' | 'expire' | 'cancel' | 'deny'
    package_name: string
    order_id: string
    snap_token?: string
}

type UsageSession = {
    id: string
    start_time: string
    mode: string
}

export default function ProfileClient({
    profile: initialProfile,
    user,
    transactions,
    usageSessions,
    totalXP,
    level
}: {
    profile: Profile,
    user: UserData,
    transactions: Transaction[],
    usageSessions: UsageSession[],
    totalXP: number,
    level: number
}) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'settings'>('profile')
    const [isEditing, setIsEditing] = useState(false)
    const [editedName, setEditedName] = useState(initialProfile.full_name || '')
    const [editedBio, setEditedBio] = useState(initialProfile.bio || '')
    const [editedPhone, setEditedPhone] = useState(initialProfile.phone_number || '')
    const [editedBirthDate, setEditedBirthDate] = useState(initialProfile.birth_date || '')
    const [editedGender, setEditedGender] = useState(initialProfile.gender || '')
    const [editedEducation, setEditedEducation] = useState(initialProfile.education_level || '')
    const [editedTarget, setEditedTarget] = useState(initialProfile.target_instance || '')
    const [showImagePreview, setShowImagePreview] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [profile, setProfile] = useState(initialProfile)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')

    // Avatar upload state
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    // Stats filter removed

    const [selectedImage, setSelectedImage] = useState<string | null>(null)

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return
        const file = e.target.files[0]
        const reader = new FileReader()
        reader.addEventListener('load', () => {
            setSelectedImage(reader.result?.toString() || null)
        })
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    const onCropComplete = async (croppedBlob: Blob) => {
        try {
            setIsUploading(true)
            setSelectedImage(null)

            const fileExt = 'jpg'
            const fileName = `${user.id}-${Math.random()}.${fileExt}`
            const filePath = `${fileName}`

            const supabase = createClient()
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, croppedBlob, {
                    upsert: true,
                    contentType: 'image/jpeg'
                })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            const result = await updateProfileInfo({ avatar_url: publicUrl })

            if (result.success) {
                setProfile({ ...profile, avatar_url: publicUrl })
                toast.success('Foto profil berhasil diperbarui!')
                router.refresh()
            } else {
                toast.error('Gagal memperbarui database')
            }
        } catch (error: any) {
            console.error('Upload error:', error)
            toast.error('Gagal mengupload foto.')
        } finally {
            setIsUploading(false)
        }
    }

    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isChangingPassword, setIsChangingPassword] = useState(false)

    const handlePayPending = (token: string, orderId: string, event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const loadingId = toast.loading("Membuka pembayaran...");

        if (typeof window !== "undefined" && window.snap) {
            try {
                window.snap.pay(token, {
                    onSuccess: async function (result: any) {
                        toast.loading("Memverifikasi pembayaran...", { id: loadingId })
                        await syncPaymentStatus(orderId)
                        toast.success("Pembayaran Berhasil!", {
                            id: loadingId,
                            description: "Tiket tryout kamu telah ditambahkan."
                        })
                        window.location.reload()
                    },
                    onPending: async function (result: any) {
                        toast.loading("Memperbarui status...", { id: loadingId })
                        await syncPaymentStatus(orderId)
                        toast.info("Pembayaran Tertunda", {
                            id: loadingId,
                            description: "Silakan selesaikan pembayaran sesuai instruksi."
                        })
                        window.location.reload()
                    },
                    onError: function (result: any) {
                        toast.dismiss(loadingId)
                        toast.error("Pembayaran Gagal")
                    },
                    onClose: async function () {
                        toast.loading("Memperiksa status terakhir...", { id: loadingId })
                        await syncPaymentStatus(orderId)
                        toast.info("Pembayaran Ditutup", { id: loadingId })
                        window.location.reload()
                    }
                })
            } catch (err: any) {
                toast.dismiss(loadingId)
                toast.error("Gagal memuat popup Snap", { description: err.message })
            }
        } else {
            toast.dismiss(loadingId)
            toast.error("Sistem pembayaran sedang disiapkan. Memuat ulang...", {
                description: "Mohon tunggu sebentar..."
            })
            setTimeout(() => {
                window.location.reload()
            }, 1000)
        }
    }



    const createdAt = new Date(user.created_at).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    const tabs = [
        { id: 'profile', label: 'Profil', icon: <User size={18} /> },
        { id: 'history', label: 'Riwayat', icon: <Clock size={18} /> },
        { id: 'settings', label: 'Pengaturan', icon: <Shield size={18} /> }
    ] as const

    const displayLevel = level

    const handleSave = async () => {
        startTransition(async () => {
            const result = await updateProfileInfo({
                full_name: editedName,
                bio: editedBio,
                phone_number: editedPhone,
                birth_date: editedBirthDate,
                gender: editedGender,
                education_level: editedEducation,
                target_instance: editedTarget
            })

            if (result.success) {
                setProfile({
                    ...profile,
                    full_name: editedName,
                    bio: editedBio,
                    phone_number: editedPhone,
                    birth_date: editedBirthDate,
                    gender: editedGender,
                    education_level: editedEducation,
                    target_instance: editedTarget
                })
                setIsEditing(false)
                toast.success('Profil berhasil diperbarui!')
                router.refresh()
            } else {
                toast.error(result.error || 'Gagal memperbarui profil')
            }
        })
    }

    const handleChangePassword = async () => {
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
        if (!oldPassword) {
            toast.error('Harap isi password lama')
            return
        }

        setIsChangingPassword(true)
        const formData = new FormData()
        formData.append('password', newPassword)
        formData.append('oldPassword', oldPassword)

        const result = await updatePassword(formData)
        setIsChangingPassword(false)

        if (result.success) {
            toast.success('Password berhasil diubah! Silakan login kembali.')
            setShowPasswordModal(false)
            setOldPassword('')
            setNewPassword('')
            setConfirmPassword('')

            setTimeout(async () => {
                await signout()
                window.location.href = '/'
            }, 1500)
        } else {
            toast.error(result.error || 'Gagal mengubah password')
        }
    }



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
                </PageAnimateItem>

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                        {/* Profile Card - Notebook Style */}
                        <div className="bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 md:p-8 relative transform rotate-0 hover:rotate-0">
                            <div className="absolute -top-3 left-8 w-16 h-6 bg-yellow-200/80 rotate-[-5deg] shadow-sm"></div>
                            <div className="absolute -top-3 right-8 w-16 h-6 bg-blue-200/80 rotate-[5deg] shadow-sm"></div>

                            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                                {/* Avatar Section */}
                                <div className="flex-shrink-0">
                                    <div className="relative w-32 h-32 mx-auto md:mx-0 group">
                                        <div className="w-full h-full rounded-full border-4 border-gray-900 bg-gradient-to-br from-yellow-100 to-pink-100 flex items-center justify-center text-4xl font-bold overflow-hidden cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] relative">
                                            {profile.avatar_url ? (
                                                <Image
                                                    src={profile.avatar_url}
                                                    alt="Avatar"
                                                    fill
                                                    priority
                                                    className="object-cover"
                                                    sizes="(max-width: 768px) 128px, 128px"
                                                />
                                            ) : (
                                                <span className="text-gray-900">{user.email[0].toUpperCase()}</span>
                                            )}
                                        </div>
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
                                    <div className="mt-4 text-center">
                                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-300 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rotate-1">
                                            <Zap size={16} className="text-orange-600" />
                                            <span className="text-base font-bold text-gray-900">Level {displayLevel}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Info Section */}
                                <div className="flex-1 space-y-4">
                                    {isEditing ? (
                                        <>
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

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-base text-gray-700 mb-2 block font-bold">No. Handphone</label>
                                                    <input
                                                        type="tel"
                                                        value={editedPhone}
                                                        onChange={(e) => setEditedPhone(e.target.value)}
                                                        className="w-full px-4 py-3 border-2 border-gray-900 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                                        placeholder="081234567890"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-base text-gray-700 mb-2 block font-bold">Tanggal Lahir</label>
                                                    <input
                                                        type="date"
                                                        value={editedBirthDate}
                                                        onChange={(e) => setEditedBirthDate(e.target.value)}
                                                        className="w-full px-4 py-3 border-2 border-gray-900 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-base text-gray-700 mb-2 block font-bold">Jenis Kelamin</label>
                                                    <select
                                                        value={editedGender}
                                                        onChange={(e) => setEditedGender(e.target.value)}
                                                        className="w-full px-4 py-3 border-2 border-gray-900 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] appearance-none"
                                                    >
                                                        <option value="">Pilih Jenis Kelamin</option>
                                                        <option value="Laki-laki">Laki-laki</option>
                                                        <option value="Perempuan">Perempuan</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-base text-gray-700 mb-2 block font-bold">Pendidikan Terakhir</label>
                                                    <select
                                                        value={editedEducation}
                                                        onChange={(e) => setEditedEducation(e.target.value)}
                                                        className="w-full px-4 py-3 border-2 border-gray-900 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] appearance-none"
                                                    >
                                                        <option value="">Pilih Pendidikan</option>
                                                        <option value="SMA/SMK">SMA/SMK</option>
                                                        <option value="D3">D3</option>
                                                        <option value="S1">S1/D4</option>
                                                        <option value="S2">S2</option>
                                                    </select>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="text-base text-gray-700 mb-2 block font-bold">Instansi Tujuan</label>
                                                    <input
                                                        type="text"
                                                        value={editedTarget}
                                                        onChange={(e) => setEditedTarget(e.target.value)}
                                                        className="w-full px-4 py-3 border-2 border-gray-900 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                                        placeholder="Contoh: Kemenkumham, STAN, IPDN"
                                                    />
                                                </div>
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
                                                        setEditedPhone(profile.phone_number || '')
                                                        setEditedBirthDate(profile.birth_date || '')
                                                        setEditedGender(profile.gender || '')
                                                        setEditedEducation(profile.education_level || '')
                                                        setEditedTarget(profile.target_instance || '')
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
                                                    <div className="overflow-hidden">
                                                        <div className="text-sm text-gray-500 font-bold">Email</div>
                                                        <div className="font-bold text-base text-gray-900 break-words">{user.email}</div>
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
                                                {/* New Fields Display with Placeholders */}
                                                <div className="flex items-center gap-3 p-3 bg-gray-50 border-2 border-gray-300">
                                                    <div className="p-2 bg-yellow-200 border-2 border-gray-900">
                                                        <span className="font-black text-xs">HP</span>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm text-gray-500 font-bold">No. Handphone</div>
                                                        <div className="font-bold text-base text-gray-900">{profile.phone_number || '-'}</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 p-3 bg-gray-50 border-2 border-gray-300">
                                                    <div className="p-2 bg-blue-200 border-2 border-gray-900">
                                                        <Target size={18} className="text-gray-900" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm text-gray-500 font-bold">Target Instansi</div>
                                                        <div className="font-bold text-base text-gray-900">{profile.target_instance || '-'}</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 p-3 bg-gray-50 border-2 border-gray-300">
                                                    <div className="p-2 bg-purple-200 border-2 border-gray-900">
                                                        <span className="font-black text-xs">EDU</span>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm text-gray-500 font-bold">Pendidikan</div>
                                                        <div className="font-bold text-base text-gray-900">{profile.education_level || '-'}</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 p-3 bg-gray-50 border-2 border-gray-300">
                                                    <div className="p-2 bg-orange-200 border-2 border-gray-900">
                                                        <span className="font-black text-xs">TGL</span>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm text-gray-500 font-bold">Tanggal Lahir</div>
                                                        <div className="font-bold text-base text-gray-900">
                                                            {profile.birth_date
                                                                ? new Date(profile.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                                                                : '-'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Quota Card - Sticky Note Style */}
                        <div className="bg-green-200 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 relative transform rotate-1 mt-4">
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-4 bg-blue-400 rounded-b-sm shadow-sm"></div>
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-yellow-300 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        <Ticket className="w-8 h-8 text-gray-900" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xl text-gray-900">Kuota Tryout</h4>
                                        <p className="text-base text-gray-700">
                                            Sisa tiket untuk mengerjakan tryout
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-stretch gap-4">
                                    <div className="text-center px-6 py-3 bg-white border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] min-w-[120px] flex flex-col justify-center">
                                        <div className="text-2xl font-bold text-green-600 leading-none mb-1">{profile.tryout_quota ?? 0}</div>
                                        <div className="text-[10px] text-gray-600 font-extrabold uppercase tracking-tight">Token SKD</div>
                                    </div>
                                    <Link href="/dashboard/beli-paket" className="px-6 py-3 bg-orange-400 text-gray-900 font-bold border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center">
                                        + Beli Kuota
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Voucher Claim Section */}
                        <div className="mt-6 relative z-20">
                            <VoucherClaim
                                userId={user.id}
                                onSuccessClaim={() => {
                                    // Refresh window to fetch new profile data with updated quota
                                    window.location.reload()
                                }}
                            />
                        </div>

                    </div>
                )
                }

                {/* Statistics Tab Removed */}

                {/* History Tab */}
                {
                    activeTab === 'history' && (
                        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                            <div className="bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 relative">
                                <div className="absolute -top-3 left-8 w-14 h-5 bg-green-200/80 rotate-[-2deg] shadow-sm"></div>
                                <h4 className="font-bold text-xl mb-6 text-gray-900 flex items-center gap-2">
                                    <CreditCard className="w-6 h-6" /> Riwayat Pembelian Kuota
                                </h4>
                                {transactions.length > 0 ? (
                                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                        {transactions.map((tx) => (
                                            <div key={tx.id} className="w-full shrink-0 p-5 bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all relative overflow-hidden group">
                                                <div className="flex items-center justify-between gap-4 relative z-10">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-blue-100 border-2 border-gray-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 group-hover:rotate-12 transition-transform">
                                                            <Coins className="w-6 h-6 text-gray-900" />
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-lg text-gray-900 mb-1">{tx.package_name}</div>
                                                            <div className="flex items-center gap-2 text-sm text-gray-600 font-bold">
                                                                <Calendar size={14} />
                                                                {new Date(tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-black text-xl text-gray-900">Rp {tx.amount.toLocaleString('id-ID')}</div>
                                                        {(() => {
                                                            const isLocallyExpired = tx.status === 'pending' && (new Date().getTime() - new Date(tx.created_at).getTime() > 15 * 60 * 1000);
                                                            const computedStatus = isLocallyExpired ? 'expire' : tx.status;

                                                            const statusMap: Record<string, { label: string; color: string }> = {
                                                                'settlement': { label: 'Berhasil', color: 'bg-green-300' },
                                                                'capture': { label: 'Berhasil', color: 'bg-green-300' },
                                                                'pending': { label: 'Menunggu', color: 'bg-yellow-300' },
                                                                'expire': { label: 'Kedaluwarsa', color: 'bg-gray-300' },
                                                                'cancel': { label: 'Batal', color: 'bg-red-300' },
                                                                'deny': { label: 'Gagal', color: 'bg-red-300' },
                                                            }
                                                            const s = statusMap[computedStatus] || { label: computedStatus, color: 'bg-blue-100' }

                                                            return (
                                                                <>
                                                                    <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 border border-gray-900 inline-block mt-2 shadow-sm ${s.color} transform ${['settlement', 'capture'].includes(computedStatus) ? '-rotate-2' : 'rotate-2'}`}>
                                                                        {s.label}
                                                                    </div>
                                                                    {computedStatus === 'pending' && tx.snap_token && (
                                                                        <div className="mt-3">
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => handlePayPending(tx.snap_token!, tx.order_id, e)}
                                                                                className="px-4 py-2 bg-blue-400 text-gray-900 text-sm font-bold border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-500 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer relative z-20 pointer-events-auto"
                                                                            >
                                                                                Bayar Sekarang
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )
                                                        })()}
                                                    </div>
                                                </div>
                                                {/* Decorative background pattern */}
                                                <div className="absolute top-0 right-0 w-24 h-full bg-gray-50 -skew-x-12 border-l-2 border-gray-100 -z-0"></div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-300 bg-gray-50">
                                        <div className="w-16 h-16 bg-green-200 border-2 border-gray-900 flex items-center justify-center mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                            <ShoppingCart className="w-8 h-8 text-gray-900" />
                                        </div>
                                        <p className="text-lg font-bold text-gray-700 mb-2">Belum ada pembelian</p>
                                        <p className="text-sm text-gray-500 mb-4">Riwayat pembelian kuota akan muncul di sini</p>
                                        <Link href="/dashboard/beli-paket" className="px-5 py-2.5 bg-green-400 text-gray-900 font-bold border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all">
                                            Beli Kuota Sekarang
                                        </Link>
                                    </div>
                                )}
                            </div>
                            <div className="bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 relative">
                                <div className="absolute -top-3 right-8 w-14 h-5 bg-orange-200/80 rotate-[2deg] shadow-sm"></div>
                                <h4 className="font-bold text-xl mb-6 text-gray-900 flex items-center gap-2">
                                    <Ticket className="w-6 h-6" /> Riwayat Pemakaian Kuota
                                </h4>
                                {usageSessions.length > 0 ? (
                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {usageSessions.map((session) => (
                                            <div key={session.id} className="flex flex-col shrink-0 sm:flex-row sm:items-center justify-between p-4 bg-gray-50 border-2 border-gray-300 hover:border-gray-900 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all gap-3 sm:gap-0">
                                                <div className="flex items-start sm:items-center gap-4">
                                                    <div className="w-12 h-12 bg-orange-200 border-2 border-gray-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0">
                                                        <FileText className="w-6 h-6 text-gray-900" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-base text-gray-900">
                                                            {session.mode === 'tryout' ? 'Tryout SKD Full' : 'Latihan Soal'}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {new Date(session.start_time).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="pl-[64px] sm:pl-0">
                                                    <span className="text-base font-bold text-red-500 bg-red-100 px-3 py-1 border-2 border-gray-900 inline-block">
                                                        -1 Tiket
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-300 bg-gray-50">
                                        <div className="w-16 h-16 bg-orange-200 border-2 border-gray-900 flex items-center justify-center mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                            <ClipboardList className="w-8 h-8 text-gray-900" />
                                        </div>
                                        <p className="text-lg font-bold text-gray-700 mb-2">Belum ada pemakaian</p>
                                        <p className="text-sm text-gray-500">Riwayat pemakaian kuota akan muncul di sini</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }

                {/* Settings Tab */}
                {
                    activeTab === 'settings' && (
                        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                            <div className="bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 relative">
                                <div className="absolute -top-3 right-8 w-14 h-5 bg-purple-200/80 rotate-[3deg] shadow-sm"></div>
                                <h4 className="font-bold text-xl mb-6 text-gray-900 flex items-center gap-2">
                                    <Settings className="w-6 h-6" /> Pengaturan Akun
                                </h4>
                                <div className="space-y-4">
                                    <button
                                        onClick={() => setShowPasswordModal(true)}
                                        className="w-full text-left p-4 bg-gray-50 border-2 border-gray-300 hover:border-gray-900 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all group"
                                    >
                                        <div className="font-bold text-base mb-1 text-gray-900 group-hover:text-blue-600 flex items-center gap-2">
                                            <Lock className="w-4 h-4" /> Ubah Password
                                        </div>
                                        <div className="text-sm text-gray-600">Update password akun Anda</div>
                                    </button>

                                    <button
                                        onClick={() => setShowDeleteModal(true)}
                                        className="w-full text-left p-4 bg-red-50 border-2 border-red-300 hover:border-red-600 hover:shadow-[2px_2px_0px_0px_rgba(220,38,38,1)] transition-all group"
                                    >
                                        <div className="font-bold text-base mb-1 text-red-600 flex items-center gap-2">
                                            <Trash2 className="w-4 h-4" /> Hapus Akun
                                        </div>
                                        <div className="text-sm text-red-400">Hapus akun dan semua data Anda</div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Modals */}
                {
                    showPasswordModal && (
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                            onClick={() => setShowPasswordModal(false)}
                        >
                            <div
                                className="relative max-w-md w-full bg-[#fdfbf7] p-8 border-2 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none -rotate-1"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-blue-101/80 border-l border-r border-white/50 shadow-sm rotate-2"></div>
                                <div className="flex items-center justify-between mb-8 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-yellow-300 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                            <Shield size={24} className="text-gray-900" />
                                        </div>
                                        <h3 className="text-2xl font-bold font-handwriting text-gray-900">Ubah Password</h3>
                                    </div>
                                    <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-red-100 transition rounded-full">
                                        <X size={24} className="text-gray-900" />
                                    </button>
                                </div>
                                <div className="space-y-6 font-handwriting">
                                    <div>
                                        <label className="text-lg font-bold text-gray-900 mb-2 block">Password Lama</label>
                                        <input
                                            type="password"
                                            value={oldPassword}
                                            onChange={(e) => setOldPassword(e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-gray-900 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-lg"
                                            placeholder="Masukkan password saat ini"
                                            disabled={isChangingPassword}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-lg font-bold text-gray-900 mb-2 block">Password Baru</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-gray-900 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-lg"
                                            placeholder="Minimal 8 karakter"
                                            disabled={isChangingPassword}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-lg font-bold text-gray-900 mb-2 block">Konfirmasi Password Baru</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-gray-900 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-lg"
                                            placeholder="Ketik ulang password baru"
                                            disabled={isChangingPassword}
                                        />
                                    </div>
                                    <div className="flex gap-4 pt-4">
                                        <button onClick={handleChangePassword} disabled={isChangingPassword} className="flex-1 px-6 py-3 bg-blue-400 text-gray-900 font-bold border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 font-handwriting text-xl">
                                            {isChangingPassword ? 'Mengubah...' : 'Ubah Password'}
                                        </button>
                                        <button onClick={() => { setShowPasswordModal(false); setOldPassword(''); setNewPassword(''); setConfirmPassword(''); }} disabled={isChangingPassword} className="px-6 py-3 bg-white text-gray-900 font-bold border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 font-handwriting text-xl">
                                            Batal
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    showImagePreview && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowImagePreview(false)}>
                            <div className="relative max-w-2xl w-full">
                                <button onClick={() => setShowImagePreview(false)} className="absolute -top-12 right-0 p-2 text-white">
                                    <X size={24} />
                                </button>
                                <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                                    {profile.avatar_url ? (
                                        <img src={profile.avatar_url} alt="Avatar Preview" className="w-full h-auto max-h-[80vh] object-contain" />
                                    ) : (
                                        <div className="w-96 h-96 flex items-center justify-center">
                                            <span className="text-9xl font-bold text-white">{user.email[0].toUpperCase()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    selectedImage && (
                        <ImageCropper
                            imageSrc={selectedImage}
                            onCancel={() => setSelectedImage(null)}
                            onCropComplete={onCropComplete}
                        />
                    )
                }

                {/* Delete Account Modal */}
                {
                    showDeleteModal && (
                        <div
                            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
                            onClick={() => !isDeleting && setShowDeleteModal(false)}
                        >
                            <div
                                className="relative max-w-md w-full bg-white p-8 border-4 border-gray-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] rounded-none rotate-1"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-40 h-10 bg-red-500 border-2 border-gray-900 shadow-sm flex items-center justify-center -rotate-2">
                                    <span className="text-white font-black uppercase tracking-widest text-sm">Peringatan Keras!</span>
                                </div>

                                <div className="flex flex-col items-center text-center mt-6 space-y-4">
                                    <div className="w-20 h-20 bg-red-100 border-2 border-gray-900 flex items-center justify-center rounded-full shadow-[4px_4px_0px_0px_rgba(220,38,38,0.2)]">
                                        <Trash2 size={40} className="text-red-600" />
                                    </div>

                                    <h3 className="text-3xl font-black text-gray-900">Hapus Akun?</h3>

                                    <div className="space-y-3 w-full">
                                        <p className="text-gray-600 font-bold italic leading-relaxed">
                                            "Tindakan ini tidak bisa dibatalkan."
                                        </p>
                                        <div className="bg-red-50 p-4 border-2 border-red-100 rounded-xl space-y-2">
                                            <p className="text-sm font-black text-red-800">Efek Penghapusan:</p>
                                            <ul className="text-xs text-red-700 font-bold space-y-1 text-left list-disc pl-4">
                                                <li>Semua riwayat ujian akan hilang</li>
                                                <li>Sisa kuota tryout akan hangus</li>
                                                <li>Data profil akan dihapus permanen</li>
                                                <li>Akses login akan dicabut selamanya</li>
                                            </ul>
                                        </div>

                                        <div className="pt-2">
                                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block text-left">
                                                Ketik <span className="text-red-600">HAPUS</span> untuk konfirmasi
                                            </label>
                                            <input
                                                type="text"
                                                value={deleteConfirmText}
                                                onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                                                className="w-full px-4 py-3 border-2 border-gray-900 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center font-black text-xl tracking-widest outline-none focus:bg-red-50 focus:border-red-600 transition-colors"
                                                placeholder="Ketik di sini..."
                                                disabled={isDeleting}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col w-full gap-3 pt-4">
                                        <button
                                            onClick={async () => {
                                                if (deleteConfirmText !== 'HAPUS') return
                                                setIsDeleting(true)
                                                try {
                                                    const res = await deleteAccount()
                                                    if (res.success) {
                                                        toast.success('Akun berhasil dihapus. Sampai jumpa!')
                                                        setTimeout(() => {
                                                            window.location.href = '/login'
                                                        }, 2000)
                                                    } else {
                                                        toast.error(res.error || 'Gagal menghapus akun')
                                                        setIsDeleting(false)
                                                    }
                                                } catch (err) {
                                                    toast.error('Terjadi kesalahan sistem')
                                                    setIsDeleting(false)
                                                }
                                            }}
                                            disabled={isDeleting || deleteConfirmText !== 'HAPUS'}
                                            className="w-full py-4 bg-red-600 text-white font-black text-xl border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                                        >
                                            {isDeleting ? <Loader2 className="animate-spin" /> : <Shield size={22} />}
                                            Ya, Hapus Permanen
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowDeleteModal(false)
                                                setDeleteConfirmText('')
                                            }}
                                            disabled={isDeleting}
                                            className="w-full py-3 bg-white text-gray-700 font-bold border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 transition disabled:opacity-50"
                                        >
                                            Batalkan
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </PageAnimateContainer >
        </div>
    )
}

