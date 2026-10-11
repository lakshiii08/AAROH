import os
import json
import uuid
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone

from src.aaroh.entity.config_entity import GamificationConfig
from src.aaroh.entity.artifact_entity import (
    BadgeEntity,
    LearningQuestEntity,
    StudentPortfolioEntity,
    ConceptEntity,
)
from src.aaroh.database.session import DatabaseManager
from src.aaroh.database.models import (
    StudentProfileModel,
    StudentBadgeModel,
    LearningQuestModel,
)
from src.aaroh.utils.logger import logger


DEFAULT_BADGES = [
    {
        "badge_id": "badge_jal_rakshak",
        "badge_name": "Jal Rakshak (Water Protector)",
        "title_local": "जल रक्षक (Jal Rakshak)",
        "description": "Completed water cycle quest and helped village save clean water.",
        "icon_symbol": "💧",
        "tier": "Bronze",
        "xp_bonus": 100,
    },
    {
        "badge_id": "badge_matka_master",
        "badge_name": "Matka Master (Clay Pot Scientist)",
        "title_local": "मटका वैज्ञानिक (Matka Vaigyanik)",
        "description": "Understood evaporation through traditional clay pot cooling.",
        "icon_symbol": "🏺",
        "tier": "Silver",
        "xp_bonus": 150,
    },
    {
        "badge_id": "badge_vriksh_mitra",
        "badge_name": "Vriksh Mitra (Tree Friend)",
        "title_local": "वृक्ष मित्र (Tree Friend)",
        "description": "Observed dew condensation on forest neem leaves.",
        "icon_symbol": "🌿",
        "tier": "Bronze",
        "xp_bonus": 100,
    },
    {
        "badge_id": "badge_gaon_khoji",
        "badge_name": "Gaon Khoji (Village Explorer)",
        "title_local": "गाँव खोजी (Village Explorer)",
        "description": "Completed 5 daily observation nature quests in village.",
        "icon_symbol": "🧭",
        "tier": "Gold",
        "xp_bonus": 300,
    },
]


