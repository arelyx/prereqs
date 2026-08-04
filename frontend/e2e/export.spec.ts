// Plan export: CSV + XLSX downloads generated client-side from the stored
// plan. Seeds localStorage directly (the planner UI is covered by smoke.spec)
// and asserts on the actual downloaded bytes.

import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const PLAN = {
  content: {
    completed: ['CSE12', 'CSE16'],
    terms: [
      { term_code: '2268', courses: ['CSE101'] },
      { term_code: '2270', courses: ['CSE102'] },
      { term_code: '2272', courses: [] },
      { term_code: '2274', courses: [] },
    ],
  },
  programIds: [],
  planName: 'Export Test "Plan", 2026',
  serverPlanId: null,
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate((plan) => {
    localStorage.clear()
    localStorage.setItem('prereqs.plan', JSON.stringify(plan))
  }, PLAN)
  await page.reload()
})

test('CSV export downloads with slugified filename and full course rows', async ({ page }) => {
  await page.getByRole('button', { name: 'Export' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Download CSV' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/^export-test-plan-2026-\d{4}-\d{2}-\d{2}\.csv$/)
  const path = test.info().outputPath('plan.csv')
  await download.saveAs(path)
  const csv = readFileSync(path, 'utf-8')

  expect(csv.startsWith('\uFEFF')).toBe(true) // UTF-8 BOM for Excel
  expect(csv).toContain('\r\n') // CRLF rows
  expect(csv).toContain('"Export Test ""Plan"", 2026"') // quoting round-trips
  expect(csv).toContain('Academic Year,Term,Course Code,Course Title,Credits,Status')
  expect(csv).toContain(',,CSE 12,') // completed row, no term
  expect(csv).toContain('2026–27,Fall 2026,CSE 101,') // planned row with term labels
  expect(csv).toMatch(/CSE 101,Introduction to Data Structures/) // titles fetched from catalog
  expect(csv).toContain('Completed')
  expect(csv).toContain('Planned')
})

test('XLSX export downloads a valid zip container', async ({ page }) => {
  await page.getByRole('button', { name: 'Export' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Download Excel (.xlsx)' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/^export-test-plan-2026-\d{4}-\d{2}-\d{2}\.xlsx$/)
  const path = test.info().outputPath('plan.xlsx')
  await download.saveAs(path)
  const bytes = readFileSync(path)
  expect(bytes.length).toBeGreaterThan(1000)
  // PK\x03\x04: the xlsx is a real zip, not an error page or empty blob.
  expect([...bytes.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04])
})

test('empty plan still exports a well-formed CSV with a note', async ({ page }) => {
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.getByRole('button', { name: 'Export' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Download CSV' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/^my-plan-\d{4}-\d{2}-\d{2}\.csv$/)
  const path = test.info().outputPath('empty.csv')
  await download.saveAs(path)
  const csv = readFileSync(path, 'utf-8')
  expect(csv).toContain('Plan,My Plan')
  // Default fresh plan has empty quarters and no completed courses.
  expect(csv).toContain('No courses in this plan yet.')
})

// A failed `import('exceljs')` is cached by the browser's module map, so the
// button is dead until the page reloads — the banner has to say so instead of
// telling the user to retry something that can never make a network attempt.
test('a blocked exceljs chunk reports the reload it actually needs', async ({ page }) => {
  await page.route(/exceljs/, (route) => route.abort('failed'))

  await page.getByRole('button', { name: 'Export' }).click()
  await page.getByRole('menuitem', { name: 'Download Excel (.xlsx)' }).click()

  const alert = page.getByRole('alert')
  await expect(alert).toBeVisible()
  const text = await alert.innerText()
  expect(text).toContain('Reload the page')
  expect(text).toContain('CSV export still works')
  // The misleading generic advice must NOT be what a chunk failure shows.
  expect(text).not.toContain('Export failed — please try again.')
  // …and the button recovers from busy so CSV remains usable.
  await expect(page.getByRole('menuitem', { name: 'Download Excel (.xlsx)' })).toBeEnabled()
})

test('reopening the menu after a failure shows no stale error banner', async ({ page }) => {
  await page.route(/exceljs/, (route) => route.abort('failed'))

  await page.getByRole('button', { name: 'Export' }).click()
  await page.getByRole('menuitem', { name: 'Download Excel (.xlsx)' }).click()
  await expect(page.getByRole('alert')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)

  await page.getByRole('button', { name: 'Export' }).click()
  await expect(page.getByRole('menu')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('export menu opens and closes without dialogs', async ({ page }) => {
  page.on('dialog', () => {
    throw new Error('export must not use browser dialogs')
  })
  const button = page.getByRole('button', { name: 'Export' })
  await button.click()
  await expect(page.getByRole('menuitem', { name: 'Download CSV' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Download Excel (.xlsx)' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
})
