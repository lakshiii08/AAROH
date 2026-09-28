import os
import uuid
from pathlib import Path
from typing import Optional, List, Dict, Any

from src.aaroh.entity.config_entity import GamificationConfig
from src.aaroh.entity.artifact_entity import (
    VisualFlashcardEntity,
    ConceptEntity,
)
from src.aaroh.utils.logger import logger


FLASHCARD_VOCAB_MAP = {
    "water": {"hi": "पानी (Paani)", "gon": "येर (Yer)", "sat": "दाः (Daah)", "icon": "💧"},
    "well": {"hi": "कुआँ (Kuan)", "gon": "बोडी (Bodi)", "sat": "कुआँ (Kuan)", "icon": "🧱"},
    "pot": {"hi": "मटका (Matka)", "gon": "गदगा (Gadga)", "sat": "तुम्बः (Tumbah)", "icon": "🏺"},
    "rain": {"hi": "बारिश (Baarish)", "gon": "पिर (Pir)", "sat": "दाग (Daag)", "icon": "🌧️"},
    "stream": {"hi": "झरना (Jharna)", "gon": "झोरिया (Jhoriya)", "sat": "झरना (Jharna)", "icon": "🌊"},
}


class VisualStorytellingComponent:
    """Generates multilingual visual flashcard decks and printable storyboards
    with village iconography and tribal dialect translations.
    """

    def __init__(self, config: GamificationConfig):
        self.config = config
        self.output_dir = Path(config.flashcards_output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_concept_flashcards(
        self,
        concept: ConceptEntity,
        target_language: str = "hi",
        target_dialect: Optional[str] = "gon",
    ) -> List[VisualFlashcardEntity]:
        """Generates visual flashcards for key vocabulary in a concept."""
        cards = []
        dialect_key = target_dialect or "gon"

        # Water, Pot, Rain, Well terms
        vocab_items = [
            ("Water / Paani", "water", "Water is life for all living beings.", "Well and handpump water in village."),
            ("Clay Pot / Matka", "pot", "Traditional clay vessel that cools water naturally.", "Mitti ka matka kept under neem tree."),
            ("Monsoon Rain / Baarish", "rain", "Water falling from clouds that fills village ponds.", "First monsoon shower turning fields green."),
            ("Village Well / Kuan", "well", "Deep ground water source for village families.", "Ramu drawing water with bucket from well."),
        ]

        for primary, key, definition, example in vocab_items:
            card_id = f"fc_{concept.concept_code.lower()}_{key}_{str(uuid.uuid4())[:6]}"
            term_info = FLASHCARD_VOCAB_MAP.get(key, {"hi": primary, "gon": primary, "sat": primary, "icon": "🌟"})
            mother_tongue_val = term_info.get(dialect_key, term_info.get("hi", primary))

            card = VisualFlashcardEntity(
                card_id=card_id,
                concept_code=concept.concept_code,
                concept_name=concept.name,
                primary_term=primary,
                english_term=key.capitalize(),
                mother_tongue_term=mother_tongue_val,
                phonetic_transliteration=term_info.get("hi", primary),
                svg_icon_or_symbol=term_info.get("icon", "💧"),
                simple_definition=definition,
                village_example=example,
            )
            cards.append(card)

        logger.info(f"Generated {len(cards)} visual flashcards for '{concept.concept_code}'")
        return cards

    def render_printable_deck_html(
        self,
        cards: List[VisualFlashcardEntity],
        output_filename: str = "flashcards_deck.html",
    ) -> Path:
        """Renders flashcards into a printable HTML card sheet for village teachers."""
        out_path = self.output_dir / output_filename

        cards_html = ""
        for c in cards:
            cards_html += f"""
            <div class="card">
                <div class="icon">{c.svg_icon_or_symbol}</div>
                <div class="term-title">{c.mother_tongue_term}</div>
                <div class="term-sub">English: <b>{c.english_term}</b> | Hindi: <b>{c.phonetic_transliteration}</b></div>
                <div class="definition">📖 {c.simple_definition}</div>
                <div class="example">🏡 <i>Gaon Example:</i> {c.village_example}</div>
            </div>
            """

        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>AAROH Visual Flashcards Deck</title>
    <style>
        body {{ font-family: sans-serif; background: #f8fafc; padding: 20px; }}
        .grid {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; max-width: 800px; margin: auto; }}
        .card {{ background: white; border: 2px dashed #0284c7; border-radius: 12px; padding: 20px; text-align: center; }}
        .icon {{ font-size: 48px; margin-bottom: 8px; }}
        .term-title {{ font-size: 22px; font-weight: bold; color: #0f172a; margin-bottom: 4px; }}
        .term-sub {{ font-size: 13px; color: #64748b; margin-bottom: 12px; }}
        .definition {{ font-size: 14px; color: #334155; margin-bottom: 8px; text-align: left; }}
        .example {{ font-size: 13px; color: #0369a1; text-align: left; background: #e0f2fe; padding: 8px; border-radius: 6px; }}
    </style>
</head>
<body>
    <h2 style="text-align: center; color: #0369a1;">AAROH - Multilingual Visual Flashcards</h2>
    <div class="grid">
        {cards_html}
    </div>
</body>
</html>"""

        with open(out_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        logger.info(f"Printable flashcard HTML deck saved: {out_path}")
        return out_path
