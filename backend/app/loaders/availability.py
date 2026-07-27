"""Derive per-course availability + instructor predictions from offerings.

"When can I take this, and who will probably teach it?" — computed at load
time into course_availability (docs/DATA_MODEL.md):

- season_counts: distinct terms per season the course ran, over the last
  HISTORY_YEARS of pisa history (catalog presence ≠ availability).
- next_planned: future-term offerings — SOE plan rows plus any future pisa
  terms (enrollment already open) — deduped per term.
- predicted_instructors: recency-weighted history. A named instructor on a
  future planned section is near-certain evidence; otherwise names decay by
  0.7^years_ago so a professor who taught it the last three falls outranks
  one from 2015. 'Staff' rows are TBD, never an identity.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..models import Course, CourseAvailability, CourseOffering, Term

HISTORY_YEARS = 5  # product decision 2026-07-25: ~5 years of history suffices
RECENCY_DECAY = 0.7
SCHEDULED_SCORE = 1.0


from ..names import better_display as _better_display
from ..names import name_key as _name_key


def _current_term_int(now: datetime) -> int:
    # Good-enough mapping of today to a pisa-style code for past/future splits.
    month = now.month
    season_digit = {1: 0, 2: 0, 3: 0, 4: 2, 5: 2, 6: 2, 7: 4, 8: 4, 9: 8, 10: 8, 11: 8, 12: 8}[month]
    return 2000 + (now.year - 2000) * 10 + season_digit


def compute_availability(db: Session, university_id: str) -> None:
    now_code = _current_term_int(datetime.now(timezone.utc))
    term_by_id = {
        t.id: t for t in db.scalars(select(Term).where(Term.university_id == university_id))
    }
    course_ids = {
        c.code: c.id
        for c in db.scalars(select(Course).where(Course.university_id == university_id))
    }

    by_course: dict[str, list[CourseOffering]] = defaultdict(list)
    for off in db.scalars(
        select(CourseOffering).where(CourseOffering.university_id == university_id)
    ):
        by_course[off.course_code].append(off)

    db.execute(
        delete(CourseAvailability).where(
            CourseAvailability.course_id.in_(
                select(Course.id).where(Course.university_id == university_id)
            )
        )
    )

    built = 0
    for code, offs in by_course.items():
        course_id = course_ids.get(code)
        if course_id is None:
            continue  # historical code with no current-catalog course

        season_terms: dict[str, set[str]] = defaultdict(set)
        next_planned: dict[str, dict] = {}
        instructor_score: dict[tuple, float] = defaultdict(float)
        instructor_terms: dict[tuple, list[str]] = defaultdict(list)
        display_name: dict[tuple, str] = {}
        scheduled_keys: set[tuple] = set()
        last_offered: str | None = None

        for off in offs:
            term = term_by_id[off.term_id]
            code_int = int(term.code)
            is_future = code_int >= now_code
            names = [
                i.get("name")
                for i in (off.instructors or [])
                if i.get("name") and i.get("name") != "Staff"
            ]
            keys = []
            for n in names:
                k = _name_key(n)
                display_name[k] = _better_display(display_name.get(k, n), n)
                keys.append(k)
            if is_future or off.is_planned:
                entry = next_planned.setdefault(
                    term.code,
                    {"term_code": term.code, "season": term.season, "year": term.year,
                     "sources": [], "instructors": []},
                )
                if off.source not in entry["sources"]:
                    entry["sources"].append(off.source)
                for k, n in zip(keys, names):
                    entry["instructors"].append(n)  # unified in the rebuild pass
                    scheduled_keys.add(k)
                    instructor_score[k] = max(instructor_score[k], SCHEDULED_SCORE)
                    instructor_terms[k].append(term.code)
                continue

            # Historical record (pisa, past term)
            years_ago = (now_code - code_int) / 10
            if years_ago <= HISTORY_YEARS:
                season_terms[term.season].add(term.code)
            if last_offered is None or code_int > int(last_offered):
                last_offered = term.code
            weight = RECENCY_DECAY ** years_ago
            for k in keys:
                instructor_score[k] += weight
                instructor_terms[k].append(term.code)

        # Rebuild planned-term instructor lists from unified display names.
        for entry in next_planned.values():
            seen: dict[tuple, str] = {}
            for n in entry["instructors"]:
                seen[_name_key(n)] = display_name.get(_name_key(n), n)
            entry["instructors"] = list(seen.values())

        predicted = [
            {
                "name": display_name[key],
                "score": round(min(score, 3.0) / 3.0, 3),
                "scheduled": key in scheduled_keys,
                "times_taught": len(instructor_terms[key]),
                "last_term": max(instructor_terms[key], key=int),
            }
            for key, score in sorted(
                instructor_score.items(), key=lambda kv: kv[1], reverse=True
            )[:5]
        ]

        db.add(
            CourseAvailability(
                course_id=course_id,
                season_counts={s: len(t) for s, t in season_terms.items()},
                last_offered_term_code=last_offered,
                next_planned=sorted(next_planned.values(), key=lambda e: int(e["term_code"])),
                predicted_instructors=predicted,
                computed_at=datetime.now(timezone.utc),
            )
        )
        built += 1

    offered_codes = set(by_course.keys())
    dormant = 0
    for code, cid in course_ids.items():
        course = db.get(Course, cid)
        is_dormant = code not in offered_codes
        if course.dormant != is_dormant:
            course.dormant = is_dormant
        dormant += 1 if is_dormant else 0
    print(f"  availability: {built} courses; dormant: {dormant}")
