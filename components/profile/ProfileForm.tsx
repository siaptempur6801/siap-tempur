'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { updateProfile } from '@/app/actions/profile'
import { updatePassword } from '@/app/auth/actions'
import { toast } from 'sonner'
import { Camera, Loader2, Save, User, Target, Bell, Shield, Crown, Sparkles, CreditCard, ChevronDown, Eye, X, Lock } from 'lucide-react'
import { signout } from '@/app/auth/actions'
import Image from 'next/image'

export default function ProfileForm({ user, profile }: any) {
    const [loading, setLoading] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url)
    const [uploading, setUploading] = useState(false)
    const [isViewModalOpen, setIsViewModalOpen] = useState(false)
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)

    const supabase = createClient()

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true)
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.')
            }

            const file = event.target.files[0]
            const fileExt = file.name.split('.').pop()
            const filePath = `${user.id}-${Math.random()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) {
                throw uploadError
            }

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
            setAvatarUrl(data.publicUrl)

        } catch (error) {
            toast.error('Gagal mengupload avatar!')
            console.log(error)
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async (formData: FormData) => {
        setLoading(true)
        if (avatarUrl) {
            formData.set('avatarUrl', avatarUrl)
        }
        try {
            const result = await updateProfile(formData)
            if (result?.error) {
                toast.error(`Gagal memperbarui profil: ${result.error}`)
            } else {
                toast.success('Profil berhasil diperbarui!', {
                    description: 'Data Anda telah tersimpan dengan aman.'
                })

                // DATA UPDATED: Re-schedule notification
                const enabled = formData.get('reminderEnabled') === 'on'
                const time = formData.get('reminderTime') as string
                if (enabled && time) {
                    scheduleNotification(time)
                }
            }
        } catch (e) {
            toast.error('Terjadi kesalahan yang tidak diketahui.')
        } finally {
            setLoading(false)
        }
    }

    // --- NOTIFICATION LOGIC ---
    // Request permission on mount if enabled

    useEffect(() => {
        if (profile?.reminder_enabled && Notification.permission !== 'granted') {
            Notification.requestPermission()
        }

        if (profile?.reminder_enabled && profile?.reminder_time) {
            scheduleNotification(profile.reminder_time)
        }
    }, [profile])

    const scheduleNotification = (time: string) => {
        if (Notification.permission !== 'granted') {
            Notification.requestPermission()
        }

        // Clear existing timeouts if we had a proper manager, 
        // but for now simplest is just check time match or set simple timeout

        const [hours, minutes] = time.split(':').map(Number)
        const now = new Date()
        const scheduledTime = new Date()
        scheduledTime.setHours(hours, minutes, 0, 0)

        if (scheduledTime <= now) {
            // If time passed today, schedule for tomorrow
            scheduledTime.setDate(scheduledTime.getDate() + 1)
        }

        const timeout = scheduledTime.getTime() - now.getTime()

        console.log(`Notification scheduled for ${time} (in ${timeout / 1000 / 60} minutes)`)

        // Clear previous if possible (stored in ref), omitting here for brevity
        setTimeout(() => {
            new Notification("Waktunya Belajar CPNS! 📚", {
                body: "Target skor 450+ menantimu. Yuk latihan soal sekarang!",
                icon: "/icon.png" // Placeholder
            })
        }, timeout)
    }

    return (
        <>
            <form
                key={profile?.updated_at}
                action={handleSubmit}
                className="space-y-6 max-w-5xl mx-auto pb-20"
            >

                {/* 1. DATA DIRI */}
                <section className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="bg-secondary/30 p-4 border-b border-border flex items-center gap-2 font-semibold">
                        <User size={18} className="text-primary" />
                        <h3>Data Diri</h3>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row gap-8 items-start">
                            {/* Avatar */}
                            <div className="relative group mx-auto sm:mx-0 w-32 h-32">
                                <div className="w-full h-full rounded-full overflow-hidden bg-secondary border-2 border-border relative">
                                    {avatarUrl ? (
                                        <Image
                                            src={avatarUrl}
                                            alt="Avatar"
                                            fill
                                            className="object-cover"
                                            priority
                                            unoptimized
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-muted-foreground">{user.email?.[0].toUpperCase()}</div>
                                    )}

                                    {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-30"><Loader2 className="animate-spin text-white" /></div>}

                                    {/* Hover Overlay for View */}
                                    {avatarUrl && !uploading && (
                                        <div
                                            onClick={() => setIsViewModalOpen(true)}
                                            className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer z-10 backdrop-blur-[1px]"
                                        >
                                            <Eye className="text-white drop-shadow-md transform scale-0 group-hover:scale-110 transition-transform duration-300" size={32} />
                                        </div>
                                    )}
                                </div>

                                {/* Floating Upload Button */}
                                <label
                                    htmlFor="avatar-upload"
                                    className="absolute bottom-0 right-0 p-2.5 bg-primary text-white rounded-full cursor-pointer hover:bg-primary/90 transition shadow-lg ring-4 ring-background z-20 hover:scale-105 active:scale-95"
                                    title="Ganti Foto"
                                >
                                    <Camera size={18} />
                                    <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
                                </label>
                            </div>



                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Nama Lengkap</label>
                                    <input name="fullName" defaultValue={profile?.full_name || ''} className="w-full p-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 transition-all outline-none" placeholder="Masukkan nama lengkap" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email</label>
                                    <input disabled defaultValue={user.email} className="w-full p-3 rounded-lg border border-input bg-secondary/50 text-muted-foreground cursor-not-allowed" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-medium">Pendidikan Terakhir (Opsional)</label>
                                    <input name="education" defaultValue={profile?.education || ''} className="w-full p-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 transition-all outline-none" placeholder="Contoh: S1 Teknik Informatika" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. STATUS KEANGGOTAAN (NEW SECTION) */}
                <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-secondary/30 p-4 border-b border-border flex items-center gap-2 font-semibold">
                        <CreditCard size={18} className="text-blue-500" />
                        <h3>Status Keanggotaan</h3>
                    </div>
                    <div className="p-6">
                        <div className={`flex flex-col md:flex-row items-center justify-between p-6 rounded-xl border transition-all ${profile?.subscription_status === 'premium'
                            ? 'bg-gradient-to-r from-yellow-500/10 via-orange-500/5 to-transparent border-yellow-500/30'
                            : 'bg-secondary/20 border-border'
                            }`}>
                            <div className="flex items-center gap-6 mb-4 md:mb-0">
                                <div className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center ${profile?.subscription_status === 'premium'
                                    ? 'bg-gradient-to-br from-yellow-400 to-orange-600 text-white shadow-lg shadow-orange-500/20'
                                    : 'bg-secondary border border-border text-muted-foreground'
                                    }`}>
                                    {profile?.subscription_status === 'premium' ? <Crown size={28} fill="currentColor" /> : <User size={28} />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className={`font-bold text-xl ${profile?.subscription_status === 'premium' ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground'
                                            }`}>
                                            {profile?.subscription_status === 'premium' ? 'Premium VIP Member' : 'Akun Basic (Free)'}
                                        </h4>
                                        {profile?.subscription_status === 'premium' && <Sparkles size={20} className="text-yellow-500 animate-pulse" />}
                                    </div>
                                    <p className="text-muted-foreground mt-1 max-w-md">
                                        {profile?.subscription_status === 'premium'
                                            ? 'Selamat! Anda memiliki akses penuh ke seluruh fitur, materi video eksklusif, dan Tryout Akbar.'
                                            : 'Saat ini Anda menggunakan fitur dasar. Upgrade untuk membuka 5000+ Bank Soal dan Materi Video.'}
                                    </p>
                                </div>
                            </div>

                            {/* Action Button */}
                            <div>
                                {profile?.subscription_status !== 'premium' ? (
                                    <button type="button" className="bg-gradient-to-r from-primary to-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:shadow-primary/25 hover:scale-105 transition-all">
                                        Upgrade Premium
                                    </button>
                                ) : (
                                    <div className="px-4 py-2 bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 rounded-lg text-sm font-medium">
                                        Aktif Seumur Hidup
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. TARGET & PREFERENSI */}
                <section className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="bg-secondary/30 p-4 border-b border-border flex items-center gap-2 font-semibold">
                        <Target size={18} className="text-accent" />
                        <h3>Target & Preferensi</h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Target Skor SKD</label>
                            <div className="relative">
                                <input type="number" name="targetScore" defaultValue={profile?.target_score || 450} className="w-full p-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-accent/20 transition-all outline-none" min="0" max="550" />
                                <span className="absolute right-3 top-3 text-xs text-muted-foreground">/ 550</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Target Belajar (Jam/Hari)</label>
                            <div className="relative">
                                <select name="studyHours" defaultValue={profile?.study_hours_per_day || 1} className="w-full p-3 pr-10 rounded-lg border border-input bg-background focus:ring-2 focus:ring-accent/20 transition-all outline-none appearance-none cursor-pointer">
                                    <option value="1">1 Jam</option>
                                    <option value="2">2 Jam</option>
                                    <option value="3">3 Jam</option>
                                    <option value="4">4+ Jam</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tahun CPNS</label>
                            <div className="relative">
                                <select name="cpnsYear" defaultValue={profile?.cpns_year || 2024} className="w-full p-3 pr-10 rounded-lg border border-input bg-background focus:ring-2 focus:ring-accent/20 transition-all outline-none appearance-none cursor-pointer">
                                    <option value="2024">2024</option>
                                    <option value="2025">2025</option>
                                    <option value="2026">2026</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* 5. NOTIFIKASI */}
                <section className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="bg-secondary/30 p-4 border-b border-border flex items-center gap-2 font-semibold">
                        <Bell size={18} className="text-yellow-500" />
                        <h3>Notifikasi</h3>
                    </div>
                    <div className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <input type="checkbox" name="reminderEnabled" defaultChecked={profile?.reminder_enabled} className="w-5 h-5 accent-yellow-500" />
                            <div>
                                <label className="font-medium text-lg">Reminder Harian</label>
                                <p className="text-sm text-muted-foreground">Dapatkan pengingat untuk tetap konsisten belajar.</p>
                            </div>
                        </div>
                        <div>
                            <input type="time" name="reminderTime" defaultValue={profile?.reminder_time || '19:00'} className="p-2.5 rounded-lg border border-input bg-background focus:ring-2 focus:ring-yellow-500/20 outline-none" />
                        </div>
                    </div>
                </section>

                {/* 6. KEAMANAN */}
                <section className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="bg-secondary/30 p-4 border-b border-border flex items-center gap-2 font-semibold">
                        <Shield size={18} className="text-red-500" />
                        <h3>Keamanan Akun</h3>
                    </div>
                    <div className="p-6 flex flex-col md:flex-row gap-6 justify-between items-center">
                        <div className="max-w-xl">
                            <p className="text-muted-foreground">
                                Keamanan akun Anda adalah prioritas kami. Ganti password secara berkala untuk mencegah akses yang tidak diinginkan.
                            </p>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto shrink-0">
                            {/* Placeholder for Change Password Logic */}
                            <button type="button" onClick={() => setIsPasswordModalOpen(true)} className="px-6 py-2.5 border border-border rounded-lg font-medium hover:bg-secondary transition w-full md:w-auto">
                                Ganti Password
                            </button>
                        </div>
                    </div>
                </section>

                <div className="sticky bottom-4 z-10 flex justify-end">
                    <button
                        type="submit"
                        disabled={loading || uploading}
                        className="flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-full font-bold shadow-xl shadow-primary/20 hover:bg-primary/90 hover:scale-105 transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                        Simpan Perubahan
                    </button>
                </div>

            </form >

            {/* Image Preview Modal */}
            {
                isViewModalOpen && avatarUrl && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsViewModalOpen(false)}>
                        <div className="relative max-w-3xl w-full max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => setIsViewModalOpen(false)}
                                className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition"
                            >
                                <X size={24} />
                            </button>
                            <img src={avatarUrl} alt="Full Avatar" className="w-full h-full object-contain bg-black/50" />
                        </div>
                    </div>
                )
            }

            {/* Password Change Modal */}
            {
                isPasswordModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-4 border-b border-border flex items-center justify-between">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <Lock size={18} className="text-primary" />
                                    Ganti Password
                                </h3>
                                <button onClick={() => setIsPasswordModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                                    <X size={20} />
                                </button>
                            </div>
                            <form
                                action={async (formData) => {
                                    const p1 = formData.get('password') as string
                                    const p2 = formData.get('confirmPassword') as string

                                    if (p1 !== p2) {
                                        toast.error('Password tidak sama!')
                                        return
                                    }

                                    if (p1.length < 6) {
                                        toast.error('Password minimal 6 karakter!')
                                        return
                                    }

                                    const result = await updatePassword(formData)
                                    if (result?.error) {
                                        toast.error(result.error)
                                    } else {
                                        toast.success('Password berhasil diganti!')
                                        setIsPasswordModalOpen(false)
                                    }
                                }}
                                className="p-6 space-y-4"
                            >
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Password Baru</label>
                                    <input type="password" name="password" required className="w-full p-3 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-primary/20" placeholder="Minimal 6 karakter" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Ulangi Password Baru</label>
                                    <input type="password" name="confirmPassword" required className="w-full p-3 rounded-lg border border-input bg-background outline-none focus:ring-2 focus:ring-primary/20" placeholder="Ketik ulang password" />
                                </div>
                                <div className="pt-2">
                                    <button type="submit" className="w-full bg-primary text-white py-3 rounded-lg font-bold shadow-lg hover:bg-primary/90 transition">
                                        Simpan Password
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </>
    )
}
