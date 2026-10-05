"""Deterministic prereq parser: the qwen prompt's few-shot examples plus
tricky real catalog texts (2026-27) found while measuring the corpus."""

from __future__ import annotations

import json

import pytest

from common.guards import GuardViolation
from ucsc.catalog_courses import prereq_overrides, prereq_parse
from ucsc.catalog_courses.prereq_parse import AMBIGUOUS, CERTAIN, parse
from ucsc.catalog_courses.structure import structure_courses


def cnf(groups):
    """Order-insensitive CNF comparison key."""
    return None if groups is None else sorted(sorted(g) for g in groups)


# --------------------------------------------------------------------------
# Few-shot examples from the retired qwen3:4b prompt (prompts.py, prereq_v1)
# --------------------------------------------------------------------------

FEW_SHOT = [
    ("Requirements Prerequisite(s): CSE 12 and CSE 101 .", [["CSE12"], ["CSE101"]]),
    (
        "Requirements Prerequisite(s): CSE 5J , or CSE 20 , or CSE 30 , or BME 160 , or equivalent.",
        [["CSE5J", "CSE20", "CSE30", "BME160"]],
    ),
    (
        "Requirements Prerequisite(s): satisfaction of the Entry Level Writing requirements and CSE 101 and CSE 130 .",
        [["CSE101"], ["CSE130"]],
    ),
    (
        "Requirements Enrollment is restricted to graduate students or previous enrollment in CHEM 151A , CHEM 151L , and CHEM 146B .",
        [["CHEM151A"], ["CHEM151L"], ["CHEM146B"]],
    ),
    (
        "Requirements Prerequisite(s): MATH 3 or MATH 11A ; or AM 3 or AM 6 ; or AM 11B or ECON 11A; or score on math placement exam of 300 or higher.",
        [["MATH3", "MATH11A", "AM3", "AM6", "AM11B", "ECON11A"]],
    ),
    ("Requirements Prerequisite(s): CSE 150 . Concurrent enrollment in CSE 151L is required.", [["CSE150"]]),
    (
        "Requirements Prerequisite(s): CSE 12 or BME 160 ; CSE 13E or ECE 13 or CSE 13S ; and CSE 16 ; and CSE 30 ; and MATH 11B or MATH 19B or MATH 20B or AM 11B or ECON 11B.",
        [["CSE12", "BME160"], ["CSE13E", "ECE13", "CSE13S"], ["CSE16"], ["CSE30"], ["MATH11B", "MATH19B", "MATH20B", "AM11B", "ECON11B"]],
    ),
    # Deliberate deviation: the prompt flattened "CSE 30, or CSE 15 and CSE 15L"
    # to [[CSE30, CSE15], [CSE15L]], which wrongly requires CSE 15L of a
    # student with CSE 30. Proper distribution keeps CSE 30 sufficient.
    (
        "Requirements Prerequisite(s): CSE 16 and CSE 12 ; and CSE 30 , or CSE 15 and CSE 15L.",
        [["CSE16"], ["CSE12"], ["CSE30", "CSE15"], ["CSE30", "CSE15L"]],
    ),
    (
        "Requirements Prerequisite(s): CSE 12 ; previous or concurrent enrollment in CSE 100L is required.",
        [["CSE12"], ["CSE100L"]],
    ),
    (
        "Requirements Prerequisite(s): previous or concurrent enrollment in ENVS 100 and ENVS 100L , or by permission of instructor.",
        [["ENVS100"], ["ENVS100L"]],
    ),
    (
        "Requirements Prerequisite(s): CSE 201 or equivalent or consent of instructor. Enrollment is restricted to graduate students.",
        [["CSE201"]],
    ),
    ("Requirements Prerequisite(s): CHIN 2 , placement by assessment, or instructor permission.", [["CHIN2"]]),
    ("Requirements Prerequisite(s): Math 117.", [["MATH117"]]),
    # Same deviation as above, plus "CSE 16 recommended." is excluded.
    (
        "Requirements Prerequisite(s): CSE 12 ; and CSE 13E, or CSE 13S , or ECE 13 , or CSE 15 and CSE 15L. CSE 16 recommended.",
        [["CSE12"], ["CSE13E", "CSE13S", "ECE13", "CSE15"], ["CSE13E", "CSE13S", "ECE13", "CSE15L"]],
    ),
    ("Requirements Antirequisite: Students cannot enroll after receiving a C or better in CSE 30.", None),
]


