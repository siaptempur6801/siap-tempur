import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { acceptConsent } from '@/app/actions/consent'
import { resolvePostLoginRedirect } from '@/lib/auth-redirect'
import { hasCurrentConsent } from '@/lib/consent'
import { createV2Client } from '@/lib/utils/supabase/server'

export const metadata: Metadata = {
  title: 'Persetujuan Penggunaan',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ERROR_TEXT: Record<string, string> = {
  invalid: 'Centang persetujuan dan pilih keterangan usia untuk melanjutkan.',
  save: 'Persetujuan belum tersimpan. Coba lagi beberapa saat.',
  request: 'Halaman perlu dimuat ulang. Setelah itu, coba lagi.',
}

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const params = await searchParams
  const next = resolvePostLoginRedirect(params.next)

  const supabase = await createV2Client()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?returnTo=${encodeURIComponent('/persetujuan')}`)
  if (hasCurrentConsent(user.user_metadata)) redirect(next)

  const errorText = params.error ? ERROR_TEXT[params.error] : undefined

  return (
    <main className="st-product min-h-screen bg-[var(--st-paper)] px-4 py-10 font-body text-[var(--st-ink)]">
      <section
        className="st-card-lg mx-auto w-full max-w-xl bg-white p-6 md:p-8"
        aria-labelledby="consent-title"
      >
        <div className="st-kicker">Satu langkah lagi</div>
        <h1 id="consent-title" className="st-heading-display mt-4 text-3xl md:text-4xl">
          Persetujuan penggunaan SiapTempur
        </h1>
        <p className="st-muted mt-3 font-semibold">
          Sebelum melanjutkan, baca dan setujui ketentuan berikut. Persetujuan ini diminta sekali
          untuk setiap akun.
        </p>

        {errorText && (
          <p
            role="alert"
            className="mt-5 rounded-lg border-2 border-red-700 bg-red-50 p-3 text-sm font-bold text-red-800"
          >
            {errorText}
          </p>
        )}

        <form action={acceptConsent} className="mt-6 space-y-5">
          <input type="hidden" name="next" value={next} />

          <fieldset className="space-y-2">
            <legend className="mb-1.5 block text-sm font-black">Keterangan usia</legend>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm font-semibold text-gray-800">
              <input
                type="radio"
                name="ageBasis"
                value="adult"
                required
                className="st-focus mt-1 h-4 w-4 shrink-0 accent-blue-600"
              />
              <span>Saya berusia 18 tahun atau lebih.</span>
            </label>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm font-semibold text-gray-800">
              <input
                type="radio"
                name="ageBasis"
                value="guardian_consent"
                required
                className="st-focus mt-1 h-4 w-4 shrink-0 accent-blue-600"
              />
              <span>
                Saya berusia di bawah 18 tahun, dan orang tua/wali saya telah membaca serta
                menyetujui penggunaan akun ini.
              </span>
            </label>
          </fieldset>

          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm font-semibold text-gray-800">
            <input
              type="checkbox"
              name="acceptTerms"
              value="true"
              required
              className="st-focus mt-1 h-4 w-4 shrink-0 accent-blue-600"
            />
            <span>
              Saya telah membaca dan menyetujui{' '}
              <Link
                href="/syarat-ketentuan"
                target="_blank"
                className="font-black text-blue-700 underline"
              >
                Syarat &amp; Ketentuan
              </Link>{' '}
              serta{' '}
              <Link
                href="/kebijakan-privasi"
                target="_blank"
                className="font-black text-blue-700 underline"
              >
                Kebijakan Privasi
              </Link>
              .
            </span>
          </label>

          <button
            type="submit"
            className="st-button inline-flex min-h-12 w-full items-center justify-center bg-blue-600 px-5 py-3 font-black text-white"
          >
            Setuju dan lanjutkan
          </button>
        </form>
      </section>
    </main>
  )
}
