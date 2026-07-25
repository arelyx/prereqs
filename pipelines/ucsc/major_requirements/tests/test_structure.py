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
