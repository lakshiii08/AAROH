import sys
from pathlib import Path
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.aaroh.pipeline.quiz_assessment_pipeline import QuizAssessmentPipeline
from src.aaroh.database.models import ConceptModel


def test_phase4_quiz_generation_and_assessment():
    pipeline = QuizAssessmentPipeline()

    # 1. Generate Quiz for EVS water concept
    concept_code = "EVS-G3-WAT-01"
    quiz = pipeline.generate_quiz_for_concept(
        concept_code=concept_code,
        target_language="hi",
        target_dialect="gon",
        grade_level=3,
    )

    assert quiz is not None
    assert quiz.concept_code == concept_code
    assert len(quiz.questions) >= 3
    print(f"\nQuiz Generated: {quiz.quiz_id} with {len(quiz.questions)} questions")
    for q in quiz.questions:
        print(f"  - [{q.question_type.upper()}] {q.question_text[:60]}... (Answer: {q.correct_answer})")

    # 2. Perfect submission (100% score) -> No remedial
    answers_perfect = {q.question_id: q.correct_answer for q in quiz.questions}
    result_perfect = pipeline.submit_and_assess_quiz(
        quiz_id=quiz.quiz_id,
        student_id="student_soma_01",
        answers=answers_perfect,
    )
    assert result_perfect["score_pct"] == 100.0
    assert result_perfect["needs_remedial"] is False
    assert result_perfect["remedial_lesson"] is None
    print(f"\nPerfect Student Score: {result_perfect['score_pct']}% | Remedial: {result_perfect['needs_remedial']}")
    print(f"Teacher Insight: {result_perfect['teacher_insight']}")

    # 3. Low-scoring submission (<60% score) -> Remedial Triggered
    # Deliberately submit wrong answers
    answers_low = {q.question_id: "WRONG_ANSWER" for q in quiz.questions}
    result_low = pipeline.submit_and_assess_quiz(
        quiz_id=quiz.quiz_id,
        student_id="student_ramu_02",
        answers=answers_low,
    )
    assert result_low["score_pct"] == 0.0
    assert result_low["needs_remedial"] is True
    assert result_low["remedial_lesson"] is not None
    assert len(result_low["learning_gaps"]) > 0
    print(f"\nLow Student Score: {result_low['score_pct']}% | Remedial: {result_low['needs_remedial']}")
    print(f"Learning Gaps Count: {len(result_low['learning_gaps'])}")
    print(f"Remedial Story (first 100 chars): {result_low['remedial_lesson']['story_narrative'][:100]}...")

    # 4. Student history
    history = pipeline.get_student_history("student_ramu_02")
    assert len(history) >= 1
    print(f"\nStudent 'student_ramu_02' Submissions: {len(history)}")

    # 5. Teacher Class Report
    class_report = pipeline.get_class_report(concept_code)
    assert class_report["total_students"] >= 2
    assert "student_ramu_02" in class_report["students_needing_remedial"]
    print(f"\nClass Report: Avg Score = {class_report['class_average_score_pct']}%")
    print(f"Students needing remedial: {class_report['students_needing_remedial']}")
    print(f"Teacher Recommendation: {class_report['actionable_recommendation']}")


if __name__ == "__main__":
    test_phase4_quiz_generation_and_assessment()
    print("\nPhase 4 Quiz & Assessment Pipeline Tests Passed!")
