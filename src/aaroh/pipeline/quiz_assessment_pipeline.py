import uuid
import sys
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from src.aaroh.configuration.configuration import ConfigurationManager
from src.aaroh.entity.artifact_entity import (
    QuizEntity,
    QuizQuestionEntity,
    QuizSubmissionEntity,
    AssessmentResultEntity,
    ConceptEntity,
    LocalizedLessonEntity,
)
from src.aaroh.components.quiz_generator import QuizGeneratorComponent
from src.aaroh.components.assessment_engine import AssessmentEngine
from src.aaroh.components.localization import LocalizationComponent
from src.aaroh.components.simplification import SimplificationComponent
from src.aaroh.components.rag_pipeline import RAGPipelineComponent
from src.aaroh.components.content_transformation import ContentTransformationComponent
from src.aaroh.database.session import DatabaseManager
from src.aaroh.database.models import (
    QuizModel,
    QuizSubmissionModel,
    AssessmentResultModel,
    ConceptModel,
    DocumentModel,
)
from src.aaroh.utils.logger import logger
from src.aaroh.utils.exception import AarohException


class QuizAssessmentPipeline:
    """Orchestrates Phase 4: Quiz Generation, Student Assessment, Gap Analysis,
    and Remedial Lesson Triggering.
    """

    def __init__(self, config_manager: Optional[ConfigurationManager] = None):
        self.config_manager = config_manager or ConfigurationManager()

        model_config = self.config_manager.get_bedrock_model_config()
        db_config = self.config_manager.get_database_config()
        loc_config = self.config_manager.get_localization_config()
        quiz_config = self.config_manager.get_quiz_config()
        prompt_config = self.config_manager.get_prompt_config()

        self.db_manager = DatabaseManager(db_config)
        self.quiz_generator = QuizGeneratorComponent(model_config, prompt_config)
        self.assessment_engine = AssessmentEngine(
            remedial_threshold_pct=quiz_config.remedial_threshold_pct
        )

        # Localization component to generate remedial lessons & contextual lessons
        transformer = ContentTransformationComponent(model_config, prompt_config)
        rag = RAGPipelineComponent(self.db_manager, transformer)
        simplifier = SimplificationComponent(model_config, prompt_config)
        self.localization_component = LocalizationComponent(
            localization_config=loc_config,
            simplification_component=simplifier,
            rag_component=rag,
            db_manager=self.db_manager,
        )

    def generate_quiz_for_concept(
        self,
        concept_code: str,
        target_language: str = "hi",
        target_dialect: Optional[str] = None,
        grade_level: int = 3,
    ) -> QuizEntity:
        """Generates and persists a customized quiz for a concept."""
        try:
            concept_entity = self._fetch_concept(concept_code)
            if not concept_entity:
                raise AarohException(f"Concept '{concept_code}' not found in database.")

            # Get simplified explanation to anchor questions
            localized_lesson = self.localization_component.generate_localized_lesson(
                concept_code=concept_code,
                target_language=target_language,
                target_dialect=target_dialect,
                grade_level=grade_level,
            )

            quiz = self.quiz_generator.generate_quiz(
                concept=concept_entity,
                localized_explanation=localized_lesson.simplified_explanation,
                grade_level=grade_level,
                target_language=target_language,
                target_dialect=target_dialect,
            )

            # Persist to database
            self._save_quiz_model(quiz)
            return quiz
        except Exception as e:
            logger.error(f"Quiz generation failed: {e}")
            raise AarohException(e, sys)

    def submit_and_assess_quiz(
        self,
        quiz_id: str,
        student_id: str,
        answers: Dict[str, str],  # {question_id: student_answer}
    ) -> Dict[str, Any]:
        """Scores submission, detects concept gaps, and attaches remedial lesson if score < threshold."""
        try:
            quiz = self._fetch_quiz(quiz_id)
            if not quiz:
                raise AarohException(f"Quiz '{quiz_id}' not found.")

            # 1. Score submission
            submission = self.assessment_engine.score_submission(quiz, student_id, answers)

            # 2. Analyze learning gaps & teacher insight
            assessment = self.assessment_engine.analyse_gaps(quiz, submission)

            # 3. If remedial needed, fetch/generate remedial lesson
            remedial_lesson = None
            if assessment.needs_remedial:
                logger.info(f"Triggering remedial lesson for student '{student_id}' (score: {submission.score_pct}%)")
                remedial_lesson = self.localization_component.generate_localized_lesson(
                    concept_code=quiz.concept_code,
                    target_language=quiz.target_language,
                    target_dialect=quiz.target_dialect,
                    grade_level=quiz.grade_level,
                )

            # 4. Save submission & assessment to database
            self._save_submission_and_assessment(submission, assessment)

            return {
                "submission_id": submission.submission_id,
                "quiz_id": quiz.quiz_id,
                "student_id": student_id,
                "concept_code": quiz.concept_code,
                "concept_name": quiz.concept_name,
                "score_pct": submission.score_pct,
                "needs_remedial": assessment.needs_remedial,
                "total_questions": len(quiz.questions),
                "correct_count": sum(1 for a in submission.answers if a.is_correct),
                "answers": [
                    {
                        "question_id": a.question_id,
                        "student_answer": a.student_answer,
                        "is_correct": a.is_correct,
                    }
                    for a in submission.answers
                ],
                "learning_gaps": [
                    {
                        "blooms_level": g.blooms_level,
                        "gap_severity": g.gap_severity,
                        "remedial_suggested": g.remedial_suggested,
                        "wrong_answers": g.wrong_answers,
                    }
                    for g in assessment.gaps
                ],
                "teacher_insight": assessment.teacher_insight,
                "remedial_lesson": {
                    "simplified_explanation": remedial_lesson.simplified_explanation,
                    "story_narrative": remedial_lesson.story_narrative,
                    "hands_on_activity": remedial_lesson.hands_on_activity,
                    "voice_script": remedial_lesson.voice_script,
                } if remedial_lesson else None,
            }
        except Exception as e:
            logger.error(f"Quiz assessment failed: {e}")
            raise AarohException(e, sys)

    def get_student_history(self, student_id: str) -> List[Dict[str, Any]]:
        """Fetches history of submissions and assessments for a student."""
        session = self.db_manager.get_session()
        try:
            submissions = (
                session.query(QuizSubmissionModel)
                .filter_by(student_id=student_id)
                .order_by(QuizSubmissionModel.submitted_at.desc())
                .all()
            )
            history = []
            for s in submissions:
                assessment = s.assessment
                history.append({
                    "submission_id": s.id,
                    "quiz_id": s.quiz_id,
                    "concept_code": s.concept_code,
                    "score_pct": s.score_pct,
                    "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
                    "needs_remedial": assessment.needs_remedial if assessment else False,
                    "teacher_insight": assessment.teacher_insight if assessment else None,
                    "gaps_count": len(assessment.gaps) if assessment and assessment.gaps else 0,
                })
            return history
        finally:
            session.close()

    def get_class_report(self, concept_code: str) -> Dict[str, Any]:
        """Aggregates class results for a concept to generate teacher insights report."""
        session = self.db_manager.get_session()
        try:
            assessments = session.query(AssessmentResultModel).filter_by(concept_code=concept_code).all()
            if not assessments:
                return {
                    "concept_code": concept_code,
                    "total_students": 0,
                    "message": f"No assessment submissions found for concept '{concept_code}'.",
                }

            result_entities = []
            for a in assessments:
                result_entities.append(AssessmentResultEntity(
                    student_id=a.student_id,
                    quiz_id=a.submission.quiz_id if a.submission else "",
                    concept_code=a.concept_code,
                    score_pct=a.score_pct,
                    grade_level=3,
                    target_language="hi",
                    gaps=[
                        type("LearningGap", (), g)() if isinstance(g, dict) else g
                        for g in (a.gaps or [])
                    ] if False else [],  # handled in report helper
                    remedial_concepts=a.remedial_concepts or [],
                    teacher_insight=a.teacher_insight or "",
                    needs_remedial=a.needs_remedial,
                ))

            # Direct aggregation
            total = len(assessments)
            avg_score = round(sum(a.score_pct for a in assessments) / total, 2)
            remedial_students = [a.student_id for a in assessments if a.needs_remedial]

            bloom_gap_counts: Dict[str, int] = {}
            for a in assessments:
                for g in (a.gaps or []):
                    bloom = g.get("blooms_level", "Unknown") if isinstance(g, dict) else getattr(g, "blooms_level", "Unknown")
                    bloom_gap_counts[bloom] = bloom_gap_counts.get(bloom, 0) + 1

            weakest_bloom = max(bloom_gap_counts, key=bloom_gap_counts.get) if bloom_gap_counts else "None"

            return {
                "concept_code": concept_code,
                "total_students": total,
                "class_average_score_pct": avg_score,
                "remedial_required_count": len(remedial_students),
                "students_needing_remedial": remedial_students,
                "weakest_bloom_level": weakest_bloom,
                "gap_distribution": bloom_gap_counts,
                "actionable_recommendation": (
                    f"Class average score for concept '{concept_code}' is {avg_score}%. "
                    + (f"Immediate remedial session recommended for {len(remedial_students)} students on '{weakest_bloom}' level concepts."
                       if remedial_students else "All students demonstrated solid concept mastery.")
                ),
            }
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

    def _fetch_quiz(self, quiz_id: str) -> Optional[QuizEntity]:
        session = self.db_manager.get_session()
        try:
            m = session.query(QuizModel).filter_by(id=quiz_id).first()
            if not m:
                return None
            questions = [
                QuizQuestionEntity(
                    question_id=q.get("question_id", ""),
                    concept_code=m.concept_code,
                    question_type=q.get("question_type", "mcq"),
                    question_text=q.get("question_text", ""),
                    options=q.get("options", []),
                    correct_answer=q.get("correct_answer", ""),
                    explanation=q.get("explanation", ""),
                    blooms_level=q.get("blooms_level", "Remember"),
                    difficulty_level=q.get("difficulty_level", 1),
                    cultural_anchor=q.get("cultural_anchor"),
                )
                for q in (m.questions or [])
            ]
            return QuizEntity(
                quiz_id=m.id,
                concept_code=m.concept_code,
                concept_name=m.concept_name or m.concept_code,
                grade_level=m.grade_level,
                target_language=m.target_language,
                target_dialect=m.target_dialect,
                questions=questions,
            )
        finally:
            session.close()

    def _save_quiz_model(self, quiz: QuizEntity):
        session = self.db_manager.get_session()
        try:
            questions_json = [
                {
                    "question_id": q.question_id,
                    "question_type": q.question_type,
                    "question_text": q.question_text,
                    "options": q.options,
                    "correct_answer": q.correct_answer,
                    "explanation": q.explanation,
                    "blooms_level": q.blooms_level,
                    "difficulty_level": q.difficulty_level,
                    "cultural_anchor": q.cultural_anchor,
                }
                for q in quiz.questions
            ]
            quiz_model = QuizModel(
                id=quiz.quiz_id,
                concept_code=quiz.concept_code,
                concept_name=quiz.concept_name,
                grade_level=quiz.grade_level,
                target_language=quiz.target_language,
                target_dialect=quiz.target_dialect,
                questions=questions_json,
                total_questions=len(quiz.questions),
            )
            session.add(quiz_model)
            session.commit()
            logger.info(f"Quiz '{quiz.quiz_id}' saved to database.")
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to save quiz: {e}")
            raise
        finally:
            session.close()

    def _save_submission_and_assessment(
        self,
        submission: QuizSubmissionEntity,
        assessment: AssessmentResultEntity,
    ):
        session = self.db_manager.get_session()
        try:
            sub_model = QuizSubmissionModel(
                id=submission.submission_id,
                quiz_id=submission.quiz_id,
                student_id=submission.student_id,
                concept_code=submission.concept_code,
                answers=[
                    {
                        "question_id": a.question_id,
                        "student_answer": a.student_answer,
                        "is_correct": a.is_correct,
                    }
                    for a in submission.answers
                ],
                score_pct=submission.score_pct,
            )
            session.add(sub_model)

            gaps_json = [
                {
                    "concept_code": g.concept_code,
                    "concept_name": g.concept_name,
                    "blooms_level": g.blooms_level,
                    "gap_severity": g.gap_severity,
                    "weak_question_ids": g.weak_question_ids,
                    "wrong_answers": g.wrong_answers,
                    "remedial_suggested": g.remedial_suggested,
                }
                for g in assessment.gaps
            ]
            assess_model = AssessmentResultModel(
                submission_id=submission.submission_id,
                student_id=assessment.student_id,
                concept_code=assessment.concept_code,
                score_pct=assessment.score_pct,
                gaps=gaps_json,
                remedial_concepts=assessment.remedial_concepts,
                teacher_insight=assessment.teacher_insight,
                needs_remedial=assessment.needs_remedial,
            )
            session.add(assess_model)

            session.commit()
            logger.info(f"Submission '{submission.submission_id}' and assessment saved.")
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to save submission/assessment: {e}")
            raise
        finally:
            session.close()
