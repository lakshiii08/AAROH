import json
import re
import time
import boto3
from typing import Any, Dict, List, Optional, Tuple
from src.aaroh.entity.config_entity import BedrockModelConfig, LocalizationConfig
from src.aaroh.entity.artifact_entity import LocalizedLessonEntity, ConceptEntity
from src.aaroh.database.content_cache import ContentCacheManager
from src.aaroh.components.rag_pipeline import RAGPipelineComponent
from src.aaroh.components.translation import TranslationComponent
from src.aaroh.utils.logger import logger
from src.aaroh.utils.exception import AarohException
import sys


class SimplificationComponent:
    """Calls Bedrock LLM to simplify a concept using retrieved RAG context and cultural anchors."""

    def __init__(self, config: BedrockModelConfig, prompt_config: dict):
        self.config = config
        self.prompt_config = prompt_config
        self.bedrock_runtime = self._init_bedrock()

    def _init_bedrock(self):
        try:
            return boto3.client("bedrock-runtime", region_name=self.config.region_name)
        except Exception as e:
            logger.warning(f"Bedrock runtime unavailable ({e}). Using smart fallback.")
            return None

    def simplify_and_localize(
        self,
        concept: ConceptEntity,
        curriculum_context: str,
        grade_level: int,
        target_language: str,
        target_dialect: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generates a child-friendly, culturally localized lesson via LLM or fallback."""
        sys_prompt = self.prompt_config["simplification_rag"]["system_prompt"]
        template = self.prompt_config["simplification_rag"]["user_prompt_template"]

        cultural_anchors_str = "\n".join(f"- {a}" for a in concept.rural_tribal_anchors)
        user_prompt = template.format(
            concept_name=concept.name,
            concept_code=concept.concept_code,
            grade_level=grade_level,
            target_language=target_language,
            target_dialect=target_dialect or "Standard",
            curriculum_context=curriculum_context[:3000],
            cultural_anchors=cultural_anchors_str,
        )

        raw = self._call_llm(sys_prompt, user_prompt)
        return self._parse_json_response(raw, concept, target_language, target_dialect)

    def _call_llm(self, system_prompt: str, user_prompt: str) -> str:
        if self.bedrock_runtime and not self.config.enable_mock_llm:
            try:
                response = self.bedrock_runtime.converse(
                    modelId=self.config.llm_model_id,
                    messages=[{"role": "user", "content": [{"text": user_prompt}]}],
                    system=[{"text": system_prompt}],
                    inferenceConfig={
                        "maxTokens": self.config.max_tokens,
                        "temperature": self.config.temperature,
                        "topP": self.config.top_p,
                    },
                )
                return response["output"]["message"]["content"][0]["text"]
            except Exception as e:
                logger.warning(f"Bedrock call failed ({e}). Using fallback lesson generator.")

        return self._heuristic_lesson_fallback(user_prompt)

    def _parse_json_response(
        self,
        raw: str,
        concept: ConceptEntity,
        target_language: str,
        target_dialect: Optional[str],
    ) -> Dict[str, Any]:
        try:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            return json.loads(raw)
        except Exception:
            logger.warning("Failed to parse LLM JSON. Returning rich fallback lesson.")
            return self._build_fallback_lesson(concept, target_language, target_dialect)

    def _heuristic_lesson_fallback(self, prompt: str) -> str:
        """High-quality fallback lesson when Bedrock is not configured."""
        lesson = {
            "simplified_explanation": (
                "Kya tumne kabhi dekha hai ki ek mitti ka matka paani ko thand rakhta hai? "
                "Yeh isliye hota hai kyunki mitti ke andar bahut chhote-chhote chhed hote hain. "
                "Paani un chhedon se dhire-dhire bahar aata hai aur phir suraj ki garmi se bhaap ban jaata hai. "
                "Jab paani bhaap banta hai, toh woh apne saath thodi thandi le jaata hai — aur matka ke andar ka paani thanda rehta hai! "
                "Yeh wahi cheez hai jo humein 'vashpikaran' (evaporation) kehte hain. "
                "Jab dhoop talaab ya khet ke paani ko garam karti hai, toh paani bhi aise hi bhaap ban jaata hai aur upar uthta hai."
            ),
            "local_analogies": [
                "Mitti ka matka (clay pot cooling) — jaise matke ka paani thanda rehta hai garmi mein.",
                "Roti pakane ke baad bhap — chapaati ke upar jo bhap aati hai woh vashpikaran hai.",
                "Khet ke upar subah ki os — raat ko patti par bane paani ki boondein kitni thandak deti hain!",
            ],
            "story_narrative": (
                "Ek baar Ramu ki daadi ne use bataya: 'Beta, dekh yeh matka. Raat bhar hum isme paani rakhte hain. "
                "Subah tak paani kitna thanda ho jaata hai!' Ramu hairaan tha.\n\n"
                "Dono akad gaye gaon ke bahar jahan ek bada talab tha. Daadi ne kaha: 'Dekh, suraj ki garmi se "
                "talab ka paani dhire-dhire upar uth raha hai — bhaap ban raha hai. Wahi bhaap upar jaake "
                "bade-bade badal banati hai. Phir wahi badal baarish ban ke vapas hamare khet aur talab mein girte hain.'\n\n"
                "Ramu ne apni aankhon se badliya dekheen aur samajh gaya — paani kabhi khatam nahi hota, "
                "woh ghoomta rehta hai — matke se bhaap, bhaap se badal, badal se baarish!"
            ),
            "hands_on_activity": {
                "title": "Bhaap aur Thandi — Matke ka Jaadu",
                "materials_needed": ["Ek chhota mitti ka bartan ya matka", "Paani", "Dhoop (bahar)", "Ek saaf kapda"],
                "steps": [
                    "Matke mein paani bharo aur saaf kapde se dhakko.",
                    "Use dhoop mein bahar rakh do — peepal ya neem ke ped ke neeche.",
                    "Ek ghante baad apna haath matke par rakh ke mehsoos karo — kya matka thanda lag raha hai?",
                    "Abhi ek katori mein alag se paani rakh do, bina dhakke dhoop mein.",
                    "Ek ghante baad dono ka paani compare karo — kaunsa thanda raha?",
                ],
                "learning_outcome": (
                    "Baccha feel karega ki matke ka paani thanda rehta hai kyunki mitti ke chhedon se "
                    "vashpikaran hota rehta hai — yeh nature ka apna cooler hai!"
                ),
            },
            "reflection_questions": [
                {
                    "question": "Subah ghaas par ya patti par jo paani ki boondein dikhti hain — woh kahan se aati hain?",
                    "hint": "Raat mein hawaa thandi hoti hai — bhaap phir se paani ban jaati hai.",
                },
                {
                    "question": "Ghar ke badon se poochho — pehle refrigerator nahi hota tha toh paani ko thanda kaise rakhte the?",
                    "hint": "Matka, surahee, ya mitti ka ghada use karte the.",
                },
            ],
            "voice_script": (
                "Namaste doston! Aaj hum ek chhoti si jaadu ki baat karange — paani ka safar! "
                "Socho, jab dhoop padti hai nadi ya talab par, toh paani dhire se upar uthne lagta hai — "
                "bhaap ban jaata hai. Yeh hoti hai vashpikaran. Yeh bhaap upar jaake thandi hawaa se milti hai "
                "aur badal ban jaati hai. Phir baarish! Aur baarish ka paani nadi mein aata hai. "
                "Isi tarah paani ghoomta rehta hai — isko kehte hain jal chakra — paani ka chakkar! "
                "Ab try karo ghar mein matke wala experiment — aur dekho kaun sa cooler hai — fridge ya matka?"
            ),
        }
        return json.dumps(lesson, ensure_ascii=False, indent=2)

    def _build_fallback_lesson(
        self, concept: ConceptEntity, target_language: str, target_dialect: Optional[str]
    ) -> Dict[str, Any]:
        return {
            "simplified_explanation": f"Aaj hum seekhenge '{concept.name}' ke baare mein. Yeh ek bahut zaroori cheez hai jo hamari duniya mein hoti hai.",
            "local_analogies": concept.rural_tribal_anchors[:3] if concept.rural_tribal_anchors else ["Gaon ka talab", "Khet ki mitti", "Barish ka paani"],
            "story_narrative": f"Ek din Ramu aur Soma jungle mein gaye aur {concept.name} ka rahasya samjha...",
            "hands_on_activity": {
                "title": f"{concept.name} — Khoj Activity",
                "materials_needed": ["Mitti", "Paani", "Pattiyaan"],
                "steps": ["Observe", "Discuss", "Record"],
                "learning_outcome": f"Child understands {concept.name} through direct experience.",
            },
            "reflection_questions": [
                {"question": f"Kya tumne kabhi {concept.name} dekhi hai?", "hint": "Gaon mein sochna..."},
                {"question": "Ghar mein badon se poochho!", "hint": "Unke anubhav sunna."},
            ],
            "voice_script": f"Aao dosto, aaj {concept.name} ke baare mein baat karte hain!",
        }
