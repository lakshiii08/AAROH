import uuid
from typing import List, Dict, Optional
from src.aaroh.entity.artifact_entity import (
    QuizEntity,
    QuizSubmissionEntity,
    StudentAnswerEntity,
    LearningGapEntity,
    AssessmentResultEntity,
    QuizQuestionEntity,
)
from src.aaroh.utils.logger import logger


class AssessmentEngine:
    """Scores quiz submissions, identifies concept-level learning gaps,
    and generates actionable teacher insights.

    Gap Severity:
      ≥ 80% correct  → no gap
      60–79%         → low gap    → encouragement tip
      40–59%         → medium gap → re-teach with different analogy
      < 40%          → critical   → full remedial lesson trigger
    """

    SEVERITY_THRESHOLDS = [
        (80, "none"),
        (60, "low"),
        (40, "medium"),
        (0,  "critical"),
    ]

    def __init__(self, remedial_threshold_pct: float = 60.0):
        self.remedial_threshold_pct = remedial_threshold_pct

    def score_submission(
        self,
        quiz: QuizEntity,
        student_id: str,
        raw_answers: Dict[str, str],   # {question_id: student_answer}
    ) -> QuizSubmissionEntity:
        """Scores a student's answers against correct answers in the quiz."""
        submission_id = str(uuid.uuid4())
        scored_answers: List[StudentAnswerEntity] = []

        for q in quiz.questions:
            student_ans = raw_answers.get(q.question_id, "")
            is_correct = self._check_answer(q, student_ans)
            scored_answers.append(StudentAnswerEntity(
                question_id=q.question_id,
                student_answer=student_ans,
                is_correct=is_correct,
            ))

        total = len(scored_answers)
        correct = sum(1 for a in scored_answers if a.is_correct)
        score_pct = round((correct / total) * 100, 2) if total > 0 else 0.0

        logger.info(f"Student '{student_id}' scored {score_pct}% on quiz '{quiz.quiz_id}'")
        return QuizSubmissionEntity(
            submission_id=submission_id,
            quiz_id=quiz.quiz_id,
            student_id=student_id,
            concept_code=quiz.concept_code,
            answers=scored_answers,
            score_pct=score_pct,
        )

    def analyse_gaps(
        self,
        quiz: QuizEntity,
        submission: QuizSubmissionEntity,
    ) -> AssessmentResultEntity:
        """Analyses concept-level learning gaps from a submission."""
        # Group wrong answers by Bloom's level
        wrong_map: Dict[str, List] = {}
        for ans in submission.answers:
            if not ans.is_correct:
                q = next((q for q in quiz.questions if q.question_id == ans.question_id), None)
                if q:
                    bloom = q.blooms_level
                    wrong_map.setdefault(bloom, []).append({
                        "question_id": q.question_id,
                        "question_text": q.question_text,
                        "correct_answer": q.correct_answer,
                        "student_answer": ans.student_answer,
                        "explanation": q.explanation,
                    })

        gaps: List[LearningGapEntity] = []
        if wrong_map:
            for blooms_level, wrong_qs in wrong_map.items():
                total_in_level = sum(1 for q in quiz.questions if q.blooms_level == blooms_level)
                wrong_count = len(wrong_qs)
                correct_pct = ((total_in_level - wrong_count) / total_in_level) * 100

                severity = self._gap_severity(correct_pct)
                if severity != "none":
                    gaps.append(LearningGapEntity(
                        concept_code=quiz.concept_code,
                        concept_name=quiz.concept_name,
                        blooms_level=blooms_level,
                        gap_severity=severity,
                        weak_question_ids=[w["question_id"] for w in wrong_qs],
                        wrong_answers=wrong_qs,
                        remedial_suggested=(severity in ["medium", "critical"]),
                    ))

        needs_remedial = submission.score_pct < self.remedial_threshold_pct
        remedial_concepts = [quiz.concept_code] if needs_remedial else []
        for g in gaps:
            if g.gap_severity == "critical" and quiz.concept_code not in remedial_concepts:
                remedial_concepts.append(quiz.concept_code)

        teacher_insight = self._generate_teacher_insight(
            quiz, submission, gaps, needs_remedial
        )

        return AssessmentResultEntity(
            student_id=submission.student_id,
            quiz_id=quiz.quiz_id,
            concept_code=quiz.concept_code,
            score_pct=submission.score_pct,
            grade_level=quiz.grade_level,
            target_language=quiz.target_language,
            gaps=gaps,
            remedial_concepts=remedial_concepts,
            teacher_insight=teacher_insight,
            needs_remedial=needs_remedial,
        )

    def _check_answer(self, q: QuizQuestionEntity, student_answer: str) -> bool:
        """Flexible answer checking — case-insensitive, strips whitespace."""
        correct = q.correct_answer.strip().lower()
        given = student_answer.strip().lower()

        if q.question_type == "mcq":
            # Accept "A", "a", "A)", "a)" all as matching correct "A"
            given = given.rstrip(")").strip()
            correct = correct.rstrip(")").strip()
            return given == correct

        if q.question_type == "true_false":
            # Accept "true"/"sach" and "false"/"jhooth" as synonyms
            true_words = {"true", "sach", "haan", "yes", "1"}
            false_words = {"false", "jhooth", "nahi", "no", "0"}
            if correct in true_words:
                return given in true_words
            return given in false_words

        # fill_blank — contains check (student may write full sentence)
        return correct in given or given == correct

    def _gap_severity(self, correct_pct: float) -> str:
        for threshold, severity in self.SEVERITY_THRESHOLDS:
            if correct_pct >= threshold:
                return severity
        return "critical"

    def _generate_teacher_insight(
        self,
        quiz: QuizEntity,
        submission: QuizSubmissionEntity,
        gaps: List[LearningGapEntity],
        needs_remedial: bool,
    ) -> str:
        """Builds a 1-paragraph teacher-facing insight in English."""
        student = submission.student_id
        score = submission.score_pct
        concept = quiz.concept_name
        lang = quiz.target_language

        if not gaps:
            return (
                f"Student '{student}' scored {score:.0f}% on '{concept}' — excellent performance! "
                f"The child has understood this concept well in {lang}. "
                f"Consider moving to the next concept or introducing an extension activity."
            )

        gap_summary = "; ".join(
            f"{g.blooms_level} level ({g.gap_severity} gap)" for g in gaps
        )
        remedial_note = (
            "A remedial lesson is recommended — re-teach using a different local analogy "
            "or hands-on activity before the next assessment."
            if needs_remedial
            else "Monitor with one follow-up question in the next class."
        )
        missed_qs = [w["question_text"][:60] for g in gaps for w in g.wrong_answers[:1]]
        missed_str = "\n  - ".join(missed_qs)
        return (
            f"Student '{student}' scored {score:.0f}% on '{concept}' (taught in {lang}). "
            f"Learning gaps detected at: {gap_summary}. "
            f"Key missed question(s): {missed_str}. "
            f"{remedial_note}"
        )

    def batch_teacher_report(
        self,
        results: List[AssessmentResultEntity],
    ) -> Dict:
        """Aggregates results across multiple students into a class-level teacher report."""
        total = len(results)
        if total == 0:
            return {"message": "No results to aggregate."}

        avg_score = round(sum(r.score_pct for r in results) / total, 2)
        needs_remedial = [r.student_id for r in results if r.needs_remedial]
        gap_bloom_counts: Dict[str, int] = {}
        for r in results:
            for g in r.gaps:
                gap_bloom_counts[g.blooms_level] = gap_bloom_counts.get(g.blooms_level, 0) + 1

        weakest_bloom = max(gap_bloom_counts, key=gap_bloom_counts.get) if gap_bloom_counts else "None"

        return {
            "concept_code": results[0].concept_code,
            "total_students": total,
            "class_average_score_pct": avg_score,
            "students_needing_remedial": needs_remedial,
            "remedial_count": len(needs_remedial),
            "weakest_bloom_level": weakest_bloom,
            "gap_distribution": gap_bloom_counts,
            "recommendation": (
                f"Re-teach '{weakest_bloom}' level questions for {len(needs_remedial)}/{total} students. "
                f"Class average is {avg_score:.0f}%. "
                + ("Focus on hands-on activities and village analogies." if avg_score < 60 else
                   "Class is performing well — move to next concept.")
            ),
        }
