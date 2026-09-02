"""Test fixtures — a fresh in-memory SQLite DB per test, seeded with demo data."""

from __future__ import annotations

from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core import ratelimit
from app.core.security import hash_password
from app.db.session import get_db
from app.main import app
from app.models import Base
from app.models.enums import Role
from app.models.scholarship import EligibilityCriteria, Scholarship, ScholarshipCategory
from app.models.user import Authority, Student, User

DEMO_PASSWORD = "password123"


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _fk(dbapi_conn, _rec):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = TestingSession()
    _seed(session)
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


@pytest.fixture()
def client(db_session):
    def _override():
        yield db_session

    app.dependency_overrides[get_db] = _override
    ratelimit.reset()
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def student_token(client):
    return _login(client, "student@scholarai.dev")


@pytest.fixture()
def authority_token(client):
    return _login(client, "authority@scholarai.dev")


@pytest.fixture()
def admin_token(client):
    return _login(client, "admin@scholarai.dev")


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------- helpers ----------
def _login(client, email: str) -> str:
    r = client.post("/api/v1/auth/login", json={"email": email, "password": DEMO_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _seed(session) -> None:
    cats = {n: ScholarshipCategory(name=n) for n in ("Merit", "Need-Based", "Government")}
    session.add_all(cats.values())
    session.flush()

    merit = Scholarship(
        name="Merit Excellence Scholarship 2026",
        slug="merit-excellence-2026",
        category_id=cats["Merit"].id,
        amount_max=50000,
        course_filter=["B.Tech"],
        is_active=True,
        close_on=date(2026, 9, 30),
    )
    need = Scholarship(
        name="Need-Based Scholarship",
        slug="need-based",
        category_id=cats["Need-Based"].id,
        amount_max=60000,
        course_filter=[],
        is_active=True,
    )
    session.add_all([merit, need])
    session.flush()
    session.add_all(
        [
            EligibilityCriteria(
                scholarship_id=merit.id, field="cgpa", operator="gte", value=8.0,
                weight=2, required=True,
            ),
            EligibilityCriteria(
                scholarship_id=need.id, field="annual_income", operator="lte", value=250000,
                weight=3, required=True,
            ),
        ]
    )

    for email, role, name in [
        ("student@scholarai.dev", Role.student, "Ramakrishnan G"),
        ("authority@scholarai.dev", Role.authority, "Anitha R"),
        ("admin@scholarai.dev", Role.admin, "Admin User"),
    ]:
        u = User(email=email, password_hash=hash_password(DEMO_PASSWORD), role=role)
        session.add(u)
        session.flush()
        if role == Role.student:
            session.add(
                Student(
                    user_id=u.id, full_name=name, phone="+91 90000 00000",
                    college="Test College", course="B.Tech", year=3,
                    cgpa=8.6, annual_income=180000, profile_complete=True,
                )
            )
        elif role == Role.authority:
            session.add(Authority(user_id=u.id, full_name=name, department="Scholarships"))

    session.commit()
