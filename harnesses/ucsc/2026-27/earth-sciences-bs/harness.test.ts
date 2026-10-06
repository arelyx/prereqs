import { describe, expect, it } from 'vitest'
import { failing, find, plan, run } from '@harness-tools/testing'
import harness from './harness'

type Terms = ReturnType<typeof plan>
const swap = (base: Terms, from: string, ...to: string[]) =>
  base.map((t) => ({ ...t, courses: t.courses.flatMap((c) => (c === from ? to : [c])) }))
const add = (base: Terms, ...courses: string[]) => [...base, { term: '2298', courses }]

// General major: field/lab = EART 109+109L, EART 116; electives 104, 102,
// 140+140L, OCEA 101; comprehensive EART 191 (also the DC).
const general = plan(
  ['2268', 'EART 10', 'EART 10L', 'CHEM 3A', 'MATH 19A'],
  ['2270', 'CHEM 3B', 'MATH 19B'],
  ['2272', 'CHEM 3C', 'PHYS 6A', 'PHYS 6L'],
  ['2278', 'PHYS 6B', 'PHYS 6M', 'MATH 22'],
  ['2280', 'EART 110A', 'EART 109', 'EART 109L'],
  ['2282', 'EART 110B', 'EART 110M', 'EART 116'],
  ['2288', 'EART 110C', 'EART 110N', 'EART 104'],
  ['2290', 'EART 102', 'EART 140', 'EART 140L'],
  ['2292', 'OCEA 101', 'EART 191'],
)

describe('earth-sciences-bs 2026-27 — general major', () => {
  it('complete record is met (general is the default)', () => {
    expect(failing(run(harness, { terms: general }))).toEqual([])
    expect(failing(run(harness, { terms: general, choices: { concentration: 'General' } }))).toEqual([])
  })

  it('CHEM 3B before fall 2026 needs CHEM 3BL', () => {
    const t = [{ term: '2262', courses: ['CHEM 3B'] }, ...swap(general, 'CHEM 3B')]
    expect(find(run(harness, { terms: t }), 'gen-chem').status).toBe('unmet')
    const t2 = [{ term: '2262', courses: ['CHEM 3B', 'CHEM 3BL'] }, ...swap(general, 'CHEM 3B')]
    expect(find(run(harness, { terms: t2 }), 'gen-chem').status).toBe('met')
  })

  it('intro geology lecture and lab must be a listed pair', () => {
    expect(find(run(harness, { terms: swap(general, 'EART 10L', 'EART 5L') }), 'intro-geology').status).toBe('unmet')
  })

  it('EART 125 counts for the math/programming/statistics slot', () => {
    expect(failing(run(harness, { terms: swap(general, 'MATH 22', 'EART 125') }))).toEqual([])
  })

  it('a field/lab lecture needs its lab', () => {
    // Without 109L, EART 109 counts nowhere: one of field-lab/electives falls short.
    const r = run(harness, { terms: swap(general, 'EART 109L') })
    expect(failing(r)).toHaveLength(1)
    expect([find(r, 'field-lab').status, find(r, 'electives').status]).toContain('unmet')
    expect(find(r, 'field-lab').used?.map((e) => e.display)).not.toContain('EART 109')
    expect(find(r, 'electives').used?.map((e) => e.display)).not.toContain('EART 109')
  })

  it('an elective lecture with a catalog lab needs the lab', () => {
    expect(find(run(harness, { terms: swap(general, 'EART 140L') }), 'electives').status).toBe('unmet')
  })

  it('EART 196B, EART 198 and 2-credit courses are not electives', () => {
    expect(find(run(harness, { terms: swap(general, 'EART 104', 'EART 196B') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap(general, 'EART 104', 'EART 198') }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: swap(general, 'EART 104', 'EART 199F') }), 'electives').status).toBe('unmet')
  })

  it('only one quarter of EART 199 / OCEA 199', () => {
    const one = swap(general, 'EART 104', 'EART 199')
    expect(find(run(harness, { terms: one }), 'electives').status).toBe('met')
    const two = swap(one, 'EART 102', 'OCEA 199')
    expect(find(run(harness, { terms: two }), 'electives').status).toBe('unmet')
  })

  it('ENVS 115A + 115L together count as one elective, not alone', () => {
    expect(find(run(harness, { terms: swap(general, 'EART 104', 'ENVS 115A', 'ENVS 115L') }), 'electives').status).toBe('met')
    expect(find(run(harness, { terms: swap(general, 'EART 104', 'ENVS 115A') }), 'electives').status).toBe('unmet')
  })

  it('the comprehensive course cannot also be an elective', () => {
    // Take away one elective; the capstone EART 191 must not fill it.
    const r = run(harness, { terms: swap(general, 'EART 104') })
    expect(find(r, 'electives').status).toBe('unmet')
    expect(find(r, 'comprehensive').status).toBe('met')
  })

  it('the comprehensive course cannot also be a field/lab course', () => {
    // EART 191C is on the field/lab list; alone it can be only one of them.
    const r = run(harness, { terms: swap(swap(general, 'EART 116'), 'EART 191', 'EART 191C') })
    expect(failing(r)).toHaveLength(1)
    expect(find(r, 'comprehensive').used?.map((e) => e.display)).toEqual(['EART 191C'])
    expect(find(r, 'field-lab').used?.map((e) => e.display)).not.toContain('EART 191C')
    expect(find(r, 'electives').used?.map((e) => e.display)).not.toContain('EART 191C')
  })

  it('DC may reuse the comprehensive course; missing DC is reported alone', () => {
    // Summer field as comprehensive; no EART 191/195 → DC still met via 189A+189B.
    const t = swap(general, 'EART 191', 'EART 189A', 'EART 189B')
    expect(failing(run(harness, { terms: t }))).toEqual([])
    // Thesis comprehensive, DC via thesis.
    expect(failing(run(harness, { terms: swap(general, 'EART 191', 'EART 195') }))).toEqual([])
  })

  it('no comprehensive: comprehensive and DC both unmet', () => {
    const r = run(harness, { terms: swap(general, 'EART 191', 'EART 152') })
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
  })

  it('EART 189A alone is not the summer field option', () => {
    const r = run(harness, { terms: swap(general, 'EART 191', 'EART 189A') })
    expect(find(r, 'comprehensive').status).toBe('unmet')
  })

  it('letter grades required, except EART 195/198/199 and OCEA 199', () => {
    expect(find(run(harness, { terms: general, grades: { 'EART 104': 'P' } }), 'electives').status).toBe('unmet')
    expect(find(run(harness, { terms: general, grades: { 'PHYS 6A': 'P' } }), 'physics').status).toBe('unmet')
    expect(find(run(harness, { terms: general, grades: { 'EART 191': 'P' } }), 'comprehensive').status).toBe('unmet')
    const thesis = swap(general, 'EART 191', 'EART 195')
    expect(failing(run(harness, { terms: thesis, grades: { 'EART 195': 'P' } }))).toEqual([])
    const tut = swap(general, 'EART 104', 'EART 199')
    expect(failing(run(harness, { terms: tut, grades: { 'EART 199': 'P' } }))).toEqual([])
  })
})

