import { expect } from 'vitest'

export function normalizeSql(text: string): string {
  let normalized = ''
  let index = 0

  while (index < text.length) {
    const current = text[index]
    const next = text[index + 1]

    if (current === '-' && next === '-') {
      index += 2
      while (index < text.length && text[index] !== '\n') index += 1
      continue
    }

    if (current === '/' && next === '*') {
      index += 2
      let depth = 1
      while (index < text.length && depth > 0) {
        if (text[index] === '/' && text[index + 1] === '*') {
          depth += 1
          index += 2
        } else if (text[index] === '*' && text[index + 1] === '/') {
          depth -= 1
          index += 2
        } else {
          index += 1
        }
      }
      continue
    }

    const dollarDelimiter = text.slice(index).match(/^\$[A-Za-z_][A-Za-z_0-9]*\$|^\$\$/)?.[0]
    if (dollarDelimiter) {
      const bodyStart = index + dollarDelimiter.length
      const bodyEnd = text.indexOf(dollarDelimiter, bodyStart)
      if (bodyEnd === -1) {
        normalized += dollarDelimiter + normalizeSql(text.slice(bodyStart))
        break
      }

      normalized += dollarDelimiter + normalizeSql(text.slice(bodyStart, bodyEnd)) + dollarDelimiter
      index = bodyEnd + dollarDelimiter.length
      continue
    }

    if (current === "'") {
      const start = index
      index += 1
      while (index < text.length) {
        if (text[index] === "'" && text[index + 1] === "'") {
          index += 2
          continue
        }
        if (text[index] === "'" && text[index - 1] !== '\\') {
          index += 1
          break
        }
        index += 1
      }
      normalized += text.slice(start, index)
      continue
    }

    if (current === '"') {
      const start = index
      index += 1
      while (index < text.length) {
        if (text[index] === '"' && text[index + 1] === '"') {
          index += 2
          continue
        }
        if (text[index] === '"') {
          index += 1
          break
        }
        index += 1
      }
      normalized += text.slice(start, index)
      continue
    }

    if (/\s/.test(current)) {
      index += 1
      continue
    }

    normalized += current.toLowerCase()
    index += 1
  }

  return normalized
}

function normalizeSqlPattern(pattern: RegExp) {
  const source = pattern.source.replace(/\\s[+*?]?/g, '').replace(/\s+/g, '')
  return new RegExp(source, pattern.flags)
}

export function expectSql(actual: string) {
  const normalized = normalizeSql(actual)
  const contains = (expected: string) =>
    normalized.includes(normalizeSql(expected)) ||
    actual.toLowerCase().includes(expected.toLowerCase())
  const assertions = {
    toContain(expected: string) {
      expect(contains(expected)).toBe(true)
    },
    toMatch(expected: RegExp) {
      expect(normalized).toMatch(normalizeSqlPattern(expected))
    },
  }

  return {
    ...assertions,
    not: {
      toContain(expected: string) {
        expect(contains(expected)).toBe(false)
      },
      toMatch(expected: RegExp) {
        expect(normalized).not.toMatch(normalizeSqlPattern(expected))
      },
    },
  }
}
