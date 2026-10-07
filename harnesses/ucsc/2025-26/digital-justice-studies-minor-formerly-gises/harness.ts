// Digital Justice Studies Minor (formerly GISES) — 2025-26
// Source: data-committed/ucsc/editions/2025-26/sources/digital-justice-studies-minor-formerly-gises.md
//
// SOCY 30A, SOCY 107A/107B, three upper-division electives (SOCY 110-189 or
// an external pre-approved list), SOCY 196G, and the practicum deliverable
// mounted on the Everett Program database (attestation). Electives from the
// external list are cannot-check: an elective requirement that is short while
// the student has unused upper-division courses outside SOCY 110-189 is never
// reported unmet.
import { codes, defineHarness, display, range } from '@harness'

const ADVANCED = range('SOCY', 110, 189).minCredits(5)
const NOT_ELECTIVE = codes('SOCY 107A', 'SOCY 107B', 'SOCY 196G')
const Q_DELIVERABLE = 'To complete the final requirements for DJS, the integrated project practicum—narrative and digital deliverable—must be mounted on the appropriate web-enabled database managed by the Everett Program.'

export default defineHarness({
  program: 'digital-justice-studies-minor-formerly-gises',
  edition: '2025-26',
  title: 'Digital Justice Studies Minor',
  attestations: [
    { id: 'djs-deliverable', label: 'DJS project practicum deliverable mounted on the Everett Program database', quote: Q_DELIVERABLE, aliases: ['deliverable', 'everett', 'capstone project', 'djs project'] },
  ],
  notes: [
    'Courses may be taken for a letter grade or Pass/No Pass.',
    'The pre-approved DJS elective list is a separate catalog page the app does not have; courses outside SOCY 110–189 are shown as “check yourself”. The DJS director may also approve other courses.',
  ],
  evaluate(h) {
    // "Courses may be taken for a letter grade or Pass/No Pass."
    h.policy = undefined

    const lower = h.take('socy30a', 'SOCY 30A Introduction to Digital Justice Studies', 'Lower-division preparation:', codes('SOCY 30A'))
    const core = h.all('djs-core', 'Upper-division DJS core courses', 'Upper-division DJS core courses:', ['SOCY 107A', 'SOCY 107B'])
    const electives = h.take(
      'advanced',
      'Three upper-division electives',
      'Three additional upper-division electives of 5 credits or more are required, selected from the Sociology Department elective courses (Sociology 110-189), or from',
      ADVANCED,
      { n: 3, repeatable: 'catalog', pool: 'SOCY 110–189 (5+ credits), or the pre-approved DJS course list (not in the app)' },
    )
    const practicum = h.group(
      'practicum',
      'Project practicum',
      [h.take('socy196g', 'SOCY 196G Project Practicum', 'Students must enroll in SOCY 196G, Project Practicum, and complete their DJS capstone project.', codes('SOCY 196G')), h.attest('djs-deliverable')],
      { quote: 'Students must enroll in SOCY 196G, Project Practicum, and complete their DJS capstone project.' },
    )

    h.solve()
    if (electives.status === 'unmet' && electives.progress) {
      const gap = electives.progress.need - electives.progress.have
      const usedCodes = new Set(h.enrollments.filter((e) => h.used.has(e.id)).map((e) => e.code))
      const free = [
        ...new Set(
          h.passed
            .filter((e) => {
              const c = h.catalog.get(e.code)
              return !h.used.has(e.id) && !usedCodes.has(e.code) && !!c && c.division === 'upper' && c.credits >= 5 && !NOT_ELECTIVE.has(e.code)
            })
            .map((e) => e.code),
        ),
      ]
      if (free.length >= gap) {
        electives.status = 'cannot-check'
        electives.detail = `${gap} more needed: ${free.map(display).join(', ')} may be on the pre-approved DJS list or approved by the DJS director — check that list.`
      }
    }
    return [
      h.group('lower', 'Lower-Division Courses', [lower]),
      h.group('upper', 'Upper-Division Courses', [core, electives, practicum]),
    ]
  },
})
