// Legal Studies Minor — 2026-27
// Source: data-committed/ucsc/editions/2026-27/sources/legal-studies-minor.md
import { canon, codes, defineHarness, range } from '@harness'
import type { Enrollment } from '@harness'

const APPROVED = [
  'ANTH 110C', 'ANTH 126', 'ANTH 130C', 'ANTH 138', 'ANTH 142', 'ANTH 148', 'ANTH 187', 'ANTH 187B', 'ART 172',
  'ART 181', 'ECON 128', 'ECON 160A', 'ECON 162', 'ECON 169', 'ECON 183', 'ENVS 130B', 'ENVS 140', 'ENVS 144',
  'ENVS 147', 'ENVS 149', 'ENVS 150', 'ENVS 151', 'ENVS 152', 'ENVS 165', 'ENVS 179', 'FMST 112', 'FMST 194O',
  'GCH 186', 'HIS 110B', 'HIS 110D', 'HIS 121B', 'LALS 194X', 'LIT 168A', 'LIT 168B', 'LGST 107', 'LGST 108',
  'LGST 109', 'LGST 111B', 'LGST 111C', 'LGST 114', 'LGST 115', 'LGST 116', 'LGST 117', 'LGST 118', 'LGST 124',
  'LGST 125', 'LGST 130', 'LGST 131', 'LGST 133', 'LGST 137', 'LGST 139', 'LGST 146', 'LGST 148', 'LGST 150',
  'LGST 152', 'LGST 153', 'LGST 154', 'LGST 155', 'LGST 156', 'LGST 157', 'LGST 158', 'LGST 159', 'LGST 161',
  'LGST 173', 'LGST 185', 'PHIL 126', 'PHIL 100D', 'PHIL 143', 'PHIL 144', 'PHIL 153', 'POLI 102',
  'POLI 103', 'POLI 105A', 'POLI 105B', 'POLI 105C', 'POLI 105D', 'POLI 110', 'POLI 111A', 'POLI 120A', 'POLI 120B',
  'POLI 120C', 'POLI 121', 'POLI 132', 'POLI 134', 'POLI 151', 'POLI 160B', 'POLI 165', 'POLI 167', 'POLI 175',
  'POLI 182', 'POLI 184', 'PSYC 114', 'PSYC 140M', 'PSYC 147A', 'PSYC 147B', 'PSYC 153', 'SOCY 117E', 'SOCY 122',
  'SOCY 127', 'SOCY 128C', 'SOCY 128I', 'SOCY 128J', 'SOCY 128M', 'SOCY 185',
  // Source row reads "SPAN 130 / SPAN 6 / SPHS 6 [/LGST 130A] — Spanish for the Legal
  // Profession": the course is SPAN 130 (SPAN 6 / SPHS 6 are lower-division
  // language courses, its prerequisites in the catalog).
  'SPAN 130',
]
// "LGST 188A/OAKS188A and OAKS 188B/LGST 188B must both be taken to count as one course."
const PAIR_A = ['LGST 188A', 'OAKS 188A']
const PAIR_B = ['OAKS 188B', 'LGST 188B']
// Independent study / thesis: "Students should contact the department if they wish to count independent study toward this requirement."
const INDEPENDENT = ['LGST 193', 'LGST 194', 'LGST 195A', 'LGST 195B', 'LGST 195C', 'LGST 198', 'LGST 199']
// On the Legal Studies B.A. thematic lists (same edition) but not on this
// page's list: "approved for the LGST major" suggests they count, the list
// here omits them — never call the minor unmet because of them.
const MAJOR_ONLY = ['ART 175', 'ART 186', 'LIT 189A']

export default defineHarness({
  program: 'legal-studies-minor',
  edition: '2026-27',
  title: 'Legal Studies Minor',
  coverage: {
    unknownOk: {
      OAKS188A: 'cross-listed partner of LGST 188A ("LGST 188A/OAKS188A"); the catalog files it under LGST',
      LGST188B: 'cross-listed partner of OAKS 188B ("OAKS 188B/LGST 188B"); the catalog files it under OAKS',
    },
  },
  notes: [
    'Minors do not follow the major’s thematic-area, philosophy (ethics) or senior-seminar requirements.',
    'There is no letter-grade policy: P/NP courses count.',
  ],
  evaluate(h) {
    // "This program does not have a letter grade policy."
    h.policy = undefined
    const cat = h.catalog

    // "Any five 5-credit courses approved for the LGST major." + "5-credit
    // courses crosslisted as LGST courses will also count toward this
    // requirement." — the listed courses, upper-division LGST courses, and
    // upper-division courses cross-listed with LGST, each with its
    // cross-listed partner codes.
    const list = [...APPROVED.map(canon)]
    for (const c of cat.all()) {
      const lgst = c.subject === 'LGST' || c.crossListed.some((x) => x.startsWith('LGST'))
      if (lgst && c.division === 'upper') list.push(c.code)
    }
    const indep = new Set(INDEPENDENT.map(canon))
    const pairCodes = [...PAIR_A, ...PAIR_B].map(canon)
    const members = new Set(list.filter((c) => !indep.has(c) && !pairCodes.includes(c)))
    for (const c of [...members]) for (const x of cat.get(c)?.crossListed ?? []) members.add(x)
    const pool = codes(...members).minCredits(5)
    pool.describe = 'courses approved for the LGST major, upper-division LGST courses, and courses cross-listed with LGST (5 credits)'
    const pairEligible = codes(...PAIR_A, ...PAIR_B)

    const upper = h.take(
      'upper',
      'Five upper-division courses',
      ['Any five 5-credit courses approved for the LGST major.', '5-credit courses crosslisted as LGST courses will also count toward this requirement.'],
      pool,
      {
        n: 5,
        composite: {
          eligible: pairEligible,
          build: (avail: Enrollment[]) => {
            const a = avail.find((e) => PAIR_A.map(canon).includes(e.code))
            const b = avail.find((e) => PAIR_B.map(canon).includes(e.code))
            return a && b ? [[a, b]] : []
          },
        },
        pool: pool.describe,
        notes: ['LGST 188A and OAKS 188B must both be taken; together they count as one course.'],
      },
    )
    const nodes = [
      h.take('lgst10', 'LGST 10 Introduction to Legal Process', 'The legal studies minor comprises six courses: LGST 10 plus any five upper-division courses approved for the LGST major.', codes('LGST 10')),
      upper,
    ]
    h.solve()
    if (upper.status === 'unmet') {
      const mine = new Set((upper.used ?? []).map((e) => e.id))
      const have = upper.progress?.have ?? 0
      const free = (e: Enrollment) => !h.used.has(e.id) || mine.has(e.id)
      const ind = h.taken(range('LGST', 193, 199)).filter((e) => indep.has(e.code) && free(e))
      const majorOnly = h.taken(codes(...MAJOR_ONLY)).filter(free)
      const extra = new Set([...ind, ...majorOnly].map((e) => e.code)).size
      if (extra && have + extra >= 5) {
        upper.status = 'cannot-check'
        upper.detail = `Complete only if ${[...ind, ...majorOnly].map((e) => e.display).join(', ')} count${ind.length + majorOnly.length > 1 ? '' : 's'}: independent study needs the department's approval, and ART 175 / ART 186 / LIT 189A are on the major's lists but not this page's — contact the department.`
      }
    }
    return nodes
  },
})
