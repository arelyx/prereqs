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
    availability = {}
    for av in db.scalars(select(CourseAvailability)):
        course = next((c for c in courses.values() if c.id == av.course_id), None)
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
        "programs": [
            {
                "program_id": p.id,
                "name": p.name,
                "verification": p.verification,
                "sections": evaluate_requirements(p.requirements or {}, all_taken, ctx),
            }
            for p in programs
        ],
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
    issues = []
    for group in course.prereq_groups or []:
        if any(g in taken_before for g in group):
            continue
        concurrent = [g for g in group if g in same_term]
        if concurrent:
            # Inline coreqs are folded into prereq groups by the pipeline, so
            # same-term satisfaction is plausible but worth surfacing.
            issues.append(_issue(
                "concurrent_prereq", course.code, term_code,
                f"{course.display_code}: {_disp(ctx, concurrent[0])} is planned in the same "
                "quarter — OK only if concurrent enrollment is allowed",
                severity="info",
            ))
            continue
        alternatives = " or ".join(_disp(ctx, g) for g in group[:4])
        issues.append(_issue(
            "missing_prereq", course.code, term_code,
            f"{course.display_code} needs {alternatives}"
            + (" (among others)" if len(group) > 4 else "")
            + " before this quarter",
            severity="error",
        ))
    return issues


def _check_availability(ctx, course: Course, term_code: str, season: str) -> list[dict]:
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


def evaluate_requirements(requirements: dict, taken: set[str], ctx: ValidationContext) -> list[dict]:
    sections_out = []
    for section in requirements.get("sections", []):
        rules_out = []
        for rule in section.get("rules", []):
            rules_out.append(_evaluate_rule(rule, taken, ctx))
        # n_of drawing from following list pools (CS BS electives, EE
        # electives): count taken courses against the union of later lists.
        raw_rules = section.get("rules", [])
        for i, r in enumerate(rules_out):
            if r["op"] == "n_of" and raw_rules[i].get("from_following_lists"):
                pool = set(r.get("courses") or [])  # self-pool parents carry courses
                child_filters = []
                for r2 in raw_rules[i + 1:]:
                    if r2.get("op") == "list":
                        pool |= set(r2.get("courses") or [])
                        if r2.get("filter"):
                            child_filters.append(r2["filter"])
                have = set(pool & taken)
                for cf in child_filters:
                    have |= {c for c in taken if _filter_match(ctx.courses.get(c), c, cf)}
                have = sorted(have)
                n = r.get("needed") or r.get("n") or 0
                r["have"] = have
                r["done"] = min(len(have), n)
                r["satisfied"] = len(have) >= n
                r["from_following_lists"] = True
        # section_choice: satisfied when any FOLLOWING rule in the section is
        # (CS BS Comprehensive: capstone list OR senior thesis). The
        # alternatives keep their own rows; mark them so the UI can group.
        for i, r in enumerate(rules_out):
            if r["op"] == "section_choice":
                later = [x for x in rules_out[i + 1:] if x.get("satisfied") is not None]
                r["satisfied"] = any(x["satisfied"] for x in later)
                r["needed"], r["done"] = 1, 1 if r["satisfied"] else 0
                for x in rules_out[i + 1:]:
                    x["alternative"] = True
        sections_out.append({
            "kind": section.get("kind"),
            "title": section.get("title"),
            "concentration": section.get("concentration"),
            "rules": rules_out,
        })
    return sections_out


