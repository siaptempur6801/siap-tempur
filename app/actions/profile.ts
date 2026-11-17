'use server'

import { createAdminClient, createClient, createV2Client } from '@/lib/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import { validateCsrf } from '@/lib/csrf'
import { passwordChangeSchema, profileInfoSchema } from '@/lib/validations/profile'
import type { Database } from '@/types/database.types'

const AVATAR_BUCKET = 'avatars'
const MAX_AVATAR_BYTES = 1024 * 1024

function isOwnedAvatarPath(path: string, userId: string) {
  return new RegExp(`^${userId}/avatar-[0-9a-f-]{36}\\.jpg$`, 'i').test(path)
}

function ownedAvatarPathFromUrl(value: string | null, userId: string) {
  if (!value) return null

  try {
    const pathname = new URL(value).pathname
    const prefix = `/storage/v1/object/public/${AVATAR_BUCKET}/`
    if (!pathname.startsWith(prefix)) return null
    const path = decodeURIComponent(pathname.slice(prefix.length))
    return isOwnedAvatarPath(path, userId) ? path : null
  } catch {
    return null
  }
}

export async function updateProfile(formData: FormData) {
  try {
    await validateCsrf()
  } catch {
    return { error: 'Invalid request' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const parsedProfile = profileInfoSchema.safeParse({
    full_name: String(formData.get('fullName') || ''),
    avatar_url: String(formData.get('avatarUrl') || ''),
  })

  if (!parsedProfile.success) {
    return { error: parsedProfile.error.issues[0]?.message || 'Data profil tidak valid' }
  }

  const updates: Database['public']['Tables']['profiles']['Update'] = {
    updated_at: new Date().toISOString(),
  }

  if (parsedProfile.data.full_name !== undefined) updates.full_name = parsedProfile.data.full_name
  if (parsedProfile.data.avatar_url !== undefined)
    updates.avatar_url = parsedProfile.data.avatar_url

  const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)

  if (error) {
    logger.error('Profile update failed', error, { userId: user.id })
    return { error: 'Gagal memperbarui profil' }
  }

  revalidatePath('/cpns/dashboard', 'layout')
  revalidatePath('/cpns/dashboard/profile')
  revalidatePath('/tka', 'layout')
  return { success: true }
}

export async function updateProfileInfo(data: {
  full_name?: string
  bio?: string
  phone_number?: string
  birth_date?: string
  gender?: string
  education_level?: string
  target_instance?: string
}) {
  try {
    await validateCsrf()
  } catch {
    return { success: false, error: 'Invalid request' }
  }

  const supabase = await createV2Client()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  const parsedProfile = profileInfoSchema.safeParse(data)
  if (!parsedProfile.success) {
    return {
      success: false,
      error: parsedProfile.error.issues[0]?.message || 'Data profil tidak valid',
    }
  }

  const updates: Database['public']['Tables']['profiles']['Update'] = {
    updated_at: new Date().toISOString(),
  }

  if (parsedProfile.data.full_name !== undefined) updates.full_name = parsedProfile.data.full_name
  if (parsedProfile.data.bio !== undefined) updates.bio = parsedProfile.data.bio
  if (parsedProfile.data.phone_number !== undefined) updates.phone = parsedProfile.data.phone_number
  if (parsedProfile.data.birth_date !== undefined)
    updates.birth_date = parsedProfile.data.birth_date
  if (parsedProfile.data.gender !== undefined) updates.gender = parsedProfile.data.gender
  if (parsedProfile.data.education_level !== undefined)
    updates.education_level = parsedProfile.data.education_level
  if (parsedProfile.data.target_instance !== undefined)
    updates.target_instance = parsedProfile.data.target_instance

  const { data: savedProfile, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select('full_name, bio, phone, birth_date, gender, education_level, target_instance')
    .maybeSingle()

  if (error || !savedProfile) {
    logger.error('Profile info update failed', error, { userId: user.id })
    return { success: false, error: 'Gagal memperbarui profil' }
  }

  revalidatePath('/', 'layout')
  revalidatePath('/cpns/dashboard', 'layout')
  revalidatePath('/cpns/dashboard/profile')
  revalidatePath('/tka', 'layout')
  return { success: true, profile: savedProfile }
}

export async function saveProfileAvatar(storagePath: string) {
  try {
    await validateCsrf()
  } catch {
    return { success: false, error: 'Invalid request' }
  }

  const supabase = await createV2Client()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }
  if (!isOwnedAvatarPath(storagePath, user.id)) {
    return { success: false, error: 'Lokasi foto profil tidak valid' }
  }

  const admin = await createAdminClient()
  const [folder, fileName] = storagePath.split('/')
  const { data: objects, error: objectError } = await admin.storage
    .from(AVATAR_BUCKET)
    .list(folder, { limit: 10, search: fileName })
  const uploadedObject = objects?.find((object) => object.name === fileName)
  const metadata = uploadedObject?.metadata as Record<string, unknown> | null | undefined
  const mimeType = typeof metadata?.mimetype === 'string' ? metadata.mimetype : ''
  const fileSize = Number(metadata?.size || 0)

  if (
    objectError ||
    !uploadedObject ||
    mimeType !== 'image/jpeg' ||
    fileSize <= 0 ||
    fileSize > MAX_AVATAR_BYTES
  ) {
    await admin.storage
      .from(AVATAR_BUCKET)
      .remove([storagePath])
      .catch(() => undefined)
    return { success: false, error: 'File foto profil tidak valid' }
  }

  const { data: currentProfile, error: profileError } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError || !currentProfile) {
    await admin.storage
      .from(AVATAR_BUCKET)
      .remove([storagePath])
      .catch(() => undefined)
    return { success: false, error: 'Profil tidak ditemukan' }
  }

  const { data: publicUrlData } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(storagePath)
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrlData.publicUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id)
  if (updateError) {
    await admin.storage
      .from(AVATAR_BUCKET)
      .remove([storagePath])
      .catch(() => undefined)
    logger.error('Avatar profile update failed', updateError, { userId: user.id })
    return { success: false, error: 'Foto profil belum bisa disimpan' }
  }

  const previousPath = ownedAvatarPathFromUrl(currentProfile.avatar_url, user.id)
  if (previousPath && previousPath !== storagePath) {
    await admin.storage
      .from(AVATAR_BUCKET)
      .remove([previousPath])
      .catch((error) => {
        logger.warn('Old avatar cleanup failed', { userId: user.id, error })
      })
  }

  revalidatePath('/', 'layout')
  revalidatePath('/cpns/dashboard', 'layout')
  revalidatePath('/cpns/dashboard/profile')
  revalidatePath('/tka', 'layout')
  return { success: true, avatarUrl: publicUrlData.publicUrl }
}