@pytest.mark.parametrize("text,expected", FEW_SHOT)
def test_prompt_few_shot_examples(text, expected):
    r = parse(text)
    assert r.confidence == CERTAIN, r.reason
    assert cnf(r.groups) == cnf(expected)


def test_few_shot_and_before_or_is_left_to_a_human():
    # Prompt example 7 read "A and B or C" as A AND (B OR C). The catalog
    # also writes "BIOC 100A and 100B or BIOL 100" meaning (A AND B) OR C, so
    # the parser flags the pattern; the CSE 160 override carries the prompt's
    # reading.
    text = "Prerequisite(s): CSE 101 and MATH 21 or AM 10 ."
    r = parse(text)
    assert r.confidence == AMBIGUOUS
    ov = prereq_overrides.load()
    res = prereq_overrides.resolve("CSE160", text, r, ov)
    assert res.source == "override"
    assert cnf(res.groups) == cnf([["CSE101"], ["MATH21", "AM10"]])


def test_concurrency_fields_for_few_shot():
    r = parse("Prerequisite(s): CSE 12 ; previous or concurrent enrollment in CSE 100L is required.")
    assert r.concurrent_ok == ["CSE100L"]
    r = parse("Prerequisite(s): CSE 150 . Concurrent enrollment in CSE 151L is required.")
    assert r.coreqs == [["CSE151L"]] and r.concurrent_ok == []


# --------------------------------------------------------------------------
# Real catalog cases
# --------------------------------------------------------------------------

