# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> course search opens drawer with prereqs, availability, graph
- Location: e2e/smoke.spec.ts:65:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  getByText('AND').first()
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('AND').first()
    13 × locator resolved to <option value="1432">Applied Linguistics and Multilingualism B.A. ✓</option>
       - unexpected value "hidden"

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
  - list
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
- heading "CSE 101Introduction to Data Structures and Algorithms" [level=2]
- paragraph:
  - text: 5 credits · upper-division · (Formerly Computer Science 101 Algorithms and Abstract Data Types.) ·
  - link "official catalog page ↗":
    - /url: https://catalog.ucsc.edu/en/current/general-catalog/courses/cse-computer-science-and-engineering/upper-division/cse-101
- button "✕ close"
- paragraph: Introduction to abstract data types and basics of algorithms. Linked lists, stacks, queues, hash tables, trees, heaps, and graphs will be covered. Students will also be taught how to derive big-Oh analysis of simple algorithms. All assignments will be in C/C++. (Formerly Computer Science 101 Algorithms and Abstract Data Types.)
- heading "Requirements (catalog text)" [level=3]
- paragraph: "Prerequisite(s): CSE 12 or BME 160 ; CSE 13E or ECE 13 or CSE 13S ; and CSE 16 ; and CSE 30 ; and MATH 11B or MATH 19B or MATH 20B or AM 11B or ECON 11B."
- heading "Offering history" [level=3]
- text: fall ×5 winter ×5 spring ×5 summer ×1
- table:
  - rowgroup:
    - row "Year fall winter spring summer":
      - columnheader "Year"
      - columnheader "fall"
      - columnheader "winter"
      - columnheader "spring"
      - columnheader "summer"
  - rowgroup:
    - row "2026–27 Ishtiyaque Ahmad Niloofar Montazeri Niloofar Montazeri ·":
      - cell "2026–27"
      - cell "Ishtiyaque Ahmad"
      - cell "Niloofar Montazeri"
      - cell "Niloofar Montazeri"
      - cell "·"
    - row "2025–26 Montazeri,N. Tantalo,P. Montazeri,N. Tantalo,P. Pang,A. Tantalo,P. ·":
      - cell "2025–26"
      - cell "Montazeri,N. Tantalo,P."
      - cell "Montazeri,N. Tantalo,P."
      - cell "Pang,A. Tantalo,P."
      - cell "·"
    - row "2024–25 Demertzis,I. Tantalo,P. Montazeri,N. Tantalo,P. Ahmad,I. Pang,A. ·":
      - cell "2024–25"
      - cell "Demertzis,I. Tantalo,P."
      - cell "Montazeri,N. Tantalo,P."
      - cell "Ahmad,I. Pang,A."
      - cell "·"
    - row "2023–24 Pang,A. Tantalo,P. Van Gelder,A. Tantalo,P. Davis,J.E. Liu,M. Montazeri,N. Montazeri,N.":
      - cell "2023–24"
      - cell "Pang,A. Tantalo,P. Van Gelder,A."
      - cell "Tantalo,P."
      - cell "Davis,J.E. Liu,M. Montazeri,N."
      - cell "Montazeri,N."
    - row "2022–23 Comandur,S. Demertzis,I. Tantalo,P. Tantalo,P. ·":
      - cell "2022–23"
      - cell "Comandur,S. Demertzis,I."
      - cell "Tantalo,P."
      - cell "Tantalo,P."
      - cell "·"
    - row "2021–22 Comandur,S. Pang,A. Tantalo,P. Tantalo,P. ·":
      - cell "2021–22"
      - cell "Comandur,S. Pang,A."
      - cell "Tantalo,P."
      - cell "Tantalo,P."
      - cell "·"
