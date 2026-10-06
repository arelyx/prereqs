// History of Art and Visual Culture B.A. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/history-of-art-and-visual-culture-ba.md
//
// Regions are defined by course-number ranges on the page itself, so they
// are computed (no external list needed). Four lower-division courses from
// four different regions; two upper-division regional courses from the two
// regions NOT covered at lower division (together: all six); HAVC 80 may
// stand for Africa, Native Americas or Oceania. Plus HAVC 100A (DC), five
// electives (HAVC 110-191) and one senior seminar (190-191). The Curation,
// Heritage, and Museums concentration adds four approved courses that may
// overlap the major's requirements (overlay).
import { codes, defineHarness, parseCode, range } from '@harness'
import type { Enrollment, HarnessContext, Node } from '@harness'

const REGION_NAMES = ['Africa and its Diaspora', 'Asia and its Diaspora', 'Europe and the Americas', 'Mediterranean', 'Native Americas', 'Oceania and its Diaspora']
// tens digit → region index: 1x Africa, 2x Asia, 3x–4x Europe/Americas, 5x Mediterranean, 6x Native Americas, 7x Oceania
const TENS: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 2, 5: 3, 6: 4, 7: 5 }

/** Regions a lower-division HAVC course can stand for. */
function ldRegions(code: string): number[] {
  const p = parseCode(code)
  if (p.subject !== 'HAVC') return []
  // "HAVC 80 may be used to fulfill a lower-division requirement for one of the following geographic regions: 10s (Africa), 60s (Native Americas), or 70s (Oceania)."
  if (p.number === 80) return [0, 4, 5]
  if (p.number < 10 || p.number > 79) return []
  return [TENS[Math.floor(p.number / 10)]]
}
/** Regions an upper-division regional HAVC course (110-179) stands for. */
function udRegions(code: string): number[] {
  const p = parseCode(code)
  if (p.subject !== 'HAVC' || p.number < 110 || p.number > 179) return []
  return [TENS[Math.floor((p.number - 100) / 10)]]
}

/** Can each course be given its own region (from its candidates)? Optionally forbid some regions. */
function distinct(cands: number[][], taken = new Set<number>()): boolean {
  if (!cands.length) return true
  const [first, ...rest] = cands
  for (const r of first) {
    if (taken.has(r)) continue
    taken.add(r)
    const ok = distinct(rest, taken)
    taken.delete(r)
    if (ok) return true
  }
  return false
}

/** Do the lower-division courses cover every region in `need`, one distinct course per region? */
function covers(need: number[], ld: number[][], used = new Set<number>()): boolean {
  if (!need.length) return true
  const [r, ...rest] = need
  for (let i = 0; i < ld.length; i++) {
    if (used.has(i) || !ld[i].includes(r)) continue
    used.add(i)
    const ok = covers(rest, ld, used)
    used.delete(i)
    if (ok) return true
  }
  return false
}

const LD_SET = range('HAVC', 10, 79).or(codes('HAVC 80'))
const UD_REGIONAL = range('HAVC', 110, 179)
const ELECTIVES = range('HAVC', 110, 191)
const SEMINAR = range('HAVC', 190, 191)

const APPROVED = [
  'HAVC 40', 'HAVC 141L', 'HAVC 141M', 'HAVC 141N', 'HAVC 142M', 'HAVC 143F', 'HAVC 178', 'HAVC 185',
  'HAVC 188A', 'HAVC 188B', 'HAVC 188C', 'HAVC 188M', 'ANTH 187', 'ANTH 187B', 'ANTH 196J', 'HIS 104D',
]
// 2025-26: the approved list has no HAVC 141Z and no VAST 188J [/HAVC 188J]
// (both added in 2026-27).
// "Upper-division concentration courses fulfill elective requirements for the major" —
// for CHM students the non-HAVC approved upper-division courses are electives too.
const CHM_NON_HAVC_UD = codes('ANTH 187', 'ANTH 187B', 'ANTH 196J', 'HIS 104D')
// "at least two of the four courses must be HAVC-sponsored courses".
const HAVC_SPONSORED = range('HAVC', 1, 199)
// "Students may petition for HAVC 199 or HIS 199 to count for a concentration course under certain circumstances."
const PETITIONABLE = codes('HAVC 199', 'HIS 199')

