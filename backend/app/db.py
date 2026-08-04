from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_session_factory():
    """Dependency for long-running endpoints.

    ``get_db`` checks out a pooled connection for the WHOLE request, which is
    wrong when the request spends tens of seconds outside the database (the
    transcript parse waits on the LLM). Those endpoints depend on this factory
    instead and open a short-lived session around each DB touch:

        with session_factory() as db: ...
    """
    return SessionLocal
