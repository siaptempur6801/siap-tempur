import { describe, expect, it } from 'vitest'
import { escapeLikePattern } from '@/lib/admin-query-pattern'
describe('literal RPC search patterns', () => {
  it.each([
    ['', ''],
    ['100%', '100\\%'],
    ['a_b', 'a\\_b'],
    ['a\\b', 'a\\\\b'],
    ['(x),"&', '(x),"&'],
  ])('escapes SQL LIKE wildcards without PostgREST encoding: %s', (input, expected) => {
    expect(escapeLikePattern(input)).toBe(expected)
  })
})
