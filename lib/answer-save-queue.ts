/** Serializes writes per question, coalesces newer edits, and retains failures.
 * Successful entries are removed, so final flushes only retry dirty answers.
 * Values must be immutable snapshots. No answers are cached across sessions.
 */
export class AnswerSaveQueue<T> {
  private entries = new Map<string, { value: T; version: number; worker: Promise<void> | null }>()

  set(key: string, value: T) {
    const entry = this.entries.get(key)
    if (entry) {
      entry.value = value
      entry.version += 1
    } else {
      this.entries.set(key, { value, version: 1, worker: null })
    }
  }

  keys() {
    return [...this.entries.keys()]
  }

  sync(key: string, save: (value: T) => Promise<void>): Promise<void> {
    const entry = this.entries.get(key)
    if (!entry) return Promise.resolve()
    if (entry.worker) return entry.worker
    // Start on a microtask so the worker is registered before save runs,
    // including when the adapter throws synchronously.
    const worker = Promise.resolve()
      .then(async () => {
        while (true) {
          const version = entry.version
          const value = entry.value
          try {
            await save(value)
          } catch (error) {
            // A failed superseded value must not discard the latest edit.
            if (entry.version !== version) continue
            throw error
          }
          if (entry.version === version) {
            this.entries.delete(key)
            return
          }
        }
      })
      .finally(() => {
        entry.worker = null
      })
    entry.worker = worker
    return worker
  }
}

/** Expiry transitions must still complete using the server's accepted answers.
 * Manual completion waits for every pending request and rejects any save failure.
 */
export async function flushAnswerSaves(saves: Promise<void>[], automatic = false) {
  const results = await Promise.allSettled(saves)
  const failure = results.find((result) => result.status === 'rejected')
  if (!automatic && failure?.status === 'rejected') throw failure.reason
}