- paragraph: scheduled for the upcoming year (subject to change)
- heading "Prerequisite structure" [level=3]
- button "CSE 12"
- text: or
- button "BME 160"
- text: AND
- button "CSE 13E"
- text: or
- button "ECE 13"
- text: or
- button "CSE 13S"
- text: AND
- button "CSE 16"
- text: AND
- button "CSE 30"
- text: AND
- button "MATH 11B"
- text: or
- button "MATH 19B"
- text: or
- button "MATH 20B"
- text: or
- button "AM 11B"
- text: or
- button "ECON 11B"
- img:
  - button "Edge from CSE12 to CSE101"
  - button "Edge from BME160 to CSE101"
  - button "Edge from CSE13E to CSE101"
  - button "Edge from ECE13 to CSE101"
  - button "Edge from CSE13S to CSE101"
  - button "Edge from CSE16 to CSE101"
  - button "Edge from CSE30 to CSE101"
  - button "Edge from MATH11B to CSE101"
  - button "Edge from MATH19B to CSE101"
  - button "Edge from MATH20B to CSE101"
  - button "Edge from AM11B to CSE101"
  - button "Edge from ECON11B to CSE101"
  - button "Edge from CSE5J to CSE12"
  - button "Edge from CSE20 to CSE12"
  - button "Edge from CSE30 to CSE12"
  - button "Edge from BME160 to CSE12"
  - button "Edge from BIOL20A to BME160"
  - button "Edge from BIOL21A to BME160"
  - button "Edge from CSE12 to ECE13"
  - button "Edge from CSE12 to CSE13S"
  - button "Edge from BME160 to CSE13S"
  - button "Edge from MATH19A to CSE16"
  - button "Edge from MATH20A to CSE16"
  - button "Edge from MATH19B to CSE16"
  - button "Edge from MATH20B to CSE16"
  - button "Edge from MATH11B to CSE16"
  - button "Edge from AM11B to CSE16"
  - button "Edge from AM15B to CSE16"
  - button "Edge from ECON11B to CSE16"
  - button "Edge from CSE20 to CSE30"
  - button "Edge from BME160 to CSE30"
  - button "Edge from MATH3 to CSE30"
  - button "Edge from MATH11A to CSE30"
  - button "Edge from MATH19A to CSE30"
  - button "Edge from MATH20A to CSE30"
  - button "Edge from AM3 to CSE30"
  - button "Edge from AM11A to CSE30"
  - button "Edge from ECON11A to CSE30"
  - button "Edge from MATH11A to MATH11B"
  - button "Edge from MATH19A to MATH11B"
  - button "Edge from AM15A to MATH11B"
  - button "Edge from MATH11A to MATH19B"
  - button "Edge from MATH19A to MATH19B"
  - button "Edge from MATH20A to MATH19B"
  - button "Edge from MATH20A to MATH20B"
  - button "Edge from AM11A to AM11B"
  - button "Edge from ECON11A to AM11B"
  - button "Edge from MATH11A to AM11B"
  - button "Edge from MATH19A to AM11B"
  - button "Edge from MATH20A to AM11B"
  - button "Edge from CHEM1A to BIOL20A"
  - button "Edge from CHEM3A to BIOL20A"
  - button "Edge from CHEM4A to BIOL20A"
  - button "Edge from MATH3 to MATH19A"
  - button "Edge from MATH2 to MATH3"
  - button "Edge from MATH3 to MATH11A"
  - button "Edge from AM3 to MATH11A"
  - button "Edge from MATH2 to AM3"
  - button "Edge from MATH3 to AM11A"
  - button "Edge from AM3 to AM11A"
  - button "Edge from AM6 to AM11A"
  - button "Edge from CSE101 to CMPM123"
  - button "Edge from CSE101 to CMPM146"
  - button "Edge from CSE101 to CMPM148"
  - button "Edge from CSE101 to CSE101M"
  - button "Edge from CSE101 to CSE106"
  - button "Edge from CSE101 to CSE108"
  - button "Edge from CSE101 to CSE110A"
  - button "Edge from CSE101 to CSE111"
  - button "Edge from CSE101 to CSE112"
  - button "Edge from CSE101 to CSE113"
  - button "Edge from CSE101 to CSE114A"
  - button "Edge from CSE101 to CSE115A"
  - button "Edge from CSE101 to CSE117"
  - button "Edge from CSE101 to CSE118"
  - button "Edge from CSE101 to CSE119"
  - button "Edge from CSE101 to CSE130"
  - button "Edge from CSE101 to CSE140"
  - button "Edge from CSE101 to CSE142"
  - button "Edge from CSE101 to CSE143"
  - button "Edge from CSE101 to CSE144"
  - button "Edge from CSE101 to CSE146"
  - button "Edge from CSE101 to CSE156"
  - button "Edge from CSE101 to CSE156L"
  - button "Edge from CSE101 to CSE160"
  - button "Edge from CSE101 to CSE163"
  - button "Edge from CSE101 to CSE180"
  - button "Edge from CSE101 to CSE183"
  - button "Edge from CSE101 to CSE184"
  - button "Edge from CSE101 to CSE186"
  - button "Edge from CSE101 to CSE207"
  - button "Edge from CSE101 to FILM170A"
  - button "Edge from CSE101 to MATH103A"
  - button "Edge from CSE101 to MATH105A"
  - button "Edge from CSE101 to MATH106"
  - button "Edge from CSE101 to MATH107"
  - button "Edge from CSE101 to MATH110"
  - button "Edge from CSE101 to MATH111A"
  - button "Edge from CSE101 to MATH115"
  - button "Edge from CSE101 to MATH116"
  - button "Edge from CSE101 to MATH117"
  - button "Edge from CSE101 to MATH121A"
  - button "Edge from CSE101 to MATH128A"
  - button "Edge from CSE101 to MATH134"
  - button "Edge from CSE101 to MATH140"
  - button "Edge from CSE101 to MATH145"
  - button "Edge from CSE101 to MATH148"
  - button "Edge from CSE101 to MATH160"
  - button "Edge from CSE101 to MATH161"
  - button "Edge from CSE101 to MATH162"
  - button "Edge from CSE101 to MATH50"
