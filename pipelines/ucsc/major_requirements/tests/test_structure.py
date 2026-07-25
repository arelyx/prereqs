from common.guards import FailureBudget
from ucsc.major_requirements.segment import RawRule
from ucsc.major_requirements import structure


def rule(heading, prose=None, courses=0, branches=0, hclass=3):
    return RawRule(
        heading=heading,
        heading_class=hclass,
        prose=prose or [],
        courses=[{"code": f"CSE{i}", "display_code": f"CSE {i}", "title": "", "credits": "5", "href": ""} for i in range(courses)],
        branches=[[{"code": f"AM{i}", "display_code": f"AM {i}", "title": "", "credits": "", "href": ""}] for i in range(branches)],
    )


def classify(r):
    return structure.classify_heading(r)


def test_heading_vocabulary():
    assert classify(rule("All of the following", courses=3)) == ("all_of", None)
    assert classify(rule("Plus one of the following", courses=2)) == ("one_of", None)
    assert classify(rule("Choose one of the following courses:", courses=4)) == ("one_of", None)
    assert classify(rule("Plus five economics electives:", courses=20)) == ("n_of", 5)
    assert classify(rule("Plus both of these courses:", courses=2)) == ("all_of", None)
    assert classify(rule("Plus one of the following options", branches=2)) == ("options", None)


def test_operator_in_prose_of_section_heading():
    r = rule(
        "Disciplinary Communication (DC) Requirement",
        prose=["The DC requirement is satisfied by completing one of the following courses."],
        courses=3,
    )
    assert classify(r) == ("one_of", None)


def test_category_count_only_from_heading():
    assert classify(rule("Plus two upper-division computer science courses")) == ("category_count", 2)
    # A number in prose without a course table must NOT become a category count.
    r = rule("Language Proficiency", prose=["Complete thirty units of coursework at UCSC."])
    assert classify(r) == ("info", None)


def test_pool_and_info():
    assert classify(rule("Finance Electives", courses=8)) == ("list", None)
    assert classify(rule("List of B.S. electives:", courses=25)) == ("list", None)
    assert classify(rule("Appeal Process", prose=["Appeals are reviewed by..."])) == ("info", None)


def test_pool_prose_numbers_are_not_counts():
    # CS BS elective pool: '...between 100 and 189, except for the DC courses...'
    # once produced n_of/100. Pool identity (heading) must outrank prose counts.
    r = rule(
        "List of B.S. electives:",
        prose=["Any 5-credit or more CSE course with a number between 100 and 189, except for the DC courses CSE 115A and CSE 185E."],
        courses=25,
    )
    assert classify(r) == ("list", None)


def test_dc_additional_course_phrasing():
    r = rule(
        "Disciplinary Communication (DC) Requirement",
        prose=["The DC requirement is satisfied by completing an additional course from the following options."],
        courses=3,
    )
    assert classify(r) == ("one_of", None)


def test_llm_count_must_be_stated():
    nums = structure.stated_numbers(rule("Plus five electives", prose=["At least three from list A."]))
    assert {5, 3} <= nums
    assert 7 not in nums


def _table_html(rows):
    trs = []
    for r in rows:
        if r.startswith("N:"):
            slug, label = r[2:].split("|")
            trs.append(
                f'<tr><td class="sc-coursenumber"><a class="sc-courselink" '
                f'href="/en/current/general-catalog/courses/narrative-courses/{slug}"> </a></td>'
                f'<td class="sc-coursetitle">{label}</td><td><p class="credits"></p></td></tr>'
            )
        else:
            code = r
            trs.append(
                f'<tr><td class="sc-coursenumber"><a class="sc-courselink" '
                f'href="/x/{code.lower().replace(" ", "-")}">{code}</a></td>'
                f'<td class="sc-coursetitle">T</td><td><p class="credits">5</p></td></tr>'
            )
    return "<table>" + "".join(trs) + "</table>"


def _parse_table(rows):
    from bs4 import BeautifulSoup
    from ucsc.major_requirements.segment import SegmentedProgram, _parse_course_table

    r = rule("Heading")
    r.courses, r.branches, r.branch_labels = [], [], []
    table = BeautifulSoup(_table_html(rows), "html.parser").find("table")
    _parse_course_table(table, r, SegmentedProgram(name="P", url="u"))
    return r


def test_narrative_state_machine_biology_screening():
    # BIOL 20A/20B/20C required, AND closes nothing open (no-op), then
    # either CHEM 3A+3B or CHEM 4A.
    r = _parse_table([
        "BIOL 20A", "BIOE 20B", "BIOE 20C",
        "N:and|AND",
        "N:either-these-courses|Either these courses", "CHEM 3A", "CHEM 3B",
        "N:or-this-course|or this course", "CHEM 4A",
    ])
    assert [c["code"] for c in r.courses] == ["BIOL20A", "BIOE20B", "BIOE20C"]
    assert [[c["code"] for c in b] for b in r.branches] == [["CHEM3A", "CHEM3B"], ["CHEM4A"]]


def test_narrative_or_after_required_row_moves_it_into_branch():
    # 'STAT 5 / or these courses STAT 7 + 7L' — the previous required row
    # becomes the first branch.
    r = _parse_table([
        "STAT 5",
        "N:or-these-courses|or these courses", "STAT 7", "STAT 7L",
    ])
    assert r.courses == []
    assert [[c["code"] for c in b] for b in r.branches] == [["STAT5"], ["STAT7", "STAT7L"]]


def test_narrative_pick_mode_each_row_own_branch():
    r = _parse_table([
        "N:one-of-these-courses|One of these courses", "STAT 5", "STAT 80",
        "N:or-these-courses|or these courses", "STAT 7", "STAT 7L",
    ])
    assert [[c["code"] for c in b] for b in r.branches] == [
        ["STAT5"], ["STAT80"], ["STAT7", "STAT7L"],
    ]


def test_narrative_and_returns_to_required():
    r = _parse_table([
        "N:either-this-course|Either this course", "CHEM 3BL",
        "N:or-this-course|or this course", "CHEM 4AL",
        "N:and|AND", "PHYS 6A",
    ])
    assert [c["code"] for c in r.courses] == ["PHYS6A"]
    assert [[c["code"] for c in b] for b in r.branches] == [["CHEM3BL"], ["CHEM4AL"]]


def test_section_choice_conversion():
    from ucsc.major_requirements.segment import RawSection, SegmentedProgram

    seg = SegmentedProgram(name="Test BS", url="u")
    sec = RawSection(kind="course_requirements", title="Comprehensive Requirement", concentration=None)
    parent = rule("Comprehensive Requirement", prose=["Satisfied by one of the following two options."], hclass=2)
    caps = rule("Capstone Courses", prose=["Choose one of the following courses:"], courses=5, hclass=3)
    thesis = rule("Senior Thesis", prose=["The following course is required."], courses=1, hclass=3)
    sec.rules = [parent, caps, thesis]
    seg.sections = [sec]

    out = structure.build_program(seg, {"slug": "test"}, FailureBudget(total=3), model=None)
    rules = out["requirements"]["sections"][0]["rules"]
    assert rules[0]["op"] == "section_choice"
    assert rules[1]["op"] == "one_of"
    assert "_hclass" not in rules[0]
