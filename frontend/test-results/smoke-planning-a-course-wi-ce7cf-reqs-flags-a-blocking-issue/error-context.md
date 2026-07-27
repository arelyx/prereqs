# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> planning a course without prereqs flags a blocking issue
- Location: e2e/smoke.spec.ts:87:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/needs CSE 12/).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText(/needs CSE 12/).first()

```

```yaml
- banner:
  - heading "prereqs" [level=1]
  - text: UC Santa Cruz
  - button "Sign in to save your plan"
- main:
  - textbox "Explore any course (e.g. CSE 101)…"
  - text: checking plan…
  - heading "Completed courses" [level=3]
  - text: 0 courses
  - textbox "Add a course you already took…"
  - paragraph: Nothing yet — add what you've taken so prerequisite checks are accurate.
  - button "+ Add previous year (2025–26)"
  - heading "2026–27" [level=3]
  - button "remove year"
  - text: fall
  - list:
    - listitem:
      - button "CSE 101"
      - button "remove CSE101": ×
  - textbox "Add course…"
  - text: winter
  - list
  - textbox "Add course…"
  - text: spring
  - list
  - textbox "Add course…"
  - text: summer
  - list
  - textbox "Add course…"
  - button "+ Add academic year"
  - heading "Your programs" [level=3]
  - combobox:
    - option "Add a major or minor…" [selected]
    - option "Agroecology B.A. ✓"
    - option "Ancient Studies B.A. ✓"
    - option "Ancient Studies Minor ✓"
    - option "Anthropology B.A. ✓"
    - option "Anthropology Minor ✓"
    - option "Applied Linguistics and Multilingualism B.A. ✓"
    - option "Applied Mathematics B.S. ✓"
    - option "Applied Mathematics Minor ✓"
    - option "Applied Physics B.S. ✓"
    - 'option "Art & Design: Games + Playable Media B.A. ✓"'
    - option "Art B.A. ✓"
    - option "Assistive Technology Minor ✓"
    - option "Astrophysics Minor ✓"
    - option "Biochemistry and Molecular Biology B.S. ✓"
    - option "Bioelectronics and Biophotonics Minor ✓"
    - option "Bioinformatics Minor ✓"
    - option "Biology B.A. ✓"
    - option "Biology B.S. ✓"
    - option "Biology Minor ✓"
    - option "Biomolecular Engineering and Bioinformatics B.S. ✓"
    - option "Biotechnology B.A. ✓"
    - option "Black Studies Minor ✓"
    - option "Business Management Economics B.A. ✓"
    - option "Chemistry B.A. ✓"
    - option "Chemistry B.S. ✓"
    - option "Chemistry Minor ✓"
    - option "Cognitive Science B.S. ✓"
    - option "Community Studies B.A. ✓"
    - option "Computer Engineering B.S. ✓"
    - option "Computer Engineering Minor ✓"
    - option "Computer Science B.A. ✓"
    - option "Computer Science B.S. ✓"
    - option "Computer Science Minor ✓"
    - 'option "Computer Science: Computer Game Design B.S. ✓"'
    - option "Creative Technologies B.A. ✓"
    - option "Critical Race and Ethnic Studies B.A. ✓"
    - option "Dance Minor ✓"
    - option "Digital Justice Studies Minor (formerly GISES) ✓"
    - option "Earth Sciences B.S. ✓"
    - option "Earth Sciences Minor ✓"
    - option "Earth Sciences/Anthropology Combined Major B.A. ✓"
    - option "East Asian Studies Minor ✓"
    - option "Ecology and Evolution B.S. ✓"
    - option "Economics B.A. ✓"
    - option "Economics Minor ✓"
    - option "Economics/Mathematics Combined B.A. ✓"
    - option "Education Minor General ✓"
    - option "Education, Democracy, and Justice B.A. ✓"
    - option "Electrical Engineering B.S. ✓"
    - option "Electrical Engineering Minor ✓"
    - option "Electronic Music Minor ✓"
    - option "Environmental Sciences B.S. ✓"
    - option "Environmental Studies B.A. ✓"
    - option "Environmental Studies/Biology Combined Major B.A. ✓"
    - option "Environmental Studies/Earth Sciences Combined Major B.A. ✓"
    - option "Environmental Studies/Economics Combined Major B.A. ✓"
    - option "Feminist Studies B.A. ✓"
    - option "Film and Digital Media B.A. ✓"
    - option "Film and Digital Media Minor ✓"
    - option "Global and Community Health B.A. ✓"
    - option "Global and Community Health B.S. ✓"
    - option "Global Economics B.A. ✓"
    - option "History B.A. ✓"
    - option "History Minor ✓"
    - option "History of Art and Visual Culture B.A. ✓"
    - option "History of Art and Visual Culture Minor ✓"
    - option "History of Consciousness Minor ✓"
    - option "Italian Studies Minor ✓"
    - option "Jazz Spontaneous Composition and Improvisation Minor ✓"
    - option "Jewish Studies B.A. ✓"
    - option "Jewish Studies Minor ✓"
    - option "Language Studies B.A. ✓"
    - option "Language Studies Minor ✓"
    - option "Latin American and Latino Studies B.A. ✓"
    - option "Latin American and Latino Studies Minor ✓"
    - option "Latin American and Latino Studies/Education, Democracy, and Justice B.A. ✓"
    - option "Latin American and Latino Studies/Politics Combined B.A. ✓"
    - option "Latin American and Latino Studies/Sociology Combined B.A. ✓"
    - option "Legal Studies B.A. ✓"
    - option "Legal Studies Minor ✓"
    - option "Linguistics B.A. ✓"
    - option "Linguistics Minor ✓"
    - option "Literature B.A. ✓"
    - option "Literature Minor ✓"
    - option "Marine Biology B.S. ✓"
    - option "Mathematics B.A. ✓"
    - option "Mathematics B.S. ✓"
    - option "Mathematics Education B.A. ✓"
    - option "Mathematics Minor ✓"
    - option "Mathematics Theory and Computation B.S. ✓"
    - option "Microbiology B.S. ✓"
    - option "Middle Eastern and North African Studies MENAS Minor ✓"
    - option "Molecular, Cell, and Developmental Biology B.S. ✓"
    - option "Music B.A. ✓"
    - option "Music B.M. ✓"
    - option "Network and Digital Technology B.A. ✓"
    - option "Neuroscience B.S. ✓"
    - option "Philosophy B.A. ✓"
    - option "Philosophy Minor ✓"
    - option "Physics (Astrophysics) B.S. ✓"
    - option "Physics B.S. ✓"
    - option "Physics Minor ✓"
    - option "Plant Sciences B.S. ✓"
    - option "Politics B.A. ✓"
    - option "Politics Minor ✓"
    - option "Psychology B.A. ✓"
    - option "Robotics Engineering B.S. ✓"
    - option "Science Education B.S. ✓"
    - option "Science Technology Engineering and Mathematics STEM Education Minor ✓"
    - option "Sociology B.A. ✓"
    - option "Spanish Studies B.A. ✓"
    - option "Spanish Studies Minor ✓"
    - option "Statistics Minor ✓"
    - option "Sustainability Studies Minor ✓"
    - option "Technology and Information Management B.S. ✓"
    - option "Technology and Information Management Minor ✓"
    - option "Theater Arts B.A. ✓"
    - option "Theater Arts Minor ✓"
    - option "Western Music Minor ✓"
