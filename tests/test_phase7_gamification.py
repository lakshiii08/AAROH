import sys
from pathlib import Path
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.aaroh.pipeline.gamification_pipeline import GamificationPipeline


def test_phase7_gamification_pipeline():
    pipeline = GamificationPipeline()

    concept_code = "EVS-G3-WAT-01"

    # 1. Generate Daily Observation Quest
    quest = pipeline.generate_concept_quest(
        concept_code=concept_code,
        target_language="hi",
        target_dialect="gon",
    )
    assert quest is not None
    assert quest.quest_id != ""
    assert quest.reward_xp > 0
    print(f"\nLearning Quest Generated: {quest.title} (ID: {quest.quest_id})")
    print(f"  - Story Mission: {quest.story_mission}")
    print(f"  - Action Prompt:\n{quest.action_prompt}")

    # 2. Record Student Activity & Unlock Badge
    prog = pipeline.record_student_activity(
        student_id="student_sukru_07",
        student_name="Sukru Gond",
        school_id="bastar_ashram_school",
        grade_level=3,
        activity_type="quest",
        concept_code=concept_code,
    )
    assert prog is not None
    assert prog["total_xp"] > 0
    assert prog["level"] >= 1
    assert prog["completed_quests_count"] >= 1
    print(f"\nStudent Progress Recorded: Level {prog['level']} (Total XP: {prog['total_xp']})")
    if prog["newly_unlocked_badges"]:
        print(f"  - New Badge Unlocked: {prog['newly_unlocked_badges'][0]['title_local']} {prog['newly_unlocked_badges'][0]['icon_symbol']}")

    # 3. Retrieve Student Portfolio
    portfolio = pipeline.get_student_portfolio("student_sukru_07")
    assert portfolio is not None
    assert portfolio.student_name == "Sukru Gond"
    assert len(portfolio.badges) >= 1
    print(f"\nStudent Portfolio: {portfolio.student_name}")
    print(f"  - Level: {portfolio.level} | Total XP: {portfolio.total_xp} | Streak: {portfolio.current_streak_days} days")
    print(f"  - Badges Earned: {[b.title_local for b in portfolio.badges]}")

    # 4. Generate Visual Flashcard Deck
    deck = pipeline.generate_flashcard_deck(
        concept_code=concept_code,
        target_language="hi",
        target_dialect="gon",
    )
    assert deck is not None
    assert deck["total_cards"] >= 3
    assert Path(deck["html_deck_path"]).exists()
    print(f"\nVisual Flashcards Deck Generated: {deck['total_cards']} cards")
    for c in deck["cards"]:
        print(f"  - {c['icon']} {c['mother_tongue_term']} (English: {c['english_term']}) -> {c['definition']}")

    # 5. School Leaderboard
    leaderboard = pipeline.get_school_leaderboard("bastar_ashram_school")
    assert len(leaderboard) >= 1
    print(f"\nSchool Leaderboard: {len(leaderboard)} students")
    print(f"  - Rank 1: {leaderboard[0]['student_name']} (XP: {leaderboard[0]['total_xp']})")


if __name__ == "__main__":
    test_phase7_gamification_pipeline()
    print("\nPhase 7 Gamification & Visual Storytelling Pipeline Tests Passed!")
