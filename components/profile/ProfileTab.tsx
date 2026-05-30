import { type Dispatch, type SetStateAction, useState, useRef, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Edit, Camera, Save, X, Loader2, Eye, Zap, Ticket, Mail, Calendar, Target } from 'lucide-react'
import { toast } from 'sonner'
import ImageCropper from '@/components/ui/ImageCropper'
import VoucherClaim from '@/components/VoucherClaim'
import { updateProfileInfo } from '@/app/actions/profile'
import { createClient } from '@/lib/utils/supabase/client'

type Profile = {
    id: string
    full_name: string | null
    bio: string | null
    phone_number?: string | null
    birth_date?: string | null
    gender?: string | null
    education_level?: string | null
    target_instance?: string | null
    avatar_url: string | null
    tryout_quota?: number
}

type UserProfile = {
    id: string
    email?: string
    created_at: string
}

interface ProfileTabProps {
    profile: Profile
    setProfile: Dispatch<SetStateAction<Profile>>
    user: UserProfile
    level: number
}

export function ProfileTab({ profile, setProfile, user, level }: ProfileTabProps) {
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)
    const [isPending, startTransition] = useTransition()

    const [editedName, setEditedName] = useState(profile.full_name || '')
    const [editedBio, setEditedBio] = useState(profile.bio || '')
    const [editedPhone, setEditedPhone] = useState(profile.phone_number || '')
    const [editedBirthDate, setEditedBirthDate] = useState(profile.birth_date || '')
    const [editedGender, setEditedGender] = useState(profile.gender || '')
    const [editedEducation, setEditedEducation] = useState(profile.education_level || '')
    const [editedTarget, setEditedTarget] = useState(profile.target_instance || '')

    const [showImagePreview, setShowImagePreview] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const createdAt = new Date(user.created_at).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Jakarta',
    })

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return
        const file = e.target.files[0]
        const reader = new FileReader()
        reader.addEventListener('load', () => setSelectedImage(reader.result?.toString() || null))
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    const onCropComplete = async (croppedBlob: Blob) => {
        try {
            setIsUploading(true)
            setSelectedImage(null)

            const fileExt = 'jpg'
            const fileName = `${user.id}-${crypto.randomUUID()}.${fileExt}`
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
        } catch (error) {
            console.error('Upload error:', error)
            toast.error('Gagal mengupload foto.')
        } finally {
            setIsUploading(false)
        }
    }

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

    return (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            {/* Profile Card */}
            <div className="bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 md:p-8 relative transform rotate-0 hover:rotate-0">
                <div className="absolute -top-3 left-8 w-16 h-6 bg-yellow-200/80 rotate-[-5deg] shadow-sm"></div>
                <div className="absolute -top-3 right-8 w-16 h-6 bg-blue-200/80 rotate-[5deg] shadow-sm"></div>

                <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                    {/* Avatar Section */}
                    <div className="shrink-0">
                        <div className="relative w-32 h-32 mx-auto md:mx-0 group">
                            <div className="w-full h-full rounded-full border-4 border-gray-900 bg-linear-to-br from-yellow-100 to-pink-100 flex items-center justify-center text-4xl font-bold overflow-hidden cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] relative">
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
                                    <span className="text-gray-900">{(user.email || 'U')[0].toUpperCase()}</span>
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
                                <span className="text-base font-bold text-gray-900">Level {level}</span>
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
                                        <Save size={16} /> {isPending ? 'Menyimpan...' : 'Simpan'}
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
                                        <X size={16} /> Batal
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
                                        <div className="p-2 bg-pink-200 border-2 border-gray-900"><Mail size={18} className="text-gray-900" /></div>
                                        <div className="overflow-hidden">
                                            <div className="text-sm text-gray-500 font-bold">Email</div>
                                            <div className="font-bold text-base text-gray-900 wrap-break-word">{user.email || '-'}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 border-2 border-gray-300">
                                        <div className="p-2 bg-green-200 border-2 border-gray-900"><Calendar size={18} className="text-gray-900" /></div>
                                        <div>
                                            <div className="text-sm text-gray-500 font-bold">Bergabung</div>
                                            <div className="font-bold text-base text-gray-900">{createdAt}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 border-2 border-gray-300">
                                        <div className="p-2 bg-yellow-200 border-2 border-gray-900"><span className="font-black text-xs">HP</span></div>
                                        <div>
                                            <div className="text-sm text-gray-500 font-bold">No. Handphone</div>
                                            <div className="font-bold text-base text-gray-900">{profile.phone_number || '-'}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 border-2 border-gray-300">
                                        <div className="p-2 bg-blue-200 border-2 border-gray-900"><Target size={18} className="text-gray-900" /></div>
                                        <div>
                                            <div className="text-sm text-gray-500 font-bold">Target Instansi</div>
                                            <div className="font-bold text-base text-gray-900">{profile.target_instance || '-'}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 border-2 border-gray-300">
                                        <div className="p-2 bg-purple-200 border-2 border-gray-900"><span className="font-black text-xs">EDU</span></div>
                                        <div>
                                            <div className="text-sm text-gray-500 font-bold">Pendidikan</div>
                                            <div className="font-bold text-base text-gray-900">{profile.education_level || '-'}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 border-2 border-gray-300">
                                        <div className="p-2 bg-orange-200 border-2 border-gray-900"><span className="font-black text-xs">TGL</span></div>
                                        <div>
                                            <div className="text-sm text-gray-500 font-bold">Tanggal Lahir</div>
                                            <div className="font-bold text-base text-gray-900">
                                                {profile.birth_date ? new Date(profile.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '-'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Quota Card */}
            <div className="bg-green-200 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 relative transform rotate-1 mt-4">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-4 bg-blue-400 rounded-b-sm shadow-sm"></div>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-yellow-300 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <Ticket className="w-8 h-8 text-gray-900" />
                        </div>
                        <div>
                            <h4 className="font-bold text-xl text-gray-900">Kuota Tryout</h4>
                            <p className="text-base text-gray-700">Sisa tiket untuk mengerjakan tryout</p>
                        </div>
                    </div>
                    <div className="flex items-stretch gap-4">
                        <div className="text-center px-6 py-3 bg-white border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] min-w-[120px] flex flex-col justify-center">
                            <div className="text-2xl font-bold text-green-600 leading-none mb-1">{profile.tryout_quota ?? 0}</div>
                            <div className="text-[10px] text-gray-600 font-extrabold uppercase tracking-tight">Token SKD</div>
                        </div>
                        <Link
                            href="/cpns/dashboard/beli-paket"
                            className="px-6 py-3 bg-orange-400 text-gray-900 font-bold border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center"
                        >
                            + Beli Kuota
                        </Link>
                    </div>
                </div>
            </div>

            {/* Voucher Claim Section */}
            <div className="mt-6 relative z-20">
                <VoucherClaim
                    userId={user.id}
                    userEmail={user.email || ''}
                    onSuccessClaim={() => window.location.reload()}
                />
            </div>

            {/* Image Preview Modal */}
            {showImagePreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowImagePreview(false)}>
                    <div className="relative max-w-2xl w-full">
                        <button onClick={() => setShowImagePreview(false)} className="absolute -top-12 right-0 p-2 text-white">
                            <X size={24} />
                        </button>
                        <div className="rounded-2xl overflow-hidden bg-linear-to-br from-primary/20 to-accent/20 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                            {profile.avatar_url ? (
                                <Image
                                    src={profile.avatar_url}
                                    alt="Avatar Preview"
                                    width={1200}
                                    height={1200}
                                    unoptimized
                                    className="w-full h-auto max-h-[80vh] object-contain"
                                />
                            ) : (
                                <div className="w-96 h-96 flex items-center justify-center">
                                    <span className="text-9xl font-bold text-white">{(user.email || 'U')[0].toUpperCase()}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {selectedImage && (
                <ImageCropper
                    imageSrc={selectedImage}
                    onCancel={() => setSelectedImage(null)}
                    onCropComplete={onCropComplete}
                />
            )}
        </div>
    )
}
