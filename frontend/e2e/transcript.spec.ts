// Transcript import: availability gating, upload → review → apply.
//
// Fully hermetic: every backend route this flow touches is mocked, so the
// spec runs anywhere (no real Ollama, no loaded database). Set SHOTS_DIR to
// also save UI screenshots (used for the headless screenshot check).

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const PARSE_RESULT = {
  matched: [
    { code: 'CSE12', title: 'Systems and Assembly', term: '2021 Fall', grade: 'A+', earned_units: 7, completed: true },
    { code: 'CSE30', title: 'Programming Abstractions', term: '2021 Fall', grade: 'A', earned_units: 7, completed: true },
    { code: 'WRIT2', title: 'Rhetoric and Inquiry', term: '2023 Summer', grade: 'NP', earned_units: 0, completed: false },
  ],
  unmatched: ['FAKE 101'],
  warnings: [],
}

async function mockBaseRoutes(page: Page) {
  await page.route('**/u/ucsc/dormant', (r) => r.fulfill({ json: { codes: [] } }))
  await page.route('**/u/ucsc/validate', (r) =>
    r.fulfill({ json: { issues: [], ge_progress: [], programs: [] } }),
  )
  await page.route('**/u/ucsc/programs', (r) => r.fulfill({ json: [] }))
}

async function shot(page: Page, name: string) {
  if (process.env.SHOTS_DIR) {
    await page.screenshot({ path: `${process.env.SHOTS_DIR}/${name}.png` })
  }
}

test.beforeEach(async ({ page }) => {
  await mockBaseRoutes(page)
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
})

test('unavailable LLM disables the import button with a clear message', async ({ page }) => {
  await page.route('**/transcript/status', (r) =>
    r.fulfill({ json: { available: false, model: null, detail: 'LLM service unreachable' } }),
  )
  await page.reload()
  const button = page.getByRole('button', { name: 'Import transcript (unavailable)' })
  await expect(button).toBeVisible()
  await expect(button).toBeDisabled()
  await expect(button).toHaveAttribute('title', /not available on this server/)
})

test('upload → review (NP flagged unchecked, unmatched inert) → builds a new plan by quarter', async ({ page }) => {
  await page.route('**/transcript/status', (r) =>
    r.fulfill({ json: { available: true, model: 'gemma4:12b', detail: 'ok' } }),
  )
  await page.route('**/u/ucsc/transcript/parse', (r) => r.fulfill({ json: PARSE_RESULT }))

  // The plan in front of the user must survive the import untouched — the
  // import builds a SEPARATE plan. Seeded on the LEGACY single-plan key and
  // written BEFORE the first store load, so this also covers the
  // legacy -> v2 migration feeding the import.
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem(
      'prereqs.plan',
      JSON.stringify({
        content: { completed: ['ANTH2'], terms: [] },
        programIds: [],
        planName: 'My Plan',
        serverPlanId: null,
      }),
    )
  })
  await page.reload()

  await page.getByRole('button', { name: 'Import transcript', exact: true }).click()
  await expect(page.getByText(/never stored/)).toBeVisible()
  await shot(page, 'transcript-upload')

  await page.getByLabel('transcript PDF').setInputFiles({
    name: 'transcript.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 fake for route-mocked parse'),
  })

  // Review: completed rows pre-checked, NP row flagged and unchecked.
  await expect(page.getByText('Best guess from your transcript', { exact: false })).toBeVisible()
  const rows = page.locator('li', { has: page.locator('input[type=checkbox]') })
  await expect(rows).toHaveCount(3)
  await expect(rows.filter({ hasText: 'CSE 12' }).getByRole('checkbox')).toBeChecked()
  await expect(rows.filter({ hasText: 'CSE 30' }).getByRole('checkbox')).toBeChecked()
  const writRow = rows.filter({ hasText: 'WRIT 2' })
  await expect(writRow.getByRole('checkbox')).not.toBeChecked()
  await expect(writRow.getByText('not completed — grade NP')).toBeVisible()
  // Unmatched raw row: no checkbox, explanatory note.
  await expect(page.getByText('FAKE 101')).toBeVisible()
  await expect(page.getByText(/not recognized in the catalog/)).toBeVisible()
  await shot(page, 'transcript-review')

  await page.getByRole('button', { name: 'Create plan with 2 courses' }).click()

  // Modal closed, and the new plan is now the active one.
  await expect(page.getByText(/never stored/)).toHaveCount(0)
  await expect(switcher(page)).toHaveText(/Imported transcript/)

  // Both checked courses land in the 2021-22 row — the year they were taken —
  // and NOT in the completed-courses box.
  const ay2021 = page.locator('section', { hasText: '2021–22' }).first()
  await expect(ay2021.getByText('CSE 12')).toBeVisible()
  await expect(ay2021.getByText('CSE 30')).toBeVisible()
  const completedSection = page.locator('section', { hasText: 'Completed courses' }).first()
  await expect(completedSection.getByText('0 courses')).toBeVisible()
  // The NP row was unchecked, so it was never imported at all.
  await expect(page.getByText('WRIT 2')).toHaveCount(0)
  await shot(page, 'transcript-applied')

  // The plan the user was on is untouched: its completed course is still there.
  await switchTo(page, 'My Plan')
  await expect(completedSection.getByRole('button', { name: 'ANTH 2', exact: true })).toBeVisible()
  await expect(page.getByText('CSE 12')).toHaveCount(0)
})

