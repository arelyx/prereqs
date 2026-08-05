// UCSC term-code helpers, mirroring backend loaders/terms.py.

const DIGIT_TO_SEASON: Record<number, string> = { 0: 'winter', 2: 'spring', 4: 'summer', 8: 'fall' }
const SEASON_TO_DIGIT: Record<string, number> = { winter: 0, spring: 2, summer: 4, fall: 8 }
const ORDER = ['winter', 'spring', 'summer', 'fall']

export function parseTermCode(code: string): { year: number; season: string } {
  const n = parseInt(code, 10)
  const year = 2000 + Math.floor((n - 2000) / 10)
  const season = DIGIT_TO_SEASON[(n - 2000) % 10]
  return { year, season }
}

export function termLabel(code: string): string {
  const { year, season } = parseTermCode(code)
  return `${season[0].toUpperCase()}${season.slice(1)} ${year}`
}

export function nextTermCode(code: string, includeSummer = false): string {
  let { year, season } = parseTermCode(code)
  let idx = ORDER.indexOf(season)
  do {
    idx += 1
    if (idx === ORDER.length) {
      idx = 0
      year += 1
    }
    season = ORDER[idx]
  } while (season === 'summer' && !includeSummer)
  return String(2000 + (year - 2000) * 10 + SEASON_TO_DIGIT[season])
}

/** First plannable term from today's date. */
export function currentTermCode(now = new Date()): string {
  const month = now.getMonth() + 1
  const digit = month <= 3 ? 0 : month <= 6 ? 2 : month <= 8 ? 4 : 8
  return String(2000 + (now.getFullYear() - 2000) * 10 + digit)
}

// Academic years run fall → summer: AY 2026 = Fall 2026, Winter/Spring/Summer 2027.

/** The academic-year start (fall calendar year) a term belongs to. */
export function academicYearOf(code: string): number {
  const { year, season } = parseTermCode(code)
  return season === 'fall' ? year : year - 1
}

export function ayLabel(startYear: number): string {
  return `${startYear}–${(startYear + 1) % 100}`
}

/** The four term codes of an academic year, in fall→summer order. */
export function ayTermCodes(startYear: number): string[] {
  const mk = (y: number, digit: number) => String(2000 + (y - 2000) * 10 + digit)
  return [mk(startYear, 8), mk(startYear + 1, 0), mk(startYear + 1, 2), mk(startYear + 1, 4)]
}

/** "2021 Fall" / "Fall 2021" -> "2218". Null when it isn't a term we plan in
 * (the transcript model echoes the heading it read, so be forgiving). */
export function termCodeFromLabel(label: string): string | null {
  const text = label.trim().toLowerCase()
  const year = text.match(/\b((?:19|20)\d{2})\b/)
  const season = ORDER.find((s) => text.includes(s))
  if (!year || !season) return null
  const y = parseInt(year[1], 10)
  return String(2000 + (y - 2000) * 10 + SEASON_TO_DIGIT[season])
}

/** The natural first planner row: the current AY during fall, else the AY
 * starting with the coming fall. */
export function upcomingAcademicYear(now = new Date()): number {
  const code = currentTermCode(now)
  const { season } = parseTermCode(code)
  return season === 'fall' ? academicYearOf(code) : academicYearOf(code) + 1
}