export async function updatePassword(data: { currentPassword: string; newPassword: string }) {
  try {
    await validateCsrf()
  } catch {
    return { success: false, error: 'Invalid request' }
  }

  const supabase = await createV2Client()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) return { success: false, error: 'Not authenticated' }

  const parsedPassword = passwordChangeSchema.safeParse(data)
  if (!parsedPassword.success) {
    return {
      success: false,
      error: parsedPassword.error.issues[0]?.message || 'Password tidak valid',
    }
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsedPassword.data.currentPassword,
  })
  if (verifyError) {
    return { success: false, error: 'Kata sandi saat ini salah' }
  }

  const { error } = await supabase.auth.updateUser({ password: parsedPassword.data.newPassword })
  if (error) {
    logger.error('Password update failed', error, { userId: user.id })
    return { success: false, error: 'Gagal memperbarui password' }
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' })
  if (signOutError) {
    logger.error('Global sign-out failed after password update', signOutError, { userId: user.id })
    return {
      success: false,
      error:
        'Password berhasil diubah, tetapi sesi belum bisa diakhiri. Silakan keluar secara manual.',
    }
  }

  return { success: true }
}

export async function claimVoucherCode(code: string, isTka = false) {
  try {
    await validateCsrf()
  } catch {
    return { success: false, message: 'Invalid request' }
  }

  const trimmed = typeof code === 'string' ? code.trim() : ''
  if (!trimmed) {
    return { success: false, message: 'Masukkan kode voucher terlebih dahulu' }
  }

  const supabase = await createV2Client()

  // Sengaja klien berbasis cookie, bukan admin: RPC `claim_voucher` menegakkan
  // `auth.uid() = p_user_id`, jadi identitas harus berasal dari sesi pengguna —
  // bukan dari argumen yang bisa dipalsukan klien.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, message: 'Sesi tidak valid. Silakan masuk ulang.' }
  }

  // Saldo token terpisah per program: profil CPNS mengisi wallet CPNS, profil
  // TKA mengisi wallet TKA — sejalan dengan pembacaan saldo di
  // `AccountProfilePage`.
  const walletType = isTka ? 'exam_token_tka' : 'exam_token_cpns'

  const { data, error } = await supabase.rpc('claim_voucher', {
    p_user_id: user.id,
    p_voucher_code: trimmed,
    p_wallet_type: walletType,
  })

  if (error) {
    logger.warn('[claimVoucherCode] RPC gagal', {
      code: error.code,
      message: error.message,
      userId: user.id,
    })
    // Pesan dari RPC sudah berbahasa Indonesia dan aman ditampilkan
    // (kuota/aktif/kadaluarsa/duplikat). Selain itu pakai pesan umum agar
    // detail internal tidak bocor.
    const known =
      /kode voucher|kuota|kadaluarsa|tidak aktif|sudah pernah|tidak berlaku|tidak boleh kosong/i.test(
        error.message,
      )
    return {
      success: false,
      message: known ? error.message : 'Voucher belum bisa diklaim. Coba lagi beberapa saat.',
    }
  }

  const result = (data ?? {}) as {
    already_claimed?: boolean
    amount?: number
    balance?: number
    message?: string
  }

  revalidatePath('/cpns/dashboard', 'layout')
  revalidatePath('/tka/[level]', 'layout')
  revalidatePath('/tka/[level]/profile', 'page')

  if (result.already_claimed) {
    return {
      success: false,
      message: result.message || 'Anda sudah pernah mengklaim kode voucher ini sebelumnya',
    }
  }

  const amount = Number(result.amount ?? 0)
  return {
    success: true,
    message:
      amount > 0
        ? `Voucher berhasil diklaim! ${amount} token ditambahkan.`
        : 'Voucher berhasil diklaim!',
    amount,
    balance: Number(result.balance ?? 0),
  }
}

