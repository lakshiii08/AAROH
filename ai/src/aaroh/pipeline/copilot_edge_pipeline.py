import uuid
import sys
from typing import Optional, List, Dict, Any
from pathlib import Path

from src.aaroh.configuration.configuration import ConfigurationManager
from src.aaroh.entity.artifact_entity import (
    LessonPlanEntity,
    RemedialTeachingAidEntity,
    OfflinePackageMetadataEntity,
    SyncPayloadEntity,
    ClassroomMasteryEntity,
    ConceptEntity,
)
from src.aaroh.components.teacher_copilot import TeacherCopilotComponent
from src.aaroh.components.edge_sync import EdgeSyncComponent
from src.aaroh.components.localization import LocalizationComponent
from src.aaroh.components.simplification import SimplificationComponent
from src.aaroh.components.rag_pipeline import RAGPipelineComponent
from src.aaroh.components.content_transformation import ContentTransformationComponent
from src.aaroh.components.quiz_generator import QuizGeneratorComponent
from src.aaroh.components.voice_tts import VoiceTTSComponent
from src.aaroh.database.session import DatabaseManager
from src.aaroh.database.models import (
    ConceptModel,
    DocumentModel,
    LessonPlanModel,
    OfflinePackageModel,
    AssessmentResultModel,
)
from src.aaroh.utils.logger import logger
from src.aaroh.utils.exception import AarohException


