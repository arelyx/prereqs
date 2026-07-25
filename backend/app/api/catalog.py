"""Read-only catalog endpoints: universities, courses, graphs, programs."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import (
    Course,
    CourseAvailability,
    CoursePrereqEdge,
    Program,
    University,
)

router = APIRouter(tags=["catalog"])


@router.get("/universities")
def universities(db: Session = Depends(get_db)) -> list[dict]:
    return [
        {
            "id": u.id,
            "name": u.name,
            "term_system": u.term_system,
            "catalog_year": u.catalog_year,
        }
        for u in db.scalars(select(University).order_by(University.id))
    ]


def _get_course(db: Session, university_id: str, code: str) -> Course:
    course = db.scalar(
        select(Course).where(
            Course.university_id == university_id, Course.code == code.upper()
        )
    )
    if course is None:
        raise HTTPException(404, f"course {code} not found")
    return course


def _course_summary(c: Course) -> dict:
    return {
        "code": c.code,
        "display_code": c.display_code,
        "title": c.title,
        "credits": c.credits,
        "division": c.division,
        "ge_codes": c.ge_codes or [],
        "subject": c.subject,
    }


@router.get("/u/{university_id}/subjects")
def subjects(university_id: str, db: Session = Depends(get_db)) -> list[dict]:
    rows = db.execute(
        select(Course.subject, func.count())
        .where(Course.university_id == university_id)
        .group_by(Course.subject)
        .order_by(Course.subject)
    ).all()
    return [{"subject": s, "courses": n} for s, n in rows]


@router.get("/u/{university_id}/courses")
def list_courses(
    university_id: str,
    q: str = Query("", max_length=80),
    subject: str = Query("", max_length=8),
    ge: str = Query("", max_length=8),
    division: str = Query("", max_length=16),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(Course).where(Course.university_id == university_id)
    if subject:
        stmt = stmt.where(Course.subject == subject.upper())
    if division:
        stmt = stmt.where(Course.division == division)
    if ge:
        stmt = stmt.where(Course.ge_codes.contains([ge.upper()]))
    if q:
        pattern = f"%{q}%"
        compact = f"%{q.replace(' ', '')}%"
        stmt = stmt.where(
            or_(
                Course.code.ilike(compact),
                Course.display_code.ilike(pattern),
                Course.title.ilike(pattern),
            )
        )
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(Course.subject, Course.number).offset(offset).limit(limit))
    return {"total": total, "courses": [_course_summary(c) for c in rows]}


@router.get("/u/{university_id}/courses/{code}")
def course_detail(university_id: str, code: str, db: Session = Depends(get_db)) -> dict:
    c = _get_course(db, university_id, code)
    availability = db.get(CourseAvailability, c.id)
    postreqs = db.scalars(
        select(Course)
        .join(CoursePrereqEdge, CoursePrereqEdge.course_id == Course.id)
        .where(CoursePrereqEdge.prereq_code == c.code)
        .order_by(Course.subject, Course.number)
    ).all()
    return {
        **_course_summary(c),
        "description": c.description,
        "quarters_offered_text": c.quarters_offered_text,
        "catalog_instructor": c.catalog_instructor,
        "cross_listed": c.cross_listed or [],
        "formerly": c.formerly,
        "repeatable": c.repeatable,
        "raw_requirements": c.raw_requirements,
        "prereq_groups": c.prereq_groups,
        "postreqs": [_course_summary(p) for p in postreqs],
        "availability": {
            "season_counts": availability.season_counts,
            "last_offered_term_code": availability.last_offered_term_code,
            "next_planned": availability.next_planned,
            "predicted_instructors": availability.predicted_instructors,
        }
        if availability
        else None,
    }


@router.get("/u/{university_id}/courses/{code}/graph")
def course_graph(
    university_id: str,
    code: str,
    depth: int = Query(3, ge=1, le=6),
    db: Session = Depends(get_db),
) -> dict:
    """Prereq ancestry (to `depth`) + direct postreqs, for the visualizer."""
    root = _get_course(db, university_id, code)
    by_code = {
        c.code: c
        for c in db.scalars(select(Course).where(Course.university_id == university_id))
    }

    nodes: dict[str, dict] = {}
    edges: list[dict] = []

    def add_node(c: Course, role: str) -> None:
        nodes.setdefault(
            c.code, {**_course_summary(c), "role": role, "prereq_groups": c.prereq_groups}
        )

    add_node(root, "root")
    frontier = [root.code]
    for _ in range(depth):
        next_frontier = []
        for code_ in frontier:
            course = by_code.get(code_)
            for group_i, group in enumerate(course.prereq_groups or [] if course else []):
                for prereq in group:
                    edges.append({"from": prereq, "to": code_, "group": group_i})
                    if prereq not in nodes:
                        pc = by_code.get(prereq)
                        if pc is not None:
                            add_node(pc, "prereq")
                            next_frontier.append(prereq)
                        else:
                            nodes[prereq] = {
                                "code": prereq,
                                "display_code": prereq,
                                "title": "(not in current catalog)",
                                "role": "missing",
                            }
        frontier = next_frontier

    postreq_rows = db.scalars(
        select(Course)
        .join(CoursePrereqEdge, CoursePrereqEdge.course_id == Course.id)
        .where(CoursePrereqEdge.prereq_code == root.code)
    ).all()
    for p in postreq_rows:
        add_node(p, "postreq")
        group_i = next(
            (i for i, g in enumerate(p.prereq_groups or []) if root.code in g), 0
        )
        edges.append({"from": root.code, "to": p.code, "group": group_i})

    return {"root": root.code, "nodes": list(nodes.values()), "edges": edges}


@router.get("/u/{university_id}/programs")
def list_programs(university_id: str, db: Session = Depends(get_db)) -> list[dict]:
    return [
        {
            "id": p.id,
            "name": p.name,
            "degree": p.degree,
            "kind": p.kind,
            "division": p.division,
            "verification": p.verification,
        }
        for p in db.scalars(
            select(Program)
            .where(Program.university_id == university_id)
            .order_by(Program.kind, Program.name)
        )
    ]


@router.get("/u/{university_id}/programs/{program_id}")
def program_detail(university_id: str, program_id: int, db: Session = Depends(get_db)) -> dict:
    p = db.get(Program, program_id)
    if p is None or p.university_id != university_id:
        raise HTTPException(404, "program not found")
    return {
        "id": p.id,
        "name": p.name,
        "degree": p.degree,
        "kind": p.kind,
        "division": p.division,
        "department": p.department,
        "url": p.url,
        "catalog_year": p.catalog_year,
        "verification": p.verification,
        "requirements": p.requirements,
    }
