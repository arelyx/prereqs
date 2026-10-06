"""Plan validation: prereqs, availability, requirement + GE progress.

Pure functions over already-loaded data — no network, no LLM. The planner is
where the app's guarantees live, so every check is conservative: when data is
missing (no offering history, unevaluable rule) we emit an informational flag
rather than silently passing or failing.

Plan content shape (docs/DATA_MODEL.md): {"completed": [codes],
"terms": [{"term_code": "2270", "courses": [codes]}]}.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from .loaders.terms import parse_term_code
from .models import Course, CourseAvailability, Program

# UCSC undergraduate GE requirements (2026-27 catalog). Prefix categories:
# any PE-* satisfies PE, any PR-* satisfies PR. DC is per-major (handled via
# program requirements, not here).
GE_CATEGORIES: dict[str, dict] = {
    "CC": {"label": "Cross-Cultural Analysis", "match": ["CC"]},
    "ER": {"label": "Ethnicity and Race", "match": ["ER"]},
    "IM": {"label": "Interpreting Arts and Media", "match": ["IM"]},
    "MF": {"label": "Mathematical and Formal Reasoning", "match": ["MF"]},
    "SI": {"label": "Scientific Inquiry", "match": ["SI"]},
    "SR": {"label": "Statistical Reasoning", "match": ["SR"]},
    "TA": {"label": "Textual Analysis", "match": ["TA"]},
    "PE": {"label": "Perspectives", "match": ["PE-E", "PE-H", "PE-T"]},
    "PR": {"label": "Practice", "match": ["PR-E", "PR-C", "PR-S"]},
    "C": {"label": "Composition", "match": ["C", "C1", "C2"]},
}


@dataclass
class ValidationContext:
    courses: dict[str, Course]
    availability: dict[str, CourseAvailability]


def build_context(db: Session, university_id: str) -> ValidationContext:
    courses = {
        c.code: c
        for c in db.scalars(select(Course).where(Course.university_id == university_id))
    }
    by_id = {c.id: c for c in courses.values()}
    availability = {}
    for av in db.scalars(select(CourseAvailability)):
        course = by_id.get(av.course_id)
        if course is not None:
            availability[course.code] = av
    return ValidationContext(courses=courses, availability=availability)


def validate_plan(ctx: ValidationContext, content: dict, programs: list[Program]) -> dict:
    completed: list[str] = content.get("completed") or []
    plan_terms: list[dict] = content.get("terms") or []

    issues: list[dict] = []
    seen: dict[str, str] = {}  # code -> where it already appeared

    for code in completed:
        if code not in ctx.courses:
            issues.append(_issue("unknown_course", code, None,
                                 f"{_disp(ctx, code)} is not in the current catalog"))
        seen[code] = "completed"

    taken_before: set[str] = set(completed)
    for i, term in enumerate(plan_terms):
        term_code = term.get("term_code", "")
        try:
            _, season = parse_term_code(term_code)
        except (ValueError, TypeError):
            issues.append(_issue("bad_term", None, term_code, f"invalid term code {term_code!r}"))
            continue
        same_term = set(term.get("courses") or [])

        for code in term.get("courses") or []:
            course = ctx.courses.get(code)
            if course is None:
                issues.append(_issue("unknown_course", code, term_code,
                                     f"{code} is not in the current catalog"))
                continue
            if code in seen and not course.repeatable:
                issues.append(_issue("duplicate", code, term_code,
                                     f"{course.display_code} already appears in {seen[code]} "
                                     "and is not repeatable"))
            seen.setdefault(code, f"term {term_code}")

            issues.extend(_check_prereqs(ctx, course, term_code, taken_before, same_term))
            issues.extend(_check_availability(ctx, course, term_code, season))

        taken_before |= same_term

    all_taken = set(completed) | {
        c for t in plan_terms for c in (t.get("courses") or [])
    }
    return {
        "issues": issues,
        "ge_progress": ge_progress(ctx, all_taken),
    }


def _issue(kind: str, code: str | None, term_code: str | None, message: str,
           severity: str = "warning") -> dict:
    return {"kind": kind, "course": code, "term_code": term_code,
            "message": message, "severity": severity}


def _disp(ctx: ValidationContext, code: str) -> str:
    c = ctx.courses.get(code)
    return c.display_code if c else code


def _check_prereqs(ctx, course: Course, term_code: str, taken_before: set,
                   same_term: set) -> list[dict]:
    """Prereq groups (CNF) must be met by earlier quarters, except by courses
    the catalog explicitly allows concurrently ("previous or concurrent
    enrollment in X"). Strict co-requisites ("concurrent enrollment in X is
    required") must be in the same quarter or earlier."""
    issues = []
    concurrent_ok = set(course.concurrent_ok or [])
    for group in course.prereq_groups or []:
        if any(g in taken_before for g in group):
            continue
        concurrent = [g for g in group if g in same_term]
        if any(g in concurrent_ok for g in concurrent):
            issues.append(_issue(
                "concurrent_prereq", course.code, term_code,
                f"{course.display_code}: {_disp(ctx, concurrent[0])} in the same quarter — "
                "the catalog allows concurrent enrollment",
                severity="info",
            ))
            continue
        alternatives = " or ".join(_disp(ctx, g) for g in group[:4])
        same_q = " (planned in the same quarter; it must be completed first)" if concurrent else ""
        issues.append(_issue(
            "missing_prereq", course.code, term_code,
            f"{course.display_code} needs {alternatives}"
            + (" (among others)" if len(group) > 4 else "")
            + " before this quarter" + same_q,
            severity="error",
        ))
    for group in course.coreqs or []:
        if any(g in taken_before or g in same_term for g in group):
            continue
        issues.append(_issue(
            "missing_coreq", course.code, term_code,
            f"{course.display_code} requires concurrent enrollment in "
            + " or ".join(_disp(ctx, g) for g in group[:4]),
        ))
    return issues


def _check_availability(ctx, course: Course, term_code: str, season: str) -> list[dict]:
    if course.dormant:
        return [_issue("dormant", course.code, term_code,
                       f"{course.display_code} has not been offered in the last five years "
                       "and has no scheduled sections — likely unavailable",
                       severity="error")]
    av = ctx.availability.get(course.code)
    if av is None:
        return [_issue("no_history", course.code, term_code,
                       f"{course.display_code} has no offering history — verify it still runs",
                       severity="info")]
    if any(e["term_code"] == term_code for e in av.next_planned or []):
        return []  # explicitly planned/scheduled for this exact term
    counts = av.season_counts or {}
    if sum(counts.values()) == 0:
        return [_issue("no_history", course.code, term_code,
                       f"{course.display_code} has not been offered in recent years",
                       severity="warning")]
    if counts.get(season, 0) == 0:
        seasons = ", ".join(s for s, n in sorted(counts.items(), key=lambda kv: -kv[1]) if n)
        return [_issue("season_mismatch", course.code, term_code,
                       f"{course.display_code} has never run in {season} recently "
                       f"(usually: {seasons})",
                       severity="warning")]
    return []


def ge_progress(ctx: ValidationContext, taken: set[str]) -> list[dict]:
    satisfied_codes: dict[str, list[str]] = {}
    for code in taken:
        course = ctx.courses.get(code)
        for ge in (course.ge_codes if course else []) or []:
            satisfied_codes.setdefault(ge, []).append(code)
    out = []
    for cat, spec in GE_CATEGORIES.items():
        matches = [
            {"ge": ge, "courses": satisfied_codes[ge]}
            for ge in spec["match"]
            if ge in satisfied_codes
        ]
        out.append({
            "category": cat,
            "label": spec["label"],
            "satisfied": bool(matches),
            "by": matches,
        })
    return out