test('parse failure surfaces a clear error and allows retry', async ({ page }) => {
  await page.route('**/transcript/status', (r) =>
    r.fulfill({ json: { available: true, model: 'qwen3:4b', detail: 'ok' } }),
  )
  await page.route('**/u/ucsc/transcript/parse', (r) =>
    r.fulfill({
      status: 503,
      json: { detail: 'transcript import is unavailable: LLM service unreachable.' },
    }),
  )
  await page.reload()
  await page.getByRole('button', { name: 'Import transcript', exact: true }).click()
  await page.getByLabel('transcript PDF').setInputFiles({
    name: 'transcript.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 fake'),
  })
  await expect(page.getByText(/unavailable right now/)).toBeVisible()
  // Still on the picker: the user can try again later or cancel.
  await expect(page.getByLabel('transcript PDF')).toBeVisible()
})

// --- multi-plan scoping ------------------------------------------------------
// setCompleted routes through the multi-plan update() helper, which mutates
// only the active plan. An import must land in the plan the user is looking
// at, merge with what is already there, leave every other plan alone, and
// survive the store's debounced write + flush-on-switch.

const switcher = (page: Page) => page.getByRole('button', { name: 'switch plan' })

async function createPlan(page: Page, name: string) {
  await switcher(page).click()
  await page.getByRole('button', { name: '+ New plan' }).click()
  await page.getByLabel('new plan name').fill(name)
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(switcher(page)).toHaveText(new RegExp(name.replace(/[+]/g, '\\+')))
}

async function addCompleted(page: Page, displayCode: string) {
  // Suggestion labels glue the GE badge straight onto the code
  // ("CSE 16MFApplied Discrete Mathematics"), so match the code element
  // exactly rather than trying to anchor a regex on the accessible name.
  const box = page.getByPlaceholder('Add a course you already took…')
  await box.fill(displayCode)
  await page
    .getByRole('button')
    .filter({ has: page.getByText(displayCode, { exact: true }) })
    .first()
    .click()
  await box.fill('')
}

async function switchTo(page: Page, name: string) {
  await switcher(page).click()
  await page.getByRole('button', { name, exact: true }).click()
  await expect(switcher(page)).toHaveText(new RegExp(name.replace(/[+]/g, '\\+')))
}