// "Only courses completed with grades of C or better (or Pass) may be used to satisfy major requirements."
const POLICY = { min: 'C', pCounts: true }

const Q_LD = 'Take four lower-division courses, each from a different geographic region listed below:'
const Q_UD = 'Take two upper-division geographic regional courses, one each from the two geographic regions not studied at the lower-division level.'

export default defineHarness({
  program: 'history-of-art-and-visual-culture-ba',
  edition: '2025-26',
  title: 'History of Art and Visual Culture B.A.',
  choices: [
    {
      key: 'concentration',
      label: 'Concentration',
      quote: 'This program is for HAVC majors who wish to pursue the study and practice of curation, heritage, and museums.',
      options: [
        { value: 'general', label: 'General Major', aliases: ['general', 'none', 'no concentration', 'havc'] },
        { value: 'chm', label: 'Concentration in Curation, Heritage, and Museums', aliases: ['curation, heritage, and museums', 'curation heritage and museums', 'curation', 'museums', 'chm'] },
      ],
      default: 'general',
    },
  ],
  attestations: [
    {
      id: 'chm-petition',
      label: 'HAVC undergraduate advisor approved my HAVC 199 / HIS 199 as a concentration course',
      quote: 'Students may petition for HAVC 199 or HIS 199 to count for a concentration course under certain circumstances.',
      aliases: ['havc 199 petition', 'his 199 petition', 'concentration petition', 'chm petition'],
    },
  ],
  notes: [
    'Major courses need a C or better, or a P.',
    'Up to three lower-division and two upper-division art history courses may transfer from other institutions; at least eight courses must be regularly scheduled UCSC HAVC courses — the app does not track where a course was taken.',
    'The senior exit seminar can be taken for senior exit credit only by permission of the instructor.',
  ],
  evaluate(h) {
    h.policy = POLICY
    const chm = h.choice('concentration') === 'chm'

    const lower = h.take('lower', 'Four lower-division courses from four different regions', [Q_LD, 'HAVC 80 may be used to fulfill a lower-division requirement for one of the following geographic regions: 10s (Africa), 60s (Native Americas), or 70s (Oceania).'], LD_SET, {
      n: 4,
      check: (chosen) => (distinct(chosen.map((e) => ldRegions(e.code))) ? null : 'each course must come from a different geographic region'),
      pool: 'HAVC 10–79 (region by tens digit) or HAVC 80',
      notes: ['Regions: 10s Africa · 20s Asia · 30s–40s Europe and the Americas · 50s Mediterranean · 60s Native Americas · 70s Oceania.'],
    })

    // Any four passed lower-division courses may serve (they compete with no other
    // slot). One entry per code: a repeated course is still one course.
    const ldCands = [...new Set(h.taken(LD_SET).map((e) => e.code))].map(ldRegions)
    const regional = h.take('ud-regional', 'Two upper-division regional courses (the two regions not taken at lower division)', Q_UD, UD_REGIONAL, {
      n: 2,
      check: (chosen) => udCheck(chosen, ldCands),
      pool: 'HAVC 110–179 in the two regions missing from your lower-division courses',
      notes: ['HAVC 180–189 are cross-regional: they count as electives but not as regional courses.'],
    })

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('havc100a', 'HAVC 100A Approaches to Visual Studies', 'Take the following course:', codes('HAVC 100A')),
      regional,
      h.take(
        'electives',
        'Five upper-division electives',
        chm
          ? ['Plus five upper-division electives:', 'These are any HAVC courses numbered 110-191.', 'Upper-division concentration courses fulfill elective requirements for the major, or if appropriate, concentration courses can be used to fulfill geographic regional requirements.']
          : ['Plus five upper-division electives:', 'These are any HAVC courses numbered 110-191.'],
        chm ? ELECTIVES.or(CHM_NON_HAVC_UD) : ELECTIVES,
        {
          n: 5,
          repeatable: 'catalog',
          pool: chm ? 'HAVC 110–191, or an upper-division approved concentration course (ANTH 187, 187B, 196J, HIS 104D)' : 'HAVC 110–191',
        },
      ),
      h.take('seminar', 'Senior exit seminar (HAVC 190–191)', ['Plus one senior exit seminar:', 'HAVC seminar courses are numbered 190-191.'], SEMINAR, { pool: 'HAVC 190–191 series' }),
    ])

    const chmSlots = chm ? concentration(h) : null

    const dc = h.take('dc', 'Disciplinary Communication: HAVC 100A', 'Students in HAVC meet the DC requirement by completing:', codes('HAVC 100A'), { exclusive: false })
    const comprehensive = h.take(
      'comprehensive',
      'Comprehensive: one HAVC senior seminar',
      'All seniors must complete one HAVC seminar (courses in the 190-191 series) as their “senior exit” course to satisfy the senior comprehensive requirement.',
      SEMINAR,
      { exclusive: false, pool: 'HAVC 190–191 series' },
    )
    const breadth = h.info('breadth', 'Six geographic regions', 'Students must take courses in each of the six different geographic regions listed below to ensure cultural, methodological, and disciplinary breadth.', `Covered by the lower-division and upper-division regional courses: ${REGION_NAMES.join(', ')}.`)
    h.solve()
    const extra = chmSlots ? [withPetition(h, chmSlots)] : []
    return [breadth, lower, upper, ...extra, dc, comprehensive]
  },
})

