"""Catalog-side tables: universities, terms, courses, offerings, programs.

Shapes and rationale documented in docs/DATA_MODEL.md — notably: offerings
reference courses by code string (historical codes may not exist in the
current catalog), and tree-shaped structures (prereq_groups, requirements)
are JSONB evaluated in application code.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base

JSONVariant = JSONB().with_variant(JSON(), "sqlite")
StrArray = ARRAY(String).with_variant(JSON(), "sqlite")


class University(Base):
    __tablename__ = "universities"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)  # slug: 'ucsc'
    name: Mapped[str] = mapped_column(String(128))
    term_system: Mapped[str] = mapped_column(String(16), default="quarter")
    catalog_year: Mapped[str | None] = mapped_column(String(16))


class Term(Base):
    __tablename__ = "terms"
    __table_args__ = (UniqueConstraint("university_id", "code"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    university_id: Mapped[str] = mapped_column(ForeignKey("universities.id"))
    code: Mapped[str] = mapped_column(String(8))
    year: Mapped[int] = mapped_column(Integer)
    season: Mapped[str] = mapped_column(String(8))  # fall|winter|spring|summer
    sort_key: Mapped[int] = mapped_column(Integer, index=True)


class Course(Base):
    __tablename__ = "courses"
    __table_args__ = (
        UniqueConstraint("university_id", "code"),
        Index("ix_courses_univ_subject", "university_id", "subject"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    university_id: Mapped[str] = mapped_column(ForeignKey("universities.id"))
    code: Mapped[str] = mapped_column(String(16))  # canonical: CSE12
    subject: Mapped[str] = mapped_column(String(8))
    number: Mapped[str] = mapped_column(String(8))
    display_code: Mapped[str] = mapped_column(String(16))  # CSE 12
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text, default="")
    credits: Mapped[str] = mapped_column(String(16), default="")  # may be a range
    division: Mapped[str] = mapped_column(String(16))  # lower|upper|graduate
    ge_codes: Mapped[list | None] = mapped_column(StrArray)
    quarters_offered_text: Mapped[str | None] = mapped_column(Text)
    catalog_instructor: Mapped[str | None] = mapped_column(Text)
    cross_listed: Mapped[list | None] = mapped_column(StrArray)
    formerly: Mapped[str | None] = mapped_column(Text)
    repeatable: Mapped[bool] = mapped_column(Boolean, default=False)
    url: Mapped[str | None] = mapped_column(Text)
    raw_requirements: Mapped[str | None] = mapped_column(Text)
    prereq_groups: Mapped[list | None] = mapped_column(JSONVariant)  # [[OR..], [OR..]] ANDed
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # In the catalog but zero offerings (historical or planned) in our data
    # window — listed courses that effectively don't run. Set during
    # availability derivation.
    dormant: Mapped[bool] = mapped_column(Boolean, default=False)

    prereq_edges: Mapped[list["CoursePrereqEdge"]] = relationship(
        back_populates="course",
        foreign_keys="CoursePrereqEdge.course_id",
        cascade="all, delete-orphan",
    )


class CoursePrereqEdge(Base):
    """Flattened prereq graph derived from Course.prereq_groups at load time."""

    __tablename__ = "course_prereq_edges"
    __table_args__ = (
        UniqueConstraint("course_id", "prereq_code"),
        Index("ix_prereq_edges_prereq_code", "prereq_code"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"))
    prereq_code: Mapped[str] = mapped_column(String(16))
    prereq_course_id: Mapped[int | None] = mapped_column(
        ForeignKey("courses.id", ondelete="SET NULL")
    )

    course: Mapped[Course] = relationship(back_populates="prereq_edges", foreign_keys=[course_id])


class CourseOffering(Base):
    """One section in one term, from pisa history or the SOE planned schedule."""

    __tablename__ = "course_offerings"
    __table_args__ = (
        Index("ix_offerings_univ_code", "university_id", "course_code"),
        Index("ix_offerings_term", "term_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    university_id: Mapped[str] = mapped_column(ForeignKey("universities.id"))
    term_id: Mapped[int] = mapped_column(ForeignKey("terms.id"))
    course_code: Mapped[str] = mapped_column(String(16))
    course_id: Mapped[int | None] = mapped_column(ForeignKey("courses.id", ondelete="SET NULL"))
    section: Mapped[str | None] = mapped_column(String(8))
    class_number: Mapped[str | None] = mapped_column(String(16))
    title: Mapped[str | None] = mapped_column(Text)
    instructors: Mapped[list | None] = mapped_column(JSONVariant)  # [{name, cruzid?}]
    days_times: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(Text)
    # Free text: SOE modality notes include arbitrary strings ("Class Topic:
    # ...", spelling variants, upstream test artifacts) — never enum-parse.
    modality: Mapped[str | None] = mapped_column(Text)
    enrolled: Mapped[int | None] = mapped_column(Integer)
    capacity: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str | None] = mapped_column(Text)  # 'Closed with Wait List' etc.
    source: Mapped[str] = mapped_column(String(8))  # pisa|soe
    is_planned: Mapped[bool] = mapped_column(Boolean, default=False)


class CourseAvailability(Base):
    """Per-course derived view: seasons histogram, next planned, instructor guess."""

    __tablename__ = "course_availability"

    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), primary_key=True
    )
    season_counts: Mapped[dict | None] = mapped_column(JSONVariant)
    last_offered_term_code: Mapped[str | None] = mapped_column(String(8))
    next_planned: Mapped[list | None] = mapped_column(JSONVariant)
    predicted_instructors: Mapped[list | None] = mapped_column(JSONVariant)
    computed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Program(Base):
    __tablename__ = "programs"
    __table_args__ = (UniqueConstraint("university_id", "slug"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    university_id: Mapped[str] = mapped_column(ForeignKey("universities.id"))
    name: Mapped[str] = mapped_column(Text)  # from index anchor text, never the slug
    degree: Mapped[str] = mapped_column(String(8))  # BA|BS|BM|minor
    kind: Mapped[str] = mapped_column(String(8))  # major|minor
    division: Mapped[str | None] = mapped_column(String(64))
    department: Mapped[str | None] = mapped_column(String(128))
    slug: Mapped[str] = mapped_column(String(160))
    url: Mapped[str] = mapped_column(Text)
    catalog_year: Mapped[str | None] = mapped_column(String(16))
    requirements: Mapped[dict | None] = mapped_column(JSONVariant)  # sections/rules tree
    verification: Mapped[str] = mapped_column(String(16), default="unverified")
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    verification_notes: Mapped[str | None] = mapped_column(Text)


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    university_id: Mapped[str] = mapped_column(ForeignKey("universities.id"))
    source: Mapped[str] = mapped_column(String(32))
    snapshot_path: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16))  # succeeded|failed|aborted
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    manifest: Mapped[dict | None] = mapped_column(JSONVariant)
    loaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
