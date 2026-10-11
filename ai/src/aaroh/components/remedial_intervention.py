import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from src.aaroh.entity.config_entity import DistrictAdminConfig
from src.aaroh.entity.artifact_entity import (
    InterventionStepEntity,
    InterventionPathwayEntity,
    ConceptEntity,
)
from src.aaroh.database.session import DatabaseManager
from src.aaroh.database.models import InterventionPathwayModel
from src.aaroh.utils.logger import logger


class RemedialInterventionDispatcher:
    """Creates, assigns, and tracks personalized 4-step remedial learning pathways
    for struggling rural and tribal students.
    """

    def __init__(self, config: DistrictAdminConfig):
        self.config = config

    def create_remedial_pathway(
        self,
        student_id: str,
        student_name: str,
        concept: ConceptEntity,
        weak_bloom_level: str = "Understand",
        target_language: str = "hi",
    ) -> InterventionPathwayEntity:
        """Generates a 4-step personalized remedial roadmap."""
        pathway_id = f"pathway_{student_id}_{concept.concept_code.lower()}_{str(uuid.uuid4())[:6]}"

        steps = [
            InterventionStepEntity(
                step_number=1,
                step_type="story_audio",
                title=f"Suniye Kahani: {concept.name} ka Rahasya",
                instruction="Listen to the 60-second village story about clay pot cooling and water vapor.",
                resource_url=f"/api/v1/voice/lessons/{concept.concept_code}",
                is_completed=False,
            ),
            InterventionStepEntity(
                step_number=2,
                step_type="hands_on_activity",
                title="Prayog: Dhoop aur Mitti ka Matka",
                instruction="Touch the clay pot outside and see how water stays cold without electricity.",
                resource_url=None,
                is_completed=False,
            ),
            InterventionStepEntity(
                step_number=3,
                step_type="micro_quest",
                title="Gaon Khoj: Os ki Boondein",
                instruction="Observe morning dew drops on 3 neem leaves and tell your teacher.",
                resource_url=f"/api/v1/gamification/quests/generate",
                is_completed=False,
            ),
            InterventionStepEntity(
                step_number=4,
                step_type="oral_quiz",
                title="Maukhik Jaanch (Oral Re-check)",
                instruction="Answer 1 quick spoken question by speaking into the phone mic.",
                resource_url=f"/api/v1/voice/oral-quiz/submit-audio",
                is_completed=False,
            ),
        ]

        logger.info(f"Created remedial pathway '{pathway_id}' for student '{student_id}' on '{concept.concept_code}'")

        return InterventionPathwayEntity(
            pathway_id=pathway_id,
            student_id=student_id,
            student_name=student_name,
            concept_code=concept.concept_code,
            concept_name=concept.name,
            weak_bloom_level=weak_bloom_level,
            steps=steps[:self.config.max_pathway_steps],
            status="ASSIGNED",
        )
