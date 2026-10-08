/** Escape LIKE wildcards only; RPC arguments never use PostgREST filter syntax. */
export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, character => `\\${character}`)
}
