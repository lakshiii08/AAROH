import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes.content import router as content_router
from api.routes.translation import router as translation_router
from api.routes.simplification import router as simplification_router

app = FastAPI(
    title="AAROH Education Platform - API",
    description="Backend services for AAROH: AI-powered educational platform for rural and tribal primary education.",
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Phases 1, 2, 3
app.include_router(content_router, prefix="/api/v1")
app.include_router(translation_router, prefix="/api/v1")
app.include_router(simplification_router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "platform": "AAROH - AI Rural & Tribal Primary Education",
        "phase": "Phase 1, 2 & 3 Active",
        "phases_active": [
            "Phase 1 - Content Ingestion & Concept Extraction",
            "Phase 2 - Mother-Tongue Translation Layer",
            "Phase 3 - Simplification & Localization (RAG + LangGraph)",
        ],
        "status": "operational",
        "docs_url": "/docs",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "aaroh-core-api", "version": "0.3.0"}
