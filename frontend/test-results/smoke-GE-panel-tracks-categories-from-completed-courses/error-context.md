# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> GE panel tracks categories from completed courses
- Location: e2e/smoke.spec.ts:104:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'CSE 16', exact: true })
Expected: visible
Error: strict mode violation: getByRole('button', { name: 'CSE 16', exact: true }) resolved to 2 elements:
    1) <button class="hover:underline">CSE 16</button> aka getByRole('button', { name: 'CSE' }).first()
    2) <button class="mr-1 rounded bg-white/80 px-1 py-0.5 text-[11px] font-medium hover:underline">CSE 16</button> aka getByRole('button', { name: 'CSE' }).nth(2)

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: 'CSE 16', exact: true })

```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - banner [ref=f1e4]:
    - generic [ref=f1e5]:
      - generic [ref=f1e6]:
        - heading "prereqs" [level=1] [ref=f1e7]
        - generic [ref=f1e8]: UC Santa Cruz
      - button "Sign in to save your plan" [ref=f1e9]
  - main [ref=f1e10]:
    - generic [ref=f1e11]:
      - textbox "Explore any course (e.g. CSE 101)…" [ref=f1e14]
      - generic [ref=f1e15]: plan looks valid
    - generic [ref=f1e16]:
      - generic [ref=f1e17]:
        - generic [ref=f1e18]:
          - generic [ref=f1e19]:
            - generic [ref=f1e20]:
              - heading "Completed courses" [level=3] [ref=f1e21]
              - generic [ref=f1e22]: 1 courses
            - textbox "Add a course you already took…" [ref=f1e25]
            - generic [ref=f1e27]:
              - button "CSE 16" [ref=f1e28]
              - button "remove CSE16" [ref=f1e29]: ×
          - button "+ Add previous year (2025–26)" [ref=f1e30]
          - generic [ref=f1e32]:
            - generic [ref=f1e33]:
              - heading "2026–27" [level=3] [ref=f1e34]
              - button "remove year" [ref=f1e35]
            - generic [ref=f1e36]:
              - generic [ref=f1e37]:
                - generic [ref=f1e38]: fall
                - list
                - textbox "Add course…" [ref=f1e41]
              - generic [ref=f1e42]:
                - generic [ref=f1e43]: winter
                - list
                - textbox "Add course…" [ref=f1e46]
              - generic [ref=f1e47]:
                - generic [ref=f1e48]: spring
                - list
                - textbox "Add course…" [ref=f1e51]
              - generic [ref=f1e52]:
                - generic [ref=f1e53]: summer
                - list
                - textbox "Add course…" [ref=f1e56]
          - button "+ Add academic year" [ref=f1e57]
        - generic [ref=f1e58]:
          - generic [ref=f1e59]:
            - heading "General Education" [level=3] [ref=f1e60]
            - generic [ref=f1e61]: 1/10
          - generic [ref=f1e62]:
            - button "CC ▸ Cross-Cultural Analysis" [ref=f1e64]:
              - text: CC
              - generic [ref=f1e65]: ▸
              - generic [ref=f1e66]: Cross-Cultural Analysis
            - button "ER ▸ Ethnicity and Race" [ref=f1e68]:
              - text: ER
              - generic [ref=f1e69]: ▸
              - generic [ref=f1e70]: Ethnicity and Race
            - button "IM ▸ Interpreting Arts and Media" [ref=f1e72]:
              - text: IM
              - generic [ref=f1e73]: ▸
              - generic [ref=f1e74]: Interpreting Arts and Media
            - generic [ref=f1e75]:
              - button "MF ✓ ▾ Mathematical and Formal Reasoning" [expanded] [active] [ref=f1e76]:
                - text: MF ✓
                - generic [ref=f1e77]: ▾
                - generic [ref=f1e78]: Mathematical and Formal Reasoning
              - button "CSE 16" [ref=f1e81]
            - button "SI ▸ Scientific Inquiry" [ref=f1e83]:
              - text: SI
              - generic [ref=f1e84]: ▸
              - generic [ref=f1e85]: Scientific Inquiry
            - button "SR ▸ Statistical Reasoning" [ref=f1e87]:
              - text: SR
              - generic [ref=f1e88]: ▸
              - generic [ref=f1e89]: Statistical Reasoning
            - button "TA ▸ Textual Analysis" [ref=f1e91]:
              - text: TA
              - generic [ref=f1e92]: ▸
              - generic [ref=f1e93]: Textual Analysis
            - button "PE ▸ Perspectives" [ref=f1e95]:
              - text: PE
              - generic [ref=f1e96]: ▸
              - generic [ref=f1e97]: Perspectives
            - button "PR ▸ Practice" [ref=f1e99]:
              - text: PR
              - generic [ref=f1e100]: ▸
              - generic [ref=f1e101]: Practice
            - button "C ▸ Composition" [ref=f1e103]:
              - text: C
              - generic [ref=f1e104]: ▸
              - generic [ref=f1e105]: Composition
      - generic [ref=f1e107]:
        - heading "Your programs" [level=3] [ref=f1e108]
        - combobox [ref=f1e109]:
          - option "Add a major or minor…" [selected]
          - option "Agroecology B.A. (unverified)"
          - option "Ancient Studies B.A. (unverified)"
          - option "Anthropology B.A. (unverified)"
          - option "Applied Linguistics and Multilingualism B.A. (unverified)"
          - option "Applied Mathematics B.S. (unverified)"
          - option "Applied Physics B.S. (unverified)"
          - 'option "Art & Design: Games + Playable Media B.A. (unverified)"'
          - option "Art B.A. (unverified)"
          - option "Biochemistry and Molecular Biology B.S. (unverified)"
          - option "Biology B.A. (unverified)"
          - option "Biology B.S. (unverified)"
          - option "Biomolecular Engineering and Bioinformatics B.S. (unverified)"
          - option "Biotechnology B.A. (unverified)"
          - option "Business Management Economics B.A. (unverified)"
          - option "Chemistry B.A. (unverified)"
          - option "Chemistry B.S. (unverified)"
          - option "Cognitive Science B.S. (unverified)"
          - option "Community Studies B.A. (unverified)"
          - option "Computer Engineering B.S. ✓"
          - option "Computer Science B.A. ✓"
          - option "Computer Science B.S. ✓"
          - 'option "Computer Science: Computer Game Design B.S. (unverified)"'
          - option "Creative Technologies B.A. (unverified)"
          - option "Critical Race and Ethnic Studies B.A. (unverified)"
          - option "Earth Sciences B.S. (unverified)"
          - option "Earth Sciences/Anthropology Combined Major B.A. (unverified)"
          - option "Ecology and Evolution B.S. (unverified)"
          - option "Economics B.A. ✓"
          - option "Economics/Mathematics Combined B.A. (unverified)"
          - option "Education, Democracy, and Justice B.A. (unverified)"
          - option "Electrical Engineering B.S. ✓"
          - option "Environmental Sciences B.S. (unverified)"
          - option "Environmental Studies B.A. (unverified)"
          - option "Environmental Studies/Biology Combined Major B.A. (unverified)"
          - option "Environmental Studies/Earth Sciences Combined Major B.A. (unverified)"
          - option "Environmental Studies/Economics Combined Major B.A. (unverified)"
          - option "Feminist Studies B.A. (unverified)"
          - option "Film and Digital Media B.A. (unverified)"
          - option "Global Economics B.A. (unverified)"
          - option "Global and Community Health B.A. (unverified)"
          - option "Global and Community Health B.S. (unverified)"
          - option "History B.A. (unverified)"
          - option "History of Art and Visual Culture B.A. (unverified)"
          - option "Jewish Studies B.A. (unverified)"
          - option "Language Studies B.A. (unverified)"
          - option "Latin American and Latino Studies B.A. (unverified)"
          - option "Latin American and Latino Studies/Education, Democracy, and Justice B.A. (unverified)"
          - option "Latin American and Latino Studies/Politics Combined B.A. (unverified)"
          - option "Latin American and Latino Studies/Sociology Combined B.A. (unverified)"
          - option "Legal Studies B.A. (unverified)"
          - option "Linguistics B.A. (unverified)"
          - option "Literature B.A. (unverified)"
          - option "Marine Biology B.S. (unverified)"
          - option "Mathematics B.A. (unverified)"
          - option "Mathematics B.S. ✓"
          - option "Mathematics Education B.A. (unverified)"
          - option "Mathematics Theory and Computation B.S. (unverified)"
          - option "Microbiology B.S. (unverified)"
          - option "Molecular, Cell, and Developmental Biology B.S. (unverified)"
          - option "Music B.A. (unverified)"
          - option "Music B.M. (unverified)"
          - option "Network and Digital Technology B.A. (unverified)"
          - option "Neuroscience B.S. (unverified)"
          - option "Philosophy B.A. (unverified)"
          - option "Physics (Astrophysics) B.S. (unverified)"
          - option "Physics B.S. (unverified)"
          - option "Plant Sciences B.S. (unverified)"
          - option "Politics B.A. (unverified)"
          - option "Psychology B.A. (unverified)"
          - option "Robotics Engineering B.S. (unverified)"
          - option "Science Education B.S. (unverified)"
          - option "Sociology B.A. (unverified)"
          - option "Spanish Studies B.A. (unverified)"
          - option "Technology and Information Management B.S. (unverified)"
          - option "Theater Arts B.A. (unverified)"
          - option "Ancient Studies Minor (unverified)"
          - option "Anthropology Minor (unverified)"
          - option "Applied Mathematics Minor (unverified)"
          - option "Assistive Technology Minor (unverified)"
          - option "Astrophysics Minor (unverified)"
          - option "Bioelectronics and Biophotonics Minor (unverified)"
          - option "Bioinformatics Minor (unverified)"
          - option "Biology Minor (unverified)"
          - option "Black Studies Minor (unverified)"
          - option "Chemistry Minor (unverified)"
          - option "Computer Engineering Minor (unverified)"
          - option "Computer Science Minor ✓"
          - option "Dance Minor (unverified)"
          - option "Digital Justice Studies Minor (formerly GISES) (unverified)"
          - option "Earth Sciences Minor (unverified)"
          - option "East Asian Studies Minor (unverified)"
          - option "Economics Minor (unverified)"
          - option "Education Minor General (unverified)"
          - option "Electrical Engineering Minor (unverified)"
          - option "Electronic Music Minor (unverified)"
          - option "Film and Digital Media Minor (unverified)"
          - option "History Minor (unverified)"
          - option "History of Art and Visual Culture Minor (unverified)"
          - option "History of Consciousness Minor (unverified)"
          - option "Italian Studies Minor (unverified)"
          - option "Jazz Spontaneous Composition and Improvisation Minor (unverified)"
          - option "Jewish Studies Minor (unverified)"
          - option "Language Studies Minor (unverified)"
          - option "Latin American and Latino Studies Minor (unverified)"
          - option "Legal Studies Minor (unverified)"
          - option "Linguistics Minor (unverified)"
          - option "Literature Minor (unverified)"
          - option "Mathematics Minor (unverified)"
          - option "Middle Eastern and North African Studies MENAS Minor (unverified)"
          - option "Philosophy Minor (unverified)"
          - option "Physics Minor (unverified)"
          - option "Politics Minor (unverified)"
          - option "Science Technology Engineering and Mathematics STEM Education Minor (unverified)"
          - option "Spanish Studies Minor (unverified)"
          - option "Statistics Minor (unverified)"
          - option "Sustainability Studies Minor (unverified)"
          - option "Technology and Information Management Minor (unverified)"
          - option "Theater Arts Minor (unverified)"
          - option "Western Music Minor (unverified)"
```