CERTAIN_CASES = [
    # subject carry-over
    (
        "Prereq(s): ELWR; and EART 5 , 10 or 20; and MATH 11A , 19A or 20A; and CHEM 1A or CHEM 3B or CHEM 4B .",
        [["EART5", "EART10", "EART20"], ["MATH11A", "MATH19A", "MATH20A"], ["CHEM1A", "CHEM3B", "CHEM4B"]],
    ),
    ("Prerequisite(s): MATH 11B or 16B or 19B or 20B or AM 15B.", [["MATH11B", "MATH16B", "MATH19B", "MATH20B", "AM15B"]]),
    ("Prerequisite(s): SOCY 200A and 200B.", [["SOCY200A"], ["SOCY200B"]]),
    ("Prerequisite(s): ECON 204C , 205C, and 211C, or by consent of instructor.", [["ECON204C"], ["ECON205C"], ["ECON211C"]]),
    # scores never carry a subject
    ("Prerequisite(s): WRIT 25 , AWPE-MLS score of 4 or 5, or course selection via Directed Self-Placement.", [["WRIT25"]]),
    # "X and XL" binds as a unit before or-precedence
    (
        "Prerequisite(s): CSE 15 and CSE 15L or CSE 30 or CSE 13S ; and AM 10 or MATH 21 .",
        [["CSE15", "CSE30", "CSE13S"], ["CSE15L", "CSE30", "CSE13S"], ["AM10", "MATH21"]],
    ),
    # slash lab pair, "/L" shorthand, cross-listing
    (
        "Prereq(s): PHYS 6A /6L or PHYS 5A /5L.",
        [["PHYS6A", "PHYS5A"], ["PHYS6A", "PHYS5L"], ["PHYS6L", "PHYS5A"], ["PHYS6L", "PHYS5L"]],
    ),
    ("Prerequisite(s): STAT 7 /L or ECON 113 .", [["STAT7", "ECON113"], ["STAT7L", "ECON113"]]),
    ("Prerequisites: GCH 1 or SOCY 1 or CRES/SOCY 12.", [["GCH1", "SOCY1", "CRES12", "SOCY12"]]),
    # either / brackets / one-of
    (
        "Prerequisite(s): CHEM 3C , or CHEM 4B , or CHEM 1C and either CHEM 1B, CHEM 3A, or CHEM 4A",
        [["CHEM3C", "CHEM4B", "CHEM1C"], ["CHEM3C", "CHEM4B", "CHEM1B", "CHEM3A", "CHEM4A"]],
    ),
    (
        "Prerequisite(s): Either [ BIOL 20A , BIOE 20B , and BIOE 20C ], or ENVS 100 ; and satisfaction of the Entry Level Writing and Composition requirements. BIOE 107 is recommended.",
        [["BIOL20A", "ENVS100"], ["BIOE20B", "ENVS100"], ["BIOE20C", "ENVS100"]],
    ),
    (
        "Prerequisite(s): CSE 13S , and one of the following: CSE 115A , CSE 20 , CSE 140 , CSE 143 , and CSE 144 .",
        [["CSE13S"], ["CSE115A", "CSE20", "CSE140", "CSE143", "CSE144"]],
    ),
    (
        "Prerequisite(s): MATH 21 or AM 10 and either MATH 100 or CSE 101 .",
        [["MATH21", "AM10"], ["MATH100", "CSE101"]],
    ),
    (
        "Prerequisite(s): PHYS 102 or ECE 102 ; PHYS 133 , or ECE 130L and ( CSE 107 or STAT 131 ); or by permission of instructor.",
        [["PHYS102", "ECE102"], ["PHYS133", "ECE130L"], ["PHYS133", "CSE107", "STAT131"]],
    ),
    # k-of-n is exact CNF: every (n-k+1)-subset needs one member
    (
        "Prerequisite(s): two courses from ART 10D , ART 10E , ART 10F .",
        [["ART10D", "ART10E"], ["ART10D", "ART10F"], ["ART10E", "ART10F"]],
    ),
    # comma lists
    ("Prerequisite(s): MATH 22 or MATH 23A , PHYS 5B or PHYS 6B , and PHYS 102 .", [["MATH22", "MATH23A"], ["PHYS5B", "PHYS6B"], ["PHYS102"]]),
    ("Prerequisite(s): BIOE 107 , BIOE 109 , or BIOE 140 .", [["BIOE107", "BIOE109", "BIOE140"]]),
    ("Prerequisite(s): BIOL 126 , BIOL 129L .", [["BIOL126"], ["BIOL129L"]]),
    ("Prerequisite(s): OCEA 80A , BIOE 20C , or permission of instructor.", [["OCEA80A", "BIOE20C"]]),
    (
        "Prerequisite(s): BIOL 100 and BIOL 101 , or BIOC 100A and BIOC 100B ; and BIOL 105 .",
        [["BIOL100", "BIOC100A"], ["BIOL100", "BIOC100B"], ["BIOL101", "BIOC100A"], ["BIOL101", "BIOC100B"], ["BIOL105"]],
    ),
    # "; or" run is one OR group, with a pruned "; or by consent" alternative
    ("Prerequisite(s): CHIN 103 or CHIN 105 ; or CHIN 107; or by consent of instructor.", [["CHIN103", "CHIN105", "CHIN107"]]),
    ("Prerequisite(s): STAT 203 ; or STAT 131 and STAT 132 .", [["STAT203", "STAT131"], ["STAT203", "STAT132"]]),
    # recommended / e.g. exclusion
    ("Prerequisite(s): BIOL 20A , BIOE 20B , and BIOE 20C ; BIOE 107 or BIOE 140 recommended.", [["BIOL20A"], ["BIOE20B"], ["BIOE20C"]]),
    ("Prerequisite(s): MATH 204 , MATH 205 , and MATH 206 recommended as preparation.", None),
    ("Prerequisites: MATH 100 . Experience in coding (e.g. MATH 152 ) is recommended.", [["MATH100"]]),
    (
        "Prerequisite(s): OCEA 200 , or a graduate geophysical fluid dynamics course or equivalent (e.g. EART 272 /OCEA 272, AM 217 ), or by instructor consent.",
        [["OCEA200"]],
    ),
    ("Prerequisite(s): AM 100 , AM 114 , AM 147 , or equivalent courses are expected but not required.", None),
    # antirequisites, inline and as sentences
    (
        "Prerequisite(s): BIOL 105 , BIOL 125 and BIOL 128 ; students cannot enroll in BIOL 129B after receiving credit with a 'C' or better in BIOL 129A .",
        [["BIOL105"], ["BIOL125"], ["BIOL128"]],
    ),
    ("Students cannot enroll in MATH 50 if they have previously completed MATH 100 , CSE 16 , or CSE 101 with a grade of B- or better.", None),
    # "X or higher" keeps X
    ("Prerequisite(s): previous or concurrent enrollment in MATH 2 or higher, or a math placement (MP) score of 200 or higher.", [["MATH2"]]),
    # graduate course, undergraduate path
    (
        "Enrollment is restricted to graduate students; undergraduate students may enroll in this course if they have completed CSE 101M or CSE 106 and have the consent of the instructor.",
        [["CSE101M", "CSE106"]],
    ),
    ("Enrollment is restricted to graduate students. Undergraduates may enroll with prerequisite(s): BME 160 or CSE 20 .", [["BME160", "CSE20"]]),
    # an unlabeled continuation sentence after a label with no codes
    (
        "Prerequisite(s): satisfaction of the Entry Level Writing and Composition requirements. CSE 20 or CSE 30 ; and AM 114 ; or by instructor permission.",
        [["CSE20", "CSE30"], ["AM114"]],
    ),
    # "courses" as filler, not a quantifier
    ("Prerequisite(s): courses BIOE 20B , BIOL 20A , and BIOL 110 .", [["BIOE20B"], ["BIOL20A"], ["BIOL110"]]),
]


