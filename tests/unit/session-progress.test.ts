import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clampStoredIndex,
  progressStorageKey,
  readStoredIndex,
  writeStoredIndex,
} from '@/lib/session-progress'

/**
 * Progres lokal sesi TKA.
 *
 * Regresi yang dijaga: Server Action menyimpan jawaban membuat Next.js me-render ulang
 * RSC tree sehingga prop `state.questions` datang dengan identitas baru. Efek sinkronisasi
 * klien sesi harus memulihkan posisi soal dari progres lokal, bukan meresetnya ke soal 1.
 */
function fakeLocalStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size
    },
  }
}

describe('progres lokal sesi TKA', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: fakeLocalStorage() })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('membuat kunci unik per attempt dan bagian', () => {
    expect(progressStorageKey('a1', 's1')).not.toBe(progressStorageKey('a1', 's2'))
    expect(progressStorageKey('a1', null)).toBe('tka-full-progress:a1:none')
  })

  it('membatasi indeks tersimpan ke rentang soal yang tersedia', () => {
    expect(clampStoredIndex(11, 12)).toBe(11)
    expect(clampStoredIndex(99, 12)).toBe(11)
    expect(clampStoredIndex(-3, 12)).toBe(0)
    expect(clampStoredIndex(4.7, 12)).toBe(4)
    expect(clampStoredIndex('x', 12)).toBe(0)
    expect(clampStoredIndex(undefined, 12)).toBe(0)
    expect(clampStoredIndex(3, 0)).toBe(0)
  })

  it('mengembalikan 0 bila progres belum pernah disimpan', () => {
    expect(readStoredIndex(progressStorageKey('attempt', 'section'), 12)).toBe(0)
  })

  it('menyimpan dan memulihkan posisi soal', () => {
    const key = progressStorageKey('attempt', 'section')
    writeStoredIndex(key, 7)
    expect(readStoredIndex(key, 12)).toBe(7)
  })

  it('tidak menghapus data lain pada kunci yang sama', () => {
    const key = progressStorageKey('attempt', 'section')
    window.localStorage.setItem(key, JSON.stringify({ index: 2, flags: { q1: true } }))
    writeStoredIndex(key, 9)
    const parsed = JSON.parse(window.localStorage.getItem(key) as string)
    expect(parsed.index).toBe(9)
    expect(parsed.flags).toEqual({ q1: true })
  })

  it('mengabaikan progres rusak dan kuota penyimpanan penuh', () => {
    const key = progressStorageKey('attempt', 'section')
    window.localStorage.setItem(key, '{bukan json')
    expect(readStoredIndex(key, 12)).toBe(0)

    vi.stubGlobal('window', {
      localStorage: {
        ...fakeLocalStorage(),
        getItem: () => {
          throw new Error('quota')
        },
        setItem: () => {
          throw new Error('quota')
        },
      },
    })
    expect(() => writeStoredIndex(key, 4)).not.toThrow()
    expect(readStoredIndex(key, 12)).toBe(0)
  })
})
