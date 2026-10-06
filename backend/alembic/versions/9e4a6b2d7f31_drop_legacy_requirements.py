"""drop the legacy generic-JSON requirements and its verification columns

Requirements are harness code (harnesses/ucsc/<edition>/<slug>/) evaluated in
the browser; harness manifests carry verification status.

Revision ID: 9e4a6b2d7f31
Revises: 8d3f2a1c5e20
Create Date: 2026-10-06 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '9e4a6b2d7f31'
down_revision: Union[str, None] = '8d3f2a1c5e20'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('programs', 'requirements')
    op.drop_column('programs', 'verification')
    op.drop_column('programs', 'verified_at')
    op.drop_column('programs', 'verification_notes')


def downgrade() -> None:
    op.add_column('programs', sa.Column('verification_notes', sa.Text(), nullable=True))
    op.add_column('programs', sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('programs', sa.Column('verification', sa.String(16), nullable=False, server_default='unverified'))
    op.add_column('programs', sa.Column('requirements', postgresql.JSONB(), nullable=True))
