// Generates the approach-C media (screenshots + walkthrough video) from
// fake-but-realistic plans. Needs the stack running (PW_BASE_URL, API_URL).
//   node scripts/media.mjs <out-dir>
import { chromium } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.argv[2] ?? 'media-out'
const BASE = process.env.PW_BASE_URL ?? 'http://localhost:5302'
const API = process.env.API_URL ?? 'http://localhost:8302'
mkdirSync(OUT, { recursive: true })
const programs = await (await fetch(`${API}/u/ucsc/programs`)).json()
const pid = (slug, ed = '2026-27') => programs.find((p) => p.slug === slug && p.edition === ed).id
const T = (rows) => rows.map(([t, ...c]) => ({ term_code: t, courses: c.map((x) => x.replace(' ', '')) }))

const PLANS = {
  'music-bm': {
    name: 'Ana — piano B.M.',
    terms: T([
      ['2248', 'MUSC 30A', 'MUSC 31', 'MUSC 2'], ['2250', 'MUSC 30B', 'MUSC 31', 'MUSC 2', 'MUSC 61'],
      ['2252', 'MUSC 30C', 'MUSC 31', 'MUSC 2', 'MUSC 61', 'MUSC 60'], ['2258', 'MUSC 101A', 'MUSC 102', 'MUSC 161'],
      ['2260', 'MUSC 101B', 'MUSC 161'], ['2262', 'MUSC 101E', 'MUSC 102', 'MUSC 161'],
      ['2268', 'MUSC 150A', 'MUSC 165', 'MUSC 161'], ['2270', 'MUSC 105A', 'MUSC 165', 'MUSC 161'], ['2272', 'MUSC 150C', 'MUSC 165', 'MUSC 161'],
    ]),
    choices: { instrument: 'instrument', entry: 'frosh' },
    attested: ['juries'],
  },
  'literature-ba': {
    name: 'Luis — Language Literature',
    terms: T([
      ['2248', 'LIT 1', 'SPAN 4'], ['2250', 'LIT 80B', 'SPAN 5'], ['2252', 'SPAN 6', 'LIT 101'],
      ['2258', 'LIT 102', 'LIT 110A', 'LIT 188A'], ['2260', 'LIT 114B', 'LIT 189E'], ['2262', 'LIT 124B', 'LIT 188B'],
      ['2268', 'LIT 189F', 'LIT 119A'], ['2270', 'LIT 190X'],
    ]),
    choices: { concentration: 'language', language: 'spanish', intensive: 'no' },
  },
  'computer-science-bs': {
    name: 'Priya — CS B.S.',
    terms: T([
      ['2248', 'CSE 20', 'MATH 19A', 'CSE 16'], ['2250', 'CSE 30', 'MATH 19B', 'CSE 12'], ['2252', 'CSE 13S', 'AM 10', 'CSE 40'],
      ['2258', 'ECE 30', 'AM 30', 'CSE 101'], ['2260', 'CSE 101M', 'CSE 120', 'STAT 131'], ['2262', 'CSE 102', 'CSE 130'],
      ['2268', 'CSE 114A', 'CSE 138'], ['2270', 'CSE 115A', 'CSE 144'],
    ]),
    grades: { MATH19A: 'P' },
  },
  'economics-ba': {
    name: 'Jordan — Economics',
    terms: T([
      ['2248', 'ECON 1', 'AM 11A'], ['2250', 'ECON 2', 'AM 11B'], ['2252', 'STAT 17', 'STAT 17L'],
      ['2258', 'ECON 100A', 'ECON 113'], ['2260', 'ECON 100B', 'ECON 133'], ['2262', 'ECON 140', 'ECON 197'],
      ['2268', 'ECON 136', 'ECON 135'], ['2270', 'ECON 120'],
    ]),
    grades: { ECON113: 'C-' },
  },
  'computer-science-minor': {
    name: 'Sam — CS minor',
    terms: T([['2248', 'MATH 19A', 'CSE 20'], ['2250', 'MATH 19B', 'CSE 30'], ['2252', 'CSE 12', 'CSE 16'], ['2258', 'MATH 21', 'CSE 13S'], ['2260', 'CSE 101'], ['2268', 'CSE 115A', 'CSE 183']]),
  },
  'psychology-ba': {
    name: 'Mei — Intensive Psychology',
    terms: T([
      ['2248', 'PSYC 1', 'MATH 3'], ['2250', 'PSYC 2', 'PSYC 10'], ['2252', 'PSYC 20'], ['2258', 'PSYC 100', 'PSYC 112'],
      ['2260', 'PSYC 121', 'PSYC 140'], ['2262', 'PSYC 159L', 'PSYC 165'], ['2268', 'PSYC 181', 'PSYC 194B', 'LING 112'], ['2270', 'PSYC 194B'],
    ]),
    choices: { concentration: 'intensive' },
  },
}

function state(slug, p, ed = '2026-27') {
  return {
    plans: [{
      id: 'p1', planName: p.name, programIds: [pid(slug, ed)], serverPlanId: null, rev: 1,
      content: { completed: [], terms: p.terms, catalog_year: ed === '2026-27' ? null : ed, choices: p.choices ? { [slug]: p.choices } : {}, attested: { [slug]: p.attested ?? [] }, grades: p.grades ?? {} },
    }],
    activeId: 'p1', deleted: [],
  }
}