```

# Test source

```ts
  1   | // End-to-end smoke of the real stack: search, course drawer, graph, planner
  2   | // validation, GE panel, program requirements, and the full auth lifecycle.
  3   | // Requires loaded UCSC data (catalog + offerings + programs).
  4   | 
  5   | import { expect, test } from '@playwright/test'
  6   | 
  7   | test.beforeEach(async ({ page }) => {
  8   |   await page.goto('/')
  9   |   // Isolate localStorage between tests.
  10  |   await page.evaluate(() => localStorage.clear())
  11  |   await page.reload()
  12  | })
  13  | 
  14  | test('dashboard renders with academic-year planner', async ({ page }) => {
  15  |   await expect(page.getByRole('heading', { name: 'prereqs' })).toBeVisible()
  16  |   await expect(page.getByText('UC Santa Cruz')).toBeVisible()
  17  |   await expect(page.getByText(/plan looks valid|blocking issue/)).toBeVisible()
  18  |   await expect(page.getByText('Completed courses')).toBeVisible()
  19  |   // Default row: the upcoming academic year with all four quarters.
  20  |   await expect(page.getByRole('heading', { name: '2026–27' })).toBeVisible()
  21  |   for (const q of ['fall', 'winter', 'spring', 'summer']) {
  22  |     await expect(page.getByText(q, { exact: true })).toBeVisible()
  23  |   }
  24  |   // Earlier years can be added as real schedules (mid-degree students).
  25  |   await expect(page.getByRole('button', { name: '+ Add previous year (2025–26)' })).toBeVisible()
  26  | })
  27  | 
  28  | test('year add/remove: gaps offer restoration, non-empty removal confirms', async ({ page }) => {
  29  |   // Add two more years, then remove the middle one (empty: no dialog).
  30  |   await page.getByRole('button', { name: '+ Add academic year' }).click()
  31  |   await page.getByRole('button', { name: '+ Add academic year' }).click()
  32  |   await expect(page.getByRole('heading', { name: '2028–29' })).toBeVisible()
  33  |   await page
  34  |     .locator('section', { has: page.getByRole('heading', { name: '2027–28' }) })
  35  |     .getByRole('button', { name: 'remove year' })
  36  |     .click()
  37  |   await expect(page.getByRole('heading', { name: '2027–28' })).toHaveCount(0)
  38  | 
  39  |   // The gap between 2026–27 and 2028–29 offers the missing year back.
  40  |   const gapButton = page.getByRole('button', { name: '+ Add 2027–28' })
  41  |   await expect(gapButton).toBeVisible()
  42  |   await gapButton.click()
  43  |   await expect(page.getByRole('heading', { name: '2027–28' })).toBeVisible()
  44  |   await expect(page.getByRole('button', { name: '+ Add 2027–28' })).toHaveCount(0)
  45  | 
  46  |   // Removing a year that has planned courses requires confirmation.
  47  |   await page.getByPlaceholder('Add course…').first().fill('CSE 12')
  48  |   await page.getByRole('button', { name: /CSE 12 / }).first().click()
  49  |   let dialogText = ''
  50  |   page.once('dialog', (d) => {
  51  |     dialogText = d.message()
  52  |     void d.dismiss()
  53  |   })
  54  |   const removeFirst = page
  55  |     .locator('section', { has: page.getByRole('heading', { name: '2026–27' }) })
  56  |     .getByRole('button', { name: 'remove year' })
  57  |   await removeFirst.click()
  58  |   await expect(page.getByRole('heading', { name: '2026–27' })).toBeVisible() // dismissed: kept
  59  |   if (!dialogText.includes('planned course')) throw new Error(`unexpected dialog: ${dialogText}`)
  60  |   page.once('dialog', (d) => void d.accept())
  61  |   await removeFirst.click()
  62  |   await expect(page.getByRole('heading', { name: '2026–27' })).toHaveCount(0)
  63  | })
  64  | 
  65  | test('course search opens drawer with prereqs, availability, graph', async ({ page }) => {
  66  |   await page.getByPlaceholder('Explore any course').fill('CSE 101')
  67  |   await page.getByRole('button', { name: /CSE 101 Introduction to Data Structures/ }).click()
  68  | 
  69  |   await expect(page.getByRole('heading', { name: /CSE 101/ })).toBeVisible()
  70  |   const official = page.getByRole('link', { name: /official catalog page/ })
  71  |   await expect(official).toHaveAttribute('href', /catalog\.ucsc\.edu.*cse-101/)
  72  |   await expect(page.getByText('Prerequisite structure')).toBeVisible()
  73  |   // Boolean structure renders AND separators for CSE 101's multi-group prereqs
  74  |   await expect(page.getByText('AND').first()).toBeVisible()
  75  |   // Offering history pivot: academic-year rows × quarter columns, with
  76  |   // scheduled future terms highlighted.
  77  |   await expect(page.getByText('Offering history')).toBeVisible()
  78  |   await expect(page.getByRole('columnheader', { name: 'Fall' })).toBeVisible()
  79  |   await expect(page.getByRole('columnheader', { name: 'Summer' })).toBeVisible()
  80  |   await expect(page.getByRole('cell', { name: /2026–27/ })).toBeVisible()
  81  |   await expect(page.getByText('scheduled').first()).toBeVisible()
  82  |   // React Flow canvas mounted
  83  |   await expect(page.locator('.react-flow').first()).toBeVisible()
  84  |   await expect(page.getByText(/Unlocks \(\d+\)/)).toBeVisible()
  85  | })
  86  | 
  87  | test('planning a course without prereqs flags a blocking issue', async ({ page }) => {
  88  |   // Add CSE 101 to the first quarter with nothing completed.
  89  |   await page.getByPlaceholder('Add course…').first().fill('CSE 101')
  90  |   await page.getByRole('button', { name: /CSE 101 Introduction to Data Structures/ }).click()
  91  | 
> 92  |   await expect(page.getByText(/needs CSE 12/).first()).toBeVisible()
      |                                                        ^ Error: expect(locator).toBeVisible() failed
  93  |   await expect(page.getByText(/blocking issue/)).toBeVisible()
  94  | 
  95  |   // Marking the prereq chain completed clears the errors for that group.
  96  |   for (const code of ['CSE 12', 'CSE 16', 'CSE 30']) {
  97  |     await page.getByPlaceholder('Add a course you already took…').fill(code)
  98  |     await page
  99  |       .getByRole('button', { name: new RegExp(`^${code} `) })
  100 |       .first()
  101 |       .click()
  102 |   }
  103 |   await expect(page.getByText(/needs CSE 12/)).toHaveCount(0)
  104 | })
  105 | 
  106 | test('GE panel tracks categories from completed courses', async ({ page }) => {
  107 |   await expect(page.getByText('General Education')).toBeVisible()
  108 |   // CSE 16 carries MF; adding it should light the MF category.
  109 |   await page.getByPlaceholder('Add a course you already took…').fill('CSE 16')
  110 |   await page.getByRole('button', { name: /CSE 16 / }).click()
  111 |   const mfTile = page.getByRole('button', { name: /MF ✓/ })
  112 |   await expect(mfTile).toBeVisible()
  113 |   // Expanding a category lists the courses that satisfy it.
  114 |   await mfTile.click()
  115 |   // Second match: the completed-courses chip is also a 'CSE 16' button.
  116 |   await expect(page.getByRole('button', { name: 'CSE 16', exact: true }).nth(1)).toBeVisible()
  117 | })
  118 | 
  119 | test('program: requirements in main fold, general info in sidebar', async ({ page }) => {
  120 |   await page.getByRole('combobox').selectOption({ label: 'Computer Science B.S. ✓' })
  121 |   // Main fold: collapsed program block; no aggregate met-counter anywhere
  122 |   // (the app mirrors the page, it does not audit degrees).
  123 |   const header = page.getByRole('button', { name: /Computer Science B\.S\./ })
  124 |   await expect(header).toBeVisible()
  125 |   await expect(page.getByText(/requirements met/)).toHaveCount(0)
  126 |   await expect(page.getByText('Lower-Division')).toHaveCount(0) // collapsed
  127 |   await header.click()
  128 |   await expect(page.getByText('Lower-Division').first()).toBeVisible()
  129 |   // Elective/range rules are gray manual-verification items.
  130 |   await expect(page.getByText('⚠ verify manually').first()).toBeVisible()
  131 |   await header.click()
  132 |   await expect(page.getByText('Lower-Division')).toHaveCount(0)
  133 | 
  134 |   // Sections collapse too, and the arrangement survives a reload
  135 |   // (persisted in localStorage, not reset per visit).
  136 |   await header.click()
  137 |   const sectionToggle = page.getByRole('button', { name: /Lower-Division/ }).first()
  138 |   const allOf = page.getByText(/All of \d+/)
  139 |   await expect(allOf.first()).toBeVisible() // sections expanded by default
  140 |   const expandedCount = await allOf.count()
  141 |   await sectionToggle.click()
  142 |   await expect(allOf).toHaveCount(expandedCount - 1)
  143 |   await page.reload()
  144 |   await expect(page.getByRole('button', { name: /Lower-Division/ }).first()).toBeVisible() // program stayed open
  145 |   await expect(allOf).toHaveCount(expandedCount - 1) // section stayed collapsed
  146 |   await page.getByRole('button', { name: /Lower-Division/ }).first().click()
  147 |   await expect(allOf).toHaveCount(expandedCount)
  148 | 
  149 |   // Sidebar: general info card with catalog link + info sections (all
  150 |   // collapsed by default).
  151 |   await expect(page.getByRole('link', { name: 'official page' })).toBeVisible()
  152 |   const infoTab = page.getByText(/Introduction|Learning Outcomes/).first()
  153 |   await expect(infoTab).toBeVisible()
  154 |   await expect(page.locator('details[open]')).toHaveCount(0)
  155 | 
  156 |   // Full-catalog verification (2026-07-26): every program is verified, so
  157 |   // no warning badges anywhere and every option carries the checkmark.
  158 |   await page.getByRole('combobox').selectOption({ label: 'History B.A. ✓' })
  159 |   await expect(page.getByText('unverified', { exact: true })).toHaveCount(0)
  160 | })
  161 | 
  162 | test('auth lifecycle: register imports plan, sign out, sign in, delete', async ({ page }) => {
  163 |   const email = `e2e-${Date.now()}@example.com`
  164 |   // Anonymous work first
  165 |   await page.getByPlaceholder('Add a course you already took…').fill('CSE 12')
  166 |   await page.getByRole('button', { name: /CSE 12 / }).click()
  167 | 
  168 |   await page.getByRole('button', { name: 'Sign in to save your plan' }).click()
  169 |   await page.getByPlaceholder('email').fill(email)
  170 |   await page.getByPlaceholder(/password/).fill('supersecret1')
  171 |   await page.getByRole('button', { name: 'Create account' }).click()
  172 |   await expect(page.getByText(email)).toBeVisible()
  173 | 
  174 |   await page.getByRole('button', { name: 'sign out' }).click()
  175 |   await expect(page.getByRole('button', { name: 'Sign in to save your plan' })).toBeVisible()
  176 | 
  177 |   await page.getByRole('button', { name: 'Sign in to save your plan' }).click()
  178 |   await page.getByText('Already have an account? Sign in').click()
  179 |   await page.getByPlaceholder('email').fill(email)
  180 |   await page.getByPlaceholder(/password/).fill('supersecret1')
  181 |   await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  182 |   await expect(page.getByText(email)).toBeVisible()
  183 |   // The imported plan came back from the server.
  184 |   await expect(page.getByRole('button', { name: 'CSE 12', exact: true })).toBeVisible()
  185 | 
  186 |   page.on('dialog', (d) => d.accept())
  187 |   await page.getByRole('button', { name: 'delete account' }).click()
  188 |   await expect(page.getByRole('button', { name: 'Sign in to save your plan' })).toBeVisible()
  189 | })
  190 | 
  191 | test('dormant courses are flagged red in search, planner, and drawer', async ({ page }) => {
  192 |   // CSE 129A: in the catalog but zero offerings in the data window.
```