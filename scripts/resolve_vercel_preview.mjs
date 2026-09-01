import { appendFile } from 'node:fs/promises'

const expectedSha = process.env.PR_HEAD_SHA || process.env.GITHUB_SHA
const githubEnv = process.env.GITHUB_ENV
const eventName = process.env.GITHUB_EVENT_NAME
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
const inputPreviewUrl = process.env.INPUT_PREVIEW_URL || ''

if (!expectedSha || !githubEnv || !bypassSecret) {
  throw new Error('Preview resolver environment incomplete')
}

function diagnostic(hostname, mode, response, returnedSha = null) {
  const type = response.headers.get('content-type') || 'unknown'
  const location = response.headers.get('location')
  let locationHost = null
  if (location) {
    try { locationHost = new URL(location).hostname } catch {}
  }
  console.log(JSON.stringify({
    previewHost: hostname,
    bypassMode: mode,
    status: response.status,
    contentType: type.split(';')[0],
    redirectHost: locationHost,
    returnedSha,
  }))
}

async function verifyPreview(candidate) {
  let url
  try {
    url = new URL(candidate)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.vercel.app')) return false

  const attempts = [
    {
      mode: 'header',
      healthUrl: new URL('/api/health', url.origin),
      headers: { 'x-vercel-protection-bypass': bypassSecret },
    },
    {
      mode: 'query',
      healthUrl: (() => {
        const health = new URL('/api/health', url.origin)
        health.searchParams.set('x-vercel-protection-bypass', bypassSecret)
        return health
      })(),
      headers: {},
    },
  ]

  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.healthUrl, {
        headers: attempt.headers,
        redirect: 'manual',
        signal: AbortSignal.timeout(15_000),
      })
      if (!response.ok) {
        diagnostic(url.hostname, attempt.mode, response)
        continue
      }
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.toLowerCase().includes('application/json')) {
        diagnostic(url.hostname, attempt.mode, response)
        continue
      }
      const payload = await response.json()
      const returnedSha = payload?.deploymentCommitSha || null
      diagnostic(url.hostname, attempt.mode, response, returnedSha)
      if (returnedSha === expectedSha) return url.origin
    } catch (error) {
      console.log(JSON.stringify({
        previewHost: url.hostname,
        bypassMode: attempt.mode,
        error: error instanceof Error ? error.name : 'request_error',
      }))
    }
  }
  return false
}

async function persist(previewUrl) {
  await appendFile(githubEnv, `BASE_URL=${previewUrl}\nE2E_EXPECTED_HEAD_SHA=${expectedSha}\n`)
  console.log(`Exact protected Vercel Preview resolved: ${previewUrl}`)
}

if (eventName === 'workflow_dispatch') {
  const verified = inputPreviewUrl ? await verifyPreview(inputPreviewUrl) : false
  if (!verified) throw new Error(`Manual Preview is not READY for exact head ${expectedSha}`)
  await persist(verified)
  process.exit(0)
}

const repository = process.env.GITHUB_REPOSITORY
const prNumber = process.env.PR_NUMBER
const token = process.env.GITHUB_TOKEN
const apiUrl = process.env.GITHUB_API_URL || 'https://api.github.com'
if (!repository || !prNumber || !token) {
  throw new Error('Vercel PR-comment resolver credentials missing')
}

async function fetchComments() {
  const response = await fetch(`${apiUrl}/repos/${repository}/issues/${prNumber}/comments?per_page=100`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`GitHub PR comments failed: ${response.status}`)
  return response.json()
}

const deadline = Date.now() + 5 * 60_000
let lastCandidateSet = ''
while (Date.now() < deadline) {
  const comments = await fetchComments()
  const candidates = []
  for (const comment of comments) {
    if (comment?.user?.login !== 'vercel[bot]' || typeof comment.body !== 'string') continue
    const matches = comment.body.match(/https:\/\/[a-z0-9-]+\.vercel\.app/gi) || []
    candidates.push(...matches)
  }

  const uniqueCandidates = [...new Set(candidates)]
  const candidateSet = uniqueCandidates.map((candidate) => new URL(candidate).hostname).join(',')
  if (candidateSet !== lastCandidateSet) {
    console.log(`Vercel Preview candidates: ${candidateSet || 'none'}`)
    lastCandidateSet = candidateSet
  }

  for (const candidate of uniqueCandidates) {
    const verified = await verifyPreview(candidate)
    if (verified) {
      await persist(verified)
      process.exit(0)
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 5000))
}

throw new Error(`Exact protected Vercel Preview not resolved for ${expectedSha}`)
