# Data-model modules register themselves on Base; import them here so Alembic
# autogenerate and create_all see the full schema.
from .catalog import (  # noqa: F401
    Course,
    CourseAvailability,
    CourseOffering,
    CoursePrereqEdge,
    PipelineRun,
    Program,
    Term,
    University,
)
from .user import AuthToken, Plan, User  # noqa: F401
