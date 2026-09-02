"""Print what's in the database.

    python -m scripts.inspect_db
"""

from sqlalchemy import func, select

from app.db.session import SessionLocal
from app.models import (
    Application,
    Authority,
    Document,
    EligibilityCriteria,
    Scholarship,
    ScholarshipCategory,
    Student,
    User,
)

TABLES = [
    User, Student, Authority, ScholarshipCategory,
    Scholarship, EligibilityCriteria, Application, Document,
]


def run() -> None:
    db = SessionLocal()
    try:
        print("ROW COUNTS")
        for model in TABLES:
            n = db.scalar(select(func.count()).select_from(model))
            print(f"  {model.__tablename__:<24} {n}")

        print("\nUSERS")
        for u in db.scalars(select(User)):
            print(f"  {u.email:<28} {u.role.value}")

        print("\nSCHOLARSHIPS")
        for s in db.scalars(select(Scholarship)):
            cat = s.category.name if s.category else "-"
            print(f"  {s.name:<38} up to Rs {int(s.amount_max or 0):<8} [{cat}]")
    finally:
        db.close()


if __name__ == "__main__":
    run()
