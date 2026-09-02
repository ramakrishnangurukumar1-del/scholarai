from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.enums import Role
from app.models.scholarship import EligibilityCriteria, Scholarship, ScholarshipCategory
from app.models.user import Student, User
from app.schemas.scholarship import (
    CategoryCreate,
    CategoryOut,
    CriteriaCreate,
    CriteriaOut,
    EligibilityCheckOut,
    ScholarshipCreate,
    ScholarshipDetailOut,
    ScholarshipOut,
    ScholarshipUpdate,
)
from app.services.eligibility import score_scholarship

router = APIRouter(prefix="/scholarships", tags=["scholarships"])
admin = Depends(require_role(Role.admin))


# ---------- public / student reads ----------
@router.get("", response_model=list[ScholarshipOut])
def list_scholarships(
    db: Session = Depends(get_db),
    q: str | None = Query(default=None),
    category: str | None = Query(default=None, description="category name, e.g. 'Merit'"),
) -> list[Scholarship]:
    stmt = (
        select(Scholarship)
        .options(selectinload(Scholarship.category))
        .where(Scholarship.is_active.is_(True))
        .order_by(Scholarship.name)
    )
    if q:
        stmt = stmt.where(Scholarship.name.ilike(f"%{q}%"))
    if category and category.lower() != "all":
        stmt = stmt.join(Scholarship.category).where(ScholarshipCategory.name == category)
    return list(db.scalars(stmt).all())


@router.get("/{scholarship_id}", response_model=ScholarshipDetailOut)
def get_scholarship(scholarship_id: uuid.UUID, db: Session = Depends(get_db)) -> Scholarship:
    obj = _load_detail(db, scholarship_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Scholarship not found")
    return obj


@router.post("/{scholarship_id}/eligibility-check", response_model=EligibilityCheckOut)
def eligibility_check(
    scholarship_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EligibilityCheckOut:
    obj = _load_detail(db, scholarship_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Scholarship not found")
    student = db.scalar(select(Student).where(Student.user_id == user.id))
    if student is None:
        raise HTTPException(status_code=400, detail="Complete your student profile first")
    report = score_scholarship(student, obj)
    return EligibilityCheckOut(**report.as_dict())


# ---------- admin CRUD ----------
@router.post("", response_model=ScholarshipDetailOut, status_code=201, dependencies=[admin])
def create_scholarship(payload: ScholarshipCreate, db: Session = Depends(get_db)) -> Scholarship:
    if db.scalar(select(Scholarship).where(Scholarship.slug == payload.slug)):
        raise HTTPException(status_code=409, detail="A scholarship with this slug already exists")
    obj = Scholarship(**payload.model_dump())
    db.add(obj)
    db.commit()
    return _load_detail(db, obj.id)


@router.put("/{scholarship_id}", response_model=ScholarshipDetailOut, dependencies=[admin])
def update_scholarship(
    scholarship_id: uuid.UUID, payload: ScholarshipUpdate, db: Session = Depends(get_db)
) -> Scholarship:
    obj = db.get(Scholarship, scholarship_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Scholarship not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    return _load_detail(db, scholarship_id)


@router.delete("/{scholarship_id}", status_code=204, dependencies=[admin])
def delete_scholarship(scholarship_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    obj = db.get(Scholarship, scholarship_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Scholarship not found")
    db.delete(obj)
    db.commit()


@router.post(
    "/{scholarship_id}/criteria", response_model=CriteriaOut, status_code=201, dependencies=[admin]
)
def add_criteria(
    scholarship_id: uuid.UUID, payload: CriteriaCreate, db: Session = Depends(get_db)
) -> EligibilityCriteria:
    if db.get(Scholarship, scholarship_id) is None:
        raise HTTPException(status_code=404, detail="Scholarship not found")
    crit = EligibilityCriteria(scholarship_id=scholarship_id, **payload.model_dump())
    db.add(crit)
    db.commit()
    db.refresh(crit)
    return crit


# ---------- categories ----------
categories_router = APIRouter(prefix="/scholarship-categories", tags=["scholarships"])


@categories_router.get("", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)) -> list[ScholarshipCategory]:
    return list(db.scalars(select(ScholarshipCategory).order_by(ScholarshipCategory.name)).all())


@categories_router.post("", response_model=CategoryOut, status_code=201, dependencies=[admin])
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)) -> ScholarshipCategory:
    if db.scalar(select(ScholarshipCategory).where(ScholarshipCategory.name == payload.name)):
        raise HTTPException(status_code=409, detail="Category already exists")
    cat = ScholarshipCategory(name=payload.name)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@categories_router.delete("/{category_id}", status_code=204, dependencies=[admin])
def delete_category(category_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    cat = db.get(ScholarshipCategory, category_id)
    if cat is None:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(cat)
    db.commit()


criteria_router = APIRouter(prefix="/criteria", tags=["scholarships"])


@criteria_router.delete("/{criteria_id}", status_code=204, dependencies=[admin])
def delete_criteria(criteria_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    crit = db.get(EligibilityCriteria, criteria_id)
    if crit is None:
        raise HTTPException(status_code=404, detail="Criterion not found")
    db.delete(crit)
    db.commit()


# ---------- helper ----------
def _load_detail(db: Session, scholarship_id: uuid.UUID) -> Scholarship | None:
    return db.scalars(
        select(Scholarship)
        .options(selectinload(Scholarship.category), selectinload(Scholarship.criteria))
        .where(Scholarship.id == scholarship_id)
    ).first()
