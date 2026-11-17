import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const read = vi.hoisted(() => vi.fn())
vi.mock('@/lib/utils/supabase/server', () => ({
  createV2AdminClient: async () => ({ from: () => ({ select() { return this }, eq() { return this }, limit() { return this }, maybeSingle: read }) }),
}))
import { attemptRepository } from '@/src/repositories/attempt.repository'

describe('concurrent start waits for the winning attempt snapshot', () => {
  beforeEach(() => { vi.useFakeTimers(); read.mockReset() })
  afterEach(() => vi.useRealTimers())
  it('does not release a resumed attempt while its questions are being initialized', async () => {
    read.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: { id: 'question' }, error: null })
    let released = false
    const pending = attemptRepository.waitForAttemptQuestions('attempt').then(() => { released = true })
    await vi.advanceTimersByTimeAsync(0)
    expect(released).toBe(false)
    await vi.advanceTimersByTimeAsync(100)
    await pending
    expect(released).toBe(true)
  })
  it('opens an already initialized attempt immediately', async () => {
    read.mockResolvedValue({ data: { id: 'question' }, error: null })
    await attemptRepository.waitForAttemptQuestions('attempt')
    expect(vi.getTimerCount()).toBe(0)
  })
  it('fails safely instead of opening an attempt that never becomes ready', async () => {
    read.mockResolvedValue({ data: null, error: null })
    const rejected = expect(attemptRepository.waitForAttemptQuestions('attempt')).rejects.toThrow('ATTEMPT_INITIALIZING')
    await vi.advanceTimersByTimeAsync(5_000)
    await rejected
  })
  it('propagates a database failure without treating it as an empty snapshot', async () => {
    read.mockResolvedValue({ data: null, error: new Error('database unavailable') })
    await expect(attemptRepository.waitForAttemptQuestions('attempt')).rejects.toThrow('database unavailable')
    expect(vi.getTimerCount()).toBe(0)
  })
})