@pytest.mark.parametrize("text,expected", CERTAIN_CASES)
def test_real_certain_cases(text, expected):
    r = parse(text)
    assert r.confidence == CERTAIN, r.reason
    assert cnf(r.groups) == cnf(expected)


AMBIGUOUS_CASES = [
    # "; or" after "; and" segments: replaces the last group or everything?
    "Prerequisite(s): AM 10 or MATH 21 ; and AM 20 or MATH 24 ; and AM 30 or MATH 23A ; or PHYS 116A .",
    # and/or without punctuation (both precedences occur in the catalog)
    "Prerequisites: BME 105 or BIOL 105 ; and BIOC 100A and 100B or BIOL 100 .",
    "Prerequisite(s): PHYS 116A or MATH 21 and MATH 24 ; and PHYS 116C .",
    "Prerequisite(s): PSYC 10 or 20 and 100.",
    # mixed comma connectors
    "Prerequisite(s): PHYS 5C or PHYS 15C , and PHYS 5N , or PHYS 6C and PHYS 6N .",
    "Prerequisite(s): ECON 211A , ECON 211B and ECON 211C , or ECON 216 and ECON 217 .",
    # unknown subject (catalog typo) and subject-less references
    "Prerequisite(s): IITAL 6, placement by assessment, or instructor permission.",
    "Prerequisite(s): ENVS 25 . Concurrent enrollment in 100L required.",
    # non-enumerable series
    "Prerequisite(s): FILM 170B , and two additional courses in the FILM 150 series or FILM 170 series.",
    # k-of-n over non-course "areas"
    "Prerequisite(s): equivalent experience in at least two of the following three areas: logic design (e.g. CSE 100 ), computer architecture ( CSE 120 / CSE 220 ), advanced programming.",
    # major-specific requirements in a free sentence
    "Prerequisite(s): ECE 103 . Prerequisites for physics majors: PHYS 116A , PHYS 116C , and PHYS 133 .",
    # population-specific completion inside a restriction
    "Enrollment is restricted to Art & Design: Games + Playable Media declared majors, and Feminist Studies majors and minors who have taken FMST 1 .",
]


