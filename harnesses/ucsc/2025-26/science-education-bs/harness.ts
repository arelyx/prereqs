// Science Education B.S. — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/science-education-bs.md
//
// The student specializes in two of four fields (a declared choice). Handled
// in code below:
//  - "MATH 19A and MATH 19B are required for students who choose physics as
//    one of their specializations" (otherwise MATH 11A/11B also count).
//  - MATH 22 waived for chemistry + biology and Earth sciences + biology.
//  - General chemistry (2025-26): CHEM 3A/3B/3BL/3C/3CL, or CHEM 4A/4AL/4B/4BL,
//    or the pre-2023 CHEM 1A/1B/1C/1M/1N series (no fall-2026 lab rule here).
//  - CSET General Science passed (an exam that waives courses → attestation,
//    §1a): offered for a non-specialization field's lower-division courses
//    only when they are not complete in the plan; never for the EART 5/10/20
//    + lab package; if chemistry is waived but biology is not, CHEM 3A or
//    CHEM 4A is still required.
//  - DC (EDUC 100A/100C + EDUC 185L) and comprehensive (EDUC 185C) reuse
//    upper-division courses: overlays.
import { codes, defineHarness, range } from '@harness'
import type { Node } from '@harness'

const Q_CHEM_NOTE =
  'This requirement may also be satisfied with prior completion of CHEM 1A, CHEM 1B, CHEM 1C, CHEM 1M, and CHEM 1N or equivalent.'
const CHEM3 = ['CHEM 3A', 'CHEM 3B', 'CHEM 3BL', 'CHEM 3C', 'CHEM 3CL']
const CHEM4 = ['CHEM 4A', 'CHEM 4AL', 'CHEM 4B', 'CHEM 4BL']
const CHEM1 = ['CHEM 1A', 'CHEM 1B', 'CHEM 1C', 'CHEM 1M', 'CHEM 1N']
const Q_19 = 'MATH 19A and MATH 19B are required for students who choose physics as one of their specializations.'
const Q_22 = 'MATH 22 is waived for a student who chooses their electives from chemistry and biology or from Earth sciences and biology.'
const Q_CSET =
  'Conversely, a student who has passed the California Subject Examinations for Teachers (CSET) General Science Examination will have the lower-division courses in the two fields that they are not specializing in (see the sections on “Electives” below) waived, except for EART 5 or EART 10 or EART 20 and the associated lab, which is a prerequisite for EART 110A.'
const Q_CSET_CHEM =
  '(If the lower-division courses in chemistry are waived, the student will still need to take CHEM 3A or CHEM 4A as the prerequisite to BIOL 20A, unless the lower-division courses in biology are also waived.)'
const Q_FIELDS = 'All the courses from any two of the following fields must be completed:'

type Field = 'physics' | 'chemistry' | 'biology' | 'earth'
const FIELDS: { key: Field; label: string; re: RegExp }[] = [
  { key: 'physics', label: 'Physics', re: /phys/ },
  { key: 'chemistry', label: 'Chemistry', re: /chem/ },
  { key: 'biology', label: 'Biology', re: /bio/ },
  { key: 'earth', label: 'Earth Sciences', re: /earth|geo/ },
]
const PAIRS: [Field, Field][] = []
for (let i = 0; i < FIELDS.length; i++) for (let j = i + 1; j < FIELDS.length; j++) PAIRS.push([FIELDS[i].key, FIELDS[j].key])
const label = (f: Field) => FIELDS.find((x) => x.key === f)!.label

function parseFields(raw: string): string | undefined {
  const s = raw.toLowerCase()
  const hit = FIELDS.filter((f) => f.re.test(s)).map((f) => f.key)
  return hit.length === 2 ? hit.join('+') : undefined
}

