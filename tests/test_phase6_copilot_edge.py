import sys
from pathlib import Path
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.aaroh.pipeline.copilot_edge_pipeline import CopilotEdgePipeline


def test_phase6_copilot_edge_pipeline():
    pipeline = CopilotEdgePipeline()

    concept_code = "EVS-G3-WAT-01"

    # 1. Test Multigrade Lesson Plan Generation
    plan = pipeline.generate_lesson_plan(
        concept_code=concept_code,
        grade_level=3,
        target_language="hi",
        target_dialect="gon",
        duration_mins=45,
    )
    assert plan is not None
    assert plan.plan_id != ""
    assert "Grade 3" in plan.multigrade_strategies
    assert "Grade 4" in plan.multigrade_strategies
    assert len(plan.teaching_aids) >= 2
    assert plan.blackboard_activity != ""
    print(f"\nMultigrade Lesson Plan Generated: {plan.title} (ID: {plan.plan_id})")
    print(f"  - Time Allocation: {plan.time_allocation_mins}")
    print(f"  - Multigrade Differentiation: {list(plan.multigrade_strategies.keys())}")

    # 2. Test Remedial Teaching Aid Generation
    aid = pipeline.generate_remedial_aid(
        concept_code=concept_code,
        weak_bloom_level="Understand",
        target_language="hi",
    )
    assert aid is not None
    assert aid.aid_id != ""
    assert len(aid.check_questions) >= 1
    assert "REMEDIAL" in aid.printable_guide
    print(f"\nRemedial Teaching Aid: {aid.concept_name}")
    print(f"  - Gap Summary: {aid.identified_gap_summary}")
    print(f"  - Simplified Activity: {aid.simplified_activity[:80]}...")

    # 3. Test Offline Edge Package Export (ZIP bundle)
    pkg = pipeline.export_offline_bundle(
        grade_level=3,
        subject="Environmental Studies",
        target_language="hi",
        target_dialect="gon",
    )
    assert pkg is not None
    assert Path(pkg.package_zip_path).exists()
    assert pkg.package_size_bytes > 0
    assert pkg.total_lessons >= 1
    assert pkg.total_quizzes >= 1
    assert pkg.total_audio_files >= 1
    print(f"\nOffline Package Exported:")
    print(f"  - Package Name: {pkg.package_name}")
    print(f"  - Size: {pkg.package_size_bytes} bytes")
    print(f"  - Lessons: {pkg.total_lessons}, Quizzes: {pkg.total_quizzes}, Audio: {pkg.total_audio_files}")

    # 4. Test Offline Sync Import (Ingesting offline kiosk attempts)
    sync_payload = {
        "batch_id": "batch_kiosk_bastar_001",
        "device_id": "rpi_kiosk_school_14",
        "school_id": "bastar_primary_gov_school",
        "submissions": [
            {
                "submission_id": "sub_offline_001",
                "quiz_id": "quiz_offline_1",
                "student_id": "student_chamru_05",
                "concept_code": "EVS-G3-WAT-01",
                "answers": [{"question_id": "Q1", "student_answer": "B", "is_correct": True}],
                "score_pct": 100.0,
                "teacher_insight": "Mastered water cycle basics.",
            }
        ],
    }
    sync_res = pipeline.sync_offline_attempts(sync_payload)
    assert sync_res is not None
    assert sync_res.total_submissions == 1
    print(f"\nOffline Sync Batch Ingested: {sync_res.batch_id} ({sync_res.total_submissions} attempts)")

    # 5. Test Classroom Mastery Heatmap
    heatmap = pipeline.get_classroom_mastery_heatmap()
    assert len(heatmap) >= 1
    assert any(h["concept_code"] == "EVS-G3-WAT-01" for h in heatmap)
    print(f"\nClassroom Mastery Heatmap: {len(heatmap)} concepts tracked.")
    for h in heatmap:
        print(f"  - [{h['concept_code']}] {h['concept_name']}: Avg Score={h['average_score_pct']}% | Status={h['status']}")


if __name__ == "__main__":
    test_phase6_copilot_edge_pipeline()
    print("\nPhase 6 Teacher Copilot & Offline Edge Sync Pipeline Tests Passed!")
