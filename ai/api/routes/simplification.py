from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.aaroh.pipeline.simplification_localization_pipeline import SimplificationLocalizationPipeline
from src.aaroh.utils.logger import logger

router = APIRouter(prefix="/simplification", tags=["Simplification & Localization (RAG)"])

pipeline = SimplificationLocalizationPipeline()


class ConceptLocalizeRequest(BaseModel):
    target_language: str = Field("hi", description="Target language: 'hi', 'bn', 'or', etc.")
    target_dialect: Optional[str] = Field(None, description="Tribal dialect: 'gon', 'sat', 'hne', 'bhi'")
    grade_level: int = Field(3, description="Grade level (1-5)")
    force_regenerate: bool = Field(False, description="Force fresh generation even if cached")


class DocumentLocalizeRequest(BaseModel):
    target_language: str = Field("hi")
    target_dialect: Optional[str] = Field(None)


@router.post("/concepts/{concept_code}")
def localize_concept(concept_code: str, request: ConceptLocalizeRequest):
    """Generates a simplified, culturally localized lesson for a curriculum concept.
    
    LangGraph pipeline: cache_lookup → RAG retrieval → Bedrock LLM → cache & emit.
    Returns: explanation, village analogies, micro-story, hands-on activity, voice script.
    """
    try:
        result = pipeline.run_for_concept(
            concept_code=concept_code,
            target_language=request.target_language,
            target_dialect=request.target_dialect,
            grade_level=request.grade_level,
            force_regenerate=request.force_regenerate,
        )
        return {
            "status": "success",
            "cached": result.cached,
            "concept_code": result.concept_code,
            "concept_name": result.concept_name,
            "grade_level": result.grade_level,
            "target_language": result.target_language,
            "target_dialect": result.target_dialect,
            "lesson": {
                "simplified_explanation": result.simplified_explanation,
                "local_analogies": result.local_analogies,
                "story_narrative": result.story_narrative,
                "hands_on_activity": result.hands_on_activity,
                "reflection_questions": result.reflection_questions,
                "voice_script": result.voice_script,
            },
            "cultural_anchors_used": result.cultural_anchors_used,
            "source_chunks_preview": result.source_chunks,
        }
    except Exception as e:
        logger.error(f"Concept localization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/documents/{document_id}")
def localize_document(document_id: str, request: DocumentLocalizeRequest):
    """Localizes ALL concepts of an ingested Phase 1 document in one shot."""
    try:
        lessons = pipeline.run_for_document(
            document_id=document_id,
            target_language=request.target_language,
            target_dialect=request.target_dialect,
        )
        return {
            "status": "success",
            "document_id": document_id,
            "target_language": request.target_language,
            "target_dialect": request.target_dialect,
            "total_lessons": len(lessons),
            "lessons": [
                {
                    "concept_code": l.concept_code,
                    "concept_name": l.concept_name,
                    "cached": l.cached,
                    "simplified_explanation": l.simplified_explanation,
                    "local_analogies": l.local_analogies,
                    "story_narrative": l.story_narrative,
                    "hands_on_activity": l.hands_on_activity,
                    "reflection_questions": l.reflection_questions,
                    "voice_script": l.voice_script,
                }
                for l in lessons
            ],
        }
    except Exception as e:
        logger.error(f"Document localization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/langgraph/concepts/{concept_code}")
def run_langgraph_agent(concept_code: str, request: ConceptLocalizeRequest):
    """Executes the explicit LangGraph agent for a concept (cache → RAG → LLM)."""
    try:
        lesson_dict = pipeline.run_langgraph_for_concept(
            concept_code=concept_code,
            target_language=request.target_language,
            target_dialect=request.target_dialect,
            grade_level=request.grade_level,
            force_regenerate=request.force_regenerate,
        )
        return {
            "status": "success",
            "agent": "LangGraph — SimplificationLocalizationGraph",
            "concept_code": concept_code,
            "lesson": lesson_dict,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cache/status")
def get_cache_status():
    """Returns the current content cache state."""
    cache = pipeline.cache
    entries = [
        {
            "cache_key": k,
            "concept_code": v.get("concept_code"),
            "target_language": v.get("target_language"),
            "target_dialect": v.get("target_dialect"),
        }
        for k, v in cache.memory_cache.items()
    ]
    return {
        "total_cached_lessons": len(entries),
        "entries": entries,
    }