class CopilotEdgePipeline:
    """Orchestrates Phase 6: Teacher AI Copilot, Remedial Aids, Offline Edge Bundling,
    and Classroom Progress Mastery Analytics.
    """

    def __init__(self, config_manager: Optional[ConfigurationManager] = None):
        self.config_manager = config_manager or ConfigurationManager()

        copilot_config = self.config_manager.get_copilot_edge_config()
        model_config = self.config_manager.get_bedrock_model_config()
        db_config = self.config_manager.get_database_config()
        loc_config = self.config_manager.get_localization_config()
        voice_config = self.config_manager.get_voice_config()
        prompt_config = self.config_manager.get_prompt_config()

        self.db_manager = DatabaseManager(db_config)
        self.copilot = TeacherCopilotComponent(model_config, copilot_config, prompt_config)
        self.edge_sync = EdgeSyncComponent(copilot_config)

        transformer = ContentTransformationComponent(model_config, prompt_config)
        rag = RAGPipelineComponent(self.db_manager, transformer)
        simplifier = SimplificationComponent(model_config, prompt_config)
        self.localization = LocalizationComponent(
            localization_config=loc_config,
            simplification_component=simplifier,
            rag_component=rag,
            db_manager=self.db_manager,
        )
        self.quiz_gen = QuizGeneratorComponent(model_config, prompt_config)
        self.tts = VoiceTTSComponent(voice_config)

    def generate_lesson_plan(
        self,
        concept_code: str,
        grade_level: int = 3,
        target_language: str = "hi",
        target_dialect: Optional[str] = None,
        duration_mins: int = 45,
    ) -> LessonPlanEntity:
        """Generates a multigrade lesson plan for rural teachers."""
        try:
            concept = self._fetch_concept(concept_code)
            if not concept:
                raise AarohException(f"Concept '{concept_code}' not found.")

            plan = self.copilot.generate_multigrade_lesson_plan(
                concept=concept,
                grade_level=grade_level,
                target_language=target_language,
                target_dialect=target_dialect,
                duration_mins=duration_mins,
            )

            self._save_lesson_plan(plan)
            return plan
        except Exception as e:
            logger.error(f"Lesson plan generation failed: {e}")
            raise AarohException(e, sys)

    def generate_remedial_aid(
        self,
        concept_code: str,
        weak_bloom_level: str = "Understand",
        target_language: str = "hi",
    ) -> RemedialTeachingAidEntity:
        """Generates targeted remedial aid for teachers."""
        try:
            concept = self._fetch_concept(concept_code)
            if not concept:
                raise AarohException(f"Concept '{concept_code}' not found.")

            return self.copilot.generate_remedial_teaching_aid(
                concept=concept,
                weak_bloom_level=weak_bloom_level,
                target_language=target_language,
            )
        except Exception as e:
            logger.error(f"Remedial aid generation failed: {e}")
            raise AarohException(e, sys)

    def export_offline_bundle(
        self,
        grade_level: int = 3,
        subject: str = "Environmental Studies",
        target_language: str = "hi",
        target_dialect: Optional[str] = None,
    ) -> OfflinePackageMetadataEntity:
        """Exports a full offline package containing lessons, audio tracks, and quizzes."""
        try:
            session = self.db_manager.get_session()
            concepts = session.query(ConceptModel).all()
            session.close()

            if not concepts:
                raise AarohException("No concepts found in database to package.")

            lessons_data = []
            quizzes_data = []
            audio_paths = []

            for c in concepts[:3]:
                # 1. Localize lesson
                loc_lesson = self.localization.generate_localized_lesson(
                    concept_code=c.concept_code,
                    target_language=target_language,
                    target_dialect=target_dialect,
                    grade_level=grade_level,
                )
                lessons_data.append({
                    "concept_code": loc_lesson.concept_code,
                    "concept_name": loc_lesson.concept_name,
                    "simplified_explanation": loc_lesson.simplified_explanation,
                    "story_narrative": loc_lesson.story_narrative,
                    "hands_on_activity": loc_lesson.hands_on_activity,
                    "voice_script": loc_lesson.voice_script,
                })

                # 2. Generate Quiz
                c_entity = ConceptEntity(
                    concept_code=c.concept_code,
                    name=c.name,
                    definition=c.definition,
                    blooms_level=c.blooms_level,
                    difficulty_level=c.difficulty_level,
                    rural_tribal_anchors=c.rural_tribal_anchors or [],
                )
                quiz = self.quiz_gen.generate_quiz(
                    concept=c_entity,
                    localized_explanation=loc_lesson.simplified_explanation,
                    grade_level=grade_level,
                    target_language=target_language,
                )
                quizzes_data.append({
                    "quiz_id": quiz.quiz_id,
                    "concept_code": quiz.concept_code,
                    "questions": [
                        {
                            "question_id": q.question_id,
                            "question_type": q.question_type,
                            "question_text": q.question_text,
                            "options": q.options,
                            "correct_answer": q.correct_answer,
                        }
                        for q in quiz.questions
                    ],
                })

                # 3. Audio track
                audio_seg = self.tts.synthesize_text(
                    text=loc_lesson.voice_script or loc_lesson.simplified_explanation,
                    section_name=f"track_{c.concept_code}",
                    target_language=target_language,
                )
                audio_paths.append(audio_seg.audio_file_path)

            glossary_terms = [
                {"term": "water", "hi": "paani", "gon": "yer", "sat": "daah"},
                {"term": "well", "hi": "kuan", "gon": "bodi", "sat": "kuan"},
                {"term": "pot", "hi": "matka", "gon": "gadga", "sat": "tumbah"},
            ]

            pkg = self.edge_sync.export_offline_package(
                grade_level=grade_level,
                subject=subject,
                target_language=target_language,
                target_dialect=target_dialect,
                lessons=lessons_data,
                quizzes=quizzes_data,
                audio_file_paths=audio_paths,
                glossary_terms=glossary_terms,
            )

            self._save_offline_package_record(pkg)
            return pkg
        except Exception as e:
            logger.error(f"Offline bundle export failed: {e}")
            raise AarohException(e, sys)

    def sync_offline_attempts(self, payload: Dict[str, Any]) -> SyncPayloadEntity:
        """Ingests offline attempts from edge devices into central database."""
        return self.edge_sync.import_and_sync_offline_attempts(
            payload=payload,
            db_manager=self.db_manager,
        )

    def get_classroom_mastery_heatmap(self) -> List[Dict[str, Any]]:
        """Calculates concept mastery rates for teacher dashboard."""
        session = self.db_manager.get_session()
        try:
            concepts = session.query(ConceptModel).all()
            heatmap = []
            for c in concepts:
                assessments = session.query(AssessmentResultModel).filter_by(concept_code=c.concept_code).all()
                total = len(assessments)
                if total > 0:
                    avg_score = round(sum(a.score_pct for a in assessments) / total, 2)
                    mastery_count = sum(1 for a in assessments if a.score_pct >= 70.0)
                    mastery_rate = round((mastery_count / total) * 100, 2)
                else:
                    avg_score = 0.0
                    mastery_rate = 0.0

                heatmap.append({
                    "concept_code": c.concept_code,
                    "concept_name": c.name,
                    "blooms_level": c.blooms_level,
                    "total_students_assessed": total,
                    "average_score_pct": avg_score,
                    "mastery_rate_pct": mastery_rate,
                    "status": "MASTERED" if mastery_rate >= 75.0 else ("DEVELOPING" if total > 0 else "UNASSESSED"),
                })
            return heatmap
        finally:
            session.close()

    def _fetch_concept(self, concept_code: str) -> Optional[ConceptEntity]:
        session = self.db_manager.get_session()
        try:
            c = session.query(ConceptModel).filter_by(concept_code=concept_code).first()
            if not c:
                return None
            return ConceptEntity(
                concept_code=c.concept_code,
                name=c.name,
                definition=c.definition,
                blooms_level=c.blooms_level,
                difficulty_level=c.difficulty_level,
                prerequisite_concepts=c.prerequisite_concepts or [],
                rural_tribal_anchors=c.rural_tribal_anchors or [],
                key_vocabulary=c.key_vocabulary or [],
            )
        finally:
            session.close()

    def _save_lesson_plan(self, plan: LessonPlanEntity):
        session = self.db_manager.get_session()
        try:
            content_json = {
                "title": plan.title,
                "time_allocation": plan.time_allocation_mins,
                "multigrade_strategies": plan.multigrade_strategies,
                "blackboard_activity": plan.blackboard_activity,
                "teaching_aids": plan.teaching_aids,
                "hands_on_experiments": plan.hands_on_experiments,
                "homework": plan.homework_village_inquiry,
            }
            model = LessonPlanModel(
                id=plan.plan_id,
                title=plan.title,
                grade_level=plan.grade_level,
                target_language=plan.target_language,
                target_dialect=plan.target_dialect,
                concept_codes=plan.concept_codes,
                content_json=content_json,
            )
            session.add(model)
            session.commit()
            logger.info(f"Lesson plan '{plan.plan_id}' saved to DB.")
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to save lesson plan: {e}")
        finally:
            session.close()

    def _save_offline_package_record(self, pkg: OfflinePackageMetadataEntity):
        session = self.db_manager.get_session()
        try:
            model = OfflinePackageModel(
                id=pkg.package_id,
                package_name=pkg.package_name,
                grade_level=pkg.grade_level,
                subject=pkg.subject,
                target_language=pkg.target_language,
                target_dialect=pkg.target_dialect,
                zip_file_path=pkg.package_zip_path,
                file_size_bytes=pkg.package_size_bytes,
                metadata_json={
                    "total_lessons": pkg.total_lessons,
                    "total_quizzes": pkg.total_quizzes,
                    "total_audio_files": pkg.total_audio_files,
                },
            )
            session.add(model)
            session.commit()
            logger.info(f"Offline package record '{pkg.package_id}' saved.")
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to save offline package record: {e}")
        finally:
            session.close()
