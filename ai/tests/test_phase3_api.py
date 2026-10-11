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

def test_root_shows_phase3():
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert "3" in data["phase"]
    assert any("Simplification" in p for p in data["phases_active"])


def test_localize_concept_api():
    r = client.post(
        "/api/v1/simplification/concepts/EVS-G3-WAT-01",
        json={"target_language": "hi", "target_dialect": "gon", "grade_level": 3, "force_regenerate": True},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    lesson = data["lesson"]
    assert lesson["simplified_explanation"] != ""
    assert lesson["story_narrative"] != ""
    assert isinstance(lesson["local_analogies"], list)
    assert isinstance(lesson["hands_on_activity"], dict)
    assert "steps" in lesson["hands_on_activity"]
    assert isinstance(lesson["reflection_questions"], list)
    assert lesson["voice_script"] != ""
    print(f"\nExplanation (60 chars): {lesson['simplified_explanation'][:60]}")
    print(f"Activity title: {lesson['hands_on_activity'].get('title')}")


def test_cache_hit_on_second_call():
    # First call to seed cache
    client.post(
        "/api/v1/simplification/concepts/EVS-G3-WAT-02",
        json={"target_language": "hi", "target_dialect": None, "grade_level": 3, "force_regenerate": True},
    )
    # Second call should be cache hit
    r2 = client.post(
        "/api/v1/simplification/concepts/EVS-G3-WAT-02",
        json={"target_language": "hi", "target_dialect": None, "grade_level": 3},
    )
    assert r2.status_code == 200
    assert r2.json()["cached"] is True
    print("Cache HIT on second call confirmed.")


def test_langgraph_endpoint():
    r = client.post(
        "/api/v1/simplification/langgraph/concepts/EVS-G3-WAT-03",
        json={"target_language": "hi", "target_dialect": "sat", "grade_level": 3, "force_regenerate": True},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert "lesson" in data
    assert "simplified_explanation" in data["lesson"]
    print(f"\nLangGraph agent keys: {list(data['lesson'].keys())}")


def test_localize_full_document():
    docs_r = client.get("/api/v1/content/documents")
    docs = docs_r.json()
    assert len(docs) >= 1
    doc_id = docs[0]["id"]

    r = client.post(
        f"/api/v1/simplification/documents/{doc_id}",
        json={"target_language": "hi", "target_dialect": "hne"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert data["total_lessons"] >= 1
    lesson = data["lessons"][0]
    assert "story_narrative" in lesson
    assert "hands_on_activity" in lesson
    print(f"\nDocument localized: {data['total_lessons']} lessons")
    print(f"First lesson activity: {lesson['hands_on_activity'].get('title')}")


def test_cache_status_endpoint():
    r = client.get("/api/v1/simplification/cache/status")
    assert r.status_code == 200
    data = r.json()
    assert data["total_cached_lessons"] >= 1
    print(f"\nTotal cached lessons: {data['total_cached_lessons']}")


if __name__ == "__main__":
    test_root_shows_phase3()
    test_localize_concept_api()
    test_cache_hit_on_second_call()
    test_langgraph_endpoint()
    test_localize_full_document()
    test_cache_status_endpoint()
    print("\nAll Phase 3 API Tests Passed Successfully!")
