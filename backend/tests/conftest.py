import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import create_app
from app.models import (
    Course,
    CourseAvailability,
    CourseOffering,
    CoursePrereqEdge,
    Program,
    Term,
    University,
)


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, expire_on_commit=False)
    session = TestSession()
    yield session
    session.close()


@pytest.fixture()
def client(db_session):
    app = create_app()

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)


def _course(code, title, **kw):
    import re

    m = re.match(r"^([A-Z]+)([0-9].*)$", code)
    return Course(
        university_id="ucsc",
        code=code,
        subject=m.group(1),
        number=m.group(2),
        display_code=f"{m.group(1)} {m.group(2)}",
        title=title,
        division=kw.pop("division", "lower"),
        ge_codes=kw.pop("ge_codes", []),
        prereq_groups=kw.pop("prereq_groups", []),
        **kw,
    )


@pytest.fixture()
def seeded(db_session):
    """Small but structurally complete UCSC fixture set."""
    db_session.add(University(id="ucsc", name="UC Santa Cruz", term_system="quarter"))
    for code in ("2260", "2262", "2268", "2270", "2272"):
        year = 2000 + (int(code) - 2000) // 10
        digit = (int(code) - 2000) % 10
        season = {0: "winter", 2: "spring", 4: "summer", 8: "fall"}[digit]
        db_session.add(
            Term(university_id="ucsc", code=code, year=year, season=season, sort_key=int(code))
        )
    courses = [
        _course("CSE12", "Systems and Assembly", ge_codes=["MF"]),
        _course("CSE16", "Discrete Math", ge_codes=["MF"]),
        _course("CSE30", "Programming Abstractions", prereq_groups=[["CSE12"]]),
        _course(
            "CSE101",
            "Data Structures and Algorithms",
            division="upper",
            prereq_groups=[["CSE12"], ["CSE16"], ["CSE30"]],
        ),
        _course(
            "CSE130",
            "Systems Design",
            division="upper",
            prereq_groups=[["CSE101"]],
        ),
        _course("ANTH2", "Cultural Anthropology", ge_codes=["CC"]),
    ]
    db_session.add_all(courses)
    db_session.flush()
    by_code = {c.code: c for c in courses}
    for c in courses:  # derived edges, as the loader builds them
        for group in c.prereq_groups or []:
            for prereq in group:
                db_session.add(
                    CoursePrereqEdge(
                        course_id=c.id,
                        prereq_code=prereq,
                        prereq_course_id=by_code[prereq].id if prereq in by_code else None,
                    )
                )
    term_ids = {
        t.code: t.id
        for t in db_session.query(Term).filter(Term.university_id == "ucsc")
    }
    # Offering history for CSE101: two past terms (pisa) + one planned (soe).
    for term_code, name, source, planned in (
        ("2260", "Tantalo,P.", "pisa", False),
        ("2262", "Tantalo,P.", "pisa", False),
        ("2268", "Ishtiyaque Ahmad", "soe", True),
    ):
        db_session.add(
            CourseOffering(
                university_id="ucsc",
                term_id=term_ids[term_code],
                course_code="CSE101",
                course_id=by_code["CSE101"].id,
                section="01",
                instructors=[{"name": name}],
                source=source,
                is_planned=planned,
            )
        )
    db_session.add(
        CourseAvailability(
            course_id=by_code["CSE101"].id,
            season_counts={"fall": 6, "winter": 5},  # never spring
            last_offered_term_code="2260",
            next_planned=[{"term_code": "2268", "sources": ["soe"], "instructors": ["Tantalo,P."]}],
            predicted_instructors=[{"name": "Tantalo,P.", "score": 1.0, "scheduled": True}],
        )
    )
    db_session.add(
        Program(
            university_id="ucsc",
            name="Computer Science B.S.",
            degree="BS",
            kind="major",
            slug="computer-science-bs",
            url="https://example.test/cs-bs",
            requirements={
                "sections": [
                    {
                        "kind": "lower_div",
                        "title": "Lower-Division Courses",
                        "concentration": None,
                        "rules": [
                            {
                                "op": "all_of",
                                "n": None,
                                "courses": ["CSE12", "CSE16", "CSE30"],
                                "branches": None,
                                "constraints": [],
                                "source": {"heading": "All of the following"},
                                "notes": [],
                                "needs_review": False,
                            }
                        ],
                    },
                    {
                        "kind": "upper_div",
                        "title": "Upper-Division Courses",
                        "concentration": None,
                        "rules": [
                            {
                                "op": "n_of",
                                "n": 2,
                                "courses": ["CSE101", "CSE130"],
                                "branches": None,
                                "constraints": [],
                                "source": {"heading": "Plus two of the following"},
                                "notes": [],
                                "needs_review": False,
                            }
                        ],
                    },
                ]
            },
        )
    )
    db_session.commit()
    return db_session
