import { test as setup } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { ciHelperUrl } from './ci-helper'

const EXPECTED_STAGING_REF = 'lpgrivowdcepcxradavu'
const OIDC_AUDIENCE = 'siap-tempur-staging-e2e'
const metadataFile = path.join(__dirname, '../../playwright/.auth/content-review-users.json')

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} wajib diatur untuk Content Review staging E2E.`)
  return value
}

function assertStagingUrl(url: string) {
  const projectRef = new URL(url).hostname.split('.')[0]
  if (projectRef !== EXPECTED_STAGING_REF) {
    throw new Error(
      `Content Review E2E diblokir: expected staging ${EXPECTED_STAGING_REF}, received ${projectRef || 'unknown'}.`,
    )
  }
}

async function githubOidcToken() {
  const explicit = process.env.E2E_GITHUB_OIDC_TOKEN
  if (explicit) return explicit
  const requestUrl = required('ACTIONS_ID_TOKEN_REQUEST_URL')
  const requestToken = required('ACTIONS_ID_TOKEN_REQUEST_TOKEN')
  const separator = requestUrl.includes('?') ? '&' : '?'
  const response = await fetch(
    `${requestUrl}${separator}audience=${encodeURIComponent(OIDC_AUDIENCE)}`,
    {
      headers: { Authorization: `bearer ${requestToken}` },
    },
  )
  if (!response.ok) throw new Error(`Gagal meminta GitHub OIDC token (${response.status}).`)
  const payload = (await response.json()) as { value?: string }
  if (!payload.value) throw new Error('GitHub OIDC token kosong.')
  return payload.value
}

async function helper(supabaseUrl: string, body: Record<string, unknown>) {
  const token = await githubOidcToken()
  const response = await fetch(ciHelperUrl(supabaseUrl, 'ci-e2e-user'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = (await response.json().catch(() => ({}))) as {
    userId?: string
    kind?: string
    error?: string
  }
  if (!response.ok)
    throw new Error(
      `ci-e2e-user ${String(body.action)} gagal (${response.status}): ${payload.error || 'unknown'}`,
    )
  return payload
}

setup('provision disposable content editor and reviewer', async () => {
  const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL')
  assertStagingUrl(supabaseUrl)
  const runId = process.env.GITHUB_RUN_ID || `local-${randomUUID().slice(0, 8)}`
  const suffix = `${runId}-${randomUUID().slice(0, 8)}`
  const editor = {
    email: `ci-content-editor-${suffix}@example.invalid`,
    password: `EditorE2E!${randomUUID()}-${randomUUID().slice(0, 8)}`,
  }
  const reviewer = {
    email: `ci-content-reviewer-${suffix}@example.invalid`,
    password: `ReviewerE2E!${randomUUID()}-${randomUUID().slice(0, 8)}`,
  }

  const editorResult = await helper(supabaseUrl, {
    action: 'provision',
    kind: 'content_editor',
    ...editor,
    runId,
  })
  if (!editorResult.userId) throw new Error('Editor provisioning tidak mengembalikan userId.')

  let reviewerResult: Awaited<ReturnType<typeof helper>> | null = null
  try {
    reviewerResult = await helper(supabaseUrl, {
      action: 'provision',
      kind: 'content_reviewer',
      ...reviewer,
      runId,
    })
    if (!reviewerResult.userId) throw new Error('Reviewer provisioning tidak mengembalikan userId.')
    await mkdir(path.dirname(metadataFile), { recursive: true })
    await writeFile(
      metadataFile,
      JSON.stringify(
        {
          runId,
          editor: { ...editor, userId: editorResult.userId },
          reviewer: { ...reviewer, userId: reviewerResult.userId },
        },
        null,
        2,
      ),
      'utf8',
    )
  } catch (error) {
    if (reviewerResult?.userId)
      await helper(supabaseUrl, { action: 'cleanup', userId: reviewerResult.userId }).catch(
        () => undefined,
      )
    await helper(supabaseUrl, { action: 'cleanup', userId: editorResult.userId }).catch(
      () => undefined,
    )
    throw error
  }
})
