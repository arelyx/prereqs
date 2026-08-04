// Multi-plan lifecycle: nav-bar switcher (create / switch / rename / delete),
// per-plan isolation of courses and programs, legacy single-plan migration,
// persistence across reload, and multi-plan account sync.
// Requires loaded UCSC data (catalog + offerings + programs).

import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  // Isolate localStorage between tests.
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

const switcher = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'switch plan' })

async function createPlan(page: import('@playwright/test').Page, name: string) {
  await switcher(page).click()
  await page.getByRole('button', { name: '+ New plan' }).click()
  await page.getByLabel('new plan name').fill(name)
  await page.getByRole('button', { name: 'Create', exact: true }).click()
}

test('create a second plan and switch: courses and programs are isolated', async ({ page }) => {
  // Work in the default plan first.
  await page.getByPlaceholder('Add a course you already took…').fill('CSE 12')
  await page.getByRole('button', { name: /CSE 12 / }).click()
  await page.getByRole('combobox').selectOption({ label: 'Computer Science B.S. ✓' })
  await expect(page.getByRole('button', { name: /Computer Science B\.S\./ })).toBeVisible()

  // New plan starts empty: default AY row, no completed courses, no programs.
  await createPlan(page, 'What-if CS+Math')
  await expect(switcher(page)).toHaveText(/What-if CS\+Math/)
  await expect(page.getByRole('heading', { name: '2026–27' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'CSE 12', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Computer Science B\.S\./ })).toHaveCount(0)

  // Give the second plan its own contents.
  await page.getByPlaceholder('Add a course you already took…').fill('CSE 16')
  await page.getByRole('button', { name: /CSE 16 / }).click()

  // Switch back: the first plan's contents are intact and the second's absent.
  await switcher(page).click()
  await page.getByRole('button', { name: 'My Plan', exact: true }).click()
  await expect(switcher(page)).toHaveText(/My Plan/)
  await expect(page.getByRole('button', { name: 'CSE 12', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'CSE 16', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Computer Science B\.S\./ })).toBeVisible()

  // And forward again.
  await switcher(page).click()
  await page.getByRole('button', { name: 'What-if CS+Math', exact: true }).click()
  await expect(page.getByRole('button', { name: 'CSE 16', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'CSE 12', exact: true })).toHaveCount(0)
})

test('rename a plan from the switcher', async ({ page }) => {
  await switcher(page).click()
  await page.getByRole('button', { name: 'rename plan My Plan' }).click()
  await page.getByLabel('plan name').fill('Renamed Plan')
  await page.getByLabel('plan name').press('Enter')
  await expect(page.getByRole('button', { name: 'Renamed Plan', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(switcher(page)).toHaveText(/Renamed Plan/)
})

test('deleting the active plan falls back; deleting the last plan re-seeds a default', async ({
  page,
}) => {
  await createPlan(page, 'Second')
  await expect(switcher(page)).toHaveText(/Second/)

  // Inline confirm, no browser dialog: "keep" cancels…
  await switcher(page).click()
  await page.getByRole('button', { name: 'delete plan Second' }).click()
  await expect(page.getByText('Delete “Second”?')).toBeVisible()
  await page.getByRole('button', { name: 'keep' }).click()
  await expect(page.getByRole('button', { name: 'Second', exact: true })).toBeVisible()

  // …and "delete" removes the ACTIVE plan → falls back to the other plan.
  await page.getByRole('button', { name: 'delete plan Second' }).click()
  await page.getByRole('button', { name: 'delete', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(switcher(page)).toHaveText(/My Plan/)

  // Deleting the last plan never leaves zero plans: a fresh default appears.
  await switcher(page).click()
  await page.getByRole('button', { name: 'delete plan My Plan' }).click()
  await page.getByRole('button', { name: 'delete', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(switcher(page)).toHaveText(/My Plan/)
  await expect(page.getByRole('heading', { name: '2026–27' })).toBeVisible()
})

test('legacy single-plan localStorage key migrates into the first plan', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem(
      'prereqs.plan',
      JSON.stringify({
        content: { completed: ['CSE12'], terms: [{ term_code: '2268', courses: ['CSE16'] }] },
        programIds: [],
        planName: 'Legacy Plan',
        serverPlanId: null,
      }),
    )
  })
  await page.reload()

  await expect(switcher(page)).toHaveText(/Legacy Plan/)
  await expect(page.getByRole('button', { name: 'CSE 12', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'CSE 16', exact: true })).toBeVisible()

  const keys = await page.evaluate(() => ({
    legacy: localStorage.getItem('prereqs.plan'),
    v2: localStorage.getItem('prereqs.plans.v2'),
  }))
  expect(keys.legacy).toBeNull() // deliberately removed after migration
  expect(keys.v2).toContain('Legacy Plan')
})

test('plans and the active selection persist across reload', async ({ page }) => {
  await createPlan(page, 'Persistent')
  await page.getByPlaceholder('Add a course you already took…').fill('CSE 30')
  await page.getByRole('button', { name: /CSE 30 / }).click()

  await page.reload()
  await expect(switcher(page)).toHaveText(/Persistent/)
  await expect(page.getByRole('button', { name: 'CSE 30', exact: true })).toBeVisible()
  await switcher(page).click()
  await expect(page.getByRole('button', { name: 'My Plan', exact: true })).toBeVisible()
})

test('register imports all local plans; sign back in restores them', async ({ page }) => {
  const email = `e2e-multi-${Date.now()}@example.com`
  // Two anonymous plans with distinct work.
  await page.getByPlaceholder('Add a course you already took…').fill('CSE 12')
  await page.getByRole('button', { name: /CSE 12 / }).click()
  await createPlan(page, 'Second Track')
  await page.getByPlaceholder('Add a course you already took…').fill('CSE 16')
  await page.getByRole('button', { name: /CSE 16 / }).click()

  await page.getByRole('button', { name: 'Sign in to save your plan' }).click()
  await page.getByPlaceholder('email').fill(email)
  await page.getByPlaceholder(/password/).fill('supersecret1')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText(email)).toBeVisible()

  // Sign out keeps local copies; wipe them to prove sign-in restores from the server.
  await page.getByRole('button', { name: 'sign out' }).click()
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  await page.getByRole('button', { name: 'Sign in to save your plan' }).click()
  await page.getByText('Already have an account? Sign in').click()
  await page.getByPlaceholder('email').fill(email)
  await page.getByPlaceholder(/password/).fill('supersecret1')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByText(email)).toBeVisible()

  // Both plans came back; contents stayed per-plan.
  await switcher(page).click()
  await page.getByRole('button', { name: 'Second Track', exact: true }).click()
  await expect(page.getByRole('button', { name: 'CSE 16', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'CSE 12', exact: true })).toHaveCount(0)
  await switcher(page).click()
  await page.getByRole('button', { name: 'My Plan', exact: true }).click()
  await expect(page.getByRole('button', { name: 'CSE 12', exact: true })).toBeVisible()

  // Clean up the account (also exercises multi-plan cascade delete).
  page.on('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'delete account' }).click()
  await expect(page.getByRole('button', { name: 'Sign in to save your plan' })).toBeVisible()
})