@pytest.mark.parametrize("text", AMBIGUOUS_CASES)
def test_real_ambiguous_cases(text):
    r = parse(text)
    assert r.confidence == AMBIGUOUS
    assert r.reason


def test_coreq_forms():
    r = parse("Prerequisite(s): BIOL 20A , BIOE 20B , and BIOE 20C . Must be taken concurrently with BIOE 117 .")
    assert cnf(r.groups) == [["BIOE20B"], ["BIOE20C"], ["BIOL20A"]]
    assert r.coreqs == [["BIOE117"]]
    r = parse("Corequisite(s): STAT 131 or CSE 107 .")
    assert r.groups is None and r.coreqs == [["STAT131", "CSE107"]]
    r = parse("Prerequisite(s): concurrent enrollment in CSP 200 and CSP 210.")
    assert r.groups is None and cnf(r.coreqs) == [["CSP200"], ["CSP210"]]
    r = parse("Prerequisites: successful completion of CHEM 8B and CHEM 8M; and previous or concurrent enrollment in BIOL 100 , BIOC 100A , or CHEM 103.")
    assert cnf(r.groups) == [["BIOC100A", "BIOL100", "CHEM103"], ["CHEM8B"], ["CHEM8M"]]
    assert sorted(r.concurrent_ok) == ["BIOC100A", "BIOL100", "CHEM103"]
    r = parse("Prerequisite(s): completion of or concurrent enrollment in ENVS 100 and ENVS 100L , and Entry Level Writing and Composition requirements.")
    assert cnf(r.groups) == [["ENVS100"], ["ENVS100L"]] and sorted(r.concurrent_ok) == ["ENVS100", "ENVS100L"]


def test_self_reference_is_dropped():
    r = parse("Prerequisite(s): Placement into SPHS 4 via via assessment.", self_code="SPHS4")
    assert r.groups is None and r.confidence == CERTAIN
    raw = (
        "Prerequisite(s): Must be taken concurrently with ANTH 161S . Requirements for the FSFS London "
        "program include concurrent enrollment in both ANTH 151s and ANTH 161s."
    )
    r = parse(raw, self_code="ANTH151S")
    assert r.coreqs == [["ANTH161S"]]


def test_restrictions_are_collected():
    r = parse(
        "Prerequisite(s): PSYC 100 , and satisfaction of the Entry Level Writing and Composition requirements. "
        "Enrollment is restricted to senior psychology and cognitive science majors."
    )
    assert r.groups == [["PSYC100"]]
    assert "satisfaction of the Entry Level Writing and Composition requirements" in r.restrictions
    assert "Enrollment is restricted to senior psychology and cognitive science majors" in r.restrictions


def test_no_text_and_no_codes():
    assert parse(None).groups is None
    assert parse("   ").groups is None
    r = parse("Enrollment is restricted to graduate students.")
    assert r.groups is None and r.confidence == CERTAIN and r.restrictions


def test_known_codes_extend_subjects():
    assert parse("Prerequisite(s): ZZZ 1 .").confidence == AMBIGUOUS
    r = parse("Prerequisite(s): ZZZ 1 .", known_codes={"ZZZ1"})
    assert r.confidence == CERTAIN and r.groups == [["ZZZ1"]]
    # title-case subject names are only accepted when known
    assert parse("Prerequisite(s): Math 19A or Phys 5A.").groups == [["MATH19A", "PHYS5A"]]


# --------------------------------------------------------------------------
# Overrides
# --------------------------------------------------------------------------

