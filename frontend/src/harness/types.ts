// Harness-as-code: shared types.
//
// A harness is a TypeScript module per program per edition
// (harnesses/ucsc/<edition>/<slug>/harness.ts) that turns a student's plan
// into a ProgressReport. Harness logic must be PURE: no network, no DOM, no
// clock, no randomness. Everything it may look at arrives through the
// HarnessContext (student record + catalog facts).

/** Status of one requirement node. Ordered roughly from best to worst for display. */
export type Status =
  | 'met' // satisfied by completed courses (and attestations)
  | 'in-progress' // satisfied only if planned/current courses are completed
  | 'unmet' // not satisfied, and the plan does not satisfy it
  | 'needs-choice' // the student must declare something first (concentration, track…)
  | 'needs-attestation' // a non-course condition the student must confirm (juries, exam…)
  | 'cannot-check' // the app cannot decide from data it has; the student must check
  | 'info' // policy/advice; never affects completion

export interface CatalogCourse {
  code: string // canonical: 'MUSC101A'
  display: string // 'MUSC 101A'
  subject: string // 'MUSC'
  number: number // 101 (NaN if non-numeric)
  suffix: string // 'A'
  credits: number // first number in the credits string (NaN if unknown)
  division: string // 'lower' | 'upper' | 'graduate' | …
  title: string
  crossListed: string[] // canonical codes
  repeatable: boolean // "may be repeated for credit" per the catalog
  description?: string // only for subjects a harness asked for (catalogNeeds)
}

export interface Catalog {
  get(code: string): CatalogCourse | undefined
  has(code: string): boolean
  /** All courses (stable order: subject, number, suffix). */
  all(): CatalogCourse[]
  /** Subjects whose descriptions are loaded. */
  described: ReadonlySet<string>
  /**
   * Codes that name the same course through cross-listing (excluding `code`
   * itself), e.g. LGST128 ↔ ECON128. Partner codes the catalog files only on
   * the primary course (it lists each cross-listed course once) are included.
   */
  equivalents(code: string): string[]
}

/** One course occurrence in the plan. The same code may occur in several terms. */
export interface Enrollment {
  /** Stable id within one evaluation: `${term ?? 'done'}:${code}:${n}`. */
  id: string
  code: string // canonical
  display: string
  term: string | null // pisa term code; null = completed with no term (transfer/AP/"completed" list)
  grade: string | null // letter, 'P', 'NP'; null = unknown (treated as a passing letter)
  planned: boolean // term is current or future: not yet completed
}

export interface ChoiceDef {
  key: string
  label: string
  quote: string
  options: { value: string; label: string; aliases?: string[] }[]
  /** Only ask when this returns true for current choices (e.g. track only for Creative Writing). */
  when?: (choices: Record<string, string>) => boolean
  /** Value used when the student has not chosen (omit = must choose). */
  default?: string
  /** Custom mapping from a free-form value to an option value (eval/transcripts). */
  parse?: (raw: string) => string | undefined
  /** Free value (no fixed options), e.g. a term code; `parse` validates it. */
  free?: boolean
  /** UI hint for free values. */
  input?: 'term'
}

export interface AttestationDef {
  id: string
  label: string
  quote: string
  /** Lower-case keywords; a free-form attested name matches when it contains any. */
  aliases?: string[]
}

export interface ReqNode {
  id: string
  title: string
  status: Status
  /** One-line, student-facing explanation of where things stand. */
  detail?: string
  /** Verbatim quote(s) from the committed source text this node implements. */
  quote: string | string[]
  progress?: { have: number; need: number; unit?: string }
  /** Enrollments counted toward this node (display codes, with term). */
  used?: Enrollment[]
  /** Courses that would (help) satisfy it, for suggestions (canonical codes). */
  options?: string[]
  /** Human description of an open-ended pool ("any CSE 100–189, 5+ credits"). */
  pool?: string
  /** The attestation this node waits on (status needs-attestation). */
  attest?: AttestationDef
  /** The choice this node waits on (status needs-choice). */
  choice?: string
  children?: ReqNode[]
  /** Free-form notes (caveats, petitions). */
  notes?: string[]
  /** Hidden from the default renderer's top-level summary counts. */
  minor?: boolean
  /** Structured data for a bespoke View (JSON-serializable). */
  data?: Record<string, unknown>
}

export interface ProgressReport {
  program: string
  edition: string
  title: string
  status: Status // rolled up over nodes
  nodes: ReqNode[]
  /** Courses in the plan this program did not use (for "doesn't count" hints). */
  unused: Enrollment[]
  /** Enrollments excluded for grade reasons, with why. */
  excluded: { enrollment: Enrollment; reason: string }[]
  choices: ChoiceDef[]
  activeChoices: Record<string, string>
  attestations: AttestationDef[]
  attested: string[]
  /** Program-wide caveats shown at the top. */
  notes: string[]
  /** Harness bugs detected while evaluating (lint fails on any). */
  authoringErrors?: string[]
}

/** Raw student data a harness is evaluated against (from PlanContent or an eval case). */
export interface StudentRecord {
  terms: { term: string; courses: string[] }[]
  completed?: string[] // courses done with no term (exam/transfer credit)
  grades?: Record<string, string> // by canonical or display code
  choices?: Record<string, string>
  /** 'all' = every attestation satisfied; else names of satisfied ones. */
  attested?: 'all' | string[]
  entry?: string // 'frosh' | 'transfer'
  /** Terms >= this code count as planned (not yet completed). Omit = all completed. */
  currentTerm?: string | null
}
