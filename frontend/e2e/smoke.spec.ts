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

test('dashboard renders with academic-year planner', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'prereqs' })).toBeVisible()
  await expect(page.getByText('UC Santa Cruz')).toBeVisible()
  await expect(page.getByText(/plan looks valid|blocking issue/)).toBeVisible()
  await expect(page.getByText('Completed courses')).toBeVisible()
  // Default row: the upcoming academic year with all four quarters.
  await expect(page.getByRole('heading', { name: '2026–27' })).toBeVisible()
  for (const q of ['fall', 'winter', 'spring', 'summer']) {
    await expect(page.getByText(q, { exact: true })).toBeVisible()
  }
  // Earlier years can be added as real schedules (mid-degree students).
  await expect(page.getByRole('button', { name: '+ Add previous year (2025–26)' })).toBeVisible()
})

test('year add/remove: gaps offer restoration, non-empty removal confirms', async ({ page }) => {
  // Add two more years, then remove the middle one (empty: no dialog).
  await page.getByRole('button', { name: '+ Add academic year' }).click()
  await page.getByRole('button', { name: '+ Add academic year' }).click()
  await expect(page.getByRole('heading', { name: '2028–29' })).toBeVisible()
  await page
    .locator('section', { has: page.getByRole('heading', { name: '2027–28' }) })
    .getByRole('button', { name: 'remove year' })
    .click()
  await expect(page.getByRole('heading', { name: '2027–28' })).toHaveCount(0)

  // The gap between 2026–27 and 2028–29 offers the missing year back.
  const gapButton = page.getByRole('button', { name: '+ Add 2027–28' })
  await expect(gapButton).toBeVisible()
  await gapButton.click()
  await expect(page.getByRole('heading', { name: '2027–28' })).toBeVisible()
  await expect(page.getByRole('button', { name: '+ Add 2027–28' })).toHaveCount(0)

  // Removing a year that has planned courses requires confirmation.
  await page.getByPlaceholder('Add course…').first().fill('CSE 12')
  await page.getByRole('button', { name: /CSE 12 / }).first().click()
  let dialogText = ''
  page.once('dialog', (d) => {
    dialogText = d.message()
    void d.dismiss()
  })
  const removeFirst = page
    .locator('section', { has: page.getByRole('heading', { name: '2026–27' }) })
    .getByRole('button', { name: 'remove year' })
  await removeFirst.click()
  await expect(page.getByRole('heading', { name: '2026–27' })).toBeVisible() // dismissed: kept
  if (!dialogText.includes('planned course')) throw new Error(`unexpected dialog: ${dialogText}`)
  page.once('dialog', (d) => void d.accept())
  await removeFirst.click()
  await expect(page.getByRole('heading', { name: '2026–27' })).toHaveCount(0)
})

test('course search opens drawer with prereqs, availability, graph', async ({ page }) => {
  await page.getByPlaceholder('Explore any course').fill('CSE 101')
  await page.getByRole('button', { name: /CSE 101 Introduction to Data Structures/ }).click()

  await expect(page.getByRole('heading', { name: /CSE 101/ })).toBeVisible()
  await expect(page.getByText('Prerequisite structure')).toBeVisible()
  // Boolean structure renders AND separators for CSE 101's multi-group prereqs
  await expect(page.getByText('AND').first()).toBeVisible()
  // Offering history pivot: academic-year rows × quarter columns, with
  // scheduled future terms highlighted.
  await expect(page.getByText('Offering history')).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Fall' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Summer' })).toBeVisible()
  await expect(page.getByRole('cell', { name: /2026–27/ })).toBeVisible()
  await expect(page.getByText('scheduled').first()).toBeVisible()
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
  const mfTile = page.getByRole('button', { name: /MF ✓/ })
  await expect(mfTile).toBeVisible()
  // Expanding a category lists the courses that satisfy it.
  await mfTile.click()
  // Second match: the completed-courses chip is also a 'CSE 16' button.
  await expect(page.getByRole('button', { name: 'CSE 16', exact: true }).nth(1)).toBeVisible()
})

test('program: requirements in main fold, general info in sidebar', async ({ page }) => {
  await page.getByRole('combobox').selectOption({ label: 'Computer Science B.S. ✓' })
  // Main fold: requirement progress block with met counter, sections expanded.
  await expect(
    page.getByRole('heading', { name: 'Computer Science B.S.', exact: true }),
  ).toBeVisible()
  await expect(page.getByText(/\d+\/\d+ requirements met/)).toBeVisible()
  await expect(page.getByText('Lower-Division').first()).toBeVisible()
  // Sidebar: general info card with catalog link + info sections.
  await expect(page.getByRole('link', { name: 'official page' })).toBeVisible()
  await expect(page.getByText(/Introduction|Learning Outcomes/).first()).toBeVisible()

  // An unverified program shows the warning badge.
  await page.getByRole('combobox').selectOption({ label: 'History B.A. (unverified)' })
  await expect(page.getByText('unverified', { exact: true }).first()).toBeVisible()
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