function udCheck(chosen: Enrollment[], ldCands: number[][]): string | null {
  const [a, b] = chosen.map((e) => udRegions(e.code))
  for (const ra of a)
    for (const rb of b) {
      if (ra === rb) continue
      const need = [0, 1, 2, 3, 4, 5].filter((r) => r !== ra && r !== rb)
      if (covers(need, ldCands)) return null
    }
  return 'the two courses must be from different regions, and together with four lower-division courses cover all six regions'
}

const Q_CHM = [
  'In fulfilling the major requirements, students in the concentration must successfully complete four courses from the “Approved Concentration Courses” list below. No more than one of the four courses can be lower-division and at least two of the four courses must be HAVC-sponsored courses.',
  'Upper-division concentration courses fulfill elective requirements for the major, or if appropriate, concentration courses can be used to fulfill geographic regional requirements.',
]
const chmOpts = {
  n: 4,
  exclusive: false,
  atMost: [{ set: codes('HAVC 40'), n: 1, label: 'at most one lower-division course' }],
  atLeast: [{ set: HAVC_SPONSORED, n: 2, label: 'HAVC-sponsored courses' }],
}

/** The approved-list slot, and the same slot widened by the petitionable HAVC 199 / HIS 199. */
function concentration(h: HarnessContext): { strict: Node; petition: Node } {
  const strict = h.take('chm', 'Curation, Heritage, and Museums: four approved concentration courses', Q_CHM, codes(...APPROVED), {
    ...chmOpts,
    notes: ['Courses not on the list count only by an approved syllabus petition (HAVC 199 / HIS 199 under certain circumstances).'],
  })
  const petition = h.take('chm-with-petition', 'Four concentration courses, counting a petitioned HAVC 199 / HIS 199', ['Students may petition for HAVC 199 or HIS 199 to count for a concentration course under certain circumstances.'], codes(...APPROVED).or(PETITIONABLE), chmOpts)
  return { strict, petition }
}

/**
 * §1a petition convention: the HAVC 199 / HIS 199 petition is asked only when
 * the approved list falls short and the petitioned course would complete it.
 */
function withPetition(h: HarnessContext, { strict, petition }: { strict: Node; petition: Node }): Node {
  if (strict.status === 'met' || petition.status !== 'met') return strict
  return h.either('chm-or-petition', 'Curation, Heritage, and Museums (approved list, or with a petitioned HAVC 199 / HIS 199)', Q_CHM, [
    strict,
    h.group('chm-petition-path', 'With a petitioned HAVC 199 / HIS 199', [petition, h.attest('chm-petition')]),
  ])
}
