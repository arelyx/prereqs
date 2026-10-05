"""programs are per catalog edition; committed source text

Revision ID: 7c2e1d9a4b10
Revises: 66a5b8cd01a9
Create Date: 2026-10-05 16:30:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '7c2e1d9a4b10'
down_revision: Union[str, None] = '66a5b8cd01a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE programs SET catalog_year = '2026-27' WHERE catalog_year IS NULL")
    op.alter_column('programs', 'catalog_year', existing_type=sa.String(16), nullable=False)
    op.drop_constraint('programs_university_id_slug_key', 'programs', type_='unique')
    op.create_unique_constraint(
        'programs_university_id_slug_catalog_year_key', 'programs',
        ['university_id', 'slug', 'catalog_year'],
    )
    op.add_column('programs', sa.Column('archive_url', sa.Text(), nullable=True))
    op.add_column('programs', sa.Column('source_md', sa.Text(), nullable=True))
    op.add_column('programs', sa.Column('source_sha256', sa.String(64), nullable=True))


def downgrade() -> None:
    op.drop_column('programs', 'source_sha256')
    op.drop_column('programs', 'source_md')
    op.drop_column('programs', 'archive_url')
    op.drop_constraint('programs_university_id_slug_catalog_year_key', 'programs', type_='unique')
    op.create_unique_constraint('programs_university_id_slug_key', 'programs', ['university_id', 'slug'])
    op.alter_column('programs', 'catalog_year', existing_type=sa.String(16), nullable=True)
