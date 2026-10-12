import { type Dispatch, type SetStateAction, useId, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  Calendar,
  Camera,
  Edit,
  Eye,
  Loader2,
  Mail,
  Phone,
  Save,
  Target,
  Ticket,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import ImageCropper from '@/components/ui/ImageCropper'
import VoucherClaim from '@/components/VoucherClaim'
import { saveProfileAvatar, updateProfileInfo } from '@/app/actions/profile'
import { createV2Client } from '@/lib/utils/supabase/client'
import { cn } from '@/lib/utils'
import { useProfileNavigation } from './useProfileNavigation'
import DialogSurface from '@/components/ui/DialogSurface'
import { Button } from '@/components/ui/Button'

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
  const { isTka, purchasePath, accessPath, level: tkaLevel } = useProfileNavigation()
  const canPurchaseTkaPass = tkaLevel === 'SMP'
  const router = useRouter()
  const avatarPreviewTitleId = useId()
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [editedName, setEditedName] = useState(profile.full_name || '')
  const [editedBio, setEditedBio] = useState(profile.bio || '')
  const [editedPhone, setEditedPhone] = useState(profile.phone_number || '')
  const [editedBirthDate, setEditedBirthDate] = useState(profile.birth_date || '')
  const [editedGender, setEditedGender] = useState(profile.gender || '')
  const [editedEducation, setEditedEducation] = useState(profile.education_level || '')
  const [editedTarget, setEditedTarget] = useState(profile.target_instance || '')
  const [profileError, setProfileError] = useState('')
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const maxBirthDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

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
    setProfileError('')
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
          const message = result.error || 'Profil belum bisa diperbarui'
          setProfileError(message)
          toast.error(message)
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
        const message = 'Profil belum bisa diperbarui. Coba lagi.'
        setProfileError(message)
        toast.error(message)
      }
    })
  }

  const cancelEditing = () => {
    setProfileError('')
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
      <section
        className={
          isTka
            ? 'rounded-2xl border border-border-strong bg-white p-6 shadow-xs'
            : 'st-card-md bg-white p-5 md:p-7'
        }
      >
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
                    : 'border-2 border-[var(--st-ink)] bg-blue-50 text-4xl font-black st-shadow-sm',
                )}
              >
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt="Foto profil"
                    fill
                    priority
                    className="object-cover"
                    sizes="128px"
                  />
                ) : (
                  <span>{(user.email || 'U')[0].toUpperCase()}</span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 transition group-hover:opacity-100">
                  <Eye size={25} />
                </span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                aria-label="Ganti foto profil"
                className={cn(
                  'st-focus absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full transition disabled:opacity-50',
                  isTka
                    ? 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700'
                    : 'border-2 border-[var(--st-ink)] bg-[var(--st-yellow)] st-shadow-sm',
                )}
              >
                {isUploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Camera size={16} />
                )}
              </button>
            </div>
            <div className="mt-4 text-center md:text-left">
              <span
                className={
                  isTka
                    ? 'rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200 shadow-2xs'
                    : 'st-pill bg-[var(--st-yellow)]'
                }
              >
                Level {level}
              </span>
            </div>
          </div>

          <div className="min-w-0">
            {isEditing ? (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nama lengkap" full isTka={isTka}>
                    <input
                      className={
                        isTka
                          ? 'w-full rounded-xl border border-border-strong bg-white px-3.5 py-2.5 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs'
                          : 'st-input'
                      }
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      placeholder="Nama lengkap"
                      minLength={2}
                      maxLength={100}
                      required
                    />
                  </Field>
                  <Field label="Bio" full isTka={isTka}>
                    <textarea
                      className={
                        isTka
                          ? 'w-full rounded-xl border border-border-strong bg-white px-3.5 py-2.5 text-sm font-medium min-h-28 resize-y focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs'
                          : 'st-input min-h-28 resize-y'
                      }
                      value={editedBio}
                      onChange={(e) => setEditedBio(e.target.value)}
                      placeholder="Ceritakan sedikit tentang target belajarmu"
                      maxLength={500}
                    />
                  </Field>
                  <Field label="No. handphone" isTka={isTka}>
                    <input
                      type="tel"
                      className={
                        isTka
                          ? 'w-full rounded-xl border border-border-strong bg-white px-3.5 py-2.5 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs'
                          : 'st-input'
                      }
                      value={editedPhone}
                      onChange={(e) => setEditedPhone(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      maxLength={30}
                      autoComplete="tel"
                    />
                  </Field>
                  <Field label="Tanggal lahir" isTka={isTka}>
                    <input
                      type="date"
                      className={
                        isTka
                          ? 'w-full rounded-xl border border-border-strong bg-white px-3.5 py-2.5 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs'
                          : 'st-input'
                      }
                      value={editedBirthDate}
                      min="1900-01-01"
                      max={maxBirthDate}
                      onChange={(e) => setEditedBirthDate(e.target.value)}
                    />
                  </Field>
                  <Field label="Jenis kelamin" isTka={isTka}>
                    <select
                      className={
                        isTka
                          ? 'w-full rounded-xl border border-border-strong bg-white px-3.5 py-2.5 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs'
                          : 'st-input'
                      }
                      value={editedGender}
                      onChange={(e) => setEditedGender(e.target.value)}
                    >
                      <option value="">Pilih</option>
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </Field>
                  {!isTka && (
                    <Field label="Pendidikan terakhir">
                      <select
                        className="st-input"
                        value={editedEducation}
                        onChange={(e) => setEditedEducation(e.target.value)}
                      >
                        <option value="">Pilih</option>
                        <option value="SMA/SMK">SMA/SMK</option>
                        <option value="D3">D3</option>
                        <option value="S1">S1/D4</option>
                        <option value="S2">S2</option>
                      </select>
                    </Field>
                  )}
                  {!isTka && (
                    <Field label="Instansi tujuan" full>
                      <input
                        className="st-input"
                        value={editedTarget}
                        onChange={(e) => setEditedTarget(e.target.value)}
                        placeholder="Contoh: Kemenkumham"
                        maxLength={120}
                      />
                    </Field>
                  )}
                </div>
                {profileError && (
                  <p role="alert" className="text-sm font-semibold text-red-700">
                    {profileError}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={isPending}
                    variant="primary"
                    size="md"
                  >
                    {isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    <span>{isPending ? 'Menyimpan...' : 'Simpan perubahan'}</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={cancelEditing}
                    disabled={isPending}
                    variant="outline"
                    size="md"
                  >
                    <X size={16} />
                    <span>Batal</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p
                      className={
                        isTka
                          ? 'text-xs font-black uppercase tracking-wider text-indigo-600'
                          : 'text-xs font-black uppercase tracking-[0.14em] text-blue-700'
                      }
                    >
                      {isTka ? 'Profil Siswa' : 'Profil utama'}
                    </p>
                    <h2
                      className={
                        isTka
                          ? 'mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl'
                          : 'st-heading mt-1 text-3xl'
                      }
                    >
                      {profile.full_name || 'Nama belum diatur'}
                    </h2>
                    <p
                      className={
                        isTka
                          ? 'mt-1 text-sm text-slate-600 leading-relaxed'
                          : 'st-muted mt-2 max-w-2xl font-semibold leading-relaxed'
                      }
                    >
                      {profile.bio || 'Tambahkan bio singkat agar profil belajarmu lebih lengkap.'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    size="sm"
                  >
                    <Edit size={14} /> Edit profil
                  </Button>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <InfoCard
                    icon={<Mail size={17} />}
                    label="Email"
                    value={user.email || '-'}
                    tone="bg-slate-50/80"
                    isTka={isTka}
                  />
                  <InfoCard
                    icon={<Calendar size={17} />}
                    label="Bergabung"
                    value={createdAt}
                    tone="bg-slate-50/80"
                    isTka={isTka}
                  />
                  <InfoCard
                    icon={<Phone size={17} />}
                    label="No. handphone"
                    value={profile.phone_number || '-'}
                    tone="bg-slate-50/80"
                    isTka={isTka}
                  />
                  {!isTka && (
                    <InfoCard
                      icon={<Target size={17} />}
                      label="Target instansi"
                      value={profile.target_instance || '-'}
                      tone="bg-slate-50/80"
                      isTka={isTka}
                    />
                  )}
                  <InfoCard
                    icon={<BookOpen size={17} />}
                    label={isTka ? 'Jenjang belajar' : 'Pendidikan'}
                    value={isTka ? tkaLevel || '-' : profile.education_level || '-'}
                    tone="bg-slate-50/80"
                    isTka={isTka}
                  />
                  <InfoCard
                    icon={<Calendar size={17} />}
                    label="Tanggal lahir"
                    value={
                      profile.birth_date
                        ? new Date(profile.birth_date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            timeZone: 'Asia/Jakarta',
                          })
                        : '-'
                    }
                    tone="bg-slate-50/80"
                    isTka={isTka}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Token Balance Card */}
      {isTka ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-blue-50/30 p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Ticket size={22} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                Akses belajar TKA {tkaLevel}
              </p>
              <h3 className="text-lg font-extrabold text-slate-950">
                {canPurchaseTkaPass ? 'Kelola Tempur Pass' : 'Status Tempur Pass'}
              </h3>
              <p className="text-xs font-medium text-slate-500">
                {canPurchaseTkaPass
                  ? 'Lihat status, masa aktif, dan paket pass untuk jenjang ini.'
                  : `Lihat masa aktif pass. Pembelian baru TKA ${tkaLevel} belum tersedia saat alur tryout disiapkan.`}
              </p>
            </div>
          </div>
          <Button asChild size="md">
            <Link href={accessPath}>
              {canPurchaseTkaPass ? 'Lihat Tempur Pass' : 'Lihat status akses'}
            </Link>
          </Button>
        </section>
      ) : (
        <section className="st-card flex flex-col gap-4 bg-green-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center border-2 border-[var(--st-ink)] bg-[var(--st-yellow)]">
              <Ticket size={22} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-green-800">
                Token CPNS
              </p>
              <h3 className="st-heading text-xl">{profile.tryout_quota ?? 0} token tersisa</h3>
              <p className="st-muted mt-0.5 text-sm font-semibold">
                Gunakan pada sesi yang menampilkan kebutuhan token sebelum dimulai.
              </p>
            </div>
          </div>
          <Button asChild size="md">
            <Link href={purchasePath}>Lihat paket token</Link>
          </Button>
        </section>
      )}

      {!isTka && (
        <section aria-label="Klaim voucher">
          <VoucherClaim onSuccessClaim={() => window.location.reload()} isTka={false} />
        </section>
      )}

      {showImagePreview && (
        <DialogSurface
          isOpen
          onClose={() => setShowImagePreview(false)}
          labelledBy={avatarPreviewTitleId}
          className="relative max-w-2xl overflow-visible border-0 bg-transparent p-4 shadow-none backdrop:bg-black/80"
        >
          <div className="flex justify-end pb-3">
            <button
              type="button"
              onClick={() => setShowImagePreview(false)}
              aria-label="Tutup preview foto"
              data-autofocus
              className="st-focus flex h-11 w-11 items-center justify-center rounded-lg text-white hover:bg-white/15"
            >
              <X size={24} />
            </button>
          </div>
          <h2 id={avatarPreviewTitleId} className="sr-only">
            Foto profil
          </h2>
          <div className="overflow-hidden rounded-2xl border border-white/20 bg-white">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt="Foto profil diperbesar"
                width={1200}
                height={1200}
                unoptimized
                className="max-h-[80vh] h-auto w-full object-contain"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center bg-indigo-600 text-8xl font-black text-white">
                {(user.email || 'U')[0].toUpperCase()}
              </div>
            )}
          </div>
        </DialogSurface>
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

function Field({
  label,
  full = false,
  isTka = false,
  children,
}: {
  label: string
  full?: boolean
  isTka?: boolean
  children: React.ReactNode
}) {
  return (
    <label className={full ? 'sm:col-span-2' : ''}>
      <span
        className={
          isTka
            ? 'mb-1.5 block text-xs font-bold text-slate-700'
            : 'mb-1.5 block text-sm font-black'
        }
      >
        {label}
      </span>
      {children}
    </label>
  )
}

function InfoCard({
  icon,
  label,
  value,
  tone,
  isTka = false,
}: {
  icon?: React.ReactNode
  label: string
  value: string
  tone: string
  isTka?: boolean
}) {
  if (isTka) {
    return (
      <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 transition hover:border-indigo-100">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-700 shadow-2xs ring-1 ring-slate-200/60 text-xs font-bold">
          {icon || label.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {label}
          </div>
          <div className="break-words text-sm font-bold text-slate-900">{value}</div>
        </div>
      </div>
    )
  }
  return (
    <div className={`flex min-w-0 items-center gap-3 border-2 border-[var(--st-ink)] p-3 ${tone}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[var(--st-ink)] bg-white text-sm font-black">
        {icon || label.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-black uppercase tracking-wide text-gray-500">{label}</div>
        <div className="break-words text-sm font-bold text-gray-900">{value}</div>
      </div>
    </div>
  )
}
