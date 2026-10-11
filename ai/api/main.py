import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes.content import router as content_router
from api.routes.translation import router as translation_router
from api.routes.simplification import router as simplification_router
from api.routes.assessment import router as assessment_router
from api.routes.voice import router as voice_router
from api.routes.copilot import router as copilot_router
from api.routes.gamification import router as gamification_router
from api.routes.district import router as district_router
from api.auth import CognitoAuthMiddleware

app = FastAPI(
    title="AAROH Education Platform - API",
    description="Backend services for AAROH: AI-powered educational platform for rural and tribal primary education.",
    version="0.8.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_ORIGIN", "*")],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Local development can run without a user pool. Terraform always supplies the
# Cognito settings for deployed environments, protecting every application API route.
if os.environ.get("COGNITO_USER_POOL_ID") and os.environ.get("COGNITO_APP_CLIENT_ID"):
    app.add_middleware(CognitoAuthMiddleware)

# Phases 1, 2, 3, 4, 5, 6, 7, 8
app.include_router(content_router, prefix="/api/v1")
app.include_router(translation_router, prefix="/api/v1")
app.include_router(simplification_router, prefix="/api/v1")
app.include_router(assessment_router, prefix="/api/v1")
app.include_router(voice_router, prefix="/api/v1")
app.include_router(copilot_router, prefix="/api/v1")
app.include_router(gamification_router, prefix="/api/v1")
app.include_router(district_router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "platform": "AAROH - AI Rural & Tribal Primary Education",
        "phase": "Phase 1, 2, 3, 4, 5, 6, 7 & 8 Active (Complete Platform)",
        "phases_active": [
            "Phase 1 - Content Ingestion & Concept Extraction",
            "Phase 2 - Mother-Tongue Translation Layer",
            "Phase 3 - Simplification & Localization (RAG + LangGraph)",
            "Phase 4 - Quiz Generation & Student Assessment Engine",
            "Phase 5 - Voice & Speech Intelligence (TTS & Oral Assessment)",
            "Phase 6 - Teacher Copilot & Offline-First Edge Sync Engine",
            "Phase 7 - Gamification, Learning Quests & Multilingual Visual Storyboards",
            "Phase 8 - District Administration & Parent-Community Voice Advisory Bridge",
        ],
        "status": "operational",
        "docs_url": "/docs",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "aaroh-core-api", "version": "0.8.0"}
