from app.programs.info import info_sections

MD = """# X B.A.

<!-- slug: x | edition: 2026-27 | url: u -->

## Information and Policies
The department offers two degrees.

### Introduction {sc1}
Intro text.

#### Sub point {sc2}
- a bullet

### Honors {sc1}
Honors text.

## Requirements and Planners

### Course Requirements {sc1}
- CSE 12 — Systems (7)
"""


def test_info_sections_come_from_the_information_part_only():
    s = info_sections(MD)
    assert [x["title"] for x in s] == ["Overview", "Introduction", "Honors"]
    assert s[0]["paragraphs"] == ["The department offers two degrees."]
    assert s[1]["paragraphs"] == ["Intro text.", "**Sub point**", "- a bullet"]
    assert all("CSE 12" not in p for x in s for p in x["paragraphs"])


def test_minor_pages_without_information_part_have_no_panels():
    assert info_sections("# M\n\n## Course Requirements\n- CSE 12 — x (5)\n") == []
