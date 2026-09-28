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

def test_get_languages():
    response = client.get("/api/v1/translation/languages")
    assert response.status_code == 200
    data = response.json()
    assert "supported_languages" in data
    lang_codes = [l["code"] for l in data["supported_languages"]]
    assert "hi" in lang_codes
    assert "gon" in lang_codes
    assert "sat" in lang_codes

def test_single_translation_api():
    payload = {
        "text": "Every morning, villagers collect water from the well.",
        "source_lang": "en",
        "target_lang": "hi",
        "target_dialect": "gon",
        "apply_glossary": True
    }
    response = client.post("/api/v1/translation/translate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    trans = data["data"]
    assert "translated_text" in trans
    assert len(trans["applied_glossary_terms"]) >= 1

def test_batch_translation_api():
    payload = {
        "texts": [
            "Rain water collects in the village pond.",
            "Handpump provides clean groundwater."
        ],
        "source_lang": "en",
        "target_lang": "hi"
    }
    response = client.post("/api/v1/translation/batch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["total_count"] == 2

def test_glossary_lookup_and_add_api():
    # 1. Lookup existing term
    resp = client.get("/api/v1/translation/glossary/lookup?term=evaporation&source_lang=en&target_lang=hi")
    assert resp.status_code == 200
    assert "वाष्पीकरण" in resp.json()["term"]["translated_term"]

    # 2. Add new tribal term
    add_payload = {
        "source_term": "seed",
        "translated_term": "बीज (दाना)",
        "source_lang": "en",
        "target_lang": "hi",
        "domain": "agriculture",
        "dialects": {
          "gon": "बीजा (Bija)",
          "sat": "जां (Jan)"
        },
        "notes": "Paddy and forest tree seeds"
    }
    add_resp = client.post("/api/v1/translation/glossary/term", json=add_payload)
    assert add_resp.status_code == 200

    # 3. Verify lookup works for new term
    verify_resp = client.get("/api/v1/translation/glossary/lookup?term=seed&source_lang=en&target_lang=hi")
    assert verify_resp.status_code == 200
    assert "बीज" in verify_resp.json()["term"]["translated_term"]

def test_translate_ingested_lesson():
    # Get first document id
    docs_resp = client.get("/api/v1/content/documents")
    docs = docs_resp.json()
    if docs:
        doc_id = docs[0]["id"]
        res = client.post(
            f"/api/v1/translation/lessons/{doc_id}",
            json={"target_lang": "hi", "target_dialect": "gon"}
        )
        assert res.status_code == 200
        lesson_data = res.json()
        assert lesson_data["status"] == "success"
        assert lesson_data["total_chunks"] > 0
        assert len(lesson_data["chunks"]) > 0
        assert "translated_content" in lesson_data["chunks"][0]

if __name__ == "__main__":
    test_get_languages()
    test_single_translation_api()
    test_batch_translation_api()
    test_glossary_lookup_and_add_api()
    test_translate_ingested_lesson()
    print("All Phase 2 Translation API Tests Passed Successfully!")