export async function deleteAccount(confirmation: string) {
  try {
    await validateCsrf()
  } catch {
    return { success: false, error: 'Invalid request' }
  }

  if (confirmation !== 'HAPUS') {
    return { success: false, error: 'Konfirmasi hapus akun tidak valid' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  try {
    const adminClient = await createAdminClient()
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
    if (deleteError) throw deleteError
    const { data: avatarObjects, error: avatarListError } = await adminClient.storage
      .from(AVATAR_BUCKET)
      .list(user.id, { limit: 100 })
    if (avatarListError) {
      logger.warn('Deleted account avatar listing failed', {
        userId: user.id,
        error: avatarListError,
      })
    } else if (avatarObjects && avatarObjects.length > 0) {
      const avatarPaths = avatarObjects.map((object) => `${user.id}/${object.name}`)
      const { error: avatarDeleteError } = await adminClient.storage
        .from(AVATAR_BUCKET)
        .remove(avatarPaths)
      if (avatarDeleteError) {
        logger.warn('Deleted account avatar cleanup failed', {
          userId: user.id,
          error: avatarDeleteError,
        })
      }
    }
    return { success: true }
  } catch (error) {
    logger.error('Delete account failed', error, { userId: user.id })
    return { success: false, error: 'Terjadi kesalahan saat menghapus akun' }
  }
}
