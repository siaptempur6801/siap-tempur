'use client'

import { useEffect } from 'react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Global Error:', error)
    }, [error])

    return (
        <html lang="id">
            <body style={{ margin: 0, background: '#fbfaf7', color: '#0f172a', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <section style={{ width: '100%', maxWidth: 520, border: '2px solid #0f172a', background: '#fff', padding: '32px', textAlign: 'center' }}>
                        <div style={{ width: 48, height: 48, margin: '0 auto', border: '2px solid #0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', fontWeight: 900, color: '#b91c1c' }}>!</div>
                        <p style={{ margin: '20px 0 0', fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#64748b' }}>Terjadi gangguan</p>
                        <h1 style={{ margin: '8px 0 0', fontSize: 32, lineHeight: 1.15 }}>SiapTempur belum bisa dimuat.</h1>
                        <p style={{ margin: '12px auto 0', maxWidth: 420, fontSize: 15, lineHeight: 1.7, color: '#64748b' }}>
                            Coba muat ulang aplikasi. Data akun dan progres yang sudah tersimpan tidak perlu kamu masukkan ulang dari halaman ini.
                        </p>
                        <button
                            type="button"
                            onClick={() => reset()}
                            style={{ marginTop: 24, minHeight: 44, padding: '10px 20px', border: '2px solid #0f172a', background: '#2563eb', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}
                        >
                            Coba Lagi
                        </button>
                    </section>
                </main>
            </body>
        </html>
    )
}
