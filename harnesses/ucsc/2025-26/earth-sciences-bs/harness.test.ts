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
  ['2270', 'CHEM 3B', 'CHEM 3BL', 'MATH 19B'],
  ['2272', 'CHEM 3C', 'CHEM 3CL', 'PHYS 6A', 'PHYS 6L'],
  ['2278', 'PHYS 6B', 'PHYS 6M', 'MATH 22'],
  ['2280', 'EART 110A', 'EART 109', 'EART 109L'],
  ['2282', 'EART 110B', 'EART 110M', 'EART 116'],
  ['2288', 'EART 110C', 'EART 110N', 'EART 104'],
  ['2290', 'EART 102', 'EART 140', 'EART 140L'],
  ['2292', 'OCEA 101', 'EART 191'],
)

describe('earth-sciences-bs 2025-26 — general major', () => {
  it('complete record is met (general is the default)', () => {
    expect(failing(run(harness, { terms: general }))).toEqual([])
    expect(failing(run(harness, { terms: general, choices: { concentration: 'General' } }))).toEqual([])
  })

  it('2025-26: CHEM 3BL and CHEM 3CL are always required (no fall-2026 rule before fall 2026)', () => {
    const t = [{ term: '2258', courses: ['CHEM 3B'] }, ...swap(general, 'CHEM 3B'), ]
    expect(find(run(harness, { terms: swap(t, 'CHEM 3BL') }), 'gen-chem').status).toBe('unmet')
    expect(find(run(harness, { terms: t }), 'gen-chem').status).toBe('met')
    expect(find(run(harness, { terms: swap(general, 'CHEM 3CL') }), 'gen-chem').status).toBe('cannot-check')
  })

  it('2025-26: CHEM 3B/3C from fall 2026 on without the lab is cannot-check, not met', () => {
    // general plan has CHEM 3B in 2270 and CHEM 3C in 2272 (after fall 2026)
    const r = run(harness, { terms: swap(swap(general, 'CHEM 3BL'), 'CHEM 3CL') })
    expect(find(r, 'gen-chem').status).toBe('cannot-check')
    expect(failing(r)).toEqual(['gen-chem:cannot-check'])
  })

  it('2025-26: the old CHEM 1A/1B/1C/1M/1N series satisfies general chemistry', () => {
    const old = [{ term: '2228', courses: ['CHEM 1A', 'CHEM 1B', 'CHEM 1C', 'CHEM 1M', 'CHEM 1N'] }, ...general.map((q) => ({ ...q, courses: q.courses.filter((c) => !c.startsWith('CHEM')) }))]
    expect(find(run(harness, { terms: old }), 'gen-chem').status).toBe('met')
    const noN = old.map((q) => ({ ...q, courses: q.courses.filter((c) => c !== 'CHEM 1N') }))
    expect(find(run(harness, { terms: noN }), 'gen-chem').status).toBe('unmet')
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
    const t = [...swap(general, 'EART 191'), { term: '2294', courses: ['EART 189A', 'EART 189B'] }]
    expect(failing(run(harness, { terms: t }))).toEqual([])
    // Thesis comprehensive, DC via thesis.
    expect(failing(run(harness, { terms: swap(general, 'EART 191', 'EART 195') }))).toEqual([])
  })

  it('no comprehensive: comprehensive unmet; DC is still met by two list courses', () => {
    const r = run(harness, { terms: swap(general, 'EART 191', 'EART 152') })
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('met')
  })

  it('2025-26: DC = two courses from the list (EART 189B alone counts as one)', () => {
    // general DC candidates: EART 109, 104, 102, 140, 191. Leave only EART 191.
    const t = general.map((q) => ({ ...q, courses: q.courses.map((c) => ({ 'EART 109': 'EART 125', 'EART 109L': 'EART 142', 'EART 104': 'EART 152', 'EART 102': 'EART 130', 'EART 140': 'EART 130L', 'EART 140L': 'OCEA 120' })[c] ?? c) }))
    const r = run(harness, { terms: t })
    // other upper-division EART courses exist and the list is "subject to change"
    expect(find(r, 'dc').status).toBe('cannot-check')
    const r2 = run(harness, { terms: add(t, 'EART 148') })
    expect(find(r2, 'dc').status).toBe('met')
    const only = plan(['2268', 'EART 191'])
    expect(find(run(harness, { terms: only }), 'dc').status).toBe('unmet')
    expect(find(run(harness, { terms: plan(['2268', 'EART 191'], ['2273', 'EART 189B']) }), 'dc').status).toBe('met')
  })

  it('2025-26: EART 189A is a field/laboratory/data analysis course', () => {
    const r = run(harness, { terms: swap(general, 'EART 116', 'EART 189A') })
    expect(failing(r)).toEqual([])
    expect(find(r, 'field-lab').used?.map((e) => e.display)).toContain('EART 189A')
  })

  it('2025-26: EART 191B (Planetary Capstone) is a comprehensive option', () => {
    expect(failing(run(harness, { terms: swap(general, 'EART 191', 'EART 191B') }))).toEqual([])
  })

  it('2025-26: EART 146 counts without a lab (no EART 146L on this page)', () => {
    expect(find(run(harness, { terms: swap(general, 'EART 116', 'EART 146') }), 'field-lab').status).toBe('met')
    expect(find(run(harness, { terms: swap(general, 'EART 104', 'EART 146') }), 'electives').status).toBe('met')
  })

  it('review: EART 189B outside a summer term is not the summer field comprehensive', () => {
    // "EART 189B must be completed in the summer."
    const r = run(harness, { terms: swap(general, 'EART 191', 'EART 189A', 'EART 189B') })
    expect(failing(r)).toEqual(['comprehensive:unmet'])
    expect(find(r, 'comprehensive').detail).toContain('summer')
  })

  it('review: one course cannot fill both the math/programming slot and a field/lab slot', () => {
    const r = run(harness, { terms: swap(swap(general, 'MATH 22', 'EART 119A'), 'EART 116') })
    expect(failing(r)).toEqual(['electives:unmet'])
  })

  it('2025-26: CHEM 3B transfer credit with no term and no CHEM 3BL is unmet (labs required)', () => {
    expect(find(run(harness, { terms: swap(general, 'CHEM 3B', 'CHEM 3BL'), completed: ['CHEM 3B'] }), 'gen-chem').status).toBe('met')
    expect(find(run(harness, { terms: swap(swap(general, 'CHEM 3B'), 'CHEM 3BL'), completed: ['CHEM 3B'] }), 'gen-chem').status).toBe('unmet')
  })

  it('review: empty plan blames every requirement', () => {
    const f = failing(run(harness, { terms: [] }))
    for (const id of ['intro-geology:unmet', 'gen-chem:unmet', 'calc:unmet', 'math-data:unmet', 'field-lab:unmet', 'electives:unmet', 'comprehensive:unmet']) expect(f).toContain(id)
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

// Geology: core incl. 109/109L, 120/120L, 150/150L; geology elective 146;
// electives 104, 102; DC + comprehensive = 189A + 189B.
const geology = plan(
  ['2268', 'EART 5', 'EART 5L', 'CHEM 4A', 'CHEM 4AL', 'MATH 11A'],
  ['2270', 'CHEM 4B', 'CHEM 4BL', 'MATH 11B'],
  ['2272', 'PHYS 6A', 'PHYS 6L'],
  ['2278', 'PHYS 6B', 'PHYS 6M', 'EART 110A'],
  ['2280', 'EART 110B', 'EART 110M', 'EART 109', 'EART 109L'],
  ['2282', 'EART 110C', 'EART 110N', 'EART 120', 'EART 120L'],
  ['2288', 'EART 150', 'EART 150L', 'EART 146'],
  ['2290', 'EART 104', 'EART 102'],
  ['2294', 'EART 189A', 'EART 189B'],
)
const GEO = { concentration: 'Geology' }

describe('earth-sciences-bs 2025-26 — geology', () => {
  it('complete record is met; no extra math course needed', () => {
    expect(failing(run(harness, { terms: geology, choices: GEO }))).toEqual([])
  })
  it('geology elective lecture needs its lab', () => {
    const t = swap(swap(geology, 'EART 146', 'EART 140'), 'EART 146L')
    expect(find(run(harness, { terms: t, choices: GEO }), 'geology-elective').status).toBe('unmet')
    expect(find(run(harness, { terms: [...t, { term: '2298', courses: ['EART 140L'] }], choices: GEO }), 'geology-elective').status).toBe('met')
  })
  it('2025-26: EART 146 is a geology elective on its own', () => {
    expect(failing(run(harness, { terms: swap(geology, 'EART 146L'), choices: GEO }))).toEqual([])
  })
  it('comprehensive must be summer field (a capstone does not count)', () => {
    const r = run(harness, { terms: swap(geology, 'EART 189A', 'EART 191'), choices: GEO })
    expect(find(r, 'comprehensive').status).toBe('unmet')
    // 2025-26 DC: two list courses (here EART 109, 120, ...) — met
    expect(find(r, 'dc').status).toBe('met')
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
  ['2270', 'CHEM 3B', 'CHEM 3BL', 'MATH 19B'],
  ['2272', 'CHEM 3C', 'CHEM 3CL', 'PHYS 6A', 'PHYS 6L', 'MATH 23A'],
  ['2278', 'PHYS 6B', 'PHYS 6M', 'EART 110A'],
  ['2280', 'EART 110B', 'EART 110M', 'EART 119A'],
  ['2282', 'EART 110C', 'EART 110N', 'EART 160'],
  ['2288', 'EART 162', 'EART 104'],
  ['2290', 'EART 102', 'EART 163'],
  ['2292', 'EART 195'],
)
const PLAN = { concentration: 'Planetary Sciences' }

describe('earth-sciences-bs 2025-26 — planetary sciences', () => {
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
  ['2270', 'CHEM 3B', 'CHEM 3BL', 'MATH 19B', 'BIOE 20C'],
  ['2272', 'CHEM 3C', 'CHEM 3CL', 'PHYS 6A', 'PHYS 6L', 'EART 111'],
  ['2278', 'PHYS 6B', 'PHYS 6M', 'EART 110A'],
  ['2280', 'EART 110B', 'EART 110M', 'OCEA 102'],
  ['2282', 'EART 110C', 'EART 110N', 'EART 104'],
  ['2288', 'EART 102', 'OCEA 120'],
  ['2290', 'OCEA 130', 'EART 191D'],
)
const OCE = { concentration: 'Ocean Sciences' }

describe('earth-sciences-bs 2025-26 — ocean sciences', () => {
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
  ['2270', 'CHEM 3B', 'CHEM 3BL', 'MATH 19B', 'MATH 21'],
  ['2272', 'CHEM 3C', 'CHEM 3CL', 'PHYS 6A', 'PHYS 6L', 'MATH 22'],
  ['2278', 'PHYS 6B', 'PHYS 6M', 'EART 110A'],
  ['2280', 'EART 110B', 'EART 110M', 'EART 112'],
  ['2282', 'EART 110C', 'EART 110N', 'EART 118'],
  ['2288', 'EART 104', 'EART 126'],
  ['2290', 'EART 270', 'EART 152'],
  ['2292', 'EART 195'],
)
const GPH = { concentration: 'Geophysics' }

describe('earth-sciences-bs 2025-26 — geophysics', () => {
  it('complete record is met (EART 270 from the recommended list counts)', () => {
    expect(failing(run(harness, { terms: geophysics, choices: GPH }))).toEqual([])
  })
  it('linear algebra is required (AM 10 also works)', () => {
    expect(failing(run(harness, { terms: swap(geophysics, 'MATH 21'), choices: GPH }))).toEqual(['linear-algebra:unmet'])
    expect(failing(run(harness, { terms: swap(geophysics, 'MATH 21', 'AM 10'), choices: GPH }))).toEqual([])
  })
  it('EART 191 capstone is not a geophysics comprehensive option (but is on the DC list)', () => {
    const r = run(harness, { terms: swap(geophysics, 'EART 195', 'EART 191'), choices: GPH })
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect(find(r, 'dc').status).toBe('met')
  })
  it('2025-26: EART 114 is not a geophysics course option', () => {
    // (EART 126, an elective in this plan, is swapped out so it cannot fill the slot)
    const r = run(harness, { terms: swap(swap(geophysics, 'EART 118', 'EART 114'), 'EART 126', 'EART 116'), choices: GPH })
    expect(find(r, 'geophys-course').status).toBe('unmet')
  })
  it('summer field is not a geophysics comprehensive option', () => {
    const r = run(harness, { terms: add(swap(geophysics, 'EART 195'), 'EART 189A', 'EART 189B'), choices: GPH })
    expect(find(r, 'comprehensive').status).toBe('unmet')
  })
  it('review: the geophysics comprehensive offers no "other options" by adviser permission', () => {
    const r = run(harness, { terms: swap(geophysics, 'EART 195'), choices: GPH })
    expect(find(r, 'comprehensive').status).toBe('unmet')
    expect((find(r, 'comprehensive').notes ?? []).join(' ')).not.toContain('Other options')
  })
  it('EART 191C satisfies both DC and comprehensive', () => {
    expect(failing(run(harness, { terms: swap(geophysics, 'EART 195', 'EART 191C'), choices: GPH }))).toEqual([])
  })
})
