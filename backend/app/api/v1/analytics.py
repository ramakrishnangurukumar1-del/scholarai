from __future__ import annotations

from collections import Counter
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import require_role
from app.db.session import get_db
from app.models.application import Application, Document
from app.models.enums import ApplicationStatus, Role, VerificationStatus
from app.models.scholarship import Scholarship

router = APIRouter(prefix="/analytics", tags=["analytics"])
guard = Depends(require_role(Role.authority, Role.admin))


@router.get("", dependencies=[guard])
def analytics(db: Session = Depends(get_db)) -> dict:
    apps = db.scalars(
        select(Application)
        .options(selectinload(Application.scholarship).selectinload(Scholarship.category))
        .where(Application.status != ApplicationStatus.draft)
    ).all()

    approved = [a for a in apps if a.status == ApplicationStatus.approved]
    rejected = [a for a in apps if a.status == ApplicationStatus.rejected]
    flagged = [a for a in apps if a.ai_flagged]
    decided = len(approved) + len(rejected)
    approval_rate = round(len(approved) / decided * 100, 1) if decided else 0.0

    # average processing time in days
    spans = [
        (a.decided_at - a.submitted_at).total_seconds()
        for a in apps
        if a.decided_at and a.submitted_at
    ]
    avg_days = round(sum(spans) / len(spans) / 86400, 1) if spans else 0.0

    # verification pass rate
    docs_total = db.scalar(select(func.count()).select_from(Document)) or 0
    docs_ok = (
        db.scalar(
            select(func.count())
            .select_from(Document)
            .where(Document.verification_status == VerificationStatus.verified)
        )
        or 0
    )
    accuracy = round(docs_ok / docs_total * 100, 1) if docs_total else 0.0

    # applications over the last 8 weeks (bucket by week start, Monday)
    today = date.today()
    week_starts = [today - timedelta(days=today.weekday() + 7 * i) for i in range(7, -1, -1)]
    buckets = Counter()
    for a in apps:
        if not a.submitted_at:
            continue
        d = a.submitted_at.date()
        wk = d - timedelta(days=d.weekday())
        buckets[wk] += 1
    over_time = [{"label": wk.strftime("%d %b"), "count": buckets.get(wk, 0)} for wk in week_starts]

    # by category
    cat_counts = Counter(
        (a.scholarship.category.name if a.scholarship and a.scholarship.category else "Other")
        for a in apps
    )
    cat_total = sum(cat_counts.values()) or 1
    by_category = [
        {"label": name, "count": c, "pct": round(c / cat_total * 100, 1)}
        for name, c in cat_counts.most_common()
    ]

    # top scholarships
    per_sch: dict[str, dict] = {}
    for a in apps:
        name = a.scholarship.name if a.scholarship else "Unknown"
        row = per_sch.setdefault(name, {"name": name, "applications": 0, "approved": 0})
        row["applications"] += 1
        if a.status == ApplicationStatus.approved:
            row["approved"] += 1
    top = sorted(per_sch.values(), key=lambda r: r["applications"], reverse=True)[:5]
    for r in top:
        r["rate"] = round(r["approved"] / r["applications"] * 100) if r["applications"] else 0

    return {
        "totals": {
            "total": len(apps),
            "approvalRate": approval_rate,
            "avgDays": avg_days,
            "accuracy": accuracy,
        },
        "counts": {
            "approved": len(approved),
            "rejected": len(rejected),
            "flagged": len(flagged),
            "pending": len(apps) - decided,
        },
        "overTime": over_time,
        "byCategory": by_category,
        "topScholarships": top,
    }
