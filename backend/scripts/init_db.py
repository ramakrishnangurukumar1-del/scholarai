"""Create all tables directly from the models (no Alembic).

Handy for a first run. For real schema changes use Alembic migrations instead:
    alembic revision --autogenerate -m "message"
    alembic upgrade head
"""

from app.db.session import engine
from app.models import Base


def run() -> None:
    Base.metadata.create_all(bind=engine)
    print(f"Created {len(Base.metadata.tables)} tables.")


if __name__ == "__main__":
    run()
