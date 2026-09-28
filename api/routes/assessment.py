from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Path as FastPath
from pydantic import BaseModel, Field

from src.aaroh.pipeline.quiz_assessment_pipeline import QuizAssessmentPipeline
from src.aaroh.utils.logger import logger

router = APIRouter(prefix="/assessment", tags=["Quiz Generation & Student Assessment"])

pipeline = QuizAssessmentPipeline()


# ── Request / Response Models ─────────────────────────────────────────────────

class GenerateQuizRequest(BaseModel):
    concept_code: str = Field(..., description="Concept code, e.g. 'EVS-G3-WAT-01'")
    target_language: str = Field("hi", description="Target mother tongue, e.g. 'hi', 'bn', 'or'")
    target_dialect: Optional[str] = Field(None, description="Optional tribal dialect: 'gon', 'sat', 'hne', 'bhi'")
    grade_level: int = Field(3, description="Grade level (1-5)")


class SubmitQuizRequest(BaseModel):
    student_id: str = Field(..., description="Unique student identifier, e.g. 'student_ramu_01'")
    answers: Dict[str, str] = Field(..., description="Map of question_id to student answer: {'Q1': 'B', 'Q2': 'C'}")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/quizzes/generate")
def generate_quiz(request: GenerateQuizRequest):
    """Generates a culturally-localized, pedagogical quiz for a curriculum concept in the child's mother tongue.

    Output format:
    - 3 Multiple Choice Questions (with options, difficulty, bloom level, village analogy)
    - 1 Fill-in-the-blank question
    - 1 True/False question
    """
    try:
        quiz = pipeline.generate_quiz_for_concept(
            concept_code=request.concept_code,
            target_language=request.target_language,
            target_dialect=request.target_dialect,
            grade_level=request.grade_level,
        )
        return {
            "status": "success",
            "quiz_id": quiz.quiz_id,
            "concept_code": quiz.concept_code,
            "concept_name": quiz.concept_name,
            "grade_level": quiz.grade_level,
            "target_language": quiz.target_language,
            "target_dialect": quiz.target_dialect,
            "total_questions": len(quiz.questions),
            "questions": [
                {
                    "question_id": q.question_id,
                    "question_type": q.question_type,
                    "question_text": q.question_text,
                    "options": q.options,
                    "blooms_level": q.blooms_level,
                    "difficulty_level": q.difficulty_level,
                    "cultural_anchor": q.cultural_anchor,
                }
                for q in quiz.questions
            ],
        }
    except Exception as e:
        logger.error(f"Quiz generation API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quizzes/{quiz_id}/submit")
def submit_quiz_and_assess(quiz_id: str, request: SubmitQuizRequest):
    """Submits student answers, calculates score, identifies concept-level gaps,
    and returns personalized remedial lessons + teacher insights.
    """
    try:
        result = pipeline.submit_and_assess_quiz(
            quiz_id=quiz_id,
            student_id=request.student_id,
            answers=request.answers,
        )
        return {
            "status": "success",
            "data": result,
        }
    except Exception as e:
        logger.error(f"Quiz submission API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/students/{student_id}/history")
def get_student_assessment_history(student_id: str):
    """Retrieves all past quiz submissions and learning progress for a specific student."""
    try:
        history = pipeline.get_student_history(student_id=student_id)
        return {
            "status": "success",
            "student_id": student_id,
            "total_submissions": len(history),
            "history": history,
        }
    except Exception as e:
        logger.error(f"Fetch student history failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/teachers/reports/{concept_code}")
def get_teacher_concept_report(concept_code: str):
    """Generates an aggregated class report and actionable recommendations for teachers."""
    try:
        report = pipeline.get_class_report(concept_code=concept_code)
        return {
            "status": "success",
            "report": report,
        }
    except Exception as e:
        logger.error(f"Fetch teacher report failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
