// Local diagnostic preload: NODE_OPTIONS=--import=<absolute-path-to-this-file>.
// Logs only timing, method, resource path, status and byte count, never bodies,
// query strings, headers, cookies, credentials or answer keys.
import fs from 'node:fs'
const original = globalThis.fetch
if (!process.env.FETCH_METRICS_FILE)
  throw new Error('Set FETCH_METRICS_FILE for local fetch diagnostics')
globalThis.fetch = async (...args) => {
  const start = Date.now()
  const response = await original(...args)
  const url = new URL(String(args[0]?.url || args[0]))
  if (
    url.hostname.endsWith('.supabase.co') &&
    (url.pathname.startsWith('/rest/v1/') || url.pathname === '/auth/v1/user')
  ) {
    const bytes = (await response.clone().arrayBuffer()).byteLength
    const path = url.pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id')
    fs.appendFileSync(
      process.env.FETCH_METRICS_FILE,
      JSON.stringify({
        start,
        end: Date.now(),
        path,
        method: args[1]?.method || args[0]?.method || 'GET',
        status: response.status,
        bytes,
      }) + '\n',
      { mode: 0o600 },
    )
  }
  return response
}