# Test source

```ts
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
  70  |   await expect(page.getByText('Prerequisite structure')).toBeVisible()
  71  |   // Boolean structure renders AND separators for CSE 101's multi-group prereqs
  72  |   await expect(page.getByText('AND').first()).toBeVisible()
  73  |   // Offering history pivot: academic-year rows × quarter columns, with
  74  |   // scheduled future terms highlighted.
  75  |   await expect(page.getByText('Offering history')).toBeVisible()
  76  |   await expect(page.getByRole('columnheader', { name: 'Fall' })).toBeVisible()
  77  |   await expect(page.getByRole('columnheader', { name: 'Summer' })).toBeVisible()
  78  |   await expect(page.getByRole('cell', { name: /2026–27/ })).toBeVisible()
  79  |   await expect(page.getByText('scheduled').first()).toBeVisible()
  80  |   // React Flow canvas mounted
  81  |   await expect(page.locator('.react-flow').first()).toBeVisible()
  82  |   await expect(page.getByText(/Unlocks \(\d+\)/)).toBeVisible()
  83  | })
  84  | 
  85  | test('planning a course without prereqs flags a blocking issue', async ({ page }) => {
  86  |   // Add CSE 101 to the first quarter with nothing completed.
  87  |   await page.getByPlaceholder('Add course…').first().fill('CSE 101')
  88  |   await page.getByRole('button', { name: /CSE 101 Introduction to Data Structures/ }).click()
  89  | 
  90  |   await expect(page.getByText(/needs CSE 12/).first()).toBeVisible()
  91  |   await expect(page.getByText(/blocking issue/)).toBeVisible()
  92  | 
  93  |   // Marking the prereq chain completed clears the errors for that group.
  94  |   for (const code of ['CSE 12', 'CSE 16', 'CSE 30']) {
  95  |     await page.getByPlaceholder('Add a course you already took…').fill(code)
  96  |     await page
  97  |       .getByRole('button', { name: new RegExp(`^${code} `) })
  98  |       .first()
  99  |       .click()
  100 |   }
  101 |   await expect(page.getByText(/needs CSE 12/)).toHaveCount(0)
  102 | })
  103 | 
  104 | test('GE panel tracks categories from completed courses', async ({ page }) => {
  105 |   await expect(page.getByText('General Education')).toBeVisible()
  106 |   // CSE 16 carries MF; adding it should light the MF category.
  107 |   await page.getByPlaceholder('Add a course you already took…').fill('CSE 16')
  108 |   await page.getByRole('button', { name: /CSE 16 / }).click()
  109 |   const mfTile = page.getByRole('button', { name: /MF ✓/ })
  110 |   await expect(mfTile).toBeVisible()
  111 |   // Expanding a category lists the courses that satisfy it.
  112 |   await mfTile.click()
> 113 |   await expect(page.getByRole('button', { name: 'CSE 16', exact: true })).toBeVisible()
      |                                                                           ^ Error: expect(locator).toBeVisible() failed
  114 | })
  115 | 
  116 | test('program: requirements in main fold, general info in sidebar', async ({ page }) => {
  117 |   await page.getByRole('combobox').selectOption({ label: 'Computer Science B.S. ✓' })
  118 |   // Main fold: requirement progress block with met counter, sections expanded.
  119 |   await expect(
  120 |     page.getByRole('heading', { name: 'Computer Science B.S.', exact: true }),
  121 |   ).toBeVisible()
  122 |   await expect(page.getByText(/\d+\/\d+ requirements met/)).toBeVisible()
  123 |   await expect(page.getByText('Lower-Division').first()).toBeVisible()
  124 |   // Sidebar: general info card with catalog link + info sections.
  125 |   await expect(page.getByRole('link', { name: 'official page' })).toBeVisible()
  126 |   await expect(page.getByText(/Introduction|Learning Outcomes/).first()).toBeVisible()
  127 | 
  128 |   // An unverified program shows the warning badge.
  129 |   await page.getByRole('combobox').selectOption({ label: 'History B.A. (unverified)' })
  130 |   await expect(page.getByText('unverified', { exact: true }).first()).toBeVisible()
  131 | })
  132 | 
  133 | test('auth lifecycle: register imports plan, sign out, sign in, delete', async ({ page }) => {
  134 |   const email = `e2e-${Date.now()}@example.com`
  135 |   // Anonymous work first
  136 |   await page.getByPlaceholder('Add a course you already took…').fill('CSE 12')
  137 |   await page.getByRole('button', { name: /CSE 12 / }).click()
  138 | 
  139 |   await page.getByRole('button', { name: 'Sign in to save your plan' }).click()
  140 |   await page.getByPlaceholder('email').fill(email)
  141 |   await page.getByPlaceholder(/password/).fill('supersecret1')
  142 |   await page.getByRole('button', { name: 'Create account' }).click()
  143 |   await expect(page.getByText(email)).toBeVisible()
  144 | 
  145 |   await page.getByRole('button', { name: 'sign out' }).click()
  146 |   await expect(page.getByRole('button', { name: 'Sign in to save your plan' })).toBeVisible()
  147 | 
  148 |   await page.getByRole('button', { name: 'Sign in to save your plan' }).click()
  149 |   await page.getByText('Already have an account? Sign in').click()
  150 |   await page.getByPlaceholder('email').fill(email)
  151 |   await page.getByPlaceholder(/password/).fill('supersecret1')
  152 |   await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  153 |   await expect(page.getByText(email)).toBeVisible()
  154 |   // The imported plan came back from the server.
  155 |   await expect(page.getByRole('button', { name: 'CSE 12', exact: true })).toBeVisible()
  156 | 
  157 |   page.on('dialog', (d) => d.accept())
  158 |   await page.getByRole('button', { name: 'delete account' }).click()
  159 |   await expect(page.getByRole('button', { name: 'Sign in to save your plan' })).toBeVisible()
  160 | })
  161 | 
```