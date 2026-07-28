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
  const official = page.getByRole('link', { name: /official catalog page/ })
  await expect(official).toHaveAttribute('href', /catalog\.ucsc\.edu.*cse-101/)
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
  // Main fold: collapsed program block; no aggregate met-counter anywhere
  // (the app mirrors the page, it does not audit degrees).
  const header = page.getByRole('button', { name: /Computer Science B\.S\./ })
  await expect(header).toBeVisible()
  await expect(page.getByText(/requirements met/)).toHaveCount(0)
  await expect(page.getByText('Lower-Division')).toHaveCount(0) // collapsed
  await header.click()
  await expect(page.getByText('Lower-Division').first()).toBeVisible()
  // Elective/range rules are gray manual-verification items.
  await expect(page.getByText('⚠ verify manually').first()).toBeVisible()
  await header.click()
  await expect(page.getByText('Lower-Division')).toHaveCount(0)

  // Sections collapse too, and the arrangement survives a reload
  // (persisted in localStorage, not reset per visit).
  await header.click()
  const sectionToggle = page.getByRole('button', { name: /Lower-Division/ }).first()
  const allOf = page.getByText(/All of \d+/)
  await expect(allOf.first()).toBeVisible() // sections expanded by default
  const expandedCount = await allOf.count()
  await sectionToggle.click()
  await expect(allOf).toHaveCount(expandedCount - 1)
  await page.reload()
  await expect(page.getByRole('button', { name: /Lower-Division/ }).first()).toBeVisible() // program stayed open
  await expect(allOf).toHaveCount(expandedCount - 1) // section stayed collapsed
  await page.getByRole('button', { name: /Lower-Division/ }).first().click()
  await expect(allOf).toHaveCount(expandedCount)

  // Sidebar: general info card with catalog link + info sections (all
  // collapsed by default).
  await expect(page.getByRole('link', { name: 'official page' })).toBeVisible()
  const infoTab = page.getByText(/Introduction|Learning Outcomes/).first()
  await expect(infoTab).toBeVisible()
  await expect(page.locator('details[open]')).toHaveCount(0)

  // Full-catalog verification (2026-07-26): every program is verified, so
  // no warning badges anywhere and every option carries the checkmark.
  await page.getByRole('combobox').selectOption({ label: 'History B.A. ✓' })
  await expect(page.getByText('unverified', { exact: true })).toHaveCount(0)
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

test('dormant courses are flagged red in search, planner, and drawer', async ({ page }) => {
  // CSE 129A: in the catalog but zero offerings in the data window.
  await page.getByPlaceholder('Add course…').first().fill('CSE 129A')
  // Badges sit between code and title in the result's accessible name.
  const result = page.getByRole('button', { name: /CSE 129A.*Capstone/ }).first()
  await expect(result.getByText('not offered in 5+ years')).toBeVisible()
  await result.click()

  // Planner card: red validation error from the backend dormant check.
  await expect(
    page.getByText(/CSE 129A has not been offered in the last five years/),
  ).toBeVisible()

  // Drawer: red warning banner.
  await page.getByRole('button', { name: 'CSE 129A', exact: true }).click()
  await expect(page.getByText(/listed in the catalog but likely unavailable/)).toBeVisible()
})

test('mobile: picker above requirements above general info', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('combobox').selectOption({ label: 'Computer Science B.S. ✓' })
  const reqHeader = page.getByRole('button', { name: /Computer Science B\.S\./ })
  await expect(reqHeader).toBeVisible()
  const infoLink = page.getByRole('link', { name: 'official page' })
  await expect(infoLink).toBeVisible()
  const picker = await page.getByText('Your programs').boundingBox()
  const requirements = await reqHeader.boundingBox()
  const info = await infoLink.boundingBox()
  if (!picker || !requirements || !info) throw new Error('missing bounding boxes')
  if (!(picker.y < requirements.y && requirements.y < info.y)) {
    throw new Error(
      `mobile order wrong: picker ${picker.y}, requirements ${requirements.y}, info ${info.y}`,
    )
  }
})

test('theme toggle switches to dark and persists across reload', async ({ page }) => {
  const html = page.locator('html')
  await expect(html).not.toHaveClass(/dark/)
  await page.getByRole('button', { name: 'toggle color theme' }).click()
  await expect(html).toHaveClass(/dark/)
  await page.reload()
  await expect(html).toHaveClass(/dark/) // pre-paint script re-applies it
  await page.getByRole('button', { name: 'toggle color theme' }).click()
  await expect(html).not.toHaveClass(/dark/)
})


test('CS B.S. electives display the CSE ranges, not just the explicit pool', async ({ page }) => {
  await page.getByRole('combobox').selectOption({ label: 'Computer Science B.S. \u2713' })
  await page.getByRole('button', { name: /Computer Science B\.S\./ }).click()
  // The pool rule's filter is requirement content and must be visible.
  await expect(page.getByText(/CSE 100\u2013189/).first()).toBeVisible()
  await expect(page.getByText(/CSE 201\u2013279/).first()).toBeVisible()
  await expect(page.getByText(/excluding/).first()).toBeVisible()
})
