from fastapi import APIRouter

from app.api.v1.admin import router as admin_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.applications import router as applications_router
from app.api.v1.auth import router as auth_router
from app.api.v1.authority import router as authority_router
from app.api.v1.scholarships import categories_router, criteria_router
from app.api.v1.scholarships import router as scholarships_router
from app.api.v1.students import router as students_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(scholarships_router)
api_router.include_router(categories_router)
api_router.include_router(criteria_router)
api_router.include_router(students_router)
api_router.include_router(applications_router)
api_router.include_router(authority_router)
api_router.include_router(analytics_router)
api_router.include_router(admin_router)
