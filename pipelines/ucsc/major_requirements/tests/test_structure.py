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


def test_film_minor_elective_filter():
    r = rule(
        "And three electives",
        prose=[
            "Students take three additional 5-credit, upper-division film and digital media "
            "critical studies courses numbered FILM 100-149, FILM 152 -169, FILM 180 -189, "
            "or from the FILM 194 series. Production studio courses ( FILM 150 , FILM 151 , "
            "and FILM 170A through FILM 179B ) may not be used to satisfy this requirement.",
        ],
    )
    node = structure.interpret_rule(r, {"calls": 0, "fallbacks": 0}, FailureBudget(total=1), model=None)
    assert node["op"] == "range" and node["n"] == 3
    f = node["filter"]
    assert {(x["subject"], x["lo"], x["hi"]) for x in f["include_ranges"]} == {
        ("FILM", 100, 149), ("FILM", 152, 169), ("FILM", 180, 189),
    }
    assert f["include_series"] == [{"subject": "FILM", "prefix": "194"}]
    assert {(x["lo"], x["hi"]) for x in f["exclude_ranges"]} == {(170, 179)}
    assert set(f["exclude_codes"]) == {"FILM150", "FILM151"}


def test_literature_style_single_range_with_exclusions():
    r = rule(
        "Electives",
        prose=[
            "Students take seven 5-credit upper-division electives chosen from LIT 109-189, "
            "excluding courses LIT 179A and LIT 179B.",
        ],
    )
    node = structure.interpret_rule(r, {"calls": 0, "fallbacks": 0}, FailureBudget(total=1), model=None)
    assert node["op"] == "range" and node["n"] == 7
    assert node["filter"]["include_ranges"] == [{"subject": "LIT", "lo": 109, "hi": 189}]
    assert set(node["filter"]["exclude_codes"]) == {"LIT179A", "LIT179B"}


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


def _build(rules_list):
    from ucsc.major_requirements.segment import RawSection, SegmentedProgram

    seg = SegmentedProgram(name="T", url="u")
    sec = RawSection(kind="course_requirements", title="X", concentration=None)
    sec.rules = rules_list
    seg.sections = [sec]
    out = structure.build_program(seg, {"slug": "t"}, FailureBudget(total=len(rules_list)), model=None)
    return out["requirements"]["sections"][0]["rules"]


def test_satisfied_by_two_of_is_n_of():
    # Biology B.A. DC: 'satisfied by completing two of the following ... courses:'
    r = rule(
        "Disciplinary Communication (DC) Requirement",
        prose=["The DC requirement in the biology bachelor of arts degree is satisfied by completing two of the following Ecology and Evolutionary Biology courses:"],
        courses=29,
    )
    assert classify(r) == ("n_of", 2)


def test_single_course_table_defaults_to_required():
    r = rule("Disciplinary Communication (DC) Requirement",
             prose=["The DC requirement in the mathematics B.S. is satisfied by"], courses=1)
    assert classify(r) == ("all_of", None)
    # ...but not when it's merely recommended — advisory content is a note.
    r2 = rule("Recommended Course for Transfer Students", courses=1,
              prose=["The following course is recommended prior to transfer."])
    assert classify(r2) == ("info", None)


def test_each_of_groups_children_become_one_of():
    # Film B.A.: 'One course from each of the following five groups' with
    # bare 'Group N:' children that would otherwise default to all_of.
    parent = rule("One course from each of the following five groups", hclass=3)
    kids = [rule(f"Group {i}:", courses=3, hclass=4) for i in range(1, 6)]
    out = _build([parent] + kids)
    assert out[0]["op"] == "info"
    assert all(r["op"] == "one_of" for r in out[1:])


def test_each_of_with_larger_total_pools_children():
    # GCH B.A.: 'Six upper-division electives...' + 'One course must be taken
    # from each of the four areas, plus two additional electives'.
    parent = rule(
        "Six upper-division electives from the four GCH context areas",
        prose=["One course must be taken from each of the four GCH context areas, plus two additional electives from any of the areas."],
        hclass=2,
    )
    kids = [rule(f"Area {i}", courses=4, hclass=3) for i in range(1, 5)]
    out = _build([parent] + kids)
    assert out[0]["op"] == "n_of" and out[0]["n"] == 6
    assert len(out[0]["pool"]) == 4  # union (fixture reuses CSE0..CSE3 codes)
    assert all(r["op"] == "one_of" for r in out[1:])


def test_counted_following_phrases_are_not_all_of():
    # Greedy 'the following courses' once swallowed these (Music/Theater/TIM).
    assert classify(rule("Studio Courses", prose=["Choose two of the following courses."], courses=35)) == ("n_of", 2)
    assert classify(rule(
        "Elective Ensembles/Performance Practice Courses",
        prose=["Take three quarters of any of the following courses."], courses=39,
    )) == ("n_of", 3)
    assert classify(rule(
        "Transfer Admission Screening Policy",
        prose=["Transfer students must have completed at least six of the following courses, or their articulated equivalents."],
        courses=15,
    )) == ("n_of", 6)
    # ...while genuine take-all headings still classify.
    assert classify(rule("Take the following courses:", courses=5)) == ("all_of", None)


def test_course_numbers_are_not_counts():
    # 'AM 115' must not read as n=115; count exceeding the table falls back
    # to requiring the listed courses.
    r = rule("Electives", prose=["Complete AM 115 or other approved courses from the list."], courses=2)
    got = classify(r)
    assert got is None or got[1] in (None, 1, 2)
    r2 = rule(
        "Core Curriculum",
        prose=["The core curriculum consists of four courses total: FILM 120, plus one course from three of the following four groups."],
        courses=1,
    )
    assert classify(r2) == ("all_of", None)


def test_pick_n_of_m_groups():
    # Film B.A. core: 'FILM 120, plus one course from three of the following
    # four groups (three total, each from a different group)'.
    parent = rule(
        "One course from three of the following four groups: (three total, each from a different group)",
        hclass=3,
    )
    kids = [rule(f"Group {i}:", courses=2 + i, hclass=4) for i in range(1, 5)]
    out = _build([parent] + kids)
    assert out[0]["op"] == "n_of_groups" and out[0]["n"] == 3
    assert len(out[0]["branches"]) == 4
    assert all(r["op"] == "list" for r in out[1:])


def test_category_count_with_enumerated_children_is_note():
    parent = rule("Two courses to satisfy the senior comprehensive requirement:", hclass=3)
    kid1 = rule("The following course:", courses=1, hclass=4)
    kid2 = rule("Plus one of the following courses:", courses=4, hclass=4)
    out = _build([parent, kid1, kid2])
    assert out[0]["op"] == "info"
    assert out[1]["op"] == "all_of" and out[2]["op"] == "one_of"


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