def test_override_applies_only_while_hash_matches():
    raw = "Prerequisite(s): PSYC 10 or 20 and 100."
    entry = {"raw_sha1": prereq_parse.raw_sha1(raw), "groups": [["PSYC10", "PSYC20"], ["PSYC100"]], "concurrent_ok": [], "note": "t"}
    ov = {"PSYC109": entry}
    res = prereq_overrides.resolve("PSYC109", raw, parse(raw), ov)
    assert res.source == "override" and not res.stale
    changed = raw.replace("100.", "100 or PSYC 101.")
    res = prereq_overrides.resolve("PSYC109", changed, parse(changed), ov)
    assert res.stale and res.source == "unresolved" and res.groups is None
    certain = "Prerequisite(s): PSYC 100 ."
    res = prereq_overrides.resolve("PSYC109", certain, parse(certain), ov)
    assert res.stale and res.source == "parser" and res.groups == [["PSYC100"]]


def test_override_validation():
    good = {"raw_sha1": "0" * 40, "groups": [["CSE12"]], "concurrent_ok": ["CSE12"], "note": "x"}
    prereq_overrides.validate_entry("X", good)
    for bad in (
        {**good, "raw_sha1": "abc"},
        {**good, "groups": [["cse 12"]]},
        {**good, "groups": [[]]},
        {**good, "concurrent_ok": ["CSE13"]},
    ):
        with pytest.raises(ValueError):
            prereq_overrides.validate_entry("X", bad)


def test_committed_overrides_file_is_valid():
    data = json.loads(prereq_overrides.OVERRIDES_PATH.read_text())
    assert data, "overrides file should not be empty"
    prereq_overrides.load()  # validates every entry
    for code, e in data.items():
        assert e.get("note"), f"{code}: every override explains itself"


# --------------------------------------------------------------------------
# Structure stage core
# --------------------------------------------------------------------------

def _course(code, raw):
    return {"code": code, "subject": "CSE", "raw_requirements": raw}


def test_structure_courses_fields_and_counts():
    courses = [
        _course("CSE100", "Prerequisite(s): CSE 12 ; previous or concurrent enrollment in CSE 100L is required."),
        _course("CSE12", None),
        _course("CSE100L", "Concurrent enrollment in CSE 100 is required."),
    ] + [_course(f"CSE{200 + i}", "Prerequisite(s): CSE 12 .") for i in range(20)]
    out, report = structure_courses(courses, {})
    by = {r["code"]: r for r in out}
    assert by["CSE100"]["prereq_groups"] == [["CSE12"], ["CSE100L"]]
    assert by["CSE100"]["concurrent_ok"] == ["CSE100L"]
    assert by["CSE100"]["prereq_source"] == "parser"
    assert by["CSE12"]["prereq_groups"] == [] and by["CSE12"]["prereq_source"] == "none"
    assert by["CSE100L"]["prereq_groups"] == [] and by["CSE100L"]["coreqs"] == [["CSE100"]]
    assert report["counts"]["unresolved"] == 0
    assert report["unresolved_prereq_codes"] == []


def test_structure_courses_quarantines_and_aborts():
    ok = [_course(f"CSE{i}", "Prerequisite(s): CSE 12 .") for i in range(30)]
    amb = _course("PSYC109", "Prerequisite(s): PSYC 10 or 20 and 100.")
    out, report = structure_courses(ok + [amb], {})
    rec = next(r for r in out if r["code"] == "PSYC109")
    assert rec["prereq_groups"] is None and rec["prereq_source"] == "unresolved"
    assert report["unresolved"][0]["code"] == "PSYC109"
    assert report["ambiguous"][0]["raw_sha1"] == prereq_parse.raw_sha1(amb["raw_requirements"])
    many_amb = [_course(f"PSYC{i}", "Prerequisite(s): PSYC 10 or 20 and 100.") for i in range(5)]
    with pytest.raises(GuardViolation):
        structure_courses(ok[:10] + many_amb, {})
