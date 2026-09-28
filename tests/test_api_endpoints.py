import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_api_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"
    assert "Phase 1" in data["phase"]

def test_api_documents_list():
    response = client.get("/api/v1/content/documents")
    assert response.status_code == 200
    docs = response.json()
    assert isinstance(docs, list)
    assert len(docs) >= 1
    doc_id = docs[0]["id"]

    # Test concepts retrieval for this document
    concept_resp = client.get(f"/api/v1/content/documents/{doc_id}/concepts")
    assert concept_resp.status_code == 200
    concept_data = concept_resp.json()
    assert "concepts" in concept_data
    assert len(concept_data["concepts"]) >= 1

def test_api_vector_search():
    response = client.post(
        "/api/v1/content/search",
        json={"query": "sources of water in village", "top_k": 2},
    )
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) > 0

if __name__ == "__main__":
    test_api_root()
    test_api_documents_list()
    test_api_vector_search()
    print("All FastAPI Route Tests Passed Successfully!")
