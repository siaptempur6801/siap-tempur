import { type Dispatch, type SetStateAction, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, Camera, Edit, Eye, Loader2, Mail, Save, Target, Ticket, X } from 'lucide-react'
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

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return
        const file = event.target.files[0]
        const reader = new FileReader()
        reader.addEventListener('load', () => setSelectedImage(reader.result?.toString() || null))
        reader.readAsDataURL(file)
        event.target.value = ''
    }

    const onCropComplete = async (croppedBlob: Blob) => {
        try {
            setIsUploading(true)
            setSelectedImage(null)
            const fileName = `${user.id}-${crypto.randomUUID()}.jpg`
            const supabase = createClient()
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, croppedBlob, {
                    upsert: true,
                    contentType: 'image/jpeg',
                })
            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
            const result = await updateProfileInfo({ avatar_url: publicUrl })
            if (result.success) {
                setProfile({ ...profile, avatar_url: publicUrl })
                toast.success('Foto profil berhasil diperbarui')
                router.refresh()
            } else {
                toast.error('Foto profil belum bisa disimpan')
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
            const result = await updateProfileInfo({
                full_name: editedName,
                bio: editedBio,
                phone_number: editedPhone,
                birth_date: editedBirthDate,
                gender: editedGender,
                education_level: editedEducation,
                target_instance: editedTarget,
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
                    target_instance: editedTarget,
                })
                setIsEditing(false)
                toast.success('Profil berhasil diperbarui')
                router.refresh()
            } else {
                toast.error(result.error || 'Profil belum bisa diperbarui')
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
            <section className="st-card-md bg-white p-5 md:p-7">
                <div className="grid gap-7 md:grid-cols-[9rem_1fr]">
                    <div>
                        <div className="group relative mx-auto h-32 w-32 md:mx-0">
                            <button
                                type="button"
                                onClick={() => setShowImagePreview(true)}
                                aria-label="Lihat foto profil"
                                className="st-focus relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-[var(--st-ink)] bg-blue-50 text-4xl font-black shadow-[3px_3px_0_var(--st-ink)]"
                            >
                                {profile.avatar_url ? (
                                    <Image src={profile.avatar_url} alt="Foto profil" fill priority className="object-cover" sizes="128px" />
                                ) : (
                                    <span>{(user.email || 'U')[0].toUpperCase()}</span>
                                )}
                                <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 transition group-hover:opacity-100"><Eye size={25} /></span>
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                aria-label="Ganti foto profil"
                                className="st-focus absolute -bottom-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[var(--st-ink)] bg-[var(--st-yellow)] shadow-[2px_2px_0_var(--st-ink)] disabled:opacity-50"
                            >
                                {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                            </button>
                        </div>
                        <div className="mt-4 text-center md:text-left">
                            <span className="st-pill bg-[var(--st-yellow)]">Level {level}</span>
                        </div>
                    </div>

                    <div className="min-w-0">
                        {isEditing ? (
                            <div className="space-y-5">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field label="Nama lengkap" full>
                                        <input className="st-input" value={editedName} onChange={(e) => setEditedName(e.target.value)} placeholder="Nama lengkap" />
                                    </Field>
                                    <Field label="Bio" full>
                                        <textarea className="st-input min-h-28 resize-y" value={editedBio} onChange={(e) => setEditedBio(e.target.value)} placeholder="Ceritakan sedikit tentang target belajarmu" />
                                    </Field>
                                    <Field label="No. handphone">
                                        <input type="tel" className="st-input" value={editedPhone} onChange={(e) => setEditedPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
                                    </Field>
                                    <Field label="Tanggal lahir">
                                        <input type="date" className="st-input" value={editedBirthDate} onChange={(e) => setEditedBirthDate(e.target.value)} />
                                    </Field>
                                    <Field label="Jenis kelamin">
                                        <select className="st-input" value={editedGender} onChange={(e) => setEditedGender(e.target.value)}>
                                            <option value="">Pilih</option>
                                            <option value="Laki-laki">Laki-laki</option>
                                            <option value="Perempuan">Perempuan</option>
                                        </select>
                                    </Field>
                                    <Field label="Pendidikan terakhir">
                                        <select className="st-input" value={editedEducation} onChange={(e) => setEditedEducation(e.target.value)}>
                                            <option value="">Pilih</option>
                                            <option value="SMA/SMK">SMA/SMK</option>
                                            <option value="D3">D3</option>
                                            <option value="S1">S1/D4</option>
                                            <option value="S2">S2</option>
                                        </select>
                                    </Field>
                                    <Field label="Instansi tujuan" full>
                                        <input className="st-input" value={editedTarget} onChange={(e) => setEditedTarget(e.target.value)} placeholder="Contoh: Kemenkumham" />
                                    </Field>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <button type="button" onClick={handleSave} disabled={isPending} className="st-button inline-flex min-h-11 items-center gap-2 bg-green-500 px-5 py-2.5 font-black disabled:opacity-50">
                                        {isPending ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />} {isPending ? 'Menyimpan...' : 'Simpan perubahan'}
                                    </button>
                                    <button type="button" onClick={cancelEditing} disabled={isPending} className="st-button inline-flex min-h-11 items-center gap-2 bg-white px-5 py-2.5 font-black disabled:opacity-50">
                                        <X size={17} /> Batal
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Profil utama</p>
                                        <h2 className="st-heading mt-1 text-3xl">{profile.full_name || 'Nama belum diatur'}</h2>
                                        <p className="st-muted mt-2 max-w-2xl font-semibold leading-relaxed">{profile.bio || 'Tambahkan bio singkat agar profilmu lebih lengkap.'}</p>
                                    </div>
                                    <button type="button" onClick={() => setIsEditing(true)} className="st-button inline-flex min-h-11 items-center gap-2 bg-blue-50 px-4 py-2 text-sm font-black">
                                        <Edit size={16} /> Edit profil
                                    </button>
                                </div>

                                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                    <InfoCard icon={<Mail size={18} />} label="Email" value={user.email || '-'} tone="bg-blue-50" />
                                    <InfoCard icon={<Calendar size={18} />} label="Bergabung" value={createdAt} tone="bg-green-50" />
                                    <InfoCard label="No. handphone" value={profile.phone_number || '-'} tone="bg-yellow-50" />
                                    <InfoCard icon={<Target size={18} />} label="Target instansi" value={profile.target_instance || '-'} tone="bg-cyan-50" />
                                    <InfoCard label="Pendidikan" value={profile.education_level || '-'} tone="bg-purple-50" />
                                    <InfoCard label="Tanggal lahir" value={profile.birth_date ? new Date(profile.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '-'} tone="bg-orange-50" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="st-card flex flex-col gap-4 bg-green-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center border-2 border-[var(--st-ink)] bg-[var(--st-yellow)]"><Ticket size={23} /></div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-green-800">Token CPNS</p>
                        <h3 className="st-heading text-xl">{profile.tryout_quota ?? 0} token tersisa</h3>
                        <p className="st-muted mt-0.5 text-sm font-semibold">Gunakan pada sesi yang menampilkan kebutuhan token sebelum dimulai.</p>
                    </div>
                </div>
                <Link href="/cpns/dashboard/beli-paket" className="st-button inline-flex min-h-11 items-center justify-center bg-blue-600 px-5 py-2.5 text-sm font-black text-white">Lihat paket token</Link>
            </section>

            <section aria-label="Klaim voucher">
                <VoucherClaim onSuccessClaim={() => window.location.reload()} />
            </section>

            {showImagePreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setShowImagePreview(false)}>
                    <div className="relative w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
                        <button type="button" onClick={() => setShowImagePreview(false)} aria-label="Tutup preview foto" className="st-focus absolute -top-12 right-0 flex h-11 w-11 items-center justify-center text-white"><X size={24} /></button>
                        <div className="overflow-hidden border-2 border-white bg-white">
                            {profile.avatar_url ? (
                                <Image src={profile.avatar_url} alt="Foto profil diperbesar" width={1200} height={1200} unoptimized className="max-h-[80vh] h-auto w-full object-contain" />
                            ) : (
                                <div className="flex aspect-square items-center justify-center bg-blue-600 text-8xl font-black text-white">{(user.email || 'U')[0].toUpperCase()}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {selectedImage && <ImageCropper imageSrc={selectedImage} onCancel={() => setSelectedImage(null)} onCropComplete={onCropComplete} />}
        </div>
    )
}

function Field({ label, full = false, children }: { label: string; full?: boolean; children: React.ReactNode }) {
    return <label className={full ? 'sm:col-span-2' : ''}><span className="mb-1.5 block text-sm font-black">{label}</span>{children}</label>
}

function InfoCard({ icon, label, value, tone }: { icon?: React.ReactNode; label: string; value: string; tone: string }) {
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
