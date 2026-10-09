import { useId, useState } from 'react'
import DialogSurface from '@/components/ui/DialogSurface'
import { KeyRound, Loader2, Lock, Settings, Shield, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { deleteAccount, updatePassword } from '@/app/actions/profile'
import { createV2Client } from '@/lib/utils/supabase/client'
import { useProfileNavigation } from './useProfileNavigation'

export function SettingsTab() {
    const passwordTitleId = useId()
    const deleteTitleId = useId()
    const [passwordErrors, setPasswordErrors] = useState<{ current?: string; next?: string; confirm?: string }>({})
    const [passwordError, setPasswordError] = useState('')
    const { landingPath, isTka } = useProfileNavigation()
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isChangingPassword, setIsChangingPassword] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)

    const closePasswordModal = () => {
        if (isChangingPassword) return
        setShowPasswordModal(false)
        setPasswordErrors({})
        setPasswordError('')
        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
    }

    const closeDeleteModal = () => {
        if (isDeleting) return
        setShowDeleteModal(false)
        setDeleteConfirmText('')
    }

    const handleChangePassword = async () => {
        if (isChangingPassword) return
        setPasswordError('')
        if (!oldPassword || !newPassword || !confirmPassword) {
            setPasswordErrors({
                current: oldPassword ? undefined : 'Masukkan kata sandi saat ini.',
                next: newPassword ? undefined : 'Masukkan kata sandi baru.',
                confirm: confirmPassword ? undefined : 'Ketik ulang kata sandi baru.',
            })
            toast.error('Lengkapi semua kolom kata sandi.')
            return
        }
        if (newPassword !== confirmPassword) {
            setPasswordErrors({ confirm: 'Konfirmasi kata sandi baru belum sama.' })
            toast.error('Konfirmasi kata sandi baru belum sama.')
            return
        }

        setPasswordErrors({})
        setIsChangingPassword(true)
        try {
            const result = await updatePassword({ currentPassword: oldPassword, newPassword })
            if (!result.success) {
                setPasswordError(result.error || 'Kata sandi belum bisa diubah.')
                toast.error(result.error || 'Kata sandi belum bisa diubah.')
                return
            }

            window.location.replace(`/login?returnTo=${encodeURIComponent(landingPath)}&password=updated`)
        } catch {
            setPasswordError('Kata sandi belum bisa diubah. Coba lagi.')
            toast.error('Kata sandi belum bisa diubah. Coba lagi.')
        } finally {
            setIsChangingPassword(false)
        }
    }

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'HAPUS') return
        setIsDeleting(true)
        try {
            const result = await deleteAccount(deleteConfirmText)
            if (result.success) {
                await createV2Client().auth.signOut({ scope: 'local' }).catch(() => undefined)
                toast.success('Akun sudah dihapus.')
                setTimeout(() => {
                    window.location.replace(landingPath)
                }, 1200)
            } else {
                toast.error(result.error || 'Akun belum bisa dihapus.')
                setIsDeleting(false)
            }
        } catch {
            toast.error('Akun belum bisa dihapus. Coba lagi.')
            setIsDeleting(false)
        }
    }

    return (
        <div className="space-y-6">
            <section className={isTka ? 'rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs' : 'st-card-md bg-white p-5 md:p-6'}>
                <div className="flex items-start gap-3">
                    <div className={isTka
                        ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-2xs'
                        : 'flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[var(--st-ink)] bg-blue-50'}
                    >
                        <Settings size={21} />
                    </div>
                    <div>
                        <p className={isTka ? 'text-xs font-bold uppercase tracking-wider text-indigo-700' : 'text-xs font-black uppercase tracking-[0.14em] text-blue-700'}>Keamanan akun</p>
                        <h2 className={isTka ? 'text-xl font-bold text-slate-950' : 'st-heading mt-1 text-2xl'}>Pengaturan akun</h2>
                        <p className={isTka ? 'mt-1 text-sm font-medium text-slate-600' : 'st-muted mt-1 text-sm font-semibold'}>Kelola kata sandi atau tindakan permanen pada akunmu.</p>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => setShowPasswordModal(true)}
                        className={isTka
                            ? 'group rounded-xl border border-slate-200/80 bg-slate-50/50 p-5 text-left transition hover:border-indigo-300 hover:bg-indigo-50/30 shadow-2xs active:scale-[0.99]'
                            : 'st-focus border-2 border-[var(--st-ink)] bg-blue-50 p-5 text-left transition hover:bg-blue-100'}
                    >
                        <div className={isTka
                            ? 'flex h-10 w-10 items-center justify-center rounded-lg bg-white text-indigo-700 ring-1 ring-slate-200 shadow-2xs group-hover:bg-indigo-600 group-hover:text-white transition'
                            : 'flex h-10 w-10 items-center justify-center border-2 border-[var(--st-ink)] bg-white'}
                        >
                            <Lock size={18} />
                        </div>
                        <h3 className={isTka ? 'mt-4 text-sm font-bold text-slate-900' : 'mt-4 font-black'}>Ubah kata sandi</h3>
                        <p className={isTka ? 'mt-1 text-xs text-slate-500 font-medium leading-relaxed' : 'st-muted mt-1 text-sm font-semibold leading-relaxed'}>Ganti kata sandi akun dengan memverifikasi kata sandi yang sedang digunakan.</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowDeleteModal(true)}
                        className={isTka
                            ? 'group rounded-xl border border-rose-200/80 bg-rose-50/30 p-5 text-left transition hover:border-rose-300 hover:bg-rose-50/60 shadow-2xs active:scale-[0.99]'
                            : 'st-focus border-2 border-red-700 bg-red-50 p-5 text-left transition hover:bg-red-100'}
                    >
                        <div className={isTka
                            ? 'flex h-10 w-10 items-center justify-center rounded-lg bg-white text-rose-600 ring-1 ring-rose-200 shadow-2xs group-hover:bg-rose-600 group-hover:text-white transition'
                            : 'flex h-10 w-10 items-center justify-center border-2 border-red-700 bg-white text-red-700'}
                        >
                            <Trash2 size={18} />
                        </div>
                        <h3 className={isTka ? 'mt-4 text-sm font-bold text-rose-800' : 'mt-4 font-black text-red-800'}>Hapus akun</h3>
                        <p className={isTka ? 'mt-1 text-xs text-rose-700/80 font-medium leading-relaxed' : 'mt-1 text-sm font-semibold leading-relaxed text-red-700'}>Tindakan ini menghapus akun dan data yang terkait secara permanen.</p>
                    </button>
                </div>
            </section>

            {showPasswordModal && (
                <DialogSurface isOpen onClose={closePasswordModal} dismissible={!isChangingPassword}
                    labelledBy={passwordTitleId}
                    className={isTka
                        ? 'relative max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-xl'
                        : 'st-product st-card-lg relative max-w-md bg-[var(--st-paper)] p-6 md:p-8'}
                >
                    <button
                        type="button"
                        onClick={closePasswordModal}
                        disabled={isChangingPassword}
                        aria-label="Tutup"
                        className={isTka
                            ? 'absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition disabled:opacity-50'
                            : 'st-focus absolute right-3 top-3 flex h-11 w-11 items-center justify-center hover:bg-white disabled:opacity-50'}
                    >
                        <X size={18} />
                    </button>
                    <div className={isTka
                        ? 'flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-2xs'
                        : 'flex h-12 w-12 items-center justify-center border-2 border-[var(--st-ink)] bg-[var(--st-yellow)]'}
                    >
                        <KeyRound size={20} />
                    </div>
                    <h2 id={passwordTitleId} className={isTka ? 'mt-4 text-xl font-bold text-slate-950' : 'st-heading mt-4 text-2xl'}>Ubah kata sandi</h2>
                    <p className={isTka ? 'mt-1 text-xs text-slate-500 font-medium' : 'st-muted mt-1 text-sm font-semibold'}>Masukkan kata sandi saat ini, lalu buat kata sandi baru.</p>

                    <form noValidate onSubmit={(event) => { event.preventDefault(); void handleChangePassword() }}>
                        <div className="mt-6 space-y-4">
                            <PasswordField error={passwordErrors.current} label="Kata sandi saat ini" value={oldPassword} onChange={(value) => { setOldPassword(value); setPasswordErrors((errors) => ({ ...errors, current: undefined })); setPasswordError('') }} placeholder="Kata sandi saat ini" disabled={isChangingPassword} autoComplete="current-password" isTka={isTka} />
                            <PasswordField error={passwordErrors.next} label="Kata sandi baru" value={newPassword} onChange={(value) => { setNewPassword(value); setPasswordErrors((errors) => ({ ...errors, next: undefined })); setPasswordError('') }} placeholder="Minimal 10 karakter" disabled={isChangingPassword} autoComplete="new-password" isTka={isTka} />
                            <PasswordField error={passwordErrors.confirm} label="Konfirmasi kata sandi baru" value={confirmPassword} onChange={(value) => { setConfirmPassword(value); setPasswordErrors((errors) => ({ ...errors, confirm: undefined })); setPasswordError('') }} placeholder="Ketik ulang kata sandi baru" disabled={isChangingPassword} autoComplete="new-password" isTka={isTka} />
                            <p className={isTka ? 'text-xs text-slate-500 font-medium leading-relaxed' : 'text-xs font-semibold leading-relaxed text-slate-500'}>Gunakan minimal 10 karakter dengan huruf besar, huruf kecil, dan angka.</p>
                        </div>

                        {passwordError && <p role="alert" className="mt-4 text-sm font-semibold text-red-700">{passwordError}</p>}
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
                            <button
                                type="submit"
                                disabled={isChangingPassword}
                                className={isTka
                                    ? 'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-[0.98] disabled:opacity-50'
                                    : 'st-button inline-flex min-h-12 flex-1 items-center justify-center gap-2 bg-blue-600 px-5 py-3 font-black text-white disabled:opacity-50'}
                            >
                                {isChangingPassword && <Loader2 size={16} className="animate-spin" />}{isChangingPassword ? 'Mengubah...' : 'Simpan kata sandi'}
                            </button>
                            <button
                                type="button"
                                onClick={closePasswordModal}
                                disabled={isChangingPassword}
                                className={isTka
                                    ? 'inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-700 transition disabled:opacity-50'
                                    : 'st-button min-h-12 bg-white px-5 py-3 font-black disabled:opacity-50'}
                            >
                                Batal
                            </button>
                        </div>
                    </form>
                </DialogSurface>
            )}

            {showDeleteModal && (
                <DialogSurface isOpen onClose={closeDeleteModal} dismissible={!isDeleting}
                    role="alertdialog" labelledBy={deleteTitleId}
                    className={isTka
                        ? 'relative max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-xl'
                        : 'st-product st-card-lg relative max-w-md bg-white p-6 md:p-8'}
                >
                    <div className={isTka
                        ? 'flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200 shadow-2xs'
                        : 'flex h-12 w-12 items-center justify-center border-2 border-red-700 bg-red-50 text-red-700'}
                    >
                        <Trash2 size={20} />
                    </div>
                    <div className={isTka ? 'mt-4 inline-flex items-center rounded-full bg-rose-100/80 px-2.5 py-0.5 text-xs font-bold text-rose-700' : 'st-kicker mt-5 bg-red-100 text-red-900'}>
                        Tindakan permanen
                    </div>
                    <h2 id={deleteTitleId} className={isTka ? 'mt-3 text-xl font-bold text-slate-950' : 'st-heading mt-4 text-3xl'}>Hapus akun?</h2>
                    <p className={isTka ? 'mt-1 text-xs font-medium text-rose-700/90 leading-relaxed' : 'mt-2 text-sm font-semibold leading-relaxed text-red-800'}>Tindakan ini tidak dapat dibatalkan. Pastikan kamu benar-benar ingin menghapus akun sebelum melanjutkan.</p>

                    <div className={isTka ? 'mt-5 rounded-xl border border-rose-200/80 bg-rose-50/50 p-4' : 'mt-5 border-2 border-red-200 bg-red-50 p-4'}>
                        <p className={isTka ? 'text-xs font-bold text-rose-900' : 'font-black text-red-900'}>Yang akan terhapus:</p>
                        <ul className={isTka ? 'mt-2 list-disc space-y-1 pl-4 text-xs font-medium text-rose-800' : 'mt-2 list-disc space-y-1 pl-5 text-sm font-semibold text-red-800'}>
                            <li>Riwayat belajar dan tryout yang terkait dengan akun.</li>
                            <li>Sisa token pada akun.</li>
                            <li>Informasi profil dan akses masuk.</li>
                        </ul>
                    </div>

                    <label className="mt-5 block">
                        <span className={isTka ? 'mb-1.5 block text-xs font-bold text-slate-700' : 'mb-1.5 block text-sm font-black'}>Ketik <span className="text-red-700">HAPUS</span> untuk konfirmasi</span>
                        <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(event) => setDeleteConfirmText(event.target.value.toUpperCase())}
                            className={isTka
                                ? 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-center font-bold tracking-widest text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-2xs'
                                : 'st-input text-center font-black tracking-[0.15em] focus:border-red-700'}
                            placeholder="HAPUS"
                            disabled={isDeleting}
                            autoComplete="off"
                        />
                    </label>

                    <div className="mt-6 space-y-3">
                        <button
                            type="button"
                            onClick={handleDeleteAccount}
                            disabled={isDeleting || deleteConfirmText !== 'HAPUS'}
                            className={isTka
                                ? 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40'
                                : 'st-button inline-flex min-h-12 w-full items-center justify-center gap-2 bg-red-600 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-40'}
                        >
                            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}{isDeleting ? 'Menghapus akun...' : 'Hapus akun permanen'}
                        </button>
                        <button
                            type="button"
                            onClick={closeDeleteModal}
                            disabled={isDeleting}
                            className={isTka
                                ? 'inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-700 transition disabled:opacity-50'
                                : 'st-button min-h-12 w-full bg-white px-5 py-3 font-black disabled:opacity-50'}
                        >
                            Batal
                        </button>
                    </div>
                </DialogSurface>
            )}
        </div>
    )
}

function PasswordField({ error, label, value, onChange, placeholder, disabled, autoComplete, isTka = false }: { error?: string; label: string; value: string; onChange: (value: string) => void; placeholder: string; disabled: boolean; autoComplete: 'current-password' | 'new-password'; isTka?: boolean }) {
    const id = useId()
    return (
        <div className="block">
            <label htmlFor={id} className={isTka ? 'mb-1.5 block text-xs font-bold text-slate-700' : 'mb-1.5 block text-sm font-black'}>{label}</label>
            <input
                id={id}
                type="password"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className={isTka
                    ? 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base font-medium text-slate-800 sm:text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs'
                    : 'st-input'}
                placeholder={placeholder}
                disabled={disabled}
                autoComplete={autoComplete}
            />
            {error && <span id={`${id}-error`} role="alert" className="mt-1.5 block text-sm font-semibold text-red-700">{error}</span>}
        </div>
    )
}