test('import builds a third plan and leaves both existing plans untouched', async ({ page }) => {
  await page.route('**/transcript/status', (r) =>
    r.fulfill({ json: { available: true, model: 'gemma4:12b', detail: 'ok' } }),
  )
  await page.route('**/u/ucsc/transcript/parse', (r) => r.fulfill({ json: PARSE_RESULT }))
  await page.reload()

  const completed = () => page.locator('section', { hasText: 'Completed courses' }).first()

  // Plan A ("My Plan") gets a completed course of its own.
  await addCompleted(page, 'CSE 16')
  await expect(completed().getByRole('button', { name: 'CSE 16', exact: true })).toBeVisible()

  // Plan B starts empty and gets a different pre-existing course.
  await createPlan(page, 'Transfer plan')
  await expect(completed().getByRole('button', { name: 'CSE 16', exact: true })).toHaveCount(0)
  await addCompleted(page, 'MATH 21')
  await expect(completed().getByRole('button', { name: 'MATH 21', exact: true })).toBeVisible()

  // Import while sitting on plan B.
  await page.getByRole('button', { name: 'Import transcript', exact: true }).click()
  await page.getByLabel('transcript PDF').setInputFiles({
    name: 'transcript.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 fake for route-mocked parse'),
  })
  await page.getByRole('button', { name: 'Create plan with 2 courses' }).click()

  // A third plan is now active, holding the courses by quarter.
  await expect(switcher(page)).toHaveText(/Imported transcript/)
  const ay2021 = page.locator('section', { hasText: '2021–22' }).first()
  await expect(ay2021.getByText('CSE 12')).toBeVisible()
  await expect(ay2021.getByText('CSE 30')).toBeVisible()
  await expect(completed().getByText('0 courses')).toBeVisible()

  // Plan A untouched: nothing imported leaked into it.
  await switchTo(page, 'My Plan')
  await expect(completed().getByRole('button', { name: 'CSE 16', exact: true })).toBeVisible()
  await expect(completed().getByText('1 course')).toBeVisible()
  await expect(page.getByText('CSE 12')).toHaveCount(0)

  // Plan B — the one that was active during the import — is untouched too.
  await switchTo(page, 'Transfer plan')
  await expect(completed().getByRole('button', { name: 'MATH 21', exact: true })).toBeVisible()
  await expect(completed().getByText('1 course')).toBeVisible()
  await expect(page.getByText('CSE 12')).toHaveCount(0)

  // Back to the imported plan: the write survived the switches.
  await switchTo(page, 'Imported transcript')
  await expect(ay2021.getByText('CSE 12')).toBeVisible()

  // ...and it is persisted as its own plan in the v2 store: courses under the
  // quarter they were taken, nothing written into the other two plans.
  const stored = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('prereqs.plans.v2') || '{}')
    const completedByName: Record<string, string[]> = {}
    const termsByName: Record<string, Record<string, string[]>> = {}
    for (const p of raw.plans ?? []) {
      completedByName[p.planName] = p.content.completed
      termsByName[p.planName] = Object.fromEntries(
        p.content.terms
          .filter((t: { courses: string[] }) => t.courses.length)
          .map((t: { term_code: string; courses: string[] }) => [t.term_code, t.courses]),
      )
    }
    const active = (raw.plans ?? []).find((p: { id: string }) => p.id === raw.activeId)
    return {
      completedByName,
      termsByName,
      count: (raw.plans ?? []).length,
      activeName: active?.planName,
      legacy: localStorage.getItem('prereqs.plan'),
    }
  })
  expect(stored.count).toBe(3)
  expect(stored.activeName).toBe('Imported transcript')
  // 2218 is Fall 2021 — where the transcript says both courses were taken.
  expect(stored.termsByName['Imported transcript']).toEqual({ '2218': ['CSE12', 'CSE30'] })
  expect(stored.completedByName['Imported transcript']).toEqual([])
  expect(stored.completedByName['Transfer plan']).toEqual(['MATH21'])
  expect(stored.completedByName['My Plan']).toEqual(['CSE16'])
  expect(stored.legacy).toBeNull()
})
