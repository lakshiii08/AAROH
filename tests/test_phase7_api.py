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


def test_root_shows_phase7():
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert "7" in data["phase"]
    assert any("Gamification" in p for p in data["phases_active"])


def test_generate_quest_api():
    r = client.post(
        "/api/v1/gamification/quests/generate",
        json={
            "concept_code": "EVS-G3-WAT-01",
            "target_language": "hi",
            "target_dialect": "gon",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert "quest_id" in data
    assert data["reward_xp"] > 0
    print(f"\nQuest API: {data['title']} (Reward: {data['reward_xp']} XP)")


def test_record_activity_api():
    r = client.post(
        "/api/v1/gamification/students/student_api_01/activity",
        json={
            "student_name": "Ramu Gond",
            "school_id": "school_dantewada_01",
            "grade_level": 3,
            "activity_type": "quiz_pass",
            "concept_code": "EVS-G3-WAT-01",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    prog = data["progress"]
    assert prog["total_xp"] > 0
    print(f"\nRecord Activity API: Total XP={prog['total_xp']}, Level={prog['level']}")


def test_get_portfolio_api():
    r = client.get("/api/v1/gamification/students/student_api_01/portfolio")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    port = data["portfolio"]
    assert port["student_name"] == "Ramu Gond"
    assert "badges" in port
    print(f"\nPortfolio API: Student {port['student_name']} has {port['badges_count']} badges.")


def test_generate_flashcards_api():
    # 1. Generate Deck
    r = client.post(
        "/api/v1/gamification/flashcards/generate",
        json={
            "concept_code": "EVS-G3-WAT-01",
            "target_language": "hi",
            "target_dialect": "gon",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert data["total_cards"] >= 3
    assert "printable_deck_url" in data
    print(f"\nFlashcards API: {data['total_cards']} cards generated.")

    # 2. View Printable HTML
    deck_url = data["printable_deck_url"]
    html_r = client.get(deck_url)
    assert html_r.status_code == 200
    assert "text/html" in html_r.headers["content-type"]
    assert "Flashcards" in html_r.text
    print(f"Printable Deck HTML: Successfully rendered {len(html_r.text)} bytes.")


def test_leaderboard_api():
    r = client.get("/api/v1/gamification/leaderboards/school_dantewada_01")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert data["total_students"] >= 1
    print(f"\nLeaderboard API: {data['total_students']} students ranked.")


if __name__ == "__main__":
    test_root_shows_phase7()
    test_generate_quest_api()
    test_record_activity_api()
    test_get_portfolio_api()
    test_generate_flashcards_api()
    test_leaderboard_api()
    print("\nAll Phase 7 API Tests Passed Successfully!")
