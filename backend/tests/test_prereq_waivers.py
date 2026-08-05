"""Prereq-check suppression: past terms and per-course waivers.

Dates are pinned explicitly rather than using today's date — otherwise a
"future term" fixture silently becomes a past one as the calendar moves and
the test starts asserting nothing.
"""

from datetime import date

from app.planner import build_context, current_term_code, validate_plan

# 2258 = 2025 fall, 2270 = 2027 winter. Standing in Jan 2026 (term 2260), the
# first is over and the second has not happened yet.
PAST_TERM = "2258"
FUTURE_TERM = "2270"
IN_2026_WINTER = date(2026, 1, 15)

# CSE101 needs CSE12, CSE16 and CSE30, none of which these plans contain.
UNMET = ["CSE101"]


def _missing(ctx, content, today=IN_2026_WINTER):
    out = validate_plan(ctx, content, [], today=today)
    return [i for i in out["issues"] if i["kind"] == "missing_prereq"]


def test_current_term_code_tracks_the_season():
    assert current_term_code(date(2026, 2, 1)) == "2260"  # winter
    assert current_term_code(date(2026, 5, 1)) == "2262"  # spring
    assert current_term_code(date(2026, 8, 1)) == "2264"  # summer
    assert current_term_code(date(2026, 11, 1)) == "2268"  # fall


def test_prereq_checks_skip_past_terms(db_session, seeded):
    ctx = build_context(db_session, "ucsc")
    content = {"completed": [], "terms": [{"term_code": PAST_TERM, "courses": UNMET}]}
    # The quarter is over: nothing can be done about its prereqs.
    assert _missing(ctx, content) == []
    # The very same plan, judged from before that quarter, is still flagged.
    assert _missing(ctx, content, today=date(2025, 7, 1)) != []


def test_prereq_checks_still_run_for_current_and_future_terms(db_session, seeded):
    ctx = build_context(db_session, "ucsc")
    content = {"completed": [], "terms": [{"term_code": FUTURE_TERM, "courses": UNMET}]}
    assert _missing(ctx, content) != []
    # The term we are standing in is not "past" — it still gets checked.
    current = {"completed": [], "terms": [{"term_code": "2260", "courses": UNMET}]}
    assert _missing(ctx, current) != []


def test_waived_courses_skip_prereq_checks(db_session, seeded):
    ctx = build_context(db_session, "ucsc")
    content = {"completed": [], "terms": [{"term_code": FUTURE_TERM, "courses": UNMET}]}
    assert _missing(ctx, content) != []
    assert _missing(ctx, {**content, "waived": ["CSE101"]}) == []
    # Waiving something else leaves the issue alone.
    assert _missing(ctx, {**content, "waived": ["CSE130"]}) != []


def test_past_terms_still_report_everything_else(db_session, seeded):
    """Only the prereq check is suppressed — a past term that names a course
    the catalog no longer has, or repeats one, still says so."""
    ctx = build_context(db_session, "ucsc")
    content = {
        "completed": ["CSE12"],
        "terms": [{"term_code": PAST_TERM, "courses": ["NOPE1", "CSE12"]}],
    }
    kinds = {i["kind"] for i in validate_plan(ctx, content, [], today=IN_2026_WINTER)["issues"]}
    assert "unknown_course" in kinds
    assert "duplicate" in kinds


def test_validate_endpoint_normalizes_waived(client, seeded):
    """The API accepts waived codes in display form ("cse 101")."""
    body = {
        "content": {
            "completed": [],
            "terms": [{"term_code": FUTURE_TERM, "courses": ["CSE101"]}],
            "waived": ["cse 101"],
        },
        "program_ids": [],
    }
    r = client.post("/u/ucsc/validate", json=body)
    assert r.status_code == 200
    assert [i for i in r.json()["issues"] if i["kind"] == "missing_prereq"] == []


def test_waived_survives_a_plan_round_trip(client, seeded):
    r = client.post("/auth/register", json={"email": "w@example.com", "password": "hunter2hunter2"})
    headers = {"Authorization": f"Bearer {r.json()['token']}"}
    content = {
        "completed": [],
        "terms": [{"term_code": FUTURE_TERM, "courses": ["CSE101"]}],
        "waived": ["CSE101"],
    }
    created = client.post(
        "/plans",
        json={"name": "P", "university_id": "ucsc", "program_ids": [], "content": content},
        headers=headers,
    )
    assert created.status_code == 201, created.text
    assert created.json()["content"]["waived"] == ["CSE101"]
    listed = client.get("/plans", headers=headers).json()
    assert listed[0]["content"]["waived"] == ["CSE101"]
