import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Lock, Trash2, X, Shield, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { updatePassword } from '@/app/auth/actions'
import { deleteAccount } from '@/app/actions/profile'

export function SettingsTab() {
    const router = useRouter()
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isChangingPassword, setIsChangingPassword] = useState(false)

    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)

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
            router.push('/login?returnTo=/cpns')
            toast.success('Password berhasil diperbarui', {
                description: 'Silakan masuk kembali dengan password baru Anda.'
            })
            setShowPasswordModal(false)
            setOldPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } else {
            toast.error(result.error || 'Gagal mengubah password')
        }
    }

    const handleDeleteAccount = async () => {
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
        } catch {
            toast.error('Terjadi kesalahan sistem')
            setIsDeleting(false)
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-white border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 relative">
                <div className="absolute -top-3 right-8 w-14 h-5 bg-purple-200/80 rotate-3 shadow-sm"></div>
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

            {/* Modals */}
            {showPasswordModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => !isChangingPassword && setShowPasswordModal(false)}
                >
                    <div
                        className="relative max-w-md w-full bg-[#fdfbf7] p-8 border-2 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none -rotate-1"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-blue-100/80 border-l border-r border-white/50 shadow-sm rotate-2"></div>
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-300 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    <Shield size={24} className="text-gray-900" />
                                </div>
                                <h3 className="text-2xl font-bold font-handwriting text-gray-900">Ubah Password</h3>
                            </div>
                            <button onClick={() => setShowPasswordModal(false)} disabled={isChangingPassword} className="p-2 hover:bg-red-100 transition rounded-full">
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
                                    placeholder="Minimal 6 karakter"
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
            )}

            {/* Delete Account Modal */}
            {showDeleteModal && (
                <div
                    className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
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
                                        <li>Semua riwayat tryout akan hilang</li>
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
                                    onClick={handleDeleteAccount}
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
            )}
        </div>
    )
}