// Geology: core incl. 109/109L, 120/120L, 150/150L; geology elective 146+146L;
// electives 104, 102; DC + comprehensive = 189A + 189B.
const geology = plan(
  ['2268', 'EART 5', 'EART 5L', 'CHEM 4A', 'CHEM 4AL', 'MATH 11A'],
  ['2270', 'CHEM 4B', 'CHEM 4BL', 'MATH 11B'],
  ['2272', 'PHYS 6A', 'PHYS 6L'],
  ['2278', 'PHYS 6B', 'PHYS 6M', 'EART 110A'],
  ['2280', 'EART 110B', 'EART 110M', 'EART 109', 'EART 109L'],
  ['2282', 'EART 110C', 'EART 110N', 'EART 120', 'EART 120L'],
  ['2288', 'EART 150', 'EART 150L', 'EART 146', 'EART 146L'],
  ['2290', 'EART 104', 'EART 102'],
  ['2294', 'EART 189A', 'EART 189B'],
)
const GEO = { concentration: 'Geology' }

describe('earth-sciences-bs 2026-27 — geology', () => {
  it('complete record is met; no extra math course needed', () => {
    expect(failing(run(harness, { terms: geology, choices: GEO }))).toEqual([])
  })
  it('geology elective lecture needs its lab', () => {
    expect(find(run(harness, { terms: swap(geology, 'EART 146L'), choices: GEO }), 'geology-elective').status).toBe('unmet')
  })
  it('comprehensive must be summer field (a capstone does not count)', () => {
    const r = run(harness, { terms: swap(geology, 'EART 189A', 'EART 191'), choices: GEO })
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
  })
  it('EART 189B used for the comprehensive is not also an elective', () => {
    expect(find(run(harness, { terms: swap(geology, 'EART 102'), choices: GEO }), 'electives').status).toBe('unmet')
  })
  it('the general-major record lacks the geology core', () => {
    const r = run(harness, { terms: general, choices: GEO })
    expect(find(r, 'ud-core').status).toBe('unmet')
  })
})

// Planetary: core + 119A + 160; 162; electives 104, 102, 163; thesis comprehensive.
const planetary = plan(
  ['2268', 'EART 20', 'EART 20L', 'CHEM 3A', 'MATH 19A'],
  ['2270', 'CHEM 3B', 'MATH 19B'],
  ['2272', 'CHEM 3C', 'PHYS 6A', 'PHYS 6L', 'MATH 23A'],
  ['2278', 'PHYS 6B', 'PHYS 6M', 'EART 110A'],
  ['2280', 'EART 110B', 'EART 110M', 'EART 119A'],
  ['2282', 'EART 110C', 'EART 110N', 'EART 160'],
  ['2288', 'EART 162', 'EART 104'],
  ['2290', 'EART 102', 'EART 163'],
  ['2292', 'EART 195'],
)
const PLAN = { concentration: 'Planetary Sciences' }