export default defineHarness({
  program: 'science-education-bs',
  edition: '2025-26',
  title: 'Science Education B.S.',
  choices: [
    {
      key: 'fields',
      label: 'Two fields of specialization',
      quote: Q_FIELDS,
      options: PAIRS.map(([a, b]) => ({ value: `${a}+${b}`, label: `${label(a)} and ${label(b)}` })),
      parse: parseFields,
    },
  ],
  attestations: [
    { id: 'cset', label: 'Passed the CSET General Science examination', quote: Q_CSET, aliases: ['cset general science', 'cset'] },
  ],
  coverage: {
    unknownOk: { CHEM1B: 'named on the 2025-26 page (pre-2023 general chemistry series); not in the catalog' },
  },
  notes: [
    'All courses used to satisfy any of the major requirements must be taken for a letter grade.',
    'EDUC 50C, EDUC 100A, EDUC 100C and EDUC 185L are Cal Teach internship courses that require an application.',
  ],
  evaluate(h) {
    // "All courses used to satisfy any of the major requirements must be taken for a letter grade."
    h.policy = { letter: true }
    const ask = h.needChoice('fields')
    if (ask) return [ask]
    const fields = h.choice('fields')!.split('+') as Field[]
    const spec = (f: Field) => fields.includes(f)
    // CSET General Science waives the lower-division courses of the two
    // non-specialization fields (never the EART package).
    const waivable = (f: Field) => !spec(f) && f !== 'earth'
    const has = (list: string[]) => list.every((c) => h.taken(codes(c)).length > 0)
    const csetNode = () =>
      h.attested('cset') ? h.attest('cset', undefined, { detail: 'Waived by the CSET General Science examination (as you confirmed).' }) : h.attest('cset')
    /** The field's courses, or (when not complete and the field is not a specialization) the CSET waiver. */
    const orCset = (f: Field, id: string, title: string, courses: Node, complete: boolean, waiver: () => Node = csetNode) =>
      waivable(f) && !complete ? h.either(`${id}-or-cset`, `${title} (or CSET waiver)`, Q_CSET, [courses, waiver()]) : courses
    const PHYS5 = ['PHYS 5A', 'PHYS 5L', 'PHYS 5B', 'PHYS 5M', 'PHYS 5C', 'PHYS 5N']
    const PHYS6 = ['PHYS 6A', 'PHYS 6L', 'PHYS 6B', 'PHYS 6M', 'PHYS 6C', 'PHYS 6N']
    const BIO = ['BIOL 20A', 'BIOE 20B', 'BIOE 20C']
    // 2025-26: labs CHEM 3BL/3CL are always part of the CHEM 3 package (the
    // fall-2026 "inclusive of lab" rule is 2026-27 only); the old CHEM 1 series
    // also satisfies it.
    const chem = h.options('gen-chem', 'General Chemistry', ['Plus one of the following options:', Q_CHEM_NOTE], [CHEM3, CHEM4, CHEM1], {
      labels: ['CHEM 3 series with labs', 'CHEM 4 series with labs', 'CHEM 1A–1C with 1M/1N'],
      notes: ['“Or equivalent” for the CHEM 1 series needs department confirmation.'],
    })

    const phys = spec('physics')
    const lower = h.group('lower', 'Lower-Division Courses', [
      phys
        ? h.take('calc-a', 'MATH 19A', ['Choose one of the following courses:', Q_19], codes('MATH 19A'))
        : h.take('calc-a', 'MATH 19A or 11A', 'Choose one of the following courses:', codes('MATH 19A', 'MATH 11A')),
      phys
        ? h.take('calc-b', 'MATH 19B', ['Plus one of the following courses:', Q_19], codes('MATH 19B'))
        : h.take('calc-b', 'MATH 19B or 11B', 'Plus one of the following courses:', codes('MATH 19B', 'MATH 11B')),
      spec('biology') && (spec('chemistry') || spec('earth'))
        ? h.node('math22', 'MATH 22 (waived for your fields)', Q_22, 'met', { detail: 'Waived for chemistry + biology and Earth sciences + biology.' })
        : h.take('math22', 'MATH 22', ['Plus the following course:', Q_22], codes('MATH 22')),
      orCset('physics', 'physics', 'Physics series',
        h.options('physics', 'PHYS 5A–5C with labs, or PHYS 6A–6C with labs', 'Plus one of the following options:', [PHYS5, PHYS6]),
        has(PHYS5) || has(PHYS6)),
      // Chemistry waived while biology is not: CHEM 3A or 4A is still needed
      // (it is the prerequisite to BIOL 20A).
      orCset('chemistry', 'gen-chem', 'General Chemistry', chem, has(CHEM3) || has(CHEM4) || has(CHEM1), () =>
        waivable('biology')
          ? csetNode()
          : h.group('gen-chem-waiver', 'CSET waiver, plus CHEM 3A or CHEM 4A', [
              csetNode(),
              // overlay: the CHEM 3/4 package is a sibling branch's slot (no course competes for 3A/4A elsewhere)
              h.take('gen-chem-3a4a', 'CHEM 3A or CHEM 4A', [Q_CSET, Q_CSET_CHEM], codes('CHEM 3A', 'CHEM 4A'), { exclusive: false }),
            ], { quote: Q_CSET_CHEM }),
      ),
      h.options('earth', 'EART 5, 10 or 20 with its lab', 'Plus one of the following options:', [['EART 5', 'EART 5L'], ['EART 10', 'EART 10L'], ['EART 20', 'EART 20L']]),
      orCset('biology', 'biology', 'Introductory biology',
        h.all('biology', 'BIOL 20A, BIOE 20B, BIOE 20C', 'Plus all of the following courses:', BIO),
        has(BIO)),
      h.take('astronomy', 'Introductory astronomy', 'Plus one of the following courses:', codes('ASTR 1', 'ASTR 2', 'ASTR 5', 'ASTR 10')),
      h.options('statistics', 'STAT 5, STAT 7 + 7L, or ASTR 119', 'Plus one of the following options:', [['STAT 5'], ['STAT 7', 'STAT 7L'], ['ASTR 119']], {
        notes: phys ? ['ASTR 119 should be taken by students who select physics as a field, to enable them to take PHYS 133.'] : undefined,
      }),
      h.take('educ50c', 'EDUC 50C', 'Plus the following course:', codes('EDUC 50C')),
    ])

    const upper = h.group('upper', 'Upper-Division Courses', [
      h.take('eart110a', 'EART 110A', 'The following course:', codes('EART 110A')),
      h.take('educ100', 'EDUC 100A or 100C', 'Plus one of the following courses:', codes('EDUC 100A', 'EDUC 100C')),
      h.all('educ185', 'EDUC 185L and 185C', 'Plus all of the following courses:', ['EDUC 185L', 'EDUC 185C']),
      h.take('diversity', 'One education diversity course', 'Plus one of the following courses:', codes('EDUC 177', 'EDUC 128', 'EDUC 140', 'EDUC 181')),
    ])

    const fieldNodes: Record<Field, () => Node> = {
      physics: () => h.all('field-physics', 'Field: Physics', ['Field 1: Physics', Q_FIELDS], ['PHYS 5D', 'PHYS 102', 'PHYS 133']),
      chemistry: () =>
        h.group('field-chemistry', 'Field: Chemistry', [
          h.all('field-chem-core', 'CHEM 8A, 8L, 8B, 8M', 'Field 2: Chemistry', ['CHEM 8A', 'CHEM 8L', 'CHEM 8B', 'CHEM 8M']),
          h.take('field-chem-ud', 'One upper-division chemistry course (CHEM 100–180)', 'And one additional 5-credit, upper-division chemistry course numbered CHEM 100 - CHEM 180.', range('CHEM', 100, 180).minCredits(5), {
            pool: 'CHEM 100–180 (5 credits)',
            notes: ['Recommended: CHEM 163B (with physics), CHEM 103 (with biology), CHEM 163A (with Earth sciences).'],
          }),
        ], { quote: Q_FIELDS }),
      biology: () => h.all('field-biology', 'Field: Biology', ['Field 3: Biology', Q_FIELDS], ['BIOL 105', 'BIOE 107', 'BIOE 109']),
      earth: () =>
        h.group('field-earth', 'Field: Earth Sciences', [
          h.all('field-earth-core', 'EART 110B, 110M, OCEA 90', 'Field 4: Earth Sciences', ['EART 110B', 'EART 110M', 'OCEA 90']),
          h.take('field-earth-ud', 'One upper-division EART course (EART 100–189)', 'And one additional 5-credit, upper-division EART course numbered EART 100 - EART 189.', range('EART', 100, 189).minCredits(5), {
            pool: 'EART 100–189 (5 credits), not EART 110A/110B',
          }),
        ], { quote: Q_FIELDS }),
    }
    const electives = h.group('electives', `Electives: ${label(fields[0])} and ${label(fields[1])}`, fields.map((f) => fieldNodes[f]()), { quote: Q_FIELDS })

    const dc = h.group('dc', 'Disciplinary Communication (DC)', [
      h.take('dc-educ100', 'EDUC 100A or 100C', 'Choose one of the following courses:', codes('EDUC 100A', 'EDUC 100C'), { exclusive: false }),
      h.take('dc-educ185l', 'EDUC 185L', 'Plus the following course:', codes('EDUC 185L'), { exclusive: false }),
    ], { quote: 'The disciplinary communication requirement for this major is fulfilled by completing:' })
    const comprehensive = h.take('comprehensive', 'Comprehensive Requirement: EDUC 185C', 'The senior capstone requirement for this major is fulfilled by completing:', codes('EDUC 185C'), { exclusive: false })
    const qualification = h.info(
      'qualification',
      'Major qualification (to declare)',
      'Students must complete at least six 5-credit courses from the lower-division course requirements before they can declare the major.',
      'Gates declaration; not a graduation requirement.',
    )
    return [qualification, lower, upper, electives, dc, comprehensive]
  },
})
