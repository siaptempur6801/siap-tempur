const SIMULATOR_ORIGIN = 'https://simulator.sandbox.midtrans.com'

function enabled(tag) {
  return process.env.VERCEL === '1'
    && process.env.VERCEL_ENV === 'preview'
    && (process.env.VERCEL_GIT_COMMIT_MESSAGE || '').includes(tag)
}

function collectPaths(source) {
  const paths = new Set()
  const patterns = [
    /(?:action|src|href)=["']([^"']+)["']/gi,
    /(?:fetch|axios\.(?:get|post)|url)\s*\(?(?:\s*)["'`]([^"'`]+)["'`]/gi,
    /["'`]((?:\/|https:\/\/simulator\.sandbox\.midtrans\.com\/)[A-Za-z0-9_?&=./:%-]{2,})["'`]/g,
  ]
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(source))) {
      const candidate = match[1]
      if (!candidate || candidate.startsWith('data:') || candidate.startsWith('//')) continue
      try {
        const parsed = new URL(candidate, SIMULATOR_ORIGIN)
        if (parsed.hostname === 'simulator.sandbox.midtrans.com') {
          paths.add(`${parsed.pathname}${parsed.search}`)
        }
      } catch {}
    }
  }
  return [...paths].slice(0, 160)
}

function scriptUrls(html) {
  const urls = new Set()
  const pattern = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi
  let match
  while ((match = pattern.exec(html))) {
    try {
      const url = new URL(match[1], SIMULATOR_ORIGIN)
      if (url.hostname === 'simulator.sandbox.midtrans.com') urls.add(url.toString())
    } catch {}
  }
  return [...urls].slice(0, 30)
}

function snippets(source) {
  const values = []
  const lower = source.toLowerCase()
  for (const needle of ['qris', 'scan', 'payment', 'transaction', 'fetch(', 'axios', 'qr-code']) {
    let from = 0
    while (values.length < 40) {
      const index = lower.indexOf(needle, from)
      if (index < 0) break
      values.push(source.slice(Math.max(0, index - 100), Math.min(source.length, index + 260)).replace(/\s+/g, ' '))
      from = index + needle.length
    }
  }
  return values
}

async function inspectSimulator() {
  const response = await fetch(`${SIMULATOR_ORIGIN}/v2/qris/index`, { redirect: 'follow' })
  const html = await response.text()
  const reports = []
  for (const url of scriptUrls(html)) {
    const scriptResponse = await fetch(url, { redirect: 'follow' })
    const source = await scriptResponse.text()
    reports.push({
      path: new URL(url).pathname,
      status: scriptResponse.status,
      paths: collectPaths(source),
      snippets: snippets(source),
    })
  }
  console.log('M4_QA_SIMULATOR_INSPECT=' + JSON.stringify({
    status: response.status,
    htmlPaths: collectPaths(html),
    scripts: reports,
  }))
}

if (enabled('[m4-qa-inspect]')) {
  await inspectSimulator()
} else {
  console.log('M4_QA_ONCE=skipped')
}
