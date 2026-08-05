// Thin API client. Token lives in localStorage; all calls are university-scoped
// where relevant. Validation is public — the anonymous mode uses it freely.

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8200'
const UNIVERSITY = 'ucsc'

export interface CourseSummary {
  code: string
  display_code: string
  title: string
  credits: string
  division: string
  ge_codes: string[]
  subject: string
  dormant?: boolean
}

export interface OfferingHistoryRow {
  term_code: string
  year: number
  season: string
  sections: number
  planned: boolean
  sources: string[]
  instructors: string[]
}

export interface CourseDetail extends CourseSummary {
  url: string | null
  description: string
  raw_requirements: string | null
  prereq_groups: string[][] | null
  postreqs: CourseSummary[]
  cross_listed: string[]
  formerly: string | null
  repeatable: boolean
  offering_history: OfferingHistoryRow[]
  availability: {
    season_counts: Record<string, number> | null
    last_offered_term_code: string | null
    next_planned: { term_code: string; sources: string[]; instructors: string[] }[] | null
    predicted_instructors:
      | { name: string; score: number; scheduled: boolean; times_taught?: number; last_term?: string }[]
      | null
  } | null
}

export interface GraphPayload {
  root: string
  nodes: (CourseSummary & { role: string; prereq_groups?: string[][] | null })[]
  edges: { from: string; to: string; group: number }[]
}

export interface ProgramSummary {
  id: number
  name: string
  degree: string
  kind: string
  division: string | null
  verification: string
}

export interface InfoSection {
  title: string
  paragraphs: string[]
}

export interface ProgramDetail extends ProgramSummary {
  department: string | null
  url: string
  catalog_year: string | null
  requirements: { sections: unknown[]; info_sections?: InfoSection[] } | null
}

export interface TranscriptStatus {
  available: boolean
  model: string | null
}

export interface TranscriptRow {
  code: string
  title: string
  term: string
  grade: string
  earned_units: number
  completed: boolean
}

export interface TranscriptParseResult {
  matched: TranscriptRow[]
  unmatched: string[]
  warnings: string[]
}

export interface PlanContent {
  completed: string[]
  terms: { term_code: string; courses: string[] }[]
  /** Courses excused from prerequisite checking (transfer credit, petition,
   * an equivalent taken elsewhere, or an imported transcript). */
  waived: string[]
}

export interface ServerPlan {
  id: number
  name: string
  university_id: string
  program_ids: number[]
  content: PlanContent
  updated_at: string | null
}

export interface ValidationIssue {
  kind: string
  course: string | null
  term_code: string | null
  message: string
  severity: 'error' | 'warning' | 'info'
}

export interface CourseFilter {
  include_ranges?: { subject: string; lo: number; hi: number }[]
  include_series?: { subject: string; prefix: string }[]
  exclude_ranges?: { subject: string; lo: number; hi: number }[]
  exclude_codes?: string[]
}

export interface RuleProgress {
  op: string
  n: number | null
  courses: string[]
  branches: string[][] | null
  have: string[]
  filter?: CourseFilter
  matching?: string[]
  needed?: number | null
  done?: number | null
  satisfied: boolean | null
  unevaluated?: boolean
  manual?: boolean
  best_branch_progress?: number
  source?: { heading?: string; prose?: string[] }
  notes: string[]
  constraints: { type: string; text: string }[]
}

export interface ValidationResult {
  issues: ValidationIssue[]
  ge_progress: { category: string; label: string; satisfied: boolean; by: { ge: string; courses: string[] }[] }[]
  programs: {
    program_id: number
    name: string
    verification: string
    sections: { kind: string; title: string; concentration: string | null; rules: RuleProgress[] }[]
  }[]
}

function token(): string | null {
  return localStorage.getItem('prereqs.token')
}

export function setToken(t: string | null) {
  if (t) localStorage.setItem('prereqs.token', t)
  else localStorage.removeItem('prereqs.token')
}

export function authedEmail(): string | null {
  return localStorage.getItem('prereqs.email')
}

export function setAuthedEmail(email: string | null) {
  if (email) localStorage.setItem('prereqs.email', email)
  else localStorage.removeItem('prereqs.email')
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const t = token()
  if (t) headers.Authorization = `Bearer ${t}`
  const res = await fetch(`${API_URL}${path}`, { ...init, headers })
  if (res.status === 204) return undefined as T
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail ?? detail
    } catch {
      /* non-JSON error */
    }
    throw new ApiError(res.status, detail)
  }
  return res.json()
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// Multipart upload: no JSON content-type (the browser sets the boundary).
async function requestUpload<T>(path: string, file: File): Promise<T> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', body: fd })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail ?? detail
    } catch {
      /* non-JSON error */
    }
    throw new ApiError(res.status, detail)
  }
  return res.json()
}

export const api = {
  searchCourses: (q: string, opts: { subject?: string; ge?: string } = {}) =>
    request<{ total: number; courses: CourseSummary[] }>(
      `/u/${UNIVERSITY}/courses?q=${encodeURIComponent(q)}&subject=${opts.subject ?? ''}&ge=${opts.ge ?? ''}&limit=30`,
    ),
  subjects: () => request<{ subject: string; courses: number }[]>(`/u/${UNIVERSITY}/subjects`),
  dormant: () => request<{ codes: string[] }>(`/u/${UNIVERSITY}/dormant`),
  courseDetail: (code: string) => request<CourseDetail>(`/u/${UNIVERSITY}/courses/${code}`),
  courseGraph: (code: string, depth = 3) =>
    request<GraphPayload>(`/u/${UNIVERSITY}/courses/${code}/graph?depth=${depth}`),
  programs: () => request<ProgramSummary[]>(`/u/${UNIVERSITY}/programs`),
  programDetail: (id: number) => request<ProgramDetail>(`/u/${UNIVERSITY}/programs/${id}`),
  validate: (content: PlanContent, programIds: number[]) =>
    request<ValidationResult>(`/u/${UNIVERSITY}/validate`, {
      method: 'POST',
      body: JSON.stringify({ content, program_ids: programIds }),
    }),
  transcriptStatus: () => request<TranscriptStatus>('/transcript/status'),
  parseTranscript: (file: File) =>
    requestUpload<TranscriptParseResult>(`/u/${UNIVERSITY}/transcript/parse`, file),
  register: (email: string, password: string) =>
    request<{ token: string; email: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; email: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  deleteAccount: () => request<void>('/auth/account', { method: 'DELETE' }),
  listPlans: () => request<ServerPlan[]>('/plans'),
  createPlan: (name: string, programIds: number[], content: PlanContent) =>
    request<ServerPlan>('/plans', {
      method: 'POST',
      body: JSON.stringify({ name, university_id: UNIVERSITY, program_ids: programIds, content }),
    }),
  updatePlan: (id: number, name: string, programIds: number[], content: PlanContent) =>
    request<ServerPlan>(`/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, university_id: UNIVERSITY, program_ids: programIds, content }),
    }),
  deletePlan: (id: number) => request<void>(`/plans/${id}`, { method: 'DELETE' }),
}

export function displayCode(code: string): string {
  const m = code.match(/^([A-Z]+)(\d.*)$/)
  return m ? `${m[1]} ${m[2]}` : code
}
