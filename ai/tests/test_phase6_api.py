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


def test_root_shows_phase6():
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert "6" in data["phase"]
    assert any("Teacher Copilot" in p for p in data["phases_active"])


def test_generate_lesson_plan_api():
    r = client.post(
        "/api/v1/copilot/lesson-plans/generate",
        json={
            "concept_code": "EVS-G3-WAT-01",
            "grade_level": 3,
            "target_language": "hi",
            "target_dialect": "gon",
            "duration_mins": 45,
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert "plan_id" in data
    assert "multigrade_strategies" in data
    print(f"\nLesson Plan API: {data['title']} (Plan ID: {data['plan_id']})")


def test_generate_remedial_aid_api():
    r = client.post(
        "/api/v1/copilot/remedial-aid/generate",
        json={
            "concept_code": "EVS-G3-WAT-01",
            "weak_bloom_level": "Apply",
            "target_language": "hi",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert "printable_guide" in data
    print(f"\nRemedial Aid API: {data['concept_name']} (Aid ID: {data['aid_id']})")


def test_export_and_download_offline_bundle_api():
    # 1. Export Bundle
    r = client.post(
        "/api/v1/copilot/edge/packages/export",
        json={
            "grade_level": 3,
            "subject": "Environmental Studies",
            "target_language": "hi",
            "target_dialect": "gon",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert "download_url" in data
    assert data["total_lessons"] >= 1
    print(f"\nExport Offline Bundle API: {data['package_name']} ({data['package_size_bytes']} bytes)")

    # 2. Download Bundle
    download_url = data["download_url"]
    dl_r = client.get(download_url)
    assert dl_r.status_code == 200
    assert dl_r.headers["content-type"] == "application/zip"
    assert len(dl_r.content) > 100
    print(f"Download Offline Bundle API: Successfully downloaded {len(dl_r.content)} bytes.")


def test_edge_sync_import_api():
    r = client.post(
        "/api/v1/copilot/edge/sync/import",
        json={
            "batch_id": "batch_api_sync_001",
            "device_id": "tablet_dantewada_01",
            "school_id": "dantewada_ashram_shala",
            "submissions": [
                {
                    "submission_id": "sub_api_sync_01",
                    "quiz_id": "quiz_101",
                    "student_id": "student_sukru_09",
                    "concept_code": "EVS-G3-WAT-01",
                    "answers": [{"question_id": "Q1", "student_answer": "B", "is_correct": True}],
                    "score_pct": 100.0,
                }
            ],
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert data["total_synced_submissions"] == 1
    print(f"\nEdge Sync Import API: Synced {data['total_synced_submissions']} submissions.")


def test_mastery_heatmap_api():
    r = client.get("/api/v1/copilot/analytics/mastery-heatmap")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert data["total_concepts"] >= 1
    print(f"\nMastery Heatmap API: Tracked {data['total_concepts']} concepts across curriculum.")


if __name__ == "__main__":
    test_root_shows_phase6()
    test_generate_lesson_plan_api()
    test_generate_remedial_aid_api()
    test_export_and_download_offline_bundle_api()
    test_edge_sync_import_api()
    test_mastery_heatmap_api()
    print("\nAll Phase 6 API Tests Passed Successfully!")
