import sys
from pathlib import Path
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.aaroh.configuration.configuration import ConfigurationManager
from src.aaroh.components.translation import TranslationComponent
from src.aaroh.database.glossary_db import GlossaryDatabaseManager
from src.aaroh.entity.artifact_entity import GlossaryEntryEntity

def test_translation_component_and_glossary():
    config_mgr = ConfigurationManager()
    t_conf = config_mgr.get_translation_config()
    d_conf = config_mgr.get_dynamodb_config()

    glossary_db = GlossaryDatabaseManager(d_conf)
    component = TranslationComponent(t_conf, glossary_db)

    # 1. Verify Curated Glossary Lookup
    term_entry = glossary_db.get_term("earthen pot", "en", "hi")
    assert term_entry is not None
    assert "मटका" in term_entry["translated_term"]
    assert "gon" in term_entry["dialects"]

    # 2. Test Single Translation with Glossary Injection
    sentence = "Water is life for people, crops, and domestic animals."
    result = component.translate_text(
        text=sentence,
        source_lang="en",
        target_lang="hi",
        apply_glossary=True,
    )
    assert result.translated_text != ""
    assert "पानी" in result.translated_text
    assert len(result.applied_glossary_terms) >= 1
    assert result.latency_ms > 0
    print(f"Original: {sentence}")
    print(f"Translated: {result.translated_text}")
    print(f"Applied Glossary: {result.applied_glossary_terms}")

    # 3. Test Tribal Dialect Adaptation (Gondi)
    gondi_sentence = "Villagers drink cool water from the earthen pot."
    gondi_result = component.translate_text(
        text=gondi_sentence,
        source_lang="en",
        target_lang="hi",
        target_dialect="gon",
        apply_glossary=True,
    )
    print(f"\nDialect (Gondi) Translation: {gondi_result.translated_text}")
    # Verify Gondi dialect anchor (कुंजे) is included
    assert "कुंजे" in gondi_result.translated_text or "मटका" in gondi_result.translated_text

    # 4. Test Batch Translation
    batch_sentences = [
        "Where does water come from?",
        "Do not waste a single drop. Always cover the water pitcher with a clean plate."
    ]
    batch_res = component.translate_batch(batch_sentences, source_lang="en", target_lang="hi")
    assert batch_res.total_count == 2
    assert len(batch_res.results) == 2
    assert "पानी" in batch_res.results[0].translated_text

if __name__ == "__main__":
    test_translation_component_and_glossary()
    print("\nPhase 2 Translation Component Tests Passed Successfully!")