- button "CSE 101 Introduction to Data Structures and Algorithms"
- button "CSE 12 Computer Systems and Assembly Language and Lab"
- button "BME 160 Research Programming in the Life Sciences"
- button "CSE13E (not in current catalog)"
- button "ECE 13 Computer Systems and C Programming"
- button "CSE 13S Computer Systems and C Programming"
- button "CSE 16 Applied Discrete Mathematics"
- 'button "CSE 30 Programming Abstractions: Python"'
- button "MATH 11B Calculus with Applications"
- button "MATH 19B Calculus for Science, Engineering, and Mathematics"
- button "MATH 20B Honors Calculus"
- button "AM 11B Mathematical Methods for Economists II"
- button "ECON11B (not in current catalog)"
- button "CSE 5J Introduction to Programming in Java"
- button "CSE 20 Beginning Programming in Python"
- button "BIOL 20A Cell and Molecular Biology"
- button "BIOL21A (not in current catalog)"
- button "MATH 19A Calculus for Science, Engineering, and Mathematics"
- button "MATH 20A Honors Calculus"
- button "AM15B (not in current catalog)"
- button "MATH 3 Precalculus"
- button "MATH 11A Calculus with Applications"
- button "AM 3 Precalculus for the Social Sciences"
- button "AM 11A Mathematical Methods for Economists I"
- button "ECON11A (not in current catalog)"
- button "AM15A (not in current catalog)"
- button "CHEM 1A General Chemistry"
- button "CHEM 3A General Chemistry"
- 'button "CHEM 4A Advanced General Chemistry: Molecular Structure and Reactivity"'
- button "MATH 2 College Algebra for Calculus"
- button "AM 6 Precalculus for Statistics"
- button "CMPM 123 Advanced Programming"
- button "CMPM 146 Game AI"
- button "CMPM 148 Interactive Storytelling"
- button "CSE 101M Mathematical Thinking for Computer Science"
- button "CSE 106 Applied Graph Theory and Algorithms"
- button "CSE 108 Algorithmic Foundations of Cryptography"
- button "CSE 110A Fundamentals of Compiler Design I"
- button "CSE 111 Advanced Programming"
- button "CSE 112 Comparative Programming Languages"
- button "CSE 113 Parallel and Concurrent Programming"
- button "CSE 114A Foundations of Programming Languages"
- button "CSE 115A Introduction to Software Engineering"
- button "CSE 117 Open Source Programming"
- button "CSE 118 Mobile Applications"
- button "CSE 119 Software for Society"
- button "CSE 130 Principles of Computer Systems Design"
- button "CSE 140 Artificial Intelligence"
- button "CSE 142 Machine Learning"
- button "CSE 143 Introduction to Natural Language Processing"
- 'button "CSE 144 Applied Machine Learning: Deep Learning"'
- button "CSE 146 Ethics and Algorithms"
- button "CSE 156 Network Programming"
- button "CSE 156L Network Programming Laboratory"
- button "CSE 160 Introduction to Computer Graphics"
- button "CSE 163 Data Programming for Visualization"
- button "CSE 180 Database Systems I"
- button "CSE 183 Web Applications"
- button "CSE 184 Data Wrangling and Web Scraping"
- button "CSE 186 Full Stack Web Development I"
- button "CSE 207 Graph Algorithms"
- button "FILM 170A Fundamentals of Digital Media Production"
- button "MATH 103A Complex Analysis"
- button "MATH 105A Real Analysis"
- button "MATH 106 Systems of Ordinary Differential Equations"
- button "MATH 107 Partial Differential Equations"
- button "MATH 110 Introduction to Number Theory"
- button "MATH 111A Algebra"
- button "MATH 115 Graph Theory"
- button "MATH 116 Combinatorics"
- button "MATH 117 Advanced Linear Algebra"
- button "MATH 121A Differential Geometry"
- 'button "MATH 128A Classical Geometry: Euclidean and Non-Euclidean"'
- button "MATH 134 Cryptography"
- button "MATH 140 Industrial Mathematics"
- button "MATH 145 Introductory Chaos Theory"
- button "MATH 148 Numerical Analysis"
- button "MATH 160 Mathematical Logic"
- button "MATH 161 Introduction to Set Theory"
- button "MATH 162 Introduction to Computably Enumerable Functions and Sets and their Degrees"
- button "MATH 50 Preparation for Proof"
- img
- button "zoom in":
  - img