describe('earth-sciences-bs 2026-27 — planetary sciences', () => {
  it('complete record is met', () => {
    expect(failing(run(harness, { terms: planetary, choices: PLAN }))).toEqual([])
  })
  it('EART 125 does not satisfy the planetary math course', () => {
    expect(find(run(harness, { terms: swap(planetary, 'MATH 23A', 'EART 125'), choices: PLAN }), 'math-multivar').status).toBe('unmet')
  })
  it('three electives, not two', () => {
    expect(find(run(harness, { terms: swap(planetary, 'EART 163'), choices: PLAN }), 'electives').status).toBe('unmet')
  })
  it('planetary elective must be EART 162-165', () => {
    expect(find(run(harness, { terms: swap(swap(planetary, 'EART 162', 'EART 152'), 'EART 163', 'EART 116'), choices: PLAN }), 'planetary-elective').status).toBe('unmet')
  })
})

// Ocean: BIOE 20C; OCEA 102; electives 104, 102, OCEA 120, OCEA 130; capstone 191D.
const ocean = plan(
  ['2268', 'EART 10', 'EART 10L', 'CHEM 3A', 'MATH 19A'],
  ['2270', 'CHEM 3B', 'MATH 19B', 'BIOE 20C'],
  ['2272', 'CHEM 3C', 'PHYS 6A', 'PHYS 6L', 'EART 111'],
  ['2278', 'PHYS 6B', 'PHYS 6M', 'EART 110A'],
  ['2280', 'EART 110B', 'EART 110M', 'OCEA 102'],
  ['2282', 'EART 110C', 'EART 110N', 'EART 104'],
  ['2288', 'EART 102', 'OCEA 120'],
  ['2290', 'OCEA 130', 'EART 191D'],
)
const OCE = { concentration: 'Ocean Sciences' }

describe('earth-sciences-bs 2026-27 — ocean sciences', () => {
  it('complete record is met', () => {
    expect(failing(run(harness, { terms: ocean, choices: OCE }))).toEqual([])
  })
  it('BIOE 20C is required', () => {
    expect(failing(run(harness, { terms: swap(ocean, 'BIOE 20C'), choices: OCE }))).toEqual(['bio-physics/BIOE20C:unmet'])
  })
  it('OCEA 101 or 102 is required (and is not double counted as an elective)', () => {
    expect(find(run(harness, { terms: swap(ocean, 'OCEA 102', 'OCEA 100'), choices: OCE }), 'ocean-course').status).toBe('unmet')
  })
})

// Geophysics: MATH 21; 22; EART 112; EART 118; electives 104, 126, 270, 152; thesis 195.
const geophysics = plan(
  ['2268', 'EART 10', 'EART 10L', 'CHEM 3A', 'MATH 19A'],
  ['2270', 'CHEM 3B', 'MATH 19B', 'MATH 21'],
  ['2272', 'CHEM 3C', 'PHYS 6A', 'PHYS 6L', 'MATH 22'],
  ['2278', 'PHYS 6B', 'PHYS 6M', 'EART 110A'],
  ['2280', 'EART 110B', 'EART 110M', 'EART 112'],
  ['2282', 'EART 110C', 'EART 110N', 'EART 118'],
  ['2288', 'EART 104', 'EART 126'],
  ['2290', 'EART 270', 'EART 152'],
  ['2292', 'EART 195'],
)
const GPH = { concentration: 'Geophysics' }

describe('earth-sciences-bs 2026-27 — geophysics', () => {
  it('complete record is met (EART 270 from the recommended list counts)', () => {
    expect(failing(run(harness, { terms: geophysics, choices: GPH }))).toEqual([])
  })
  it('linear algebra is required (AM 10 also works)', () => {
    expect(failing(run(harness, { terms: swap(geophysics, 'MATH 21'), choices: GPH }))).toEqual(['linear-algebra:unmet'])
    expect(failing(run(harness, { terms: swap(geophysics, 'MATH 21', 'AM 10'), choices: GPH }))).toEqual([])
  })
  it('EART 191 capstone is not a geophysics comprehensive or DC option', () => {
    const r = run(harness, { terms: swap(geophysics, 'EART 195', 'EART 191'), choices: GPH })
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('unmet')
  })
  it('summer field is not a geophysics comprehensive option', () => {
    const r = run(harness, { terms: add(swap(geophysics, 'EART 195'), 'EART 189A', 'EART 189B'), choices: GPH })
    expect(find(r, 'comprehensive').status).toBe('unmet')
  })
  it('EART 191C satisfies both DC and comprehensive', () => {
    expect(failing(run(harness, { terms: swap(geophysics, 'EART 195', 'EART 191C'), choices: GPH }))).toEqual([])
  })
})
