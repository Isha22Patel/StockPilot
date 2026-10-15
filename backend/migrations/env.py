
import sys
from pathlib import Path

from alembic import context
from sqlalchemy import pool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import Base, engine
from app import models

config = context.config

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations without opening a database connection."""
    url = engine.url

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations using the application's database engine."""
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