async function open(browser, s, { width = 1440, height = 900, theme = 'light', video } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: theme, ...(video ? { recordVideo: { dir: video, size: { width, height } } } : {}) })
  const page = await ctx.newPage()
  await page.addInitScript(([st, th]) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('prereqs.plans.v2', st)
      sessionStorage.setItem('seeded', '1')
    }
    localStorage.setItem('prereqs.theme', th)
  }, [JSON.stringify(s), theme])
  await page.goto(BASE)
  return { ctx, page }
}

async function toDashboard(page, offset = 0) {
  const region = page.getByRole('region', { name: /degree progress/ }).first()
  await region.waitFor()
  await page.waitForTimeout(700)
  await region.evaluate((e, off) => window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - (document.querySelector('header')?.getBoundingClientRect().height ?? 56) - 8 + off), offset)
  await page.waitForTimeout(300)
}

const browser = await chromium.launch()
const shots = [
  ['music-bm', 'music-bm_performance-timeline_light.png', {}, 0],
  ['music-bm', 'music-bm_performance-timeline_dark.png', { theme: 'dark' }, 0],
  ['literature-ba', 'literature-ba_language-literature-spanish_light.png', {}, 0],
  ['literature-ba', 'literature-ba_language-literature-spanish_dark.png', { theme: 'dark' }, 0],
  ['computer-science-bs', 'computer-science-bs_partial-plan_light.png', {}, 0],
  ['computer-science-bs', 'computer-science-bs_electives-dc-capstone_light.png', {}, 1150],
  ['economics-ba', 'economics-ba_comprehensive-grade-rule_light.png', {}, 560],
  ['computer-science-minor', 'computer-science-minor_partial-plan_light.png', {}, 0],
  ['psychology-ba', 'psychology-ba_subfield-board_light.png', {}, 0],
  ['music-bm', 'music-bm_mobile-390.png', { width: 390, height: 844 }, 0],
  ['literature-ba', 'literature-ba_mobile-390.png', { width: 390, height: 844 }, 0],
]
for (const [slug, file, opts, off] of process.env.ONLY_VIDEO ? [] : shots) {
  const { ctx, page } = await open(browser, state(slug, PLANS[slug]), opts)
  await toDashboard(page, off)
  await page.screenshot({ path: join(OUT, file) })
  await ctx.close()
  console.log('wrote', file)
}
// 2025-26 edition (refresh simulation): same plan, older catalog harness.
if (!process.env.ONLY_VIDEO) {
  const { ctx, page } = await open(browser, state('computer-science-bs', PLANS['computer-science-bs'], '2025-26'))
  await toDashboard(page, 0)
  await page.screenshot({ path: join(OUT, 'computer-science-bs_2025-26-edition_light.png') })
  await ctx.close()
  console.log('wrote 2025-26 shot')
}

// Walkthrough video: pick a program, add courses, watch progress, choose a
// concentration, attest something.
if (!process.env.NO_VIDEO) {
  const vdir = join(OUT, 'video-tmp')
  rmSync(vdir, { recursive: true, force: true })
  const empty = { plans: [{ id: 'p1', planName: 'Walkthrough', programIds: [], serverPlanId: null, rev: 1, content: { completed: [], terms: [] } }], activeId: 'p1', deleted: [] }
  const { ctx, page } = await open(browser, empty, { video: vdir })
  const slow = (ms = 700) => page.waitForTimeout(ms)
  await slow(800)
  await page.getByRole('combobox', { name: 'Add a program' }).selectOption({ label: 'Literature B.A. ✓' })
  await toDashboard(page)
  await slow(1200)
  const add = async (code, title) => {
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.getByPlaceholder('Add a course you already took…').fill(code)
    await page.getByRole('button', { name: new RegExp(`^${code} `) }).first().click()
    await slow(350)
  }
  await add('LIT 1', 'Literary')
  await add('LIT 61C', '')
  await add('SPAN 3', '')
  await add('LIT 101', 'Theory')
  await toDashboard(page)
  await slow(1000)
  // Choose a concentration: the page reshapes.
  await page.getByRole('radio', { name: /Language Literature/ }).click()
  await slow(1200)
  await page.getByRole('combobox', { name: 'Language of concentration' }).first().selectOption('spanish')
  await slow(1200)
  await add('LIT 188A', '')
  await add('LIT 110A', '')
  await add('LIT 114B', '')
  await toDashboard(page)
  await slow(1500)
  await page.mouse.wheel(0, 500)
  await slow(1200)
  // Confirm the creative-writing-free attestation path: language exam not needed now; show catalog wording.
  await page.getByRole('button', { name: /catalog wording/ }).first().click()
  await slow(1500)
  await page.mouse.wheel(0, 700)
  await slow(1500)
  // Switch program to Music B.M. to show attestation + timeline.
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('combobox', { name: 'Add a program' }).selectOption({ label: 'Music B.M. ✓' })
  await slow(800)
  const music = page.getByRole('region', { name: 'Music B.M. degree progress' })
  await music.evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 64))
  await slow(1200)
  await music.getByText('Frosh (first-year)').click()
  await slow(800)
  await music.getByText('Juries passed each fall').click()
  await slow(1800)
  await ctx.close()
  const webm = readdirSync(vdir).find((f) => f.endsWith('.webm'))
  renameSync(join(vdir, webm), join(OUT, 'walkthrough.webm'))
  rmSync(vdir, { recursive: true, force: true })
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(OUT, 'walkthrough.webm'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(OUT, 'walkthrough_choose-program-add-courses-concentration-attest.mp4')])
  rmSync(join(OUT, 'walkthrough.webm'))
  console.log('wrote video')
}
await browser.close()
