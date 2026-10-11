import os
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from src.aaroh.pipeline.copilot_edge_pipeline import CopilotEdgePipeline
from src.aaroh.utils.logger import logger

router = APIRouter(prefix="/copilot", tags=["Teacher Copilot & Offline Edge Sync"])

pipeline = CopilotEdgePipeline()


# ── Request / Response Models ─────────────────────────────────────────────────

class GenerateLessonPlanRequest(BaseModel):
    concept_code: str = Field(..., description="Concept code, e.g. 'EVS-G3-WAT-01'")
    grade_level: int = Field(3, description="Base grade level")
    target_language: str = Field("hi", description="Instruction language")
    target_dialect: Optional[str] = Field(None, description="Optional dialect: 'gon', 'sat'")
    duration_mins: int = Field(45, description="Class duration in minutes")


class RemedialAidRequest(BaseModel):
    concept_code: str = Field(..., description="Concept code")
    weak_bloom_level: str = Field("Understand", description="Struggling Bloom's level: 'Remember' | 'Understand' | 'Apply'")
    target_language: str = Field("hi", description="Instruction language")


class ExportOfflineBundleRequest(BaseModel):
    grade_level: int = Field(3, description="Grade level to export")
    subject: str = Field("Environmental Studies", description="Subject name")
    target_language: str = Field("hi", description="Language code")
    target_dialect: Optional[str] = Field(None, description="Dialect code")


class EdgeSyncBatchRequest(BaseModel):
    batch_id: str = Field(..., description="Unique sync batch ID")
    device_id: str = Field(..., description="Edge device / tablet identifier")
    school_id: str = Field(..., description="School code / ID")
    submissions: List[Dict[str, Any]] = Field(..., description="List of offline completed student quiz attempts")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/lesson-plans/generate")
def generate_multigrade_lesson_plan(request: GenerateLessonPlanRequest):
    """Generates a multigrade lesson plan tailored for single-teacher rural classrooms.
    
    Includes:
    - Time allocations for story, concept, hands-on activity, and assessment
    - Multigrade differentiation strategies for Grades 3, 4, and 5 simultaneously
    - ASCII chalkboard activity guide
    - Low-cost village material teaching aids
    """
    try:
        plan = pipeline.generate_lesson_plan(
            concept_code=request.concept_code,
            grade_level=request.grade_level,
            target_language=request.target_language,
            target_dialect=request.target_dialect,
            duration_mins=request.duration_mins,
        )
        return {
            "status": "success",
            "plan_id": plan.plan_id,
            "title": plan.title,
            "grade_level": plan.grade_level,
            "target_language": plan.target_language,
            "time_allocation_mins": plan.time_allocation_mins,
            "multigrade_strategies": plan.multigrade_strategies,
            "blackboard_activity": plan.blackboard_activity,
            "teaching_aids": plan.teaching_aids,
            "hands_on_experiments": plan.hands_on_experiments,
            "homework_village_inquiry": plan.homework_village_inquiry,
        }
    except Exception as e:
        logger.error(f"Lesson plan API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/remedial-aid/generate")
def generate_remedial_teaching_aid(request: RemedialAidRequest):
    """Generates a targeted 1-page remedial teaching guide based on student assessment gaps."""
    try:
        aid = pipeline.generate_remedial_aid(
            concept_code=request.concept_code,
            weak_bloom_level=request.weak_bloom_level,
            target_language=request.target_language,
        )
        return {
            "status": "success",
            "aid_id": aid.aid_id,
            "concept_code": aid.concept_code,
            "concept_name": aid.concept_name,
            "identified_gap_summary": aid.identified_gap_summary,
            "simplified_activity": aid.simplified_activity,
            "story_analogy": aid.story_analogy,
            "check_questions": aid.check_questions,
            "printable_guide": aid.printable_guide,
        }
    except Exception as e:
        logger.error(f"Remedial aid API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/edge/packages/export")
def export_offline_package(request: ExportOfflineBundleRequest):
    """Exports an offline ZIP bundle for zero-connectivity rural classrooms.
    
    Contains: localized lessons, audio recordings, quizzes, and glossary for edge playback.
    """
    try:
        pkg = pipeline.export_offline_bundle(
            grade_level=request.grade_level,
            subject=request.subject,
            target_language=request.target_language,
            target_dialect=request.target_dialect,
        )
        zip_filename = Path(pkg.package_zip_path).name
        return {
            "status": "success",
            "package_id": pkg.package_id,
            "package_name": pkg.package_name,
            "grade_level": pkg.grade_level,
            "subject": pkg.subject,
            "target_language": pkg.target_language,
            "total_lessons": pkg.total_lessons,
            "total_quizzes": pkg.total_quizzes,
            "total_audio_files": pkg.total_audio_files,
            "package_size_bytes": pkg.package_size_bytes,
            "download_url": f"/api/v1/copilot/edge/packages/download/{zip_filename}",
        }
    except Exception as e:
        logger.error(f"Offline package export API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/edge/packages/download/{filename}")
def download_offline_package(filename: str):
    """Downloads the exported offline ZIP package."""
    export_dir = Path(pipeline.config_manager.get_copilot_edge_config().packages_export_dir)
    zip_path = export_dir / filename
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="Offline package file not found.")

    return FileResponse(
        path=zip_path,
        media_type="application/zip",
        filename=filename,
    )


@router.post("/edge/sync/import")
def sync_offline_student_attempts(request: EdgeSyncBatchRequest):
    """Ingests offline student quiz attempts from school kiosks/tablets and merges into central database."""
    try:
        sync_result = pipeline.sync_offline_attempts(request.model_dump())
        return {
            "status": "success",
            "batch_id": sync_result.batch_id,
            "device_id": sync_result.device_id,
            "school_id": sync_result.school_id,
            "total_synced_submissions": sync_result.total_submissions,
            "synced_at": sync_result.synced_at.isoformat(),
        }
    except Exception as e:
        logger.error(f"Edge sync API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/mastery-heatmap")
def get_classroom_mastery_heatmap():
    """Generates concept mastery rates and student progression metrics for the teacher dashboard."""
    try:
        heatmap = pipeline.get_classroom_mastery_heatmap()
        return {
            "status": "success",
            "total_concepts": len(heatmap),
            "mastery_heatmap": heatmap,
        }
    except Exception as e:
        logger.error(f"Mastery heatmap API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
