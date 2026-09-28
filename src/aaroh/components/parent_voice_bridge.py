import uuid
import os
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime, timezone

from src.aaroh.entity.config_entity import DistrictAdminConfig
from src.aaroh.entity.artifact_entity import ParentVoiceAdvisoryEntity
from src.aaroh.components.voice_tts import VoiceTTSComponent
from src.aaroh.utils.logger import logger


class ParentVoiceBridgeComponent:
    """Generates and dispatches 45-second mother-tongue voice advisory notes
    for non-literate rural/tribal parents over IVR / WhatsApp audio.
    """

    def __init__(self, config: DistrictAdminConfig, tts_component: VoiceTTSComponent):
        self.config = config
        self.tts = tts_component
        self.output_dir = Path(config.parent_voice_output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def create_parent_voice_note(
        self,
        student_id: str,
        student_name: str,
        parent_phone: str,
        concept_name: str,
        target_language: str = "hi",
        target_dialect: Optional[str] = "gon",
    ) -> ParentVoiceAdvisoryEntity:
        """Generates a mother-tongue voice advisory audio message for a parent."""
        advisory_id = f"adv_{student_id}_{str(uuid.uuid4())[:6]}"

        if target_language == "hi":
            speech_script = (
                f"Namaste! Aaj aapke bachhe {student_name} ne primary school mein "
                f"'{concept_name}' aur mitti ke matke se paani thanda hone ka jaadu seekha. "
                f"Aap ghar par unse poochhiye ki matka paani kaise thanda rakhta hai! "
                f"Aapka aashirvaad unhe aur aage badhayega. Dhanyawaad!"
            )
        else:
            speech_script = (
                f"Greetings! Today your child {student_name} learned about '{concept_name}' in school. "
                f"Please ask them at home about how the clay pot cools water naturally. "
                f"Your encouragement helps them thrive!"
            )

        # Synthesize voice note
        audio_seg = self.tts.synthesize_text(
            text=speech_script,
            section_name=f"parent_{student_id}",
            target_language=target_language,
            target_dialect=target_dialect,
        )

        stream_url = f"/api/v1/voice/stream/{Path(audio_seg.audio_file_path).name}"
        dispatch_status = "SENT" if self.config.enable_mock_ivr_dispatch else "SCHEDULED"

        logger.info(f"Parent Voice Advisory generated: '{advisory_id}' for {student_name} (Phone: {parent_phone})")

        return ParentVoiceAdvisoryEntity(
            advisory_id=advisory_id,
            student_id=student_id,
            student_name=student_name,
            parent_phone=parent_phone,
            target_language=target_language,
            target_dialect=target_dialect,
            concept_learned=concept_name,
            speech_script=speech_script,
            audio_file_path=audio_seg.audio_file_path,
            stream_url=stream_url,
            dispatch_status=dispatch_status,
        )
