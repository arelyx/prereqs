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

test('upload → review (NP flagged unchecked, unmatched inert) → apply merges completed', async ({ page }) => {
  await page.route('**/transcript/status', (r) =>
    r.fulfill({ json: { available: true, model: 'qwen3:4b', detail: 'ok' } }),
  )
  await page.route('**/u/ucsc/transcript/parse', (r) => r.fulfill({ json: PARSE_RESULT }))
  await page.reload()

  // Pre-existing completed course must survive the import (merge, not clobber).
  await page.evaluate(() => {
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

  await page.getByRole('button', { name: 'Add 2 courses' }).click()

  // Modal closed; the two checked courses joined the existing completed set.
  await expect(page.getByText(/never stored/)).toHaveCount(0)
  const completedSection = page.locator('section', { hasText: 'Completed courses' }).first()
  await expect(completedSection.getByRole('button', { name: 'CSE 12', exact: true })).toBeVisible()
  await expect(completedSection.getByRole('button', { name: 'CSE 30', exact: true })).toBeVisible()
  await expect(completedSection.getByRole('button', { name: 'ANTH 2', exact: true })).toBeVisible()
  await expect(completedSection.getByRole('button', { name: 'WRIT 2', exact: true })).toHaveCount(0)
  await expect(completedSection.getByText('3 courses')).toBeVisible()
  await shot(page, 'transcript-applied')
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
