import os
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.aaroh.pipeline.district_admin_pipeline import DistrictAdminPipeline
from src.aaroh.utils.logger import logger

router = APIRouter(prefix="/district", tags=["District Administration & Parent Voice Advisory"])

pipeline = DistrictAdminPipeline()


# ── Request / Response Models ─────────────────────────────────────────────────

class GeneratePathwayRequest(BaseModel):
    student_id: str = Field(..., description="Student identifier")
    student_name: str = Field("Student", description="Student full name")
    concept_code: str = Field(..., description="Concept code, e.g. 'EVS-G3-WAT-01'")
    weak_bloom_level: str = Field("Understand", description="Identified gap level: 'Remember' | 'Understand' | 'Apply'")
    target_language: str = Field("hi", description="Instruction language")


class SendParentAdvisoryRequest(BaseModel):
    student_id: str = Field(..., description="Student identifier")
    student_name: str = Field("Student", description="Student full name")
    parent_phone: str = Field(..., description="Parent phone number for IVR / WhatsApp audio")
    concept_code: str = Field(..., description="Concept code learned today")
    target_language: str = Field("hi", description="Parent spoken language")
    target_dialect: Optional[str] = Field("gon", description="Parent mother-tongue dialect")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/interventions/generate-pathway")
def generate_remedial_pathway(request: GeneratePathwayRequest):
    """Generates a personalized 4-step remedial learning pathway for a student with identified learning gaps.
    
    Steps:
    1. Story Audio Re-listen
    2. Hands-on Village Experiment
    3. Daily Nature Micro-Quest
    4. Spoken Oral Re-check
    """
    try:
        pathway = pipeline.generate_remedial_pathway(
            student_id=request.student_id,
            student_name=request.student_name,
            concept_code=request.concept_code,
            weak_bloom_level=request.weak_bloom_level,
            target_language=request.target_language,
        )
        return {
            "status": "success",
            "pathway_id": pathway.pathway_id,
            "student_id": pathway.student_id,
            "student_name": pathway.student_name,
            "concept_code": pathway.concept_code,
            "concept_name": pathway.concept_name,
            "weak_bloom_level": pathway.weak_bloom_level,
            "status_code": pathway.status,
            "steps": [
                {
                    "step_number": s.step_number,
                    "step_type": s.step_type,
                    "title": s.title,
                    "instruction": s.instruction,
                    "resource_url": s.resource_url,
                    "is_completed": s.is_completed,
                }
                for s in pathway.steps
            ],
        }
    except Exception as e:
        logger.error(f"Generate pathway API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/parent-advisory/send-voice-note")
def dispatch_parent_voice_note(request: SendParentAdvisoryRequest):
    """Generates and dispatches a 45-second mother-tongue audio advisory note for non-literate parents."""
    try:
        advisory = pipeline.send_parent_voice_advisory(
            student_id=request.student_id,
            student_name=request.student_name,
            parent_phone=request.parent_phone,
            concept_code=request.concept_code,
            target_language=request.target_language,
            target_dialect=request.target_dialect,
        )
        return {
            "status": "success",
            "advisory_id": advisory.advisory_id,
            "student_id": advisory.student_id,
            "parent_phone": advisory.parent_phone,
            "target_language": advisory.target_language,
            "speech_script": advisory.speech_script,
            "audio_stream_url": advisory.stream_url,
            "dispatch_status": advisory.dispatch_status,
        }
    except Exception as e:
        logger.error(f"Parent advisory API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/interventions/pending")
def list_pending_remedial_interventions():
    """Returns active remedial intervention pathways queued across schools."""
    try:
        pending = pipeline.get_pending_interventions()
        return {
            "status": "success",
            "total_pending_interventions": len(pending),
            "interventions": pending,
        }
    except Exception as e:
        logger.error(f"Pending interventions API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/overview")
def get_district_admin_overview():
    """Returns high-level administrative KPIs across all tribal schools in the district."""
    try:
        overview = pipeline.get_district_overview()
        return {
            "status": "success",
            "district_analytics": overview,
        }
    except Exception as e:
        logger.error(f"District analytics API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
