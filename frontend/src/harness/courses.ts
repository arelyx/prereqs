// Course codes, catalog construction, and composable course sets.
//
// A CourseSet is a predicate over canonical course codes plus a human
// description, so a harness can say `range('CSE', 100, 189).minCredits(5)`
// and the dashboard can say "any CSE 100–189 (5+ credits)".

import type { Catalog, CatalogCourse } from './types'

const CODE_RE = /^([A-Z]+)\s*(\d+)([A-Z]*)$/

/** 'MUSC 101A' / 'musc101a' → 'MUSC101A'. */
export function canon(code: string): string {
  return code.replace(/\s+/g, '').toUpperCase()
}

/** 'MUSC101A' → 'MUSC 101A'. */
export function display(code: string): string {
  const m = canon(code).match(CODE_RE)
  return m ? `${m[1]} ${m[2]}${m[3]}` : code
}

export function parseCode(code: string): { subject: string; number: number; suffix: string } {
  const m = canon(code).match(CODE_RE)
  if (!m) return { subject: canon(code), number: NaN, suffix: '' }
  return { subject: m[1], number: parseInt(m[2], 10), suffix: m[3] }
}

/** Raw course row (committed JSON / compact API). */
export interface RawCourse {
  code: string
  display_code?: string
  subject?: string
  number?: string
  credits?: string
  division?: string
  title?: string
  cross_listed?: string[]
  description?: string | null
}

export function makeCatalog(rows: RawCourse[], describedSubjects: Iterable<string> = []): Catalog {
  const byCode = new Map<string, CatalogCourse>()
  for (const r of rows) {
    const p = parseCode(r.code)
    const credits = parseFloat((r.credits ?? '').match(/\d+(\.\d+)?/)?.[0] ?? 'NaN')
    byCode.set(canon(r.code), {
      code: canon(r.code),
      display: r.display_code ?? display(r.code),
      subject: r.subject ?? p.subject,
      number: p.number,
      suffix: p.suffix,
      credits,
      division: r.division ?? '',
      title: r.title ?? '',
      crossListed: (r.cross_listed ?? []).map(canon),
      description: r.description ?? undefined,
    })
  }
  const sorted = [...byCode.values()].sort(
    (a, b) =>
      a.subject.localeCompare(b.subject) || a.number - b.number || a.suffix.localeCompare(b.suffix),
  )
  return {
    get: (c) => byCode.get(canon(c)),
    has: (c) => byCode.has(canon(c)),
    all: () => sorted,
    described: new Set(describedSubjects),
  }
}

// ---------------------------------------------------------------------------
// Course sets

export interface CourseSet {
  /** Does this canonical code belong to the set? (catalog-aware) */
  has(code: string, catalog?: Catalog): boolean
  /** Human description for the dashboard. */
  describe: string
  /** Explicit members when the set is a finite list (for suggestions/lint). */
  members?: string[]
  /** Union / exclusion / filters, chainable. */
  or(other: CourseSet): CourseSet
  except(other: CourseSet | string[]): CourseSet
  minCredits(n: number): CourseSet
  where(pred: (c: CatalogCourse) => boolean, describe: string): CourseSet
  /** Enumerate catalog members (explicit members, or a catalog scan). */
  list(catalog: Catalog): string[]
}

function mkSet(
  has: (code: string, catalog?: Catalog) => boolean,
  describe: string,
  members?: string[],
): CourseSet {
  const self: CourseSet = {
    has,
    describe,
    members,
    or: (other) =>
      mkSet(
        (c, cat) => has(c, cat) || other.has(c, cat),
        `${describe}; or ${other.describe}`,
        members && other.members ? [...new Set([...members, ...other.members])] : undefined,
      ),
    except: (other) => {
      const o = Array.isArray(other) ? codes(...other) : other
      return mkSet(
        (c, cat) => has(c, cat) && !o.has(c, cat),
        `${describe}, except ${o.describe}`,
        members?.filter((m) => !o.has(m)),
      )
    },
    minCredits: (n) =>
      mkSet(
        (c, cat) => {
          if (!has(c, cat)) return false
          const cr = cat?.get(c)?.credits
          return cr === undefined || Number.isNaN(cr) ? true : cr >= n
        },
        `${describe} (${n}+ credits)`,
        members,
      ),
    where: (pred, d) =>
      mkSet(
        (c, cat) => {
          if (!has(c, cat)) return false
          const course = cat?.get(c)
          return course ? pred(course) : false
        },
        `${describe} (${d})`,
        members,
      ),
    list: (catalog) =>
      members
        ? members.filter((m) => catalog.has(m) && has(m, catalog))
        : catalog
            .all()
            .filter((c) => has(c.code, catalog))
            .map((c) => c.code),
  }
  return self
}

/** An explicit list: codes('MUSC 101A', 'MUSC 101B'). */
export function codes(...list: string[]): CourseSet {
  const set = new Set(list.map(canon))
  return mkSet((c) => set.has(canon(c)), list.map(display).join(', '), [...set])
}

/** Expand 'MUSC 101A/B/C' style shorthand: series('MUSC 101', 'ABC') → MUSC101A, MUSC101B, MUSC101C. */
export function lettered(base: string, letters: string): string[] {
  return [...letters].map((l) => canon(base) + l)
}

/** subject + number range, inclusive, any suffix: range('CSE', 100, 189). */
export function range(subject: string, lo: number, hi: number): CourseSet {
  const subj = subject.toUpperCase()
  return mkSet((c) => {
    const p = parseCode(c)
    return p.subject === subj && p.number >= lo && p.number <= hi
  }, `${subj} ${lo}–${hi}`)
}

/** A numbered "series": series('LIT', 61) → LIT 61, 61A, 61B, … */
export function series(subject: string, number: number): CourseSet {
  const subj = subject.toUpperCase()
  return mkSet((c) => {
    const p = parseCode(c)
    return p.subject === subj && p.number === number
  }, `${subj} ${number} series`)
}

/** Every course in a subject (optionally only one division). */
export function subject(subj: string, division?: 'lower' | 'upper' | 'graduate'): CourseSet {
  const s = subj.toUpperCase()
  return mkSet(
    (c, cat) => {
      const p = parseCode(c)
      if (p.subject !== s) return false
      if (!division) return true
      const d = cat?.get(c)?.division
      if (d) return d === division
      return division === 'lower' ? p.number < 100 : division === 'upper' ? p.number >= 100 && p.number < 200 : p.number >= 200
    },
    division ? `any ${division}-division ${s}` : `any ${s}`,
  )
}

export function anyOf(...sets: CourseSet[]): CourseSet {
  return sets.reduce((a, b) => a.or(b))
}

export const NONE: CourseSet = mkSet(() => false, 'nothing', [])

/** Is this code a lab whose lecture is `code` minus a trailing L (e.g. CSE 100L ↔ CSE 100)? */
export function labFor(lecture: string, catalog: Catalog): string | null {
  const lab = canon(lecture) + 'L'
  return catalog.has(lab) ? lab : null
}
