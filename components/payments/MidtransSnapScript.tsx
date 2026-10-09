import Script from 'next/script'
import { headers } from 'next/headers'
import { env } from '@/lib/env'

/** Render only on payment surfaces; preserve CSP nonce and sandbox selection. */
export default async function MidtransSnapScript() {
    const nonce = (await headers()).get('x-nonce') || undefined
    return <Script id="midtrans-snap-script" src={env.midtransSnapScriptUrl()}
        data-client-key={env.midtransClientKey()} strategy="afterInteractive" nonce={nonce} />
}
