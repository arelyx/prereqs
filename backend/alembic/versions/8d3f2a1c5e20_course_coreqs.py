"""course co-requisites and concurrent-allowed prereqs

Revision ID: 8d3f2a1c5e20
Revises: 7c2e1d9a4b10
Create Date: 2026-10-05 17:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '8d3f2a1c5e20'
down_revision: Union[str, None] = '7c2e1d9a4b10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('courses', sa.Column('concurrent_ok', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('courses', sa.Column('coreqs', postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column('courses', 'coreqs')
    op.drop_column('courses', 'concurrent_ok')
