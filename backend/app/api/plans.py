"""Plan endpoints.

Validation is a PUBLIC endpoint taking plan content in the request body: the
anonymous localStorage mode needs full validation without an account. Saved
plans (CRUD) require auth and reuse the same engine.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, StringConstraints
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth.service import get_current_user
from ..db import get_db
from ..models import Plan, Program, University, User
from ..planner import build_context, validate_plan

router = APIRouter(tags=["plans"])

# Per-user plan cap: enough for any realistic what-if exploration, small
# enough that a runaway client can't fill the table. Mirrored client-side.
MAX_PLANS = 20


# Course codes are short catalog identifiers; anything longer is garbage and
# would otherwise turn the plans table into an unbounded blob store.
CourseCode = Annotated[str, StringConstraints(max_length=32)]


class TermIn(BaseModel):
    term_code: Annotated[str, StringConstraints(max_length=16)]
    courses: list[CourseCode] = Field(default_factory=list, max_length=30)


class PlanContent(BaseModel):
    completed: list[CourseCode] = Field(default_factory=list, max_length=200)
    terms: list[TermIn] = Field(default_factory=list, max_length=24)


class ValidateRequest(BaseModel):
    content: PlanContent
    program_ids: list[int] = Field(default_factory=list, max_length=4)


class PlanIn(BaseModel):
    name: str = Field(default="My Plan", max_length=128)
    university_id: str
    program_ids: list[int] = Field(default_factory=list, max_length=4)
    content: PlanContent


def _programs(db: Session, university_id: str, ids: list[int]) -> list[Program]:
    if not ids:
        return []
    rows = db.scalars(
        select(Program).where(Program.university_id == university_id, Program.id.in_(ids))
    ).all()
    if len(rows) != len(set(ids)):
        raise HTTPException(404, "one or more programs not found")
    return rows


@router.post("/u/{university_id}/validate")
def validate(university_id: str, req: ValidateRequest, db: Session = Depends(get_db)) -> dict:
    if db.get(University, university_id) is None:
        raise HTTPException(404, "unknown university")
    ctx = build_context(db, university_id)
    programs = _programs(db, university_id, req.program_ids)
    normalized = {
        "completed": [c.replace(" ", "").upper() for c in req.content.completed],
        "terms": [
            {
                "term_code": t.term_code,
                "courses": [c.replace(" ", "").upper() for c in t.courses],
            }
            for t in req.content.terms
        ],
    }
    return validate_plan(ctx, normalized, programs)


def _plan_out(p: Plan) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "university_id": p.university_id,
        "program_ids": p.program_ids or [],
        "content": p.content,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


@router.get("/plans")
def list_plans(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(select(Plan).where(Plan.user_id == user.id).order_by(Plan.id))
    return [_plan_out(p) for p in rows]


@router.post("/plans", status_code=201)
def create_plan(
    body: PlanIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    if db.get(University, body.university_id) is None:
        raise HTTPException(404, "unknown university")
    # Serialize plan creation per user: count-then-insert is racy without it
    # (concurrent POSTs at 19 plans could all pass the check and blow past
    # MAX_PLANS). The row lock serializes on Postgres; SQLite (tests) ignores
    # FOR UPDATE, which is fine — its writes are serialized anyway.
    db.execute(select(User).where(User.id == user.id).with_for_update())
    count = db.scalar(select(func.count()).select_from(Plan).where(Plan.user_id == user.id))
    if count is not None and count >= MAX_PLANS:
        raise HTTPException(
            422, f"plan limit reached ({MAX_PLANS} plans per account); delete a plan first"
        )
    _programs(db, body.university_id, body.program_ids)
    plan = Plan(
        user_id=user.id,
        university_id=body.university_id,
        name=body.name,
        program_ids=body.program_ids,
        content=body.content.model_dump(),
    )
    db.add(plan)
    db.commit()
    return _plan_out(plan)


def _own_plan(db: Session, user: User, plan_id: int) -> Plan:
    plan = db.get(Plan, plan_id)
    if plan is None or plan.user_id != user.id:
        raise HTTPException(404, "plan not found")
    return plan


@router.put("/plans/{plan_id}")
def update_plan(
    plan_id: int,
    body: PlanIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    plan = _own_plan(db, user, plan_id)
    _programs(db, body.university_id, body.program_ids)
    plan.name = body.name
    plan.university_id = body.university_id
    plan.program_ids = body.program_ids
    plan.content = body.content.model_dump()
    db.commit()
    return _plan_out(plan)


@router.delete("/plans/{plan_id}", status_code=204)
def delete_plan(
    plan_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> None:
    db.delete(_own_plan(db, user, plan_id))
    db.commit()
