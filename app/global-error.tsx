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
        <html>
            <body>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '100vh',
                        padding: '2rem',
                        fontFamily: 'system-ui, sans-serif',
                        textAlign: 'center',
                    }}
                >
                    <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
                        Terjadi Kesalahan
                    </h1>
                    <p style={{ color: '#666', marginBottom: '2rem', maxWidth: '480px' }}>
                        Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi beberapa saat.
                    </p>
                    <button
                        onClick={() => reset()}
                        style={{
                            padding: '0.75rem 1.5rem',
                            fontSize: '1rem',
                            backgroundColor: '#0070f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                        }}
                    >
                        Coba Lagi
                    </button>
                </div>
            </body>
        </html>
    )
}
