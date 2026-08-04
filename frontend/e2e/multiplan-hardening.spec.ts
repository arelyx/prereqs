// Hardening around multi-plan state: hostile localStorage shapes must render
// (repaired) instead of white-screening, plan names are capped at the server
// limit, a failed plan list at sign-in aborts the import instead of
// duplicating every plan, a slow validate response can never land on a
// different plan than it was computed for, deletes propagate cross-tab via
// tombstones without resurrection, and an edit made in another tab during a
// slow sign-in survives the post-sign-in adoption.
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

test('deleting a plan in one tab removes it in the other and never resurrects', async ({
  page,
  context,
}) => {
  await createPlan(page, 'Doomed')
  await expect(switcher(page)).toHaveText(/Doomed/)

  const other = await context.newPage()
  await other.goto('/')
  await expect(switcher(other)).toHaveText(/Doomed/) // shared active selection

  // Delete in the first tab; the tombstone must remove it in the other too.
  await switcher(page).click()
  await page.getByRole('button', { name: 'delete plan Doomed' }).click()
  await page.getByRole('button', { name: 'delete', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(switcher(page)).toHaveText(/My Plan/)
  await expect(switcher(other)).toHaveText(/My Plan/)

  // The surviving tab keeps working and re-broadcasts; the deleted plan must
  // not resurrect in the deleting tab off that write.
  await other.getByPlaceholder('Add a course you already took…').fill('CSE 12')
  await other.getByRole('button', { name: /CSE 12 / }).click()
  await expect(page.getByRole('button', { name: 'CSE 12', exact: true })).toBeVisible()
  await switcher(page).click()
  await expect(page.getByRole('button', { name: 'Doomed', exact: true })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await switcher(other).click()
  await expect(other.getByRole('button', { name: 'Doomed', exact: true })).toHaveCount(0)
})

test('an edit in another tab during a slow sign-in is not lost', async ({ page, context }) => {
  const email = `e2e-signinrace-${Date.now()}@example.com`
  await page.getByPlaceholder('Add a course you already took…').fill('CSE 12')
  await page.getByRole('button', { name: /CSE 12 / }).click()

  const other = await context.newPage()
  await other.goto('/')
  await expect(other.getByRole('button', { name: 'CSE 12', exact: true })).toBeVisible()

  // Stretch the sign-in window: the first GET /plans takes 2.5s.
  let delayed = false
  await page.route('**/plans', async (route) => {
    if (!delayed && route.request().method() === 'GET') {
      delayed = true
      await new Promise((r) => setTimeout(r, 2500))
    }
    return route.continue()
  })
  await page.getByRole('button', { name: 'Sign in to save your plan' }).click()
  await page.getByPlaceholder('email').fill(email)
  await page.getByPlaceholder(/password/).fill('supersecret1')
  await page.getByRole('button', { name: 'Create account' }).click()

  // Mid-sign-in, the other tab edits the shared plan.
  await page.waitForTimeout(400)
  await other.getByPlaceholder('Add a course you already took…').fill('CSE 16')
  await other.getByRole('button', { name: /CSE 16 / }).click()

  await expect(page.getByText(email)).toBeVisible({ timeout: 10000 })
  expect(delayed).toBe(true)
  // The mid-sign-in edit survives in both tabs…
  await expect(page.getByRole('button', { name: 'CSE 16', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'CSE 12', exact: true })).toBeVisible()
  await expect(other.getByRole('button', { name: 'CSE 16', exact: true })).toBeVisible()
  // …and reaches the server once the post-sign-in flush runs.
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          const r = await fetch('http://localhost:8200/plans', {
            headers: { Authorization: `Bearer ${localStorage.getItem('prereqs.token')}` },
          })
          return JSON.stringify(await r.json())
        }),
      { timeout: 8000 },
    )
    .toContain('CSE16')

  // Clean up the account.
  page.on('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'delete account' }).click()
  await expect(page.getByRole('button', { name: 'Sign in to save your plan' })).toBeVisible()
})

test('a 404 from a bad program id never discards the local plan', async ({ page }) => {
  // PUT /plans/{id} 404s for "one or more programs not found" (checked BEFORE
  // the plan lookup) as well as for a missing row, so a 404 must never be
  // read as "deleted elsewhere" and destroy the user's work.
  const email = `e2e-put404-${Date.now()}@example.com`
  await page.getByPlaceholder('Add a course you already took…').fill('CSE 12')
  await page.getByRole('button', { name: /CSE 12 / }).click()
  await page.getByRole('button', { name: 'Sign in to save your plan' }).click()
  await page.getByPlaceholder('email').fill(email)
  await page.getByPlaceholder(/password/).fill('supersecret1')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText(email)).toBeVisible()
  await page.waitForTimeout(1200)
  const before = await page.evaluate(async () => {
    const r = await fetch('http://localhost:8200/plans', {
      headers: { Authorization: `Bearer ${localStorage.getItem('prereqs.token')}` },
    })
    return (await r.json()).length
  })
  expect(before).toBe(1)

  // Poison programIds with an id no program has (hand-edited state, or a
  // program dropped by an annual catalog refresh), then force flushes.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('prereqs.plans.v2')!)
    s.plans[0].programIds = [999999]
    localStorage.setItem('prereqs.plans.v2', JSON.stringify(s))
  })
  await page.reload()
  await expect(page.getByText(email)).toBeVisible()
  await page.waitForTimeout(2500)

  // The plan survived locally with its work; nothing was tombstoned, and no
  // duplicate reseed row was pushed to the server.
  await expect(page.getByRole('button', { name: 'CSE 12', exact: true })).toBeVisible()
  const after = await page.evaluate(async () => {
    const blob = JSON.parse(localStorage.getItem('prereqs.plans.v2')!)
    const r = await fetch('http://localhost:8200/plans', {
      headers: { Authorization: `Bearer ${localStorage.getItem('prereqs.token')}` },
    })
    return { plans: blob.plans.length, deleted: (blob.deleted ?? []).length, server: (await r.json()).length }
  })
  expect(after.plans).toBe(1)
  expect(after.deleted).toBe(0)
  expect(after.server).toBe(1)

  page.on('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'delete account' }).click()
  await expect(page.getByRole('button', { name: 'Sign in to save your plan' })).toBeVisible()
})

