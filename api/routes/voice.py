import os
import shutil
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from src.aaroh.pipeline.voice_intelligence_pipeline import VoiceIntelligencePipeline
from src.aaroh.utils.logger import logger

router = APIRouter(prefix="/voice", tags=["Voice & Speech Intelligence"])

pipeline = VoiceIntelligencePipeline()


# ── Request / Response Models ─────────────────────────────────────────────────

class TextToSpeechRequest(BaseModel):
    text: str = Field(..., description="Text to synthesize into speech")
    target_language: str = Field("hi", description="Target language code: 'hi', 'bn', 'or', 'gon', 'sat'")
    target_dialect: Optional[str] = Field(None, description="Optional dialect: 'gon', 'sat', 'hne'")
    section_name: str = Field("custom", description="Section identifier, e.g. 'story', 'activity'")


class VoiceLessonRequest(BaseModel):
    target_language: str = Field("hi", description="Target language code")
    target_dialect: Optional[str] = Field(None, description="Optional tribal dialect")
    grade_level: int = Field(3, description="Grade level (1-5)")


class OralQuizAssessmentRequest(BaseModel):
    quiz_id: str = Field(..., description="Quiz identifier")
    question_id: str = Field(..., description="Question identifier")
    student_id: str = Field(..., description="Student identifier")
    expected_answer: str = Field(..., description="Expected correct answer")
    target_language: str = Field("hi", description="Language of oral response")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/synthesize")
def synthesize_speech(request: TextToSpeechRequest):
    """Synthesizes text into a localized audio explanation (AWS Polly / local synth)."""
    try:
        segment = pipeline.synthesize_custom_text(
            text=request.text,
            section_name=request.section_name,
            target_language=request.target_language,
            target_dialect=request.target_dialect,
        )
        audio_filename = Path(segment.audio_file_path).name
        return {
            "status": "success",
            "segment_id": segment.segment_id,
            "section_name": segment.section_name,
            "duration_seconds": segment.duration_seconds,
            "format": segment.format,
            "voice_id": segment.voice_id,
            "audio_file_path": segment.audio_file_path,
            "stream_url": f"/api/v1/voice/stream/{audio_filename}",
        }
    except Exception as e:
        logger.error(f"Speech synthesis API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/lessons/{concept_code}")
def generate_voice_lesson(concept_code: str, request: VoiceLessonRequest):
    """Generates a complete voice lesson package (Explanation, Story, and Voice Script) for a concept.
    
    Returns structured audio segments ready for local playback in tribal/rural schools.
    """
    try:
        pkg = pipeline.generate_voice_lesson(
            concept_code=concept_code,
            target_language=request.target_language,
            target_dialect=request.target_dialect,
            grade_level=request.grade_level,
        )
        return {
            "status": "success",
            "concept_code": pkg.concept_code,
            "concept_name": pkg.concept_name,
            "target_language": pkg.target_language,
            "target_dialect": pkg.target_dialect,
            "total_duration_seconds": pkg.total_duration_seconds,
            "audio_segments": [
                {
                    "segment_id": s.segment_id,
                    "section_name": s.section_name,
                    "duration_seconds": s.duration_seconds,
                    "audio_file_path": s.audio_file_path,
                    "stream_url": f"/api/v1/voice/stream/{Path(s.audio_file_path).name}",
                }
                for s in pkg.segments
            ],
        }
    except Exception as e:
        logger.error(f"Voice lesson API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/oral-quiz/submit-audio")
async def submit_oral_quiz_audio(
    quiz_id: str = Form(...),
    question_id: str = Form(...),
    student_id: str = Form(...),
    expected_answer: str = Form(...),
    target_language: str = Form("hi"),
    audio_file: UploadFile = File(...),
):
    """Submits student spoken audio file for oral quiz assessment.
    
    Runs Speech-to-Text → Grades against expected answer → Returns verbal feedback audio track.
    """
    try:
        temp_dir = Path("data/uploads/audio")
        temp_dir.mkdir(parents=True, exist_ok=True)
        local_audio_path = temp_dir / audio_file.filename

        with open(local_audio_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)

        result = pipeline.process_oral_quiz_answer(
            quiz_id=quiz_id,
            question_id=question_id,
            student_id=student_id,
            audio_file_path=str(local_audio_path),
            expected_answer=expected_answer,
            target_language=target_language,
        )

        feedback_filename = Path(result.feedback_audio_path).name if result.feedback_audio_path else None

        return {
            "status": "success",
            "student_id": result.student_id,
            "question_id": result.question_id,
            "transcribed_speech": result.transcribed_speech,
            "expected_answer": result.expected_answer,
            "is_correct": result.is_correct,
            "confidence_score": result.confidence_score,
            "feedback_script": result.feedback_audio_script,
            "feedback_audio_url": f"/api/v1/voice/stream/{feedback_filename}" if feedback_filename else None,
        }
    except Exception as e:
        logger.error(f"Oral quiz audio submit failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stream/{filename}")
def stream_audio(filename: str):
    """Streams a generated audio file (.wav or .mp3) directly to the client browser/app."""
    audio_dir = Path(pipeline.config_manager.get_voice_config().audio_output_dir)
    file_path = audio_dir / filename

    if not file_path.exists():
        # Check uploads
        upload_path = Path("data/uploads/audio") / filename
        if upload_path.exists():
            file_path = upload_path
        else:
            raise HTTPException(status_code=404, detail="Audio file not found.")

    media_type = "audio/mpeg" if file_path.suffix == ".mp3" else "audio/wav"
    return FileResponse(path=file_path, media_type=media_type, filename=filename)
