// End-to-end smoke of the real stack: search, course drawer, graph, planner
// validation, GE panel, program requirements, and the full auth lifecycle.
// Requires loaded UCSC data (catalog + offerings + programs).

import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  // Isolate localStorage between tests.
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('dashboard renders with planner and validation state', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'prereqs' })).toBeVisible()
  await expect(page.getByText('UC Santa Cruz')).toBeVisible()
  await expect(page.getByText(/plan looks valid|blocking issue/)).toBeVisible()
  await expect(page.getByText('Completed courses')).toBeVisible()
})

test('course search opens drawer with prereqs, availability, graph', async ({ page }) => {
  await page.getByPlaceholder('Explore any course').fill('CSE 101')
  await page.getByRole('button', { name: /CSE 101 Introduction to Data Structures/ }).click()

  await expect(page.getByRole('heading', { name: /CSE 101/ })).toBeVisible()
  await expect(page.getByText('Prerequisite structure')).toBeVisible()
  // Boolean structure renders AND separators for CSE 101's multi-group prereqs
  await expect(page.getByText('AND').first()).toBeVisible()
  await expect(page.getByText('Availability')).toBeVisible()
  // React Flow canvas mounted
  await expect(page.locator('.react-flow').first()).toBeVisible()
  await expect(page.getByText(/Unlocks \(\d+\)/)).toBeVisible()
})

test('planning a course without prereqs flags a blocking issue', async ({ page }) => {
  // Add CSE 101 to the first quarter with nothing completed.
  await page.getByPlaceholder('Add course…').first().fill('CSE 101')
  await page.getByRole('button', { name: /CSE 101 Introduction to Data Structures/ }).click()

  await expect(page.getByText(/needs CSE 12/).first()).toBeVisible()
  await expect(page.getByText(/blocking issue/)).toBeVisible()

  // Marking the prereq chain completed clears the errors for that group.
  for (const code of ['CSE 12', 'CSE 16', 'CSE 30']) {
    await page.getByPlaceholder('Add a course you already took…').fill(code)
    await page
      .getByRole('button', { name: new RegExp(`^${code} `) })
      .first()
      .click()
  }
  await expect(page.getByText(/needs CSE 12/)).toHaveCount(0)
})

test('GE panel tracks categories from completed courses', async ({ page }) => {
  await expect(page.getByText('General Education')).toBeVisible()
  // CSE 16 carries MF; adding it should light the MF category.
  await page.getByPlaceholder('Add a course you already took…').fill('CSE 16')
  await page.getByRole('button', { name: /CSE 16 / }).click()
  await expect(
    page.locator('div', { hasText: /^MF ✓/ }).first(),
  ).toBeVisible()
})

test('program requirements progress renders; verified and unverified badges', async ({ page }) => {
  // CS BS is hand-verified (verified.json) — no warning badge.
  await page.getByRole('combobox').selectOption({ label: 'Computer Science B.S. ✓' })
  await expect(page.getByRole('heading', { name: 'Computer Science B.S.' })).toBeVisible()
  await expect(page.getByText('Lower-Division').first()).toBeVisible()

  // An unverified program shows the warning badge.
  await page.getByRole('combobox').selectOption({ label: 'History B.A. (unverified)' })
  await expect(page.getByRole('heading', { name: 'History B.A.' })).toBeVisible()
  await expect(page.getByText('unverified', { exact: true })).toBeVisible()
})

test('auth lifecycle: register imports plan, sign out, sign in, delete', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`
  // Anonymous work first
  await page.getByPlaceholder('Add a course you already took…').fill('CSE 12')
  await page.getByRole('button', { name: /CSE 12 / }).click()

  await page.getByRole('button', { name: 'Sign in to save your plan' }).click()
  await page.getByPlaceholder('email').fill(email)
  await page.getByPlaceholder(/password/).fill('supersecret1')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText(email)).toBeVisible()

  await page.getByRole('button', { name: 'sign out' }).click()
  await expect(page.getByRole('button', { name: 'Sign in to save your plan' })).toBeVisible()

  await page.getByRole('button', { name: 'Sign in to save your plan' }).click()
  await page.getByText('Already have an account? Sign in').click()
  await page.getByPlaceholder('email').fill(email)
  await page.getByPlaceholder(/password/).fill('supersecret1')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByText(email)).toBeVisible()
  // The imported plan came back from the server.
  await expect(page.getByRole('button', { name: 'CSE 12', exact: true })).toBeVisible()

  page.on('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'delete account' }).click()
  await expect(page.getByRole('button', { name: 'Sign in to save your plan' })).toBeVisible()
})
