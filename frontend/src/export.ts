// Client-side plan export: CSV (universal) and styled XLSX (via exceljs,
// loaded lazily on first use so it never weighs on the initial bundle).
// Generation is pure — plan content + a code→{title,credits} lookup in,
// bytes out — so it stays testable outside the browser. Fetching titles
// lives in the ExportButton component; a missing lookup degrades to
// code-only rows, never a failed export.

import type { PlanContent } from './api'
import { displayCode } from './api'
import { academicYearOf, ayLabel, parseTermCode, termLabel } from './terms'

export interface CourseInfo {
  title: string
  credits: string
}

export interface ExportInput {
  planName: string
  programNames: string[]
  content: PlanContent
  /** code → title/credits; may be empty (offline) — rows degrade to code-only */
  courses: Map<string, CourseInfo>
  /** export timestamp; injectable for tests */
  now?: Date
}

const QUARTER_ORDER = ['fall', 'winter', 'spring', 'summer']

function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** `My Plan (2026)!` → `my-plan-2026`; always non-empty, filesystem-safe. */
export function slugify(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics left by NFKD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
  return slug || 'plan'
}

export function exportFilename(planName: string, ext: 'csv' | 'xlsx', now = new Date()): string {
  return `${slugify(planName)}-${isoDate(now)}.${ext}`
}

// ---------------------------------------------------------------------------
// CSV

/** Excel-safe field quoting: commas, quotes, and newlines all round-trip. */
function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function csvRow(cells: string[]): string {
  return cells.map(csvField).join(',')
}

function sortedTerms(content: PlanContent) {
  return [...content.terms].sort((a, b) => parseInt(a.term_code, 10) - parseInt(b.term_code, 10))
}

/**
 * Flat tabular CSV: header block (plan / programs / date), then one row per
 * course. Completed courses carry no term. UTF-8 BOM + CRLF so Excel opens
 * it with correct encoding and line breaks on every platform.
 */
export function buildCsv(input: ExportInput): string {
  const now = input.now ?? new Date()
  const rows: string[] = []
  rows.push(csvRow(['Plan', input.planName]))
  rows.push(csvRow(['Programs', input.programNames.join('; ')]))
  rows.push(csvRow(['Exported', isoDate(now)]))
  rows.push('')
  rows.push(csvRow(['Academic Year', 'Term', 'Course Code', 'Course Title', 'Credits', 'Status']))

  const info = (code: string): CourseInfo => input.courses.get(code) ?? { title: '', credits: '' }

  let any = false
  for (const code of input.content.completed) {
    const { title, credits } = info(code)
    rows.push(csvRow(['', '', displayCode(code), title, credits, 'Completed']))
    any = true
  }
  for (const term of sortedTerms(input.content)) {
    const ay = ayLabel(academicYearOf(term.term_code))
    const label = termLabel(term.term_code)
    for (const code of term.courses) {
      const { title, credits } = info(code)
      rows.push(csvRow([ay, label, displayCode(code), title, credits, 'Planned']))
      any = true
    }
  }
  if (!any) rows.push(csvRow(['', '', '', 'No courses in this plan yet.', '', '']))

  return '\uFEFF' + rows.join('\r\n') + '\r\n'
}

// ---------------------------------------------------------------------------
// XLSX (exceljs, dynamic import)

/**
 * The exceljs chunk could not be loaded. Distinct from every other export
 * failure because it is *unrecoverable without a page reload*: per the HTML
 * spec the module map caches the rejection, so a second `import()` resolves
 * from the poisoned entry and never touches the network. Telling the user to
 * "try again" would be a lie — the retry cannot make an attempt. The realistic
 * trigger is a tab left open across a redeploy: the old hashed chunk URL is
 * gone, so even a fresh fetch would 404. Only a reload fixes either case.
 */
export class ChunkLoadError extends Error {
  constructor(cause: unknown) {
    super('exceljs chunk failed to load', { cause })
    this.name = 'ChunkLoadError'
  }
}

/**
 * Lazily pull in exceljs, tagging *any* failure of the import itself — network
 * error, 404 on a stale hash, or a throw during module evaluation — as a
 * ChunkLoadError. All three poison the module map identically, so the caller
 * can act on the class rather than sniffing error message strings (which vary
 * between vite's dev server, rollup's preload helper, and browsers).
 */
async function loadWorkbookCtor(): Promise<typeof import('exceljs').Workbook> {
  try {
    const { Workbook } = await import('exceljs')
    return Workbook
  } catch (cause) {
    throw new ChunkLoadError(cause)
  }
}

// Zinc palette (matches the app's shadcn-zinc theme), ARGB for exceljs.
const ZINC = {
  ink: 'FF27272A', // zinc-800
  muted: 'FF71717A', // zinc-500
  headFill: 'FFF4F4F5', // zinc-100
  sectionFill: 'FFFAFAFA', // zinc-50
  border: 'FFE4E4E7', // zinc-200
}

type Borders = { top: object; left: object; bottom: object; right: object }
function thinBorders(): Borders {
  const edge = { style: 'thin', color: { argb: ZINC.border } }
  return { top: edge, left: edge, bottom: edge, right: edge }
}

/**
 * Styled workbook mirroring the on-screen planner: a "Plan" sheet with one
 * row per academic year × quarter columns (Fall/Winter/Spring/Summer), a
 * completed-courses section, plus a flat "Courses" sheet in the CSV layout
 * for anyone who wants the data tabular. Returns the .xlsx bytes.
 */
