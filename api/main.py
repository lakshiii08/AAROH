import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes.content import router as content_router

app = FastAPI(
    title="AAROH Education Platform - API",
    description="Backend services for AAROH: AI-powered educational platform for rural and tribal primary education.",
    version="1.0.0",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Phase 1 routes
app.include_router(content_router, prefix="/api/v1")

@app.get("/")
def root():
    return {
        "platform": "AAROH - AI Rural & Tribal Primary Education",
        "phase": "Phase 1 - Content Ingestion & Concept Extraction",
        "status": "operational",
        "docs_url": "/docs",
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "aaroh-core-api"}
