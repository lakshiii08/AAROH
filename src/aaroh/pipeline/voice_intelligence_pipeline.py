import uuid
import sys
from typing import Optional, List, Dict, Any
from pathlib import Path

from src.aaroh.configuration.configuration import ConfigurationManager
from src.aaroh.entity.artifact_entity import (
    VoiceLessonEntity,
    AudioSegmentEntity,
    TranscriptionResultEntity,
    OralQuizResultEntity,
    LocalizedLessonEntity,
)
from src.aaroh.components.voice_tts import VoiceTTSComponent
from src.aaroh.components.voice_stt import VoiceSTTComponent
from src.aaroh.components.localization import LocalizationComponent
from src.aaroh.components.simplification import SimplificationComponent
from src.aaroh.components.rag_pipeline import RAGPipelineComponent
from src.aaroh.components.content_transformation import ContentTransformationComponent
from src.aaroh.database.session import DatabaseManager
from src.aaroh.database.models import VoiceLessonModel, OralQuizAttemptModel
from src.aaroh.utils.logger import logger
from src.aaroh.utils.exception import AarohException


class VoiceIntelligencePipeline:
    """Orchestrates Phase 5: Voice Lesson Audio Synthesis, Speech-to-Text Transcription,
    and Oral Quiz Grading with Spoken Audio Feedback.
    """

    def __init__(self, config_manager: Optional[ConfigurationManager] = None):
        self.config_manager = config_manager or ConfigurationManager()

        voice_config = self.config_manager.get_voice_config()
        model_config = self.config_manager.get_bedrock_model_config()
        db_config = self.config_manager.get_database_config()
        loc_config = self.config_manager.get_localization_config()
        prompt_config = self.config_manager.get_prompt_config()

        self.db_manager = DatabaseManager(db_config)
        self.tts = VoiceTTSComponent(voice_config)
        self.stt = VoiceSTTComponent(voice_config)

        # Localization to pull/generate lesson scripts
        transformer = ContentTransformationComponent(model_config, prompt_config)
        rag = RAGPipelineComponent(self.db_manager, transformer)
        simplifier = SimplificationComponent(model_config, prompt_config)
        self.localization = LocalizationComponent(
            localization_config=loc_config,
            simplification_component=simplifier,
            rag_component=rag,
            db_manager=self.db_manager,
        )

    def generate_voice_lesson(
        self,
        concept_code: str,
        target_language: str = "hi",
        target_dialect: Optional[str] = None,
        grade_level: int = 3,
    ) -> VoiceLessonEntity:
        """Generates voice audio files for a concept's explanation, story narrative, and voice script."""
        try:
            logger.info(f"Phase 5: Generating voice lesson for concept '{concept_code}' ({target_language})")

            # 1. Fetch / generate localized lesson text
            lesson = self.localization.generate_localized_lesson(
                concept_code=concept_code,
                target_language=target_language,
                target_dialect=target_dialect,
                grade_level=grade_level,
            )

            # 2. Synthesize audio segments
            voice_pkg = self.tts.synthesize_lesson_package(lesson)

            # 3. Save to database
            self._save_voice_lesson(voice_pkg)

            return voice_pkg
        except Exception as e:
            logger.error(f"Voice lesson synthesis failed: {e}")
            raise AarohException(e, sys)

    def synthesize_custom_text(
        self,
        text: str,
        section_name: str = "custom",
        target_language: str = "hi",
        target_dialect: Optional[str] = None,
    ) -> AudioSegmentEntity:
        """Synthesizes any custom text into an audio file."""
        return self.tts.synthesize_text(
            text=text,
            section_name=section_name,
            target_language=target_language,
            target_dialect=target_dialect,
        )

    def process_oral_quiz_answer(
        self,
        quiz_id: str,
        question_id: str,
        student_id: str,
        audio_file_path: str,
        expected_answer: str,
        target_language: str = "hi",
    ) -> OralQuizResultEntity:
        """Transcribes student oral response, grades it, and synthesizes spoken feedback audio."""
        try:
            # 1. Transcribe spoken audio
            transcription = self.stt.transcribe_audio(
                audio_file_path=audio_file_path,
                hint_language=target_language,
            )

            # 2. Grade transcription against expected answer
            result = self.stt.grade_oral_answer(
                question_id=question_id,
                student_id=student_id,
                transcribed_text=transcription.transcribed_text,
                expected_answer=expected_answer,
                target_language=target_language,
            )

            # 3. Synthesize verbal feedback audio for the child
            feedback_audio = self.tts.synthesize_text(
                text=result.feedback_audio_script,
                section_name="oral_feedback",
                target_language=target_language,
            )
            result.feedback_audio_path = feedback_audio.audio_file_path

            # 4. Save attempt to database
            self._save_oral_attempt(quiz_id, result, audio_file_path)

            return result
        except Exception as e:
            logger.error(f"Oral quiz grading failed: {e}")
            raise AarohException(e, sys)

    def _save_voice_lesson(self, voice_pkg: VoiceLessonEntity):
        session = self.db_manager.get_session()
        try:
            segments_json = [
                {
                    "segment_id": s.segment_id,
                    "section_name": s.section_name,
                    "duration_seconds": s.duration_seconds,
                    "audio_file_path": s.audio_file_path,
                    "format": s.format,
                }
                for s in voice_pkg.segments
            ]
            primary_path = voice_pkg.segments[0].audio_file_path if voice_pkg.segments else ""
            model = VoiceLessonModel(
                concept_code=voice_pkg.concept_code,
                concept_name=voice_pkg.concept_name,
                target_language=voice_pkg.target_language,
                target_dialect=voice_pkg.target_dialect,
                audio_file_path=primary_path,
                segments=segments_json,
                total_duration_seconds=voice_pkg.total_duration_seconds,
            )
            session.add(model)
            session.commit()
            logger.info(f"Voice lesson for '{voice_pkg.concept_code}' saved in DB.")
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to save voice lesson model: {e}")
        finally:
            session.close()

    def _save_oral_attempt(self, quiz_id: str, result: OralQuizResultEntity, original_audio_path: str):
        session = self.db_manager.get_session()
        try:
            model = OralQuizAttemptModel(
                student_id=result.student_id,
                quiz_id=quiz_id,
                question_id=result.question_id,
                audio_file_path=original_audio_path,
                transcribed_text=result.transcribed_speech,
                expected_answer=result.expected_answer,
                is_correct=result.is_correct,
                confidence_score=result.confidence_score,
                feedback_audio_path=result.feedback_audio_path,
            )
            session.add(model)
            session.commit()
            logger.info(f"Oral quiz attempt saved for student '{result.student_id}'.")
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to save oral attempt: {e}")
        finally:
            session.close()
