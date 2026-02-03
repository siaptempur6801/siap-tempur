'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { updateProfile } from '@/app/actions/profile'
import { updatePassword } from '@/app/auth/actions'
import { toast } from 'sonner'
import { Camera, Loader2, Save, User, Shield, Crown, Sparkles, CreditCard, Eye, X, Lock } from 'lucide-react'
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
            console.error('[ProfileForm] Avatar upload error:', error)
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


            }
        } catch (e) {
            toast.error('Terjadi kesalahan yang tidak diketahui.')
        } finally {
            setLoading(false)
        }
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

                            </div>
                        </div>
                    </div>
                </section>

                {/* Quota section is handled in ProfileClient, no need for it here if redundant */}





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
