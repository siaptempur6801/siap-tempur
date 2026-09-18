/**
 * Validasi form autentikasi tanpa membawa `zod` ke bundle browser.
 *
 * KENAPA FILE INI ADA
 *   `zodResolver` menyeret seluruh runtime `zod` ke bundle klien. Terukur pada
 *   hasil build: satu chunk 444 KB khusus `zod` dimuat di `/login` dan
 *   `/register` — chunk terbesar kedua di aplikasi, dan sama sekali tidak
 *   diperlukan di sana.
 *
 *   Validasi klien tetap dipertahankan (pesan error inline sebelum submit tetap
 *   muncul); yang dilepas hanya pustaka runtime-nya. Aturan dan pesannya
 *   IDENTIK dengan schema `zod` sebelumnya, termasuk regex email, sehingga
 *   perilaku yang dilihat pengguna tidak berubah.
 *
 * SUMBER KEBENARAN
 *   Skema `zod` di `lib/validations/auth.ts` TETAP dipakai di server
 *   (`app/auth/actions.ts`) dan tetap menjadi sumber kebenaran. File ini hanya
 *   cerminan untuk klien. `tests/unit/auth-form-validation.test.ts` mengunci
 *   paritas keduanya terhadap korpus kasus yang sama, sehingga keduanya tidak
 *   dapat menyimpang diam-diam.
 *
 * CATATAN PERILAKU
 *   `react-hook-form` hanya memakai error PERTAMA per field. Schema zod lama
 *   dapat menghasilkan dua error untuk satu field (mis. email kosong → "wajib
 *   diisi" DAN "format tidak valid"); yang sampai ke layar selalu yang pertama.
 *   Karena itu validasi di sini berhenti pada error pertama per field — hasil
 *   yang terlihat identik, tanpa pekerjaan sia-sia.
 */

/**
 * Regex email Zod v4 (`z.email()`), disalin apa adanya.
 *
 * Sengaja TIDAK "diperbaiki" atau diperketat: mengubahnya akan mengubah email
 * mana yang diterima klien, dan itu perubahan perilaku. Contoh: `user@example-.com`
 * LOLOS oleh regex ini (sama seperti sebelumnya).
 */
const EMAIL_PATTERN = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/

export type LoginFormData = {
    email: string
    password: string
}

export type RegisterFormData = {
    email: string
    password: string
    fullName: string
}

type FieldErrors<T> = Partial<Record<keyof T, { type: string; message: string }>>
type ResolverResult<T> = { values: T; errors: Record<string, never> } | { values: Record<string, never>; errors: FieldErrors<T> }

function emailError(value: string): string | null {
    if (value.length < 1) return 'Email wajib diisi'
    if (!EMAIL_PATTERN.test(value)) return 'Format email tidak valid'
    return null
}

/**
 * Resolver bergaya `react-hook-form`.
 *
 * `zodResolver` juga bersifat sinkron untuk schema tanpa transformasi async,
 * jadi bentuk hasilnya sama: `{ values }` bila valid, `{ errors }` bila tidak.
 */
function makeResolver<T extends Record<string, string>>(
    validate: (input: Record<string, unknown>) => FieldErrors<T>,
) {
    return async (values: Record<string, unknown>): Promise<ResolverResult<T>> => {
        const errors = validate(values)
        if (Object.keys(errors).length > 0) {
            return { values: {} as Record<string, never>, errors }
        }
        return { values: values as T, errors: {} as Record<string, never> }
    }
}

export const loginResolver = makeResolver<LoginFormData>((values) => {
    const errors: FieldErrors<LoginFormData> = {}
    const email = String(values.email ?? '')
    const password = String(values.password ?? '')

    const emailMessage = emailError(email)
    if (emailMessage) errors.email = { type: 'validation', message: emailMessage }
    if (password.length < 1) errors.password = { type: 'validation', message: 'Password wajib diisi' }

    return errors
})

export const registerResolver = makeResolver<RegisterFormData>((values) => {
    const errors: FieldErrors<RegisterFormData> = {}
    const email = String(values.email ?? '')
    const password = String(values.password ?? '')
    const fullName = String(values.fullName ?? '')

    const emailMessage = emailError(email)
    if (emailMessage) errors.email = { type: 'validation', message: emailMessage }

    if (password.length < 8) {
        errors.password = { type: 'validation', message: 'Password minimal 8 karakter' }
    }

    if (fullName.length < 3) {
        errors.fullName = { type: 'validation', message: 'Nama lengkap minimal 3 karakter' }
    } else if (fullName.length > 100) {
        errors.fullName = { type: 'validation', message: 'Nama lengkap maksimal 100 karakter' }
    }

    return errors
})