export async function buildXlsx(input: ExportInput): Promise<ArrayBuffer> {
  const Workbook = await loadWorkbookCtor()
  const now = input.now ?? new Date()
  const wb = new Workbook()
  wb.created = now
  wb.modified = now

  const courseLine = (code: string): string => {
    const c = input.courses.get(code)
    return c?.title ? `${displayCode(code)} — ${c.title}` : displayCode(code)
  }

  // --- Plan sheet: planner-grid layout -------------------------------------
  const plan = wb.addWorksheet('Plan', { properties: { defaultRowHeight: 16 } })
  plan.columns = [
    { width: 12 }, // academic year
    { width: 42 },
    { width: 42 },
    { width: 42 },
    { width: 42 },
  ]

  const title = plan.addRow([input.planName])
  plan.mergeCells(title.number, 1, title.number, 5)
  title.getCell(1).font = { size: 16, bold: true, color: { argb: ZINC.ink } }
  title.height = 26

  const subtitleText = [
    input.programNames.length ? input.programNames.join(' · ') : 'No programs selected',
    `Exported ${isoDate(now)}`,
  ].join('  —  ')
  const subtitle = plan.addRow([subtitleText])
  plan.mergeCells(subtitle.number, 1, subtitle.number, 5)
  subtitle.getCell(1).font = { size: 10, color: { argb: ZINC.muted } }
  plan.addRow([])

  const head = plan.addRow(['Year', 'Fall', 'Winter', 'Spring', 'Summer'])
  head.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: ZINC.ink } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZINC.headFill } }
    cell.border = thinBorders()
    cell.alignment = { vertical: 'middle' }
  })

  const byTerm = new Map(input.content.terms.map((t) => [t.term_code, t.courses]))
  const years = [...new Set(input.content.terms.map((t) => academicYearOf(t.term_code)))].sort(
    (a, b) => a - b,
  )
  for (const year of years) {
    // Quarter cells hold one course per line, mirroring the planner cards.
    const cells = QUARTER_ORDER.map((season) => {
      for (const [tc, courses] of byTerm) {
        const p = parseTermCode(tc)
        if (p.season === season && academicYearOf(tc) === year)
          return courses.map(courseLine).join('\n')
      }
      return ''
    })
    const row = plan.addRow([ayLabel(year), ...cells])
    const lines = Math.max(1, ...cells.map((c) => c.split('\n').length))
    row.height = Math.max(20, lines * 15 + 6)
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      if (col > 5) return
      cell.border = thinBorders()
      cell.alignment = { vertical: 'top', wrapText: true }
      cell.font = { size: 10, color: { argb: ZINC.ink } }
    })
    row.getCell(1).font = { size: 10, bold: true, color: { argb: ZINC.muted } }
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZINC.sectionFill } }
  }
  if (years.length === 0) {
    const empty = plan.addRow(['', 'No terms planned yet.'])
    empty.getCell(2).font = { size: 10, italic: true, color: { argb: ZINC.muted } }
  }

  // --- Completed-courses section -------------------------------------------
  plan.addRow([])
  const compHead = plan.addRow([`Completed courses (${input.content.completed.length})`])
  plan.mergeCells(compHead.number, 1, compHead.number, 5)
  compHead.getCell(1).font = { bold: true, size: 11, color: { argb: ZINC.ink } }
  compHead.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZINC.headFill } }
  compHead.getCell(1).border = thinBorders()
  if (input.content.completed.length) {
    for (const code of input.content.completed) {
      const c = input.courses.get(code)
      const row = plan.addRow([displayCode(code), c?.title ?? '', '', '', c?.credits ?? ''])
      plan.mergeCells(row.number, 2, row.number, 4)
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        if (col > 5) return
        cell.border = thinBorders()
        cell.font = { size: 10, color: { argb: ZINC.ink } }
      })
    }
  } else {
    const none = plan.addRow(['None recorded.'])
    none.getCell(1).font = { size: 10, italic: true, color: { argb: ZINC.muted } }
  }

  // --- Flat data sheet (same layout as the CSV) ----------------------------
  const flat = wb.addWorksheet('Courses')
  flat.columns = [
    { header: 'Academic Year', width: 14 },
    { header: 'Term', width: 14 },
    { header: 'Course Code', width: 13 },
    { header: 'Course Title', width: 52 },
    { header: 'Credits', width: 8 },
    { header: 'Status', width: 11 },
  ]
  flat.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: ZINC.ink } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZINC.headFill } }
    cell.border = thinBorders()
  })
  const info = (code: string): CourseInfo => input.courses.get(code) ?? { title: '', credits: '' }
  for (const code of input.content.completed) {
    const { title: t, credits } = info(code)
    flat.addRow(['', '', displayCode(code), t, credits, 'Completed'])
  }
  for (const term of sortedTerms(input.content)) {
    for (const code of term.courses) {
      const { title: t, credits } = info(code)
      flat.addRow([
        ayLabel(academicYearOf(term.term_code)),
        termLabel(term.term_code),
        displayCode(code),
        t,
        credits,
        'Planned',
      ])
    }
  }
  flat.views = [{ state: 'frozen', ySplit: 1 }]

  return wb.xlsx.writeBuffer() as Promise<ArrayBuffer>
}

// ---------------------------------------------------------------------------
// Download plumbing (browser only)

export function triggerDownload(bytes: BlobPart, filename: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Delay revocation: some browsers abort the download if revoked synchronously.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function downloadCsv(input: ExportInput): void {
  triggerDownload(buildCsv(input), exportFilename(input.planName, 'csv'), 'text/csv;charset=utf-8')
}

export async function downloadXlsx(input: ExportInput): Promise<void> {
  const bytes = await buildXlsx(input)
  triggerDownload(
    bytes,
    exportFilename(input.planName, 'xlsx'),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
}
