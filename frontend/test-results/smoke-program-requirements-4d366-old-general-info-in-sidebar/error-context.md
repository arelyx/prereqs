# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> program: requirements in main fold, general info in sidebar
- Location: e2e/smoke.spec.ts:117:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.selectOption: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('combobox')
    - locator resolved to <select class="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">…</select>
  - attempting select option action
    2 × waiting for element to be visible and enabled
      - did not find some options
    - retrying select option action
    - waiting 20ms
    2 × waiting for element to be visible and enabled
      - did not find some options
    - retrying select option action
      - waiting 100ms
    60 × waiting for element to be visible and enabled
       - did not find some options
     - retrying select option action
       - waiting 500ms

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
              - generic [ref=f1e22]: 0 courses
            - textbox "Add a course you already took…" [ref=f1e25]
            - paragraph [ref=f1e27]: Nothing yet — add what you've taken so prerequisite checks are accurate.
          - button "+ Add previous year (2025–26)" [ref=f1e28]
          - generic [ref=f1e30]:
            - generic [ref=f1e31]:
              - heading "2026–27" [level=3] [ref=f1e32]
              - button "remove year" [ref=f1e33]
            - generic [ref=f1e34]:
              - generic [ref=f1e35]:
                - generic [ref=f1e36]: fall
                - list
                - textbox "Add course…" [ref=f1e39]
              - generic [ref=f1e40]:
                - generic [ref=f1e41]: winter
                - list
                - textbox "Add course…" [ref=f1e44]
              - generic [ref=f1e45]:
                - generic [ref=f1e46]: spring
                - list
                - textbox "Add course…" [ref=f1e49]
              - generic [ref=f1e50]:
                - generic [ref=f1e51]: summer
                - list
                - textbox "Add course…" [ref=f1e54]
          - button "+ Add academic year" [ref=f1e55]
        - generic [ref=f1e56]:
          - generic [ref=f1e57]:
            - heading "General Education" [level=3] [ref=f1e58]
            - generic [ref=f1e59]: 0/10
          - generic [ref=f1e60]:
            - button "CC ▸ Cross-Cultural Analysis" [ref=f1e62]:
              - text: CC
              - generic [ref=f1e63]: ▸
              - generic [ref=f1e64]: Cross-Cultural Analysis
            - button "ER ▸ Ethnicity and Race" [ref=f1e66]:
              - text: ER
              - generic [ref=f1e67]: ▸
              - generic [ref=f1e68]: Ethnicity and Race
            - button "IM ▸ Interpreting Arts and Media" [ref=f1e70]:
              - text: IM
              - generic [ref=f1e71]: ▸
              - generic [ref=f1e72]: Interpreting Arts and Media
            - button "MF ▸ Mathematical and Formal Reasoning" [ref=f1e74]:
              - text: MF
              - generic [ref=f1e75]: ▸
              - generic [ref=f1e76]: Mathematical and Formal Reasoning
            - button "SI ▸ Scientific Inquiry" [ref=f1e78]:
              - text: SI
              - generic [ref=f1e79]: ▸
              - generic [ref=f1e80]: Scientific Inquiry
            - button "SR ▸ Statistical Reasoning" [ref=f1e82]:
              - text: SR
              - generic [ref=f1e83]: ▸
              - generic [ref=f1e84]: Statistical Reasoning
            - button "TA ▸ Textual Analysis" [ref=f1e86]:
              - text: TA
              - generic [ref=f1e87]: ▸
              - generic [ref=f1e88]: Textual Analysis
            - button "PE ▸ Perspectives" [ref=f1e90]:
              - text: PE
              - generic [ref=f1e91]: ▸
              - generic [ref=f1e92]: Perspectives
            - button "PR ▸ Practice" [ref=f1e94]:
              - text: PR
              - generic [ref=f1e95]: ▸
              - generic [ref=f1e96]: Practice
            - button "C ▸ Composition" [ref=f1e98]:
              - text: C
              - generic [ref=f1e99]: ▸
              - generic [ref=f1e100]: Composition
      - generic [ref=f1e102]:
        - heading "Your programs" [level=3] [ref=f1e103]
        - combobox [ref=f1e104]:
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
          - option "Computer Engineering B.S. (unverified)"
          - option "Computer Science B.A. (unverified)"
          - option "Computer Science B.S. (unverified)"
          - 'option "Computer Science: Computer Game Design B.S. (unverified)"'
          - option "Creative Technologies B.A. (unverified)"
          - option "Critical Race and Ethnic Studies B.A. (unverified)"
          - option "Earth Sciences B.S. (unverified)"
          - option "Earth Sciences/Anthropology Combined Major B.A. (unverified)"
          - option "Ecology and Evolution B.S. (unverified)"
          - option "Economics B.A. (unverified)"
          - option "Economics/Mathematics Combined B.A. (unverified)"
          - option "Education, Democracy, and Justice B.A. (unverified)"
          - option "Electrical Engineering B.S. (unverified)"
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
          - option "Mathematics B.S. (unverified)"
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
          - option "Computer Science Minor (unverified)"
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
  113 |   // Second match: the completed-courses chip is also a 'CSE 16' button.
  114 |   await expect(page.getByRole('button', { name: 'CSE 16', exact: true }).nth(1)).toBeVisible()
  115 | })
  116 | 
  117 | test('program: requirements in main fold, general info in sidebar', async ({ page }) => {
> 118 |   await page.getByRole('combobox').selectOption({ label: 'Computer Science B.S. ✓' })
      |                                    ^ Error: locator.selectOption: Test timeout of 30000ms exceeded.
  119 |   // Main fold: requirement progress block with met counter, sections expanded.
  120 |   await expect(
  121 |     page.getByRole('heading', { name: 'Computer Science B.S.', exact: true }),
  122 |   ).toBeVisible()
  123 |   await expect(page.getByText(/\d+\/\d+ requirements met/)).toBeVisible()
  124 |   await expect(page.getByText('Lower-Division').first()).toBeVisible()
  125 |   // Sidebar: general info card with catalog link + info sections.
  126 |   await expect(page.getByRole('link', { name: 'official page' })).toBeVisible()
  127 |   await expect(page.getByText(/Introduction|Learning Outcomes/).first()).toBeVisible()
  128 | 
  129 |   // An unverified program shows the warning badge.
  130 |   await page.getByRole('combobox').selectOption({ label: 'History B.A. (unverified)' })
  131 |   await expect(page.getByText('unverified', { exact: true }).first()).toBeVisible()
  132 | })
  133 | 
  134 | test('auth lifecycle: register imports plan, sign out, sign in, delete', async ({ page }) => {
  135 |   const email = `e2e-${Date.now()}@example.com`
  136 |   // Anonymous work first
  137 |   await page.getByPlaceholder('Add a course you already took…').fill('CSE 12')
  138 |   await page.getByRole('button', { name: /CSE 12 / }).click()
  139 | 
  140 |   await page.getByRole('button', { name: 'Sign in to save your plan' }).click()
  141 |   await page.getByPlaceholder('email').fill(email)
  142 |   await page.getByPlaceholder(/password/).fill('supersecret1')
  143 |   await page.getByRole('button', { name: 'Create account' }).click()
  144 |   await expect(page.getByText(email)).toBeVisible()
  145 | 
  146 |   await page.getByRole('button', { name: 'sign out' }).click()
  147 |   await expect(page.getByRole('button', { name: 'Sign in to save your plan' })).toBeVisible()
  148 | 
  149 |   await page.getByRole('button', { name: 'Sign in to save your plan' }).click()
  150 |   await page.getByText('Already have an account? Sign in').click()
  151 |   await page.getByPlaceholder('email').fill(email)
  152 |   await page.getByPlaceholder(/password/).fill('supersecret1')
  153 |   await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  154 |   await expect(page.getByText(email)).toBeVisible()
  155 |   // The imported plan came back from the server.
  156 |   await expect(page.getByRole('button', { name: 'CSE 12', exact: true })).toBeVisible()
  157 | 
  158 |   page.on('dialog', (d) => d.accept())
  159 |   await page.getByRole('button', { name: 'delete account' }).click()
  160 |   await expect(page.getByRole('button', { name: 'Sign in to save your plan' })).toBeVisible()
  161 | })
  162 | 
```