def _evaluate_rule(rule: dict, taken: set[str], ctx: ValidationContext) -> dict:
    op = rule.get("op")
    courses = rule.get("courses") or []
    branches = rule.get("branches") or []
    have = [c for c in courses if c in taken]
    result: dict = {
        "op": op,
        "n": rule.get("n"),
        "courses": courses,
        "branches": branches or None,
        "have": have,
        "source": rule.get("source"),
        "notes": rule.get("notes") or [],
        "constraints": rule.get("constraints") or [],
    }

    if op == "all_of":
        result |= {"needed": len(courses), "done": len(have),
                   "satisfied": len(have) == len(courses)}
    elif op == "one_of":
        result |= {"needed": 1, "done": min(len(have), 1), "satisfied": bool(have)}
    elif op == "n_of":
        n = rule.get("n") or len(courses)
        if rule.get("pool"):
            # Count over a materialized union of child groups (GCH: six
            # electives across four areas) instead of own listed courses.
            have = sorted(set(rule["pool"]) & taken)
        if rule.get("filter"):
            # Hybrid membership: explicit list UNION prose ranges.
            extra = [c for c in taken if _filter_match(ctx.courses.get(c), c, rule["filter"])]
            have = sorted(set(have) | set(extra))
        result["have"] = have
        result |= {"needed": n, "done": min(len(have), n), "satisfied": len(have) >= n}
    elif op == "n_of_groups":
        # Pick N distinct groups, one course from each picked group.
        n = rule.get("n") or 0
        hit_groups = [b for b in branches if any(c in taken for c in b)]
        have = sorted({c for b in hit_groups for c in b if c in taken})
        result["have"] = have
        result |= {"needed": n, "done": min(len(hit_groups), n),
                   "satisfied": len(hit_groups) >= n}
    elif op == "options":
        best = 0.0
        branch_ok = False
        for branch in branches:
            got = sum(1 for c in branch if c in taken)
            if branch and got == len(branch):
                branch_ok = True
            best = max(best, got / len(branch) if branch else 0)
        # Mixed tables (Biology: required core rows AND an OR-block in one
        # table) put plain requirements in `courses` alongside the branches.
        courses_ok = all(c in taken for c in courses) if courses else True
        satisfied = branch_ok and courses_ok
        result |= {"needed": 1, "done": 1 if satisfied else 0,
                   "satisfied": satisfied, "best_branch_progress": round(best, 2)}
    elif op == "range":
        course_filter = rule.get("filter") or {}
        matching = [
            c for c in taken if _filter_match(ctx.courses.get(c), c, course_filter)
        ]
        n = rule.get("n")
        result |= {"needed": n, "done": len(matching), "matching": sorted(matching),
                   "filter": course_filter,
                   "satisfied": (len(matching) >= n) if n else None}
    elif op == "category_count":
        # Membership is a described category we can't resolve mechanically.
        result |= {"needed": rule.get("n"), "done": None, "satisfied": None,
                   "unevaluated": True}
    elif op in ("info", "list"):
        # Policy prose / named course pool: display-only, never a blocker.
        result |= {"satisfied": None, "informational": True}
    elif op == "section_choice":
        result |= {"satisfied": None}  # resolved by the section post-pass
    else:  # distribution | external | unknown
        result |= {"satisfied": None, "unevaluated": True}
    return result


def _filter_match(course, code: str, course_filter: dict) -> bool:
    """Prose-defined membership: include ranges/series minus exclusions.

    Range bounds compare on the numeric part only (FILM 170A..179B ⇒
    170..179); series match on number prefix (FILM 194 series ⇒ FILM 194,
    194A, 194B, ...).
    """
    if course is None:
        return False
    digits = "".join(ch for ch in course.number if ch.isdigit())
    if not digits:
        return False
    num = int(digits)

    def in_range(r: dict) -> bool:
        return course.subject == r.get("subject") and r.get("lo", 0) <= num <= r.get("hi", -1)

    included = any(in_range(r) for r in course_filter.get("include_ranges") or []) or any(
        course.subject == s.get("subject") and course.number.startswith(s.get("prefix", "\0"))
        for s in course_filter.get("include_series") or []
    )
    if not included:
        return False
    if code in (course_filter.get("exclude_codes") or []):
        return False
    return not any(in_range(r) for r in course_filter.get("exclude_ranges") or [])
