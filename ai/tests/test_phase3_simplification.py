import sys
from pathlib import Path
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.aaroh.pipeline.simplification_localization_pipeline import SimplificationLocalizationPipeline
from src.aaroh.database.models import ConceptModel

def test_phase3_langgraph_pipeline():
    pipeline = SimplificationLocalizationPipeline()

    # Verify concepts exist from Phase 1
    session = pipeline.db_manager.get_session()
    try:
        concepts = session.query(ConceptModel).all()
        assert len(concepts) > 0, "No concepts found - run Phase 1 first"
        concept_code = concepts[0].concept_code
        grade = 3
        print(f"\nTesting with concept: {concept_code}")
    finally:
        session.close()

    # 1. Run LangGraph agent (cache miss → RAG → LLM fallback → cache)
    result = pipeline.run_for_concept(
        concept_code=concept_code,
        target_language="hi",
        target_dialect="gon",
        grade_level=grade,
        force_regenerate=True,
    )
    assert result.concept_code == concept_code
    assert result.simplified_explanation != ""
    assert result.story_narrative != ""
    assert isinstance(result.local_analogies, list)
    assert len(result.local_analogies) > 0
    assert isinstance(result.hands_on_activity, dict)
    assert "steps" in result.hands_on_activity
    assert isinstance(result.reflection_questions, list)
    assert result.voice_script != ""
    print(f"Simplified Explanation (first 150 chars): {result.simplified_explanation[:150]}")
    print(f"Story Narrative (first 150 chars): {result.story_narrative[:150]}")
    print(f"Hands-On Activity: {result.hands_on_activity.get('title')}")
    print(f"Voice Script (first 100 chars): {result.voice_script[:100]}")
    print(f"Cultural Anchors Used: {result.cultural_anchors_used}")

    # 2. Run again → should be CACHE HIT now
    result_cached = pipeline.run_for_concept(
        concept_code=concept_code,
        target_language="hi",
        target_dialect="gon",
        grade_level=grade,
    )
    assert result_cached.cached is True
    print(f"\nCache HIT confirmed for '{concept_code}'")

    # 3. LangGraph agent direct run
    lesson_dict = pipeline.run_langgraph_for_concept(
        concept_code=concept_code,
        target_language="hi",
        force_regenerate=True,
    )
    assert "simplified_explanation" in lesson_dict
    assert "voice_script" in lesson_dict
    print(f"\nLangGraph agent run successful. Keys: {list(lesson_dict.keys())}")


if __name__ == "__main__":
    test_phase3_langgraph_pipeline()
    print("\nPhase 3 Simplification & Localization Pipeline Tests Passed!")
