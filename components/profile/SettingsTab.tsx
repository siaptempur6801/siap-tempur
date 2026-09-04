import { useState } from 'react'
import { KeyRound, Loader2, Lock, Settings, Shield, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { deleteAccount, updatePassword } from '@/app/actions/profile'
import { createV2Client } from '@/lib/utils/supabase/client'

export function SettingsTab() {
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
        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
    }

    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword || !confirmPassword) {
            toast.error('Lengkapi semua kolom kata sandi.')
            return
        }
        if (newPassword !== confirmPassword) {
            toast.error('Konfirmasi kata sandi baru belum sama.')
            return
        }

        setIsChangingPassword(true)
        try {
            const result = await updatePassword({ currentPassword: oldPassword, newPassword })
            if (!result.success) {
                toast.error(result.error || 'Kata sandi belum bisa diubah.')
                return
            }

            setShowPasswordModal(false)
            setOldPassword('')
            setNewPassword('')
            setConfirmPassword('')
            toast.success('Kata sandi berhasil diperbarui', {
                description: 'Sesi pada perangkat lain telah diakhiri.',
            })
        } catch {
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
                    window.location.replace('/cpns')
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
            <section className="st-card-md bg-white p-5 md:p-6">
                <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[var(--st-ink)] bg-blue-50"><Settings size={21} /></div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Keamanan akun</p>
                        <h2 className="st-heading mt-1 text-2xl">Pengaturan akun</h2>
                        <p className="st-muted mt-1 text-sm font-semibold">Kelola kata sandi atau tindakan permanen pada akunmu.</p>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => setShowPasswordModal(true)}
                        className="st-focus border-2 border-[var(--st-ink)] bg-blue-50 p-5 text-left transition hover:bg-blue-100"
                    >
                        <div className="flex h-10 w-10 items-center justify-center border-2 border-[var(--st-ink)] bg-white"><Lock size={18} /></div>
                        <h3 className="mt-4 font-black">Ubah kata sandi</h3>
                        <p className="st-muted mt-1 text-sm font-semibold leading-relaxed">Ganti kata sandi akun dengan memverifikasi kata sandi yang sedang digunakan.</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowDeleteModal(true)}
                        className="st-focus border-2 border-red-700 bg-red-50 p-5 text-left transition hover:bg-red-100"
                    >
                        <div className="flex h-10 w-10 items-center justify-center border-2 border-red-700 bg-white text-red-700"><Trash2 size={18} /></div>
                        <h3 className="mt-4 font-black text-red-800">Hapus akun</h3>
                        <p className="mt-1 text-sm font-semibold leading-relaxed text-red-700">Tindakan ini menghapus akun dan data yang terkait secara permanen.</p>
                    </button>
                </div>
            </section>

            {showPasswordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={closePasswordModal}>
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="change-password-title"
                        className="st-product st-card-lg relative w-full max-w-md bg-[var(--st-paper)] p-6 md:p-8"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button type="button" onClick={closePasswordModal} disabled={isChangingPassword} aria-label="Tutup" className="st-focus absolute right-3 top-3 flex h-11 w-11 items-center justify-center hover:bg-white disabled:opacity-50"><X size={20} /></button>
                        <div className="flex h-12 w-12 items-center justify-center border-2 border-[var(--st-ink)] bg-[var(--st-yellow)]"><KeyRound size={22} /></div>
                        <h2 id="change-password-title" className="st-heading mt-4 text-2xl">Ubah kata sandi</h2>
                        <p className="st-muted mt-1 text-sm font-semibold">Masukkan kata sandi saat ini, lalu buat kata sandi baru.</p>

                        <div className="mt-6 space-y-4">
                            <PasswordField label="Kata sandi saat ini" value={oldPassword} onChange={setOldPassword} placeholder="Kata sandi saat ini" disabled={isChangingPassword} autoComplete="current-password" />
                            <PasswordField label="Kata sandi baru" value={newPassword} onChange={setNewPassword} placeholder="Minimal 10 karakter" disabled={isChangingPassword} autoComplete="new-password" />
                            <PasswordField label="Konfirmasi kata sandi baru" value={confirmPassword} onChange={setConfirmPassword} placeholder="Ketik ulang kata sandi baru" disabled={isChangingPassword} autoComplete="new-password" />
                            <p className="text-xs font-semibold leading-relaxed text-slate-500">Gunakan minimal 10 karakter dengan huruf besar, huruf kecil, dan angka.</p>
                        </div>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
                            <button type="button" onClick={handleChangePassword} disabled={isChangingPassword} className="st-button inline-flex min-h-12 flex-1 items-center justify-center gap-2 bg-blue-600 px-5 py-3 font-black text-white disabled:opacity-50">
                                {isChangingPassword && <Loader2 size={18} className="animate-spin" />}{isChangingPassword ? 'Mengubah...' : 'Simpan kata sandi'}
                            </button>
                            <button type="button" onClick={closePasswordModal} disabled={isChangingPassword} className="st-button min-h-12 bg-white px-5 py-3 font-black disabled:opacity-50">Batal</button>
                        </div>
                    </section>
                </div>
            )}

            {showDeleteModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => !isDeleting && setShowDeleteModal(false)}>
                    <section
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="delete-account-title"
                        className="st-product st-card-lg relative w-full max-w-md bg-white p-6 md:p-8"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex h-12 w-12 items-center justify-center border-2 border-red-700 bg-red-50 text-red-700"><Trash2 size={23} /></div>
                        <div className="st-kicker mt-5 bg-red-100 text-red-900">Tindakan permanen</div>
                        <h2 id="delete-account-title" className="st-heading mt-4 text-3xl">Hapus akun?</h2>
                        <p className="mt-2 text-sm font-semibold leading-relaxed text-red-800">Tindakan ini tidak dapat dibatalkan. Pastikan kamu benar-benar ingin menghapus akun sebelum melanjutkan.</p>

                        <div className="mt-5 border-2 border-red-200 bg-red-50 p-4">
                            <p className="font-black text-red-900">Yang akan terhapus:</p>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold text-red-800">
                                <li>Riwayat belajar dan tryout yang terkait dengan akun.</li>
                                <li>Sisa token pada akun.</li>
                                <li>Informasi profil dan akses masuk.</li>
                            </ul>
                        </div>

                        <label className="mt-5 block">
                            <span className="mb-1.5 block text-sm font-black">Ketik <span className="text-red-700">HAPUS</span> untuk konfirmasi</span>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(event) => setDeleteConfirmText(event.target.value.toUpperCase())}
                                className="st-input text-center font-black tracking-[0.15em] focus:border-red-700"
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
                                className="st-button inline-flex min-h-12 w-full items-center justify-center gap-2 bg-red-600 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}{isDeleting ? 'Menghapus akun...' : 'Hapus akun permanen'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText('') }}
                                disabled={isDeleting}
                                className="st-button min-h-12 w-full bg-white px-5 py-3 font-black disabled:opacity-50"
                            >
                                Batal
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    )
}

function PasswordField({ label, value, onChange, placeholder, disabled, autoComplete }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; disabled: boolean; autoComplete: 'current-password' | 'new-password' }) {
    return (
        <label>
            <span className="mb-1.5 block text-sm font-black">{label}</span>
            <input type="password" value={value} onChange={(event) => onChange(event.target.value)} className="st-input" placeholder={placeholder} disabled={disabled} autoComplete={autoComplete} />
        </label>
    )
}
