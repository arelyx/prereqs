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
