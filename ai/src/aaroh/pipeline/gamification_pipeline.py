import uuid
import sys
from typing import Optional, List, Dict, Any
from pathlib import Path

from src.aaroh.configuration.configuration import ConfigurationManager
from src.aaroh.entity.artifact_entity import (
    BadgeEntity,
    LearningQuestEntity,
    VisualFlashcardEntity,
    StudentPortfolioEntity,
    ConceptEntity,
)
from src.aaroh.components.gamification_engine import GamificationEngineComponent
from src.aaroh.components.visual_storytelling import VisualStorytellingComponent
from src.aaroh.database.session import DatabaseManager
from src.aaroh.database.models import (
    ConceptModel,
    StudentProfileModel,
    LearningQuestModel,
    VisualFlashcardModel,
)
from src.aaroh.utils.logger import logger
from src.aaroh.utils.exception import AarohException


class GamificationPipeline:
    """Orchestrates Phase 7: Gamified Quests, Badges, Level Progression,
    Multilingual Visual Flashcards, and Student Learning Portfolios.
    """

    def __init__(self, config_manager: Optional[ConfigurationManager] = None):
        self.config_manager = config_manager or ConfigurationManager()

        gamify_config = self.config_manager.get_gamification_config()
        db_config = self.config_manager.get_database_config()

        self.db_manager = DatabaseManager(db_config)
        self.gamification_engine = GamificationEngineComponent(gamify_config)
        self.storyteller = VisualStorytellingComponent(gamify_config)

    def generate_concept_quest(
        self,
        concept_code: str,
        target_language: str = "hi",
        target_dialect: Optional[str] = None,
    ) -> LearningQuestEntity:
        """Generates a 2-minute daily village observation micro-challenge for a concept."""
        try:
            concept = self._fetch_concept(concept_code)
            if not concept:
                raise AarohException(f"Concept '{concept_code}' not found.")

            quest = self.gamification_engine.generate_concept_quest(
                concept=concept,
                target_language=target_language,
                target_dialect=target_dialect,
            )

            self._save_quest(quest)
            return quest
        except Exception as e:
            logger.error(f"Quest generation failed: {e}")
            raise AarohException(e, sys)

    def record_student_activity(
        self,
        student_id: str,
        student_name: str = "Student",
        school_id: str = "rural_primary_01",
        grade_level: int = 3,
        activity_type: str = "lesson",
        concept_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Records student activity completion, awards XP, updates streak & unlocks badges."""
        try:
            return self.gamification_engine.record_progress(
                student_id=student_id,
                student_name=student_name,
                school_id=school_id,
                grade_level=grade_level,
                activity_type=activity_type,
                concept_code=concept_code,
                db_manager=self.db_manager,
            )
        except Exception as e:
            logger.error(f"Record activity failed: {e}")
            raise AarohException(e, sys)

    def get_student_portfolio(self, student_id: str) -> StudentPortfolioEntity:
        """Retrieves student's complete gamified learning portfolio and badges."""
        try:
            return self.gamification_engine.get_student_portfolio(
                student_id=student_id,
                db_manager=self.db_manager,
            )
        except Exception as e:
            logger.error(f"Get portfolio failed: {e}")
            raise AarohException(e, sys)

    def generate_flashcard_deck(
        self,
        concept_code: str,
        target_language: str = "hi",
        target_dialect: Optional[str] = "gon",
    ) -> Dict[str, Any]:
        """Generates a visual multilingual flashcard deck with printable HTML file."""
        try:
            concept = self._fetch_concept(concept_code)
            if not concept:
                raise AarohException(f"Concept '{concept_code}' not found.")

            cards = self.storyteller.generate_concept_flashcards(
                concept=concept,
                target_language=target_language,
                target_dialect=target_dialect,
            )

            html_deck_path = self.storyteller.render_printable_deck_html(
                cards=cards,
                output_filename=f"deck_{concept_code.lower()}_{target_dialect or 'std'}.html",
            )

            self._save_flashcards(cards)

            return {
                "concept_code": concept_code,
                "concept_name": concept.name,
                "total_cards": len(cards),
                "html_deck_path": str(html_deck_path),
                "cards": [
                    {
                        "card_id": c.card_id,
                        "primary_term": c.primary_term,
                        "english_term": c.english_term,
                        "mother_tongue_term": c.mother_tongue_term,
                        "phonetic_transliteration": c.phonetic_transliteration,
                        "icon": c.svg_icon_or_symbol,
                        "definition": c.simple_definition,
                        "village_example": c.village_example,
                    }
                    for c in cards
                ],
            }
        except Exception as e:
            logger.error(f"Flashcards generation failed: {e}")
            raise AarohException(e, sys)

    def get_school_leaderboard(self, school_id: str = "rural_primary_01") -> List[Dict[str, Any]]:
        """Retrieves school-wide cooperative learning leaderboard."""
        session = self.db_manager.get_session()
        try:
            profiles = (
                session.query(StudentProfileModel)
                .filter_by(school_id=school_id)
                .order_by(StudentProfileModel.total_xp.desc())
                .limit(20)
                .all()
            )

            leaderboard = []
            for rank, p in enumerate(profiles, 1):
                leaderboard.append({
                    "rank": rank,
                    "student_id": p.student_id,
                    "student_name": p.student_name,
                    "level": p.level,
                    "total_xp": p.total_xp,
                    "streak_days": p.current_streak_days,
                    "quests_completed": p.completed_quests_count,
                    "mastered_concepts_count": len(p.concepts_mastered or []),
                })
            return leaderboard
        finally:
            session.close()

    def _fetch_concept(self, concept_code: str) -> Optional[ConceptEntity]:
        session = self.db_manager.get_session()
        try:
            c = session.query(ConceptModel).filter_by(concept_code=concept_code).first()
            if not c:
                return None
            return ConceptEntity(
                concept_code=c.concept_code,
                name=c.name,
                definition=c.definition,
                blooms_level=c.blooms_level,
                difficulty_level=c.difficulty_level,
                prerequisite_concepts=c.prerequisite_concepts or [],
                rural_tribal_anchors=c.rural_tribal_anchors or [],
                key_vocabulary=c.key_vocabulary or [],
            )
        finally:
            session.close()

    def _save_quest(self, quest: LearningQuestEntity):
        session = self.db_manager.get_session()
        try:
            model = LearningQuestModel(
                quest_id=quest.quest_id,
                concept_code=quest.concept_code,
                title=quest.title,
                story_mission=quest.story_mission,
                action_prompt=quest.action_prompt,
                reward_xp=quest.reward_xp,
                badge_unlock=quest.badge_unlock,
                target_language=quest.target_language,
            )
            session.add(model)
            session.commit()
            logger.info(f"Learning quest '{quest.quest_id}' saved.")
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to save quest: {e}")
        finally:
            session.close()

    def _save_flashcards(self, cards: List[VisualFlashcardEntity]):
        session = self.db_manager.get_session()
        try:
            for c in cards:
                model = VisualFlashcardModel(
                    concept_code=c.concept_code,
                    primary_term=c.primary_term,
                    english_term=c.english_term,
                    mother_tongue_term=c.mother_tongue_term,
                    phonetic_transliteration=c.phonetic_transliteration,
                    svg_icon=c.svg_icon_or_symbol,
                    definition_simple=c.simple_definition,
                    village_example=c.village_example,
                )
                session.add(model)
            session.commit()
            logger.info(f"{len(cards)} flashcards saved to DB.")
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to save flashcards: {e}")
        finally:
            session.close()
