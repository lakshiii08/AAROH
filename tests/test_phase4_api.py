import sys
from pathlib import Path
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)


def test_root_shows_phase4():
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert "4" in data["phase"]
    assert any("Quiz Generation" in p for p in data["phases_active"])


def test_generate_quiz_api():
    r = client.post(
        "/api/v1/assessment/quizzes/generate",
        json={
            "concept_code": "EVS-G3-WAT-01",
            "target_language": "hi",
            "target_dialect": "gon",
            "grade_level": 3,
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert "quiz_id" in data
    assert len(data["questions"]) >= 3
    print(f"\nQuiz API returned {len(data['questions'])} questions for quiz_id: {data['quiz_id']}")


def test_submit_quiz_perfect_score_api():
    # 1. Generate quiz
    gen_r = client.post(
        "/api/v1/assessment/quizzes/generate",
        json={"concept_code": "EVS-G3-WAT-01", "target_language": "hi", "grade_level": 3},
    )
    quiz_data = gen_r.json()
    quiz_id = quiz_data["quiz_id"]

    # 2. Submit answers (Q1: B, Q2: C, Q3: B, Q4: vashpikaran, Q5: False)
    answers = {
        "Q1": "B",
        "Q2": "C",
        "Q3": "B",
        "Q4": "vashpikaran",
        "Q5": "False",
    }
    r = client.post(
        f"/api/v1/assessment/quizzes/{quiz_id}/submit",
        json={"student_id": "student_deepa_03", "answers": answers},
    )
    assert r.status_code == 200
    res = r.json()["data"]
    assert res["score_pct"] == 100.0
    assert res["needs_remedial"] is False
    print(f"\nAPI Perfect Score: {res['score_pct']}% | Remedial: {res['needs_remedial']}")


def test_submit_quiz_low_score_triggers_remedial_api():
    gen_r = client.post(
        "/api/v1/assessment/quizzes/generate",
        json={"concept_code": "EVS-G3-WAT-01", "target_language": "hi", "grade_level": 3},
    )
    quiz_id = gen_r.json()["quiz_id"]

    answers = {
        "Q1": "A",  # wrong
        "Q2": "A",  # wrong
        "Q3": "A",  # wrong
        "Q4": "galat",  # wrong
        "Q5": "True",  # wrong
    }
    r = client.post(
        f"/api/v1/assessment/quizzes/{quiz_id}/submit",
        json={"student_id": "student_vikram_04", "answers": answers},
    )
    assert r.status_code == 200
    res = r.json()["data"]
    assert res["score_pct"] == 0.0
    assert res["needs_remedial"] is True
    assert res["remedial_lesson"] is not None
    assert "simplified_explanation" in res["remedial_lesson"]
    print(f"\nAPI Low Score: {res['score_pct']}% | Remedial Lesson Attached: True")
    print(f"Teacher Insight: {res['teacher_insight']}")


def test_student_history_api():
    r = client.get("/api/v1/assessment/students/student_vikram_04/history")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert data["total_submissions"] >= 1
    print(f"\nStudent History: {data['total_submissions']} submissions recorded.")


def test_teacher_class_report_api():
    r = client.get("/api/v1/assessment/teachers/reports/EVS-G3-WAT-01")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    report = data["report"]
    assert report["total_students"] >= 1
    print(f"\nTeacher Class Report API:")
    print(f"  - Total Students: {report['total_students']}")
    print(f"  - Class Average: {report['class_average_score_pct']}%")
    print(f"  - Remedial Required: {report['remedial_required_count']}")


if __name__ == "__main__":
    test_root_shows_phase4()
    test_generate_quiz_api()
    test_submit_quiz_perfect_score_api()
    test_submit_quiz_low_score_triggers_remedial_api()
    test_student_history_api()
    test_teacher_class_report_api()
    print("\nAll Phase 4 API Tests Passed Successfully!")
