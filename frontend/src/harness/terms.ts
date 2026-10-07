// Per-term helpers for rules like "an ensemble every quarter you are in the
// program". Pure functions over term codes (pisa STRM: 2 + YY + season digit,
// 0 winter / 2 spring / 4 summer / 8 fall).

import type { Enrollment } from './types'

export function season(term: string): 'winter' | 'spring' | 'summer' | 'fall' {
  const d = Number(term) % 10
  return d === 0 ? 'winter' : d === 2 ? 'spring' : d === 4 ? 'summer' : 'fall'
}

export function isSummer(term: string): boolean {
  return season(term) === 'summer'
}

export function termLabel(term: string): string {
  const n = Number(term)
  const year = 2000 + Math.floor((n - 2000) / 10)
  const s = season(term)
  return `${s[0].toUpperCase()}${s.slice(1)} ${year}`
}

/** The next regular (non-summer) quarter after `term`. */
export function nextRegular(term: string): string {
  const n = Number(term)
  const base = n - (n % 10)
  const d = n % 10
  if (d === 8) return String(base + 10) // fall → next winter (year digit rolls)
  if (d === 0) return String(base + 2) // winter → spring
  return String(base + 8) // spring/summer → fall
}

/** Regular quarters from `from` to `to` inclusive. */
export function regularQuarters(from: string, to: string): string[] {
  const out: string[] = []
  let t = isSummer(from) ? nextRegular(from) : from
  while (Number(t) <= Number(to)) {
    out.push(t)
    t = nextRegular(t)
  }
  return out
}

/** Enrollments grouped by term (term-less enrollments under ''). Sorted chronologically. */
export function byTerm(es: Enrollment[]): Map<string, Enrollment[]> {
  const m = new Map<string, Enrollment[]>()
  for (const e of es) {
    const k = e.term ?? ''
    if (!m.has(k)) m.set(k, [])
    m.get(k)!.push(e)
  }
  return new Map([...m.entries()].sort((a, b) => Number(a[0] || 0) - Number(b[0] || 0)))
}

/** Terms (non-empty) that have at least one enrollment, chronological. */
export function enrolledTerms(es: Enrollment[]): string[] {
  return [...new Set(es.map((e) => e.term).filter((t): t is string => !!t))].sort((a, b) => Number(a) - Number(b))
}