- button "zoom out" [disabled]:
  - img
- button "fit view":
  - img
- paragraph: Arrows point from prerequisite to unlocked course. Edge colors group OR-alternatives; green-bordered nodes are what this course unlocks. Red = referenced course not in the current catalog.
- heading "Unlocks (50)" [level=3]
- button "CMPM 123"
- button "CMPM 146"
- button "CMPM 148"
- button "CSE 101M"
- button "CSE 106"
- button "CSE 108"
- button "CSE 110A"
- button "CSE 111"
- button "CSE 112"
- button "CSE 113"
- button "CSE 114A"
- button "CSE 115A"
- button "CSE 117"
- button "CSE 118"
- button "CSE 119"
- button "CSE 130"
- button "CSE 140"
- button "CSE 142"
- button "CSE 143"
- button "CSE 144"
- button "CSE 146"
- button "CSE 156"
- button "CSE 156L"
- button "CSE 160"
- button "CSE 163"
- button "CSE 180"
- button "CSE 183"
- button "CSE 184"
- button "CSE 186"
- button "CSE 207"
- button "FILM 170A"
- button "MATH 103A"
- button "MATH 105A"
- button "MATH 106"
- button "MATH 107"
- button "MATH 110"
- button "MATH 111A"
- button "MATH 115"
- button "MATH 116"
- button "MATH 117"
- button "MATH 121A"
- button "MATH 128A"
- button "MATH 134"
- button "MATH 140"
- button "MATH 145"
- button "MATH 148"
- button "MATH 160"
- button "MATH 161"
- button "MATH 162"
- button "MATH 50"
- button "Mark completed"
- button "+ Fall 2026"
- button "+ Winter 2027"
- button "+ Spring 2027"
- button "+ Summer 2027"
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
> 74  |   await expect(page.getByText('AND').first()).toBeVisible()
      |                                               ^ Error: expect(locator).toBeVisible() failed
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
  92  |   await expect(page.getByText(/needs CSE 12/).first()).toBeVisible()
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
```