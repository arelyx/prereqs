// Politics Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/politics-minor.md
import { codes, defineHarness, range } from '@harness'
import type { Enrollment } from '@harness'

const GROUPS: { key: string; label: string; list: string[] }[] = [
  { key: 'theory', label: 'Theory', list: ['POLI 105A', 'POLI 105B', 'POLI 105C', 'POLI 105D'] },
  { key: 'us', label: 'U.S. Politics', list: ['POLI 120A', 'POLI 120B', 'POLI 120C'] },
  { key: 'comparative', label: 'Comparative', list: ['POLI 140A', 'POLI 140C', 'POLI 140D', 'POLI 140E'] },
  { key: 'global', label: 'Global Politics/International Relations', list: ['POLI 160A', 'POLI 160B', 'POLI 160C', 'POLI 160D'] },
]

// Group sets match cross-listed partner codes ("POLI 105A [/LGST 105A]") through the library.
const GROUP_SETS = GROUPS.map((g) => ({ key: g.key, set: codes(...g.list) }))

export default defineHarness({
  program: 'politics-minor',
  edition: '2026-27',
  title: 'Politics Minor',
  notes: ['No letter-grade policy: P/NP courses count.'],
  evaluate(h) {
    // "This program does not have a letter grade policy."
    h.policy = undefined

    const lower = h.take(
      'lower',
      'One lower-division politics course',
      'One 5-credit lower-division politics course from POLI 1-POLI 70.',
      range('POLI', 1, 70).minCredits(5),
    )

    const coreSet = GROUP_SETS.map((g) => g.set).reduce((a, b) => a.or(b))
    const groupOf = (code: string) => GROUP_SETS.find((g) => g.set.has(code, h.catalog))?.key ?? '?'
    const twoAndTwo = (chosen: Enrollment[]) => {
      const n = new Map<string, number>()
      for (const e of chosen) n.set(groupOf(e.code), (n.get(groupOf(e.code)) ?? 0) + 1)
      const p = [...n.values()]
      return p.length === 2 && p.every((x) => x === 2) ? null : 'needs two courses each from two different subfields'
    }
    const core = h.take(
      'core',
      'Four core courses (two each from two subfields)',
      ['Students take five upper-division electives: four core courses chosen from two subfields, and one upper-division elective.', 'Take two courses each from two different subfields below.'],
      coreSet,
      { n: 4, check: twoAndTwo, pool: GROUPS.map((g) => `${g.label}: ${g.list.join(', ')}`).join(' · ') },
    )
    const elective = h.take(
      'elective',
      'One upper-division elective',
      'Take one course numbered POLI 100-189.',
      range('POLI', 100, 189),
      { pool: 'POLI 100–189' },
    )
    return [lower, h.group('upper', 'Upper-Division Courses', [core, elective])]
  },
})
