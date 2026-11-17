import { type Dispatch, type SetStateAction, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, Camera, Edit, Eye, Loader2, Mail, Save, Target, Ticket, X } from 'lucide-react'
import { toast } from 'sonner'
import ImageCropper from '@/components/ui/ImageCropper'
import VoucherClaim from '@/components/VoucherClaim'
import { saveProfileAvatar, updateProfileInfo } from '@/app/actions/profile'
import { createV2Client } from '@/lib/utils/supabase/client'
import { cn } from '@/lib/utils'
import { useProfileNavigation } from './useProfileNavigation'

const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024
const ALLOWED_SOURCE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function genderLabel(value: string | null) {
    if (value === 'male') return 'Laki-laki'
    if (value === 'female') return 'Perempuan'
    return ''
}

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
    const { isTka, purchasePath, level: tkaLevel } = useProfileNavigation()
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

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return
        const file = event.target.files[0]
        event.target.value = ''

        if (!ALLOWED_SOURCE_IMAGE_TYPES.has(file.type)) {
            toast.error('Format foto harus JPG, PNG, atau WebP.')
            return
        }
        if (file.size > MAX_SOURCE_IMAGE_BYTES) {
            toast.error('Ukuran foto maksimal 10 MB.')
            return
        }

        const reader = new FileReader()
        reader.addEventListener('load', () => setSelectedImage(reader.result?.toString() || null))
        reader.addEventListener('error', () => toast.error('Foto belum bisa dibaca. Pilih file lain.'))
        reader.readAsDataURL(file)
    }

    const onCropComplete = async (croppedBlob: Blob) => {
        try {
            setIsUploading(true)
            setSelectedImage(null)
            const fileName = `${user.id}/avatar-${crypto.randomUUID()}.jpg`
            const supabase = createV2Client()
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, croppedBlob, {
                    upsert: false,
                    contentType: 'image/jpeg',
                    cacheControl: '3600',
                })
            if (uploadError) throw uploadError

            const result = await saveProfileAvatar(fileName)
            if (result.success && result.avatarUrl) {
                setProfile((current) => ({ ...current, avatar_url: result.avatarUrl! }))
                toast.success('Foto profil berhasil diperbarui')
                router.refresh()
            } else {
                toast.error(result.error || 'Foto profil belum bisa disimpan')
            }
        } catch (error) {
            console.error('Upload error:', error)
            toast.error('Foto belum bisa diunggah. Coba lagi.')
        } finally {
            setIsUploading(false)
        }
    }

    const handleSave = async () => {
        startTransition(async () => {
            try {
                const result = await updateProfileInfo({
                    full_name: editedName,
                    bio: editedBio,
                    phone_number: editedPhone,
                    birth_date: editedBirthDate,
                    gender: editedGender,
                    ...(!isTka ? { education_level: editedEducation, target_instance: editedTarget } : {}),
                })

                if (!result.success || !result.profile) {
                    toast.error(result.error || 'Profil belum bisa diperbarui')
                    return
                }

                const saved = result.profile
                const savedGender = genderLabel(saved.gender)
                setProfile((current) => ({
                    ...current,
                    full_name: saved.full_name,
                    bio: saved.bio,
                    phone_number: saved.phone,
                    birth_date: saved.birth_date,
                    gender: savedGender,
                    education_level: saved.education_level,
                    target_instance: saved.target_instance,
                }))
                setEditedName(saved.full_name)
                setEditedBio(saved.bio || '')
                setEditedPhone(saved.phone || '')
                setEditedBirthDate(saved.birth_date || '')
                setEditedGender(savedGender)
                setEditedEducation(saved.education_level || '')
                setEditedTarget(saved.target_instance || '')
                setIsEditing(false)
                toast.success('Profil berhasil diperbarui')
                router.refresh()
            } catch {
                toast.error('Profil belum bisa diperbarui. Coba lagi.')
            }
        })
    }

    const cancelEditing = () => {
        setIsEditing(false)
        setEditedName(profile.full_name || '')
        setEditedBio(profile.bio || '')
        setEditedPhone(profile.phone_number || '')
        setEditedBirthDate(profile.birth_date || '')
        setEditedGender(profile.gender || '')
        setEditedEducation(profile.education_level || '')
        setEditedTarget(profile.target_instance || '')
    }

    return (
        <div className="space-y-6">
            <section className={isTka ? 'rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs' : 'st-card-md bg-white p-5 md:p-7'}>
                <div className="grid gap-7 md:grid-cols-[9rem_1fr]">
                    <div>
                        <div className="group relative mx-auto h-32 w-32 md:mx-0">
                            <button
                                type="button"
                                onClick={() => setShowImagePreview(true)}
                                aria-label="Lihat foto profil"
                                className={cn(
                                    'st-focus relative flex h-full w-full items-center justify-center overflow-hidden rounded-full',
                                    isTka
                                        ? 'border-2 border-indigo-100 bg-indigo-50/80 text-3xl font-bold text-indigo-700 shadow-xs'
                                        : 'border-2 border-[var(--st-ink)] bg-blue-50 text-4xl font-black st-shadow-sm'
                                )}
                            >
                                {profile.avatar_url ? (
                                    <Image src={profile.avatar_url} alt="Foto profil" fill priority className="object-cover" sizes="128px" />
                                ) : (
                                    <span>{(user.email || 'U')[0].toUpperCase()}</span>
                                )}
                                <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 transition group-hover:opacity-100"><Eye size={25} /></span>
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                aria-label="Ganti foto profil"
                                className={cn(
                                    'st-focus absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full transition disabled:opacity-50',
                                    isTka
                                        ? 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700'
                                        : 'border-2 border-[var(--st-ink)] bg-[var(--st-yellow)] st-shadow-sm'
                                )}
                            >
                                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                            </button>
                        </div>
                        <div className="mt-4 text-center md:text-left">
                            <span className={isTka ? 'rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200 shadow-2xs' : 'st-pill bg-[var(--st-yellow)]'}>
                                Level {level}
                            </span>
                        </div>
                    </div>

                    <div className="min-w-0">
                        {isEditing ? (
                            <div className="space-y-5">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field label="Nama lengkap" full isTka={isTka}>
                                        <input className={isTka ? 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs' : 'st-input'} value={editedName} onChange={(e) => setEditedName(e.target.value)} placeholder="Nama lengkap" minLength={2} maxLength={100} required />
                                    </Field>
                                    <Field label="Bio" full isTka={isTka}>
                                        <textarea className={isTka ? 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium min-h-28 resize-y focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs' : 'st-input min-h-28 resize-y'} value={editedBio} onChange={(e) => setEditedBio(e.target.value)} placeholder="Ceritakan sedikit tentang target belajarmu" maxLength={500} />
                                    </Field>
                                    <Field label="No. handphone" isTka={isTka}>
                                        <input type="tel" className={isTka ? 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs' : 'st-input'} value={editedPhone} onChange={(e) => setEditedPhone(e.target.value)} placeholder="08xxxxxxxxxx" maxLength={30} autoComplete="tel" />
                                    </Field>
                                    <Field label="Tanggal lahir" isTka={isTka}>
                                        <input type="date" className={isTka ? 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs' : 'st-input'} value={editedBirthDate} min="1900-01-01" max={new Date().toISOString().slice(0, 10)} onChange={(e) => setEditedBirthDate(e.target.value)} />
                                    </Field>
                                    <Field label="Jenis kelamin" isTka={isTka}>
                                        <select className={isTka ? 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs' : 'st-input'} value={editedGender} onChange={(e) => setEditedGender(e.target.value)}>
                                            <option value="">Pilih</option>
                                            <option value="Laki-laki">Laki-laki</option>
                                            <option value="Perempuan">Perempuan</option>
                                        </select>
                                    </Field>
                                    {!isTka && <Field label="Pendidikan terakhir">
                                        <select className="st-input" value={editedEducation} onChange={(e) => setEditedEducation(e.target.value)}>
                                            <option value="">Pilih</option>
                                            <option value="SMA/SMK">SMA/SMK</option>
                                            <option value="D3">D3</option>
                                            <option value="S1">S1/D4</option>
                                            <option value="S2">S2</option>
                                        </select>
                                    </Field>}
                                    {!isTka && <Field label="Instansi tujuan" full>
                                        <input className="st-input" value={editedTarget} onChange={(e) => setEditedTarget(e.target.value)} placeholder="Contoh: Kemenkumham" maxLength={120} />
                                    </Field>}
                                </div>
                                <div className="flex flex-wrap gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={isPending}
                                        className={isTka
                                            ? 'inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-[0.98] disabled:opacity-50'
                                            : 'st-button inline-flex min-h-11 items-center gap-2 bg-green-500 px-5 py-2.5 font-black disabled:opacity-50'}
                                    >
                                        {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        <span>{isPending ? 'Menyimpan...' : 'Simpan perubahan'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={cancelEditing}
                                        disabled={isPending}
                                        className={isTka
                                            ? 'inline-flex min-h-11 items-center gap-2 rounded-xl bg-white hover:bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-700 border border-slate-200 transition disabled:opacity-50'
                                            : 'st-button inline-flex min-h-11 items-center gap-2 bg-white px-5 py-2.5 font-black disabled:opacity-50'}
                                    >
                                        <X size={16} />
                                        <span>Batal</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <p className={isTka ? 'text-xs font-black uppercase tracking-wider text-indigo-600' : 'text-xs font-black uppercase tracking-[0.14em] text-blue-700'}>
                                            {isTka ? 'Profil Siswa' : 'Profil utama'}
                                        </p>
                                        <h2 className={isTka ? 'mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl' : 'st-heading mt-1 text-3xl'}>
                                            {profile.full_name || 'Nama belum diatur'}
                                        </h2>
                                        <p className={isTka ? 'mt-1 text-sm text-slate-600 leading-relaxed' : 'st-muted mt-2 max-w-2xl font-semibold leading-relaxed'}>
                                            {profile.bio || 'Tambahkan bio singkat agar profil belajarmu lebih lengkap.'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(true)}
                                        className={isTka
                                            ? 'inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200 transition active:scale-[0.98]'
                                            : 'st-button inline-flex min-h-11 items-center gap-2 bg-blue-50 px-4 py-2 text-sm font-black'}
                                    >
                                        <Edit size={14} /> Edit profil
                                    </button>
                                </div>

                                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                    <InfoCard icon={<Mail size={17} />} label="Email" value={user.email || '-'} tone="bg-blue-50" isTka={isTka} />
                                    <InfoCard icon={<Calendar size={17} />} label="Bergabung" value={createdAt} tone="bg-green-50" isTka={isTka} />
                                    <InfoCard label="No. handphone" value={profile.phone_number || '-'} tone="bg-yellow-50" isTka={isTka} />
                                    {!isTka && <InfoCard icon={<Target size={17} />} label="Target instansi" value={profile.target_instance || '-'} tone="bg-blue-50" isTka={isTka} />}
                                    <InfoCard label={isTka ? 'Jenjang belajar' : 'Pendidikan'} value={isTka ? tkaLevel || '-' : profile.education_level || '-'} tone="bg-blue-50" isTka={isTka} />
                                    <InfoCard label="Tanggal lahir" value={profile.birth_date ? new Date(profile.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '-'} tone="bg-orange-50" isTka={isTka} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Token Balance Card */}
            <section className={isTka
                ? 'rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-blue-50/30 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'
                : 'st-card flex flex-col gap-4 bg-green-50 p-5 sm:flex-row sm:items-center sm:justify-between'}
            >
                <div className="flex items-center gap-4">
                    <div className={isTka
                        ? 'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs'
                        : 'flex h-12 w-12 items-center justify-center border-2 border-[var(--st-ink)] bg-[var(--st-yellow)]'}
                    >
                        <Ticket size={22} />
                    </div>
                    <div>
                        <p className={isTka ? 'text-[11px] font-bold uppercase tracking-wider text-indigo-700' : 'text-xs font-black uppercase tracking-[0.12em] text-green-800'}>
                            {isTka ? 'Token SiapTempur' : 'Token CPNS'}
                        </p>
                        <h3 className={isTka ? 'text-lg font-extrabold text-slate-950' : 'st-heading text-xl'}>
                            {profile.tryout_quota ?? 0} token tersisa
                        </h3>
                        <p className={isTka ? 'text-xs text-slate-500 font-medium' : 'st-muted mt-0.5 text-sm font-semibold'}>
                            {isTka ? 'Gunakan pada simulasi Tryout CAT dan modul latihan terpandu.' : 'Gunakan pada sesi yang menampilkan kebutuhan token sebelum dimulai.'}
                        </p>
                    </div>
                </div>
                <Link
                    href={purchasePath}
                    className={isTka
                        ? 'inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:shadow transition active:scale-[0.98]'
                        : 'st-button inline-flex min-h-11 items-center justify-center bg-blue-600 px-5 py-2.5 text-sm font-black text-white'}
                >
                    {isTka ? 'Beli / Tambah Token' : 'Lihat paket token'}
                </Link>
            </section>

            <section aria-label="Klaim voucher">
                <VoucherClaim onSuccessClaim={() => window.location.reload()} isTka={isTka} />
            </section>

            {showImagePreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setShowImagePreview(false)}>
                    <div className="relative w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
                        <button type="button" onClick={() => setShowImagePreview(false)} aria-label="Tutup preview foto" className="st-focus absolute -top-12 right-0 flex h-11 w-11 items-center justify-center text-white"><X size={24} /></button>
                        <div className="overflow-hidden rounded-2xl border border-white/20 bg-white">
                            {profile.avatar_url ? (
                                <Image src={profile.avatar_url} alt="Foto profil diperbesar" width={1200} height={1200} unoptimized className="max-h-[80vh] h-auto w-full object-contain" />
                            ) : (
                                <div className="flex aspect-square items-center justify-center bg-indigo-600 text-8xl font-black text-white">{(user.email || 'U')[0].toUpperCase()}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {selectedImage && <ImageCropper imageSrc={selectedImage} onCancel={() => setSelectedImage(null)} onCropComplete={onCropComplete} />}
        </div>
    )
}

function Field({ label, full = false, isTka = false, children }: { label: string; full?: boolean; isTka?: boolean; children: React.ReactNode }) {
    return (
        <label className={full ? 'sm:col-span-2' : ''}>
            <span className={isTka ? 'mb-1.5 block text-xs font-bold text-slate-700' : 'mb-1.5 block text-sm font-black'}>
                {label}
            </span>
            {children}
        </label>
    )
}

function InfoCard({ icon, label, value, tone, isTka = false }: { icon?: React.ReactNode; label: string; value: string; tone: string; isTka?: boolean }) {
    if (isTka) {
        return (
            <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 transition hover:border-indigo-100">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-700 shadow-2xs ring-1 ring-slate-200/60 text-xs font-bold">
                    {icon || label.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
                    <div className="break-words text-sm font-bold text-slate-900">{value}</div>
                </div>
            </div>
        )
    }
    return (
        <div className={`flex min-w-0 items-center gap-3 border-2 border-[var(--st-ink)] p-3 ${tone}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[var(--st-ink)] bg-white text-sm font-black">{icon || label.slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0">
                <div className="text-xs font-black uppercase tracking-wide text-gray-500">{label}</div>
                <div className="break-words text-sm font-bold text-gray-900">{value}</div>
            </div>
        </div>
    )
}
