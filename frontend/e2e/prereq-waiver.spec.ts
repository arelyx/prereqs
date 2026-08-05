// Per-course prereq waiver: the escape hatch for prerequisites the catalog
// cannot see (transfer credit, an equivalent taken elsewhere, a petition).
//
// Exercised on a FUTURE quarter on purpose. Past terms skip prereq checking
// wholesale, so a waiver toggled there would look like it worked no matter
// what the button did.

import { test, expect, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

/** Add a course to the first (upcoming, therefore future) fall quarter. */
async function addToFall(page: Page, displayCode: string) {
  const cell = page.locator('div', { has: page.getByPlaceholder('Add course…') }).nth(0)
  const box = cell.getByPlaceholder('Add course…').first()
  await box.fill(displayCode)
  await page
    .getByRole('button')
    .filter({ has: page.getByText(displayCode, { exact: true }) })
    .first()
    .click()
}

test('waiving a course silences its prereq complaint, and undo brings it back', async ({ page }) => {
  // CSE 101 needs CSE 12, CSE 16 and CSE 30 — none of them planned.
  await addToFall(page, 'CSE 101')
  const complaint = page.getByText(/needs .* before this quarter/).first()
  await expect(complaint).toBeVisible()

  await page.getByRole('button', { name: 'skip this check' }).first().click()
  await expect(page.getByText(/needs .* before this quarter/)).toHaveCount(0)
  await expect(page.getByText('prereqs not checked')).toBeVisible()

  // Persisted, not just hidden.
  const waived = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('prereqs.plans.v2')!)
    return raw.plans.find((p: { id: string }) => p.id === raw.activeId).content.waived
  })
  expect(waived).toEqual(['CSE101'])

  await page.getByRole('button', { name: /undo/ }).first().click()
  await expect(page.getByText(/needs .* before this quarter/).first()).toBeVisible()
  await expect(page.getByText('prereqs not checked')).toHaveCount(0)
})

test('the waiver control only appears where there is a prereq complaint', async ({ page }) => {
  // CSE 12 has no prerequisites, so there is nothing to skip.
  await addToFall(page, 'CSE 12')
  await expect(page.getByText('CSE 12').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'skip this check' })).toHaveCount(0)
})

test('a waiver belongs to its plan, not to the app', async ({ page }) => {
  await addToFall(page, 'CSE 101')
  await page.getByRole('button', { name: 'skip this check' }).first().click()
  await expect(page.getByText('prereqs not checked')).toBeVisible()

  // A second plan with the same course must still be checked.
  await page.getByRole('button', { name: 'switch plan' }).click()
  await page.getByRole('button', { name: '+ New plan' }).click()
  await page.getByLabel('new plan name').fill('Second')
  await page.getByRole('button', { name: 'Create', exact: true }).click()

  await addToFall(page, 'CSE 101')
  await expect(page.getByText(/needs .* before this quarter/).first()).toBeVisible()
  await expect(page.getByText('prereqs not checked')).toHaveCount(0)
})
