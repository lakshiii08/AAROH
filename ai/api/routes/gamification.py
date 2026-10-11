import os
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel, Field

from src.aaroh.pipeline.gamification_pipeline import GamificationPipeline
from src.aaroh.utils.logger import logger

router = APIRouter(prefix="/gamification", tags=["Gamified Learning & Visual Flashcards"])

pipeline = GamificationPipeline()


# ── Request / Response Models ─────────────────────────────────────────────────

class GenerateQuestRequest(BaseModel):
    concept_code: str = Field(..., description="Concept code, e.g. 'EVS-G3-WAT-01'")
    target_language: str = Field("hi", description="Instruction language")
    target_dialect: Optional[str] = Field(None, description="Tribal dialect, e.g. 'gon'")


class RecordActivityRequest(BaseModel):
    student_name: str = Field("Student", description="Student full name")
    school_id: str = Field("rural_primary_01", description="School code")
    grade_level: int = Field(3, description="Grade level (1-5)")
    activity_type: str = Field("lesson", description="'lesson' | 'quiz_pass' | 'quest'")
    concept_code: Optional[str] = Field(None, description="Concept code completed")


class GenerateFlashcardsRequest(BaseModel):
    concept_code: str = Field(..., description="Concept code")
    target_language: str = Field("hi", description="Primary instruction language")
    target_dialect: Optional[str] = Field("gon", description="Mother-tongue tribal dialect")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/quests/generate")
def generate_nature_quest(request: GenerateQuestRequest):
    """Generates a 2-minute daily village observation micro-challenge for a concept."""
    try:
        quest = pipeline.generate_concept_quest(
            concept_code=request.concept_code,
            target_language=request.target_language,
            target_dialect=request.target_dialect,
        )
        return {
            "status": "success",
            "quest_id": quest.quest_id,
            "concept_code": quest.concept_code,
            "title": quest.title,
            "story_mission": quest.story_mission,
            "action_prompt": quest.action_prompt,
            "reward_xp": quest.reward_xp,
            "badge_unlock": quest.badge_unlock,
        }
    except Exception as e:
        logger.error(f"Generate quest API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/students/{student_id}/activity")
def record_student_learning_activity(student_id: str, request: RecordActivityRequest):
    """Records completion of a lesson, quiz, or nature quest, awards XP, and unlocks badges."""
    try:
        progress = pipeline.record_student_activity(
            student_id=student_id,
            student_name=request.student_name,
            school_id=request.school_id,
            grade_level=request.grade_level,
            activity_type=request.activity_type,
            concept_code=request.concept_code,
        )
        return {
            "status": "success",
            "progress": progress,
        }
    except Exception as e:
        logger.error(f"Record activity API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/students/{student_id}/portfolio")
def get_student_portfolio(student_id: str):
    """Retrieves student's complete gamification profile, level, streak, and unlocked badges."""
    try:
        portfolio = pipeline.get_student_portfolio(student_id=student_id)
        return {
            "status": "success",
            "portfolio": {
                "student_id": portfolio.student_id,
                "student_name": portfolio.student_name,
                "school_id": portfolio.school_id,
                "grade_level": portfolio.grade_level,
                "total_xp": portfolio.total_xp,
                "level": portfolio.level,
                "current_streak_days": portfolio.current_streak_days,
                "completed_quests_count": portfolio.completed_quests_count,
                "concepts_mastered": portfolio.concepts_mastered,
                "badges_count": len(portfolio.badges),
                "badges": [
                    {
                        "badge_id": b.badge_id,
                        "badge_name": b.badge_name,
                        "title_local": b.title_local,
                        "description": b.description,
                        "icon": b.icon_symbol,
                        "tier": b.tier,
                    }
                    for b in portfolio.badges
                ],
            },
        }
    except Exception as e:
        logger.error(f"Get portfolio API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/flashcards/generate")
def generate_bilingual_flashcards(request: GenerateFlashcardsRequest):
    """Generates a multilingual visual flashcard deck with village iconography and printable HTML sheet."""
    try:
        deck = pipeline.generate_flashcard_deck(
            concept_code=request.concept_code,
            target_language=request.target_language,
            target_dialect=request.target_dialect,
        )
        filename = Path(deck["html_deck_path"]).name
        return {
            "status": "success",
            "concept_code": deck["concept_code"],
            "concept_name": deck["concept_name"],
            "total_cards": deck["total_cards"],
            "printable_deck_url": f"/api/v1/gamification/flashcards/deck/{filename}",
            "cards": deck["cards"],
        }
    except Exception as e:
        logger.error(f"Flashcards generation API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/flashcards/deck/{filename}")
def view_printable_deck_html(filename: str):
    """Serves the printable HTML flashcard sheet."""
    flashcards_dir = Path(pipeline.config_manager.get_gamification_config().flashcards_output_dir)
    file_path = flashcards_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Flashcard deck not found.")

    with open(file_path, "r", encoding="utf-8") as f:
        html_data = f.read()

    return HTMLResponse(content=html_data)


@router.get("/leaderboards/{school_id}")
def get_school_leaderboard(school_id: str):
    """Returns the cooperative learning leaderboard for a rural school."""
    try:
        leaderboard = pipeline.get_school_leaderboard(school_id=school_id)
        return {
            "status": "success",
            "school_id": school_id,
            "total_students": len(leaderboard),
            "leaderboard": leaderboard,
        }
    except Exception as e:
        logger.error(f"Leaderboard API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
