"""Seed the database with demo data.

Usage (from the backend/ folder, venv active, DB running):
    python -m scripts.seed
"""

from __future__ import annotations

from datetime import date

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.enums import Role
from app.models.scholarship import EligibilityCriteria, Scholarship, ScholarshipCategory
from app.models.user import Authority, Student, User

CATEGORIES = ["Merit", "Need-Based", "Government", "Private"]

SCHOLARSHIPS = [
    {
        "name": "Merit Excellence Scholarship 2026",
        "slug": "merit-excellence-2026",
        "category": "Merit",
        "provider": "ScholarAI Foundation",
        "description": "Rewards students with outstanding academic performance in engineering.",
        "amount_max": 50000,
        "course_filter": ["B.Tech", "B.E"],
        "close_on": date(2026, 9, 30),
        "criteria": [
            {"field": "cgpa", "operator": "gte", "value": 8.0, "weight": 2, "required": True},
            {"field": "year", "operator": "gte", "value": 2, "weight": 1, "required": True},
        ],
    },
    {
        "name": "Need-Based Scholarship",
        "slug": "need-based",
        "category": "Need-Based",
        "provider": "State Welfare Board",
        "description": "Financial assistance for students from low-income families.",
        "amount_max": 60000,
        "course_filter": [],
        "close_on": date(2026, 10, 15),
        "criteria": [
            {"field": "annual_income", "operator": "lte", "value": 250000, "weight": 3, "required": True},
            {"field": "cgpa", "operator": "gte", "value": 6.0, "weight": 1, "required": True},
        ],
    },
    {
        "name": "Government Scholarship",
        "slug": "government",
        "category": "Government",
        "provider": "Ministry of Education",
        "description": "Central government scholarship for all recognised courses.",
        "amount_max": 25000,
        "course_filter": [],
        "close_on": date(2026, 11, 1),
        "criteria": [
            {"field": "annual_income", "operator": "lte", "value": 800000, "weight": 2, "required": True},
        ],
    },
    {
        "name": "Technical Education Scholarship",
        "slug": "technical-education",
        "category": "Private",
        "provider": "TechBridge Trust",
        "description": "For diploma and degree students in technical fields.",
        "amount_max": 40000,
        "course_filter": ["B.Tech", "Diploma"],
        "close_on": date(2026, 9, 20),
        "criteria": [
            {"field": "cgpa", "operator": "gte", "value": 7.0, "weight": 2, "required": True},
        ],
    },
]

DEMO_USERS = [
    ("student@scholarai.dev", Role.student, "Ramakrishnan G"),
    ("authority@scholarai.dev", Role.authority, "Anitha R"),
    ("admin@scholarai.dev", Role.admin, "Admin User"),
]
DEMO_PASSWORD = "password123"


def run() -> None:
    db = SessionLocal()
    try:
        # categories
        cats: dict[str, ScholarshipCategory] = {}
        for name in CATEGORIES:
            cat = db.scalar(select(ScholarshipCategory).where(ScholarshipCategory.name == name))
            if cat is None:
                cat = ScholarshipCategory(name=name)
                db.add(cat)
            cats[name] = cat
        db.flush()

        # scholarships + criteria
        for s in SCHOLARSHIPS:
            existing = db.scalar(select(Scholarship).where(Scholarship.slug == s["slug"]))
            if existing:
                continue
            sch = Scholarship(
                name=s["name"],
                slug=s["slug"],
                category_id=cats[s["category"]].id,
                provider=s["provider"],
                description=s["description"],
                amount_max=s["amount_max"],
                course_filter=s["course_filter"],
                close_on=s["close_on"],
                is_active=True,
            )
            db.add(sch)
            db.flush()
            for c in s["criteria"]:
                db.add(EligibilityCriteria(scholarship_id=sch.id, **c))

        # demo users
        for email, role, name in DEMO_USERS:
            if db.scalar(select(User).where(User.email == email)):
                continue
            user = User(email=email, password_hash=hash_password(DEMO_PASSWORD), role=role)
            db.add(user)
            db.flush()
            if role == Role.student:
                db.add(
                    Student(
                        user_id=user.id,
                        full_name=name,
                        phone="+91 98765 43210",
                        college="Eeswari Engineering College",
                        course="B.Tech - AI & DS",
                        year=3,
                        cgpa=8.6,
                        annual_income=180000,
                        family_members=4,
                        income_source="Agriculture",
                        profile_complete=True,
                    )
                )
            elif role == Role.authority:
                db.add(Authority(user_id=user.id, full_name=name, department="Scholarships"))

        db.commit()
        print("Seed complete.")
        print(f"  Demo login password for all 3 accounts: {DEMO_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