class GamificationEngineComponent:
    """Manages student XP progression, levels, streaks, badge unlocks,
    and daily village nature observation micro-quests.
    """

    def __init__(self, config: GamificationConfig):
        self.config = config
        self.catalog_path = Path(config.badges_catalog_path)
        self.catalog_path.parent.mkdir(parents=True, exist_ok=True)
        self.badges_catalog = self._load_or_init_catalog()

    def _load_or_init_catalog(self) -> List[Dict[str, Any]]:
        if self.catalog_path.exists():
            try:
                with open(self.catalog_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Could not read badges catalog ({e}). Re-initializing.")

        with open(self.catalog_path, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_BADGES, f, ensure_ascii=False, indent=2)
        return DEFAULT_BADGES

    def generate_concept_quest(
        self,
        concept: ConceptEntity,
        target_language: str = "hi",
        target_dialect: Optional[str] = None,
    ) -> LearningQuestEntity:
        """Generates a 2-minute daily village observation micro-challenge for a concept."""
        quest_id = f"quest_{concept.concept_code.lower()}_{str(uuid.uuid4())[:6]}"

        story_mission = (
            f"Gaon ke talab aur matke ka rahasya pata lagao! "
            f"Kya tum dekh sakte ho ki dhoop mein paani kaise gayab hota hai?"
            if target_language == "hi"
            else f"Investigate the secret of the village clay pot! Can you spot how water rises into the sun?"
        )

        action_prompt = (
            "1. Apne ghar ke mitti ke matke ko bahar se chhoo kar dekho — kya thanda laga?\n"
            "2. Subah ghaas ya patti par os ki 3 boondein dekho aur unka rang dekho.\n"
            "3. Apne dost ko batao ki paani bhaap banke kahan jaata hai!"
            if target_language == "hi"
            else "1. Touch the outside of your clay pot — is it cool?\n2. Spot 3 dew drops on morning leaves.\n3. Tell your friend where steam goes!"
        )

        logger.info(f"Generated learning quest: '{quest_id}' for concept '{concept.concept_code}'")

        return LearningQuestEntity(
            quest_id=quest_id,
            concept_code=concept.concept_code,
            concept_name=concept.name,
            title=f"Mission: {concept.name} Khoj",
            story_mission=story_mission,
            action_prompt=action_prompt,
            reward_xp=self.config.points_per_quest_complete,
            badge_unlock="badge_jal_rakshak",
            target_language=target_language,
        )

    def record_progress(
        self,
        student_id: str,
        student_name: str,
        school_id: str,
        grade_level: int,
        activity_type: str,   # "lesson" | "quiz_pass" | "quest"
        concept_code: Optional[str] = None,
        db_manager: Optional[DatabaseManager] = None,
    ) -> Dict[str, Any]:
        """Calculates XP, updates level, streak, and checks for newly unlocked badges."""
        if activity_type == "lesson":
            base_xp = self.config.points_per_lesson_complete
        elif activity_type == "quiz_pass":
            base_xp = self.config.points_per_quiz_pass
        elif activity_type == "quest":
            base_xp = self.config.points_per_quest_complete
        else:
            base_xp = 25

        session = db_manager.get_session() if db_manager else None
        newly_unlocked_badges = []
        try:
            if session:
                profile = session.query(StudentProfileModel).filter_by(student_id=student_id).first()
                if not profile:
                    profile = StudentProfileModel(
                        student_id=student_id,
                        student_name=student_name,
                        school_id=school_id,
                        grade_level=grade_level,
                        total_xp=0,
                        level=1,
                        current_streak_days=1,
                        completed_quests_count=0,
                        concepts_mastered=[],
                    )
                    session.add(profile)

                # Update XP & Level (1 level per 250 XP)
                profile.total_xp += base_xp
                new_level = max(1, 1 + (profile.total_xp // 250))
                leveled_up = new_level > profile.level
                profile.level = new_level

                if activity_type == "quest":
                    profile.completed_quests_count += 1
                if concept_code and concept_code not in (profile.concepts_mastered or []):
                    mastered = list(profile.concepts_mastered or [])
                    mastered.append(concept_code)
                    profile.concepts_mastered = mastered

                # Badge check: award 'badge_jal_rakshak' on first water quest or quiz pass
                existing_badge_ids = {
                    b.badge_id
                    for b in session.query(StudentBadgeModel).filter_by(student_id=student_id).all()
                }

                if "badge_jal_rakshak" not in existing_badge_ids and (activity_type in ["quiz_pass", "quest"]):
                    b_entity = next((b for b in self.badges_catalog if b["badge_id"] == "badge_jal_rakshak"), None)
                    if b_entity:
                        badge_row = StudentBadgeModel(
                            student_id=student_id,
                            badge_id=b_entity["badge_id"],
                            badge_name=b_entity["badge_name"],
                            title_local=b_entity["title_local"],
                            icon_symbol=b_entity["icon_symbol"],
                            tier=b_entity["tier"],
                        )
                        session.add(badge_row)
                        profile.total_xp += b_entity["xp_bonus"]
                        newly_unlocked_badges.append(b_entity)

                profile.last_active = datetime.now(timezone.utc)
                session.commit()

                return {
                    "student_id": student_id,
                    "earned_xp": base_xp,
                    "total_xp": profile.total_xp,
                    "level": profile.level,
                    "leveled_up": leveled_up,
                    "current_streak_days": profile.current_streak_days,
                    "completed_quests_count": profile.completed_quests_count,
                    "newly_unlocked_badges": newly_unlocked_badges,
                }
            else:
                return {
                    "student_id": student_id,
                    "earned_xp": base_xp,
                    "total_xp": base_xp,
                    "level": 1,
                    "leveled_up": False,
                    "current_streak_days": 1,
                    "completed_quests_count": 1 if activity_type == "quest" else 0,
                    "newly_unlocked_badges": [],
                }
        except Exception as e:
            if session:
                session.rollback()
            logger.error(f"Failed to record progress: {e}")
            raise
        finally:
            if session:
                session.close()

    def get_student_portfolio(
        self,
        student_id: str,
        db_manager: DatabaseManager,
    ) -> StudentPortfolioEntity:
        """Retrieves student's badges, mastery level, and achievements portfolio."""
        session = db_manager.get_session()
        try:
            profile = session.query(StudentProfileModel).filter_by(student_id=student_id).first()
            badge_rows = session.query(StudentBadgeModel).filter_by(student_id=student_id).all()

            badges = [
                BadgeEntity(
                    badge_id=b.badge_id,
                    badge_name=b.badge_name,
                    title_local=b.title_local,
                    description="Awarded for excellence in learning.",
                    icon_symbol=b.icon_symbol,
                    tier=b.tier,
                    unlocked_at=b.unlocked_at,
                )
                for b in badge_rows
            ]

            if not profile:
                return StudentPortfolioEntity(
                    student_id=student_id,
                    student_name="New Student",
                    school_id="school_01",
                    grade_level=3,
                    total_xp=0,
                    level=1,
                    current_streak_days=1,
                    badges=badges,
                    completed_quests_count=0,
                    concepts_mastered=[],
                )

            return StudentPortfolioEntity(
                student_id=profile.student_id,
                student_name=profile.student_name,
                school_id=profile.school_id,
                grade_level=profile.grade_level,
                total_xp=profile.total_xp,
                level=profile.level,
                current_streak_days=profile.current_streak_days,
                badges=badges,
                completed_quests_count=profile.completed_quests_count,
                concepts_mastered=profile.concepts_mastered or [],
                last_active=profile.last_active,
            )
        finally:
            session.close()