test('hostile tombstone list is normalized and a tombstoned active plan is fixed up', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await page.evaluate(() => {
    localStorage.clear()
    // Junk entries plus a tombstone for the (active) zombie plan.
    const junk: unknown[] = [123, null, {}, 'dead-x', 'zombie']
    localStorage.setItem(
      'prereqs.plans.v2',
      JSON.stringify({
        plans: [
          { id: 'alive', planName: 'Alive', content: { completed: [], terms: [] }, programIds: [], serverPlanId: null, rev: 1 },
          { id: 'zombie', planName: 'Zombie', content: { completed: [], terms: [] }, programIds: [], serverPlanId: null, rev: 9 },
        ],
        activeId: 'zombie', // the active plan is tombstoned
        deleted: junk,
      }),
    )
  })
  await page.reload()

  // Zombie filtered out, active selection repaired onto a live plan.
  await expect(switcher(page)).toHaveText(/Alive/)
  await switcher(page).click()
  await expect(page.getByRole('button', { name: 'Zombie', exact: true })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await page.getByPlaceholder('Add a course you already took…').fill('CSE 12')
  await page.getByRole('button', { name: /CSE 12 / }).click()
  await page.waitForTimeout(300)
  const blob = await page.evaluate(() => JSON.parse(localStorage.getItem('prereqs.plans.v2')!))
  expect(blob.deleted.every((d: unknown) => typeof d === 'string')).toBe(true)
  expect(blob.deleted.length).toBeLessThanOrEqual(100)
  expect(pageErrors).toEqual([])
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
