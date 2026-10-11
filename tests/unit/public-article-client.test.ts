import { beforeEach, describe, expect, it, vi } from 'vitest'
const { createClient, query, state } = vi.hoisted(() => {
  const state = { result: { data: [] as unknown, error: null as unknown } }
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
    then: vi.fn(),
  }
  return { createClient: vi.fn(), query, state }
})
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }))
vi.mock('@supabase/supabase-js', () => ({ createClient }))
vi.mock('@/lib/env', () => ({
  env: { supabaseUrl: () => 'https://staging.test', supabasePublishableKey: () => 'public-key' },
}))
vi.mock('@/lib/utils/supabase/server', () => {
  throw Error('Public article cache must not import cookie or privileged clients')
})
import {
  getPublishedArticleBySlug,
  listLatestPublishedArticleCards,
  listLatestPublishedArticles,
  listPublishedArticles,
} from '@/src/services/article-read.service'
beforeEach(() => {
  vi.clearAllMocks()
  state.result = { data: [], error: null }
  for (const method of ['select', 'eq', 'order', 'limit'] as const)
    query[method].mockReturnValue(query)
  query.maybeSingle.mockImplementation(() => Promise.resolve(state.result))
  query.then.mockImplementation(
    (resolve: (result: unknown) => unknown, reject: (error: unknown) => unknown) =>
      Promise.resolve(state.result).then(resolve, reject),
  )
  createClient.mockReturnValue({ from: vi.fn().mockReturnValue(query) })
})
describe('public article cache authorization', () => {
  for (const [name, read] of [
    ['all', () => listPublishedArticles()],
    ['latest', () => listLatestPublishedArticles(3)],
    ['cards', () => listLatestPublishedArticleCards(3)],
    ['slug', () => getPublishedArticleBySlug('public-slug')],
  ] as const)
    it(`${name} uses a stateless publishable client and filters published content`, async () => {
      await read()
      expect(createClient).toHaveBeenCalledExactlyOnceWith('https://staging.test', 'public-key', {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
      expect(query.eq).toHaveBeenCalledWith('status', 'published')
    })
  it('propagates query errors instead of caching an incorrect empty list', async () => {
    state.result = { data: null, error: { code: '42501', message: 'denied' } }
    await expect(listLatestPublishedArticleCards(3)).rejects.toEqual(state.result.error)
  })
})
