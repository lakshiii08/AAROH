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


def test_root_shows_phase8():
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert "8" in data["phase"]
    assert any("District Administration" in p for p in data["phases_active"])


def test_generate_pathway_api():
    r = client.post(
        "/api/v1/district/interventions/generate-pathway",
        json={
            "student_id": "student_ramu_p8",
            "student_name": "Ramu Mandavi",
            "concept_code": "EVS-G3-WAT-01",
            "weak_bloom_level": "Understand",
            "target_language": "hi",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert "pathway_id" in data
    assert len(data["steps"]) == 4
    print(f"\nPathway API: {data['pathway_id']} for {data['student_name']} (4 steps generated).")


def test_dispatch_parent_voice_note_api():
    r = client.post(
        "/api/v1/district/parent-advisory/send-voice-note",
        json={
            "student_id": "student_ramu_p8",
            "student_name": "Ramu Mandavi",
            "parent_phone": "+91-9876543210",
            "concept_code": "EVS-G3-WAT-01",
            "target_language": "hi",
            "target_dialect": "gon",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert "advisory_id" in data
    assert "audio_stream_url" in data
    print(f"\nParent Advisory API: {data['advisory_id']} (Status: {data['dispatch_status']})")


def test_list_pending_interventions_api():
    r = client.get("/api/v1/district/interventions/pending")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert data["total_pending_interventions"] >= 1
    print(f"\nPending Interventions API: {data['total_pending_interventions']} active pathways.")


def test_district_analytics_overview_api():
    r = client.get("/api/v1/district/analytics/overview")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    overview = data["district_analytics"]
    assert "CG-BASTAR" in overview["district_code"]
    print(f"\nDistrict Analytics API: District {overview['district_code']} | State: {overview['state_name']}")


if __name__ == "__main__":
    test_root_shows_phase8()
    test_generate_pathway_api()
    test_dispatch_parent_voice_note_api()
    test_list_pending_interventions_api()
    test_district_analytics_overview_api()
    print("\nAll Phase 8 API Tests Passed Successfully!")
