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

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}=["']([^"']*)["']`, 'i'))
  return match?.[1] ?? null
}

function inspectForms(html) {
  const forms = []
  const pattern = /<form\b[^>]*>[\s\S]*?<\/form>/gi
  let match
  while ((match = pattern.exec(html))) {
    const block = match[0]
    const openTag = block.match(/^<form\b[^>]*>/i)?.[0] || ''
    const fields = []
    const inputPattern = /<(?:input|textarea|select)\b[^>]*>/gi
    let inputMatch
    while ((inputMatch = inputPattern.exec(block))) {
      const tag = inputMatch[0]
      fields.push({
        tag: tag.match(/^<(\w+)/)?.[1]?.toLowerCase() || '',
        name: attr(tag, 'name'),
        type: attr(tag, 'type'),
        id: attr(tag, 'id'),
      })
    }
    forms.push({
      method: (attr(openTag, 'method') || 'get').toLowerCase(),
      action: attr(openTag, 'action'),
      fields,
    })
  }
  return forms.slice(0, 20)
}

function inlineScriptSnippets(html) {
  const scripts = []
  const pattern = /<script(?![^>]+src=)[^>]*>([\s\S]*?)<\/script>/gi
  let match
  while ((match = pattern.exec(html))) {
    const source = match[1]
    if (!/(payment|qris|scan|submit|fetch|axios)/i.test(source)) continue
    scripts.push(source.replace(/\s+/g, ' ').slice(0, 2500))
  }
  return scripts.slice(0, 10)
}

async function inspectSimulator() {
  const response = await fetch(`${SIMULATOR_ORIGIN}/v2/qris/index`, { redirect: 'follow' })
  const html = await response.text()
  console.log('M4_QA_SIMULATOR_INSPECT=' + JSON.stringify({
    status: response.status,
    htmlPaths: collectPaths(html),
    forms: inspectForms(html),
    inlineScripts: inlineScriptSnippets(html),
  }))
}

if (enabled('[m4-qa-inspect]')) {
  await inspectSimulator()
} else {
  console.log('M4_QA_ONCE=skipped')
}
