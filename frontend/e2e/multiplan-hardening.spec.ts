// Hardening around multi-plan state: hostile localStorage shapes must render
// (repaired) instead of white-screening, plan names are capped at the server
// limit, a failed plan list at sign-in aborts the import instead of
// duplicating every plan, and a slow validate response can never land on a
// different plan than it was computed for.
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

// Structurally wrong but valid JSON — every one of these white-screened the
// app before plans were normalized on load.
const HOSTILE_V2: [string, string][] = [
  ['plan missing content', '{"plans":[{"id":"a","planName":"X"}],"activeId":"a"}'],
  [
    'terms not an array',
    '{"plans":[{"id":"a","planName":"X","content":{"completed":[],"terms":"bad"},"programIds":[]}],"activeId":"a"}',
  ],
  [
    'non-string course codes',
    '{"plans":[{"id":"a","planName":"X","content":{"completed":[123],"terms":[{"term_code":"2270","courses":[123]}]},"programIds":[]}],"activeId":"a"}',
  ],
  [
    'programIds null',
    '{"plans":[{"id":"a","planName":"X","content":{"completed":[],"terms":[]},"programIds":null}],"activeId":"a"}',
  ],
  [
    'planName not a string',
    '{"plans":[{"id":"a","planName":123,"content":{"completed":[],"terms":[]},"programIds":[]}],"activeId":"a"}',
  ],
]

test('hostile v2 localStorage shapes load repaired and self-heal', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  for (const [name, v2] of HOSTILE_V2) {
    await page.evaluate((v) => {
      localStorage.clear()
      localStorage.setItem('prereqs.plans.v2', v)
    }, v2)
    await page.reload()
    await expect(switcher(page), `case: ${name}`).toBeVisible()
    // Self-heal: the persisted value has been rewritten into a valid shape.
    const healed = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('prereqs.plans.v2') ?? 'null'),
    )
    expect(Array.isArray(healed?.plans), `case: ${name}`).toBe(true)
    for (const p of healed.plans) {
      expect(typeof p.planName, `case: ${name}`).toBe('string')
      expect(Array.isArray(p.content?.completed), `case: ${name}`).toBe(true)
      expect(Array.isArray(p.content?.terms), `case: ${name}`).toBe(true)
      expect(Array.isArray(p.programIds), `case: ${name}`).toBe(true)
    }
  }
  expect(pageErrors).toEqual([])
})

test('hostile legacy plan key migrates repaired instead of crashing', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('prereqs.plan', '{"content":"oops","planName":"L","programIds":"x"}')
  })
  await page.reload()
  await expect(switcher(page)).toHaveText(/L/)
  expect(pageErrors).toEqual([])
})

test('plan name inputs cap at the server limit (128)', async ({ page }) => {
  await switcher(page).click()
  await page.getByRole('button', { name: '+ New plan' }).click()
  await expect(page.getByLabel('new plan name')).toHaveAttribute('maxlength', '128')
  // Belt and braces: even a value bypassing the input cap is sliced in the store.
  await page.getByLabel('new plan name').fill('N'.repeat(200))
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await switcher(page).click()
  await page.getByRole('button', { name: /^rename plan My Plan$/ }).click()
  await expect(page.getByLabel('plan name')).toHaveAttribute('maxlength', '128')
  await page.keyboard.press('Escape')
  const names = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('prereqs.plans.v2')!).plans.map(
      (p: { planName: string }) => p.planName.length,
    ),
  )
  for (const len of names) expect(len).toBeLessThanOrEqual(128)
})

test('failed plan list at sign-in aborts the import instead of duplicating plans', async ({
  page,
}) => {
  const email = `e2e-listfail-${Date.now()}@example.com`
  // One anonymous plan with work; registering imports it.
  await page.getByPlaceholder('Add a course you already took…').fill('CSE 12')
  await page.getByRole('button', { name: /CSE 12 / }).click()
  await page.getByRole('button', { name: 'Sign in to save your plan' }).click()
  await page.getByPlaceholder('email').fill(email)
  await page.getByPlaceholder(/password/).fill('supersecret1')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText(email)).toBeVisible()
  await page.getByRole('button', { name: 'sign out' }).click()

  // Sign in while GET /plans fails exactly once.
  let failedOnce = false
  await page.route('**/plans', (route) => {
    if (!failedOnce && route.request().method() === 'GET') {
      failedOnce = true
      return route.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"boom"}' })
    }
    return route.continue()
  })
  await page.getByRole('button', { name: 'Sign in to save your plan' }).click()
  await page.getByText('Already have an account? Sign in').click()
  await page.getByPlaceholder('email').fill(email)
  await page.getByPlaceholder(/password/).fill('supersecret1')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()

  // The merge aborted: error surfaced, still signed out, nothing imported.
  await expect(page.getByText('boom')).toBeVisible()
  expect(failedOnce).toBe(true)

  // Retrying cleanly restores the single server copy — no duplicates.
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByText(email)).toBeVisible()
  await switcher(page).click()
  await expect(page.getByRole('button', { name: 'My Plan', exact: true })).toHaveCount(1)
  await page.keyboard.press('Escape')

  // Clean up the account.
  page.on('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'delete account' }).click()
  await expect(page.getByRole('button', { name: 'Sign in to save your plan' })).toBeVisible()
})

test('slow validate response for one plan never lands on another', async ({ page }) => {
  // Plan A carries a program, so its validation grows a requirements panel.
  await page.getByRole('combobox').selectOption({ label: 'Computer Science B.S. ✓' })
  await expect(page.getByRole('heading', { name: 'Computer Science B.S.' })).toBeVisible()
  await createPlan(page, 'Empty B')
  await expect(switcher(page)).toHaveText(/Empty B/)
  await expect(page.getByRole('heading', { name: 'Computer Science B.S.' })).toHaveCount(0)
  await page.waitForTimeout(1000) // let plan B's own validate settle

  // Delay the NEXT validate (plan A's) so its response outlives the switch.
  let delayed = false
  await page.route('**/validate', async (route) => {
    if (!delayed) {
      delayed = true
      await new Promise((r) => setTimeout(r, 900))
    }
    return route.continue()
  })
  await switcher(page).click()
  await page.getByRole('button', { name: 'My Plan', exact: true }).click()
  await page.waitForTimeout(500) // > 350ms debounce: plan A validate in flight
  await switcher(page).click()
  await page.getByRole('button', { name: 'Empty B', exact: true }).click()
  // The delayed plan-A response arrives ~900ms after its request; plan B must
  // never show plan A's requirements panel.
  await page.waitForTimeout(2500)
  expect(delayed).toBe(true)
  await expect(switcher(page)).toHaveText(/Empty B/)
  await expect(page.getByRole('heading', { name: 'Computer Science B.S.' })).toHaveCount(0)
})
