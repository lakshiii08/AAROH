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
        """High-quality fallback lesson with authentic Devanagari Hindi for TTS voice clarity."""
        lesson = {
            "simplified_explanation": (
                "क्या तुमने कभी देखा है कि मिट्टी का मटका पानी को कितना ठंडा और ताज़ा रखता है? "
                "यह इसलिए होता है क्योंकि मिट्टी के घड़े में बहुत छोटे-छोटे छेद होते हैं। "
                "पानी उन छेदों से धीरे-धीरे बाहर आता है और सूरज की धूप व हवा से भाप बनकर उड़ जाता है। "
                "जब पानी भाप बनता है, तो वह अपने साथ थोड़ी गर्मी ले जाता है — और मटके के अंदर का पानी बिल्कुल ठंडा रहता है! "
                "इसी प्रक्रिया को हम वाष्पीकरण कहते हैं। "
                "जब धूप नदी या तालाब के पानी को गर्म करती है, तो वह भी इसी तरह भाप बनकर आसमान की ओर उठता है।"
            ),
            "local_analogies": [
                "मिट्टी का मटका (Clay Pot Cooling) — जैसे मटके का पानी गर्मी में ठंडा रहता है।",
                "रोटी से उठती भाप — तवे पर गरम रोटी से जो भाप निकलती है वह वाष्पीकरण है।",
                "सुबह घास पर ओस की बूँदें — रात में ठंडी हवा से बनी पानी की बूँदें!",
            ],
            "story_narrative": (
                "एक बार रामू की दादी ने उसे बताया: 'बेटा, देख यह मिट्टी का मटका। रात भर हम इसमें पानी रखते हैं और सुबह तक पानी कितना ठंडा और मीठा हो जाता है!' रामू हैरान था।\n\n"
                "दोनों गाँव के बड़े तालाब के किनारे गए। दादी ने कहा: 'देख, सूरज की धूप से तालाब का पानी धीरे-धीरे भाप बनकर ऊपर आसमान में उड़ रहा है। वही भाप ऊपर जाकर बड़े-बड़े बादल बनाती है। फिर वही बादल बारिश बनकर हमारे खेतों और तालाबों में बरसते हैं।'\n\n"
                "रामू ने बादलों को देखा और समझ गया — पानी कभी खत्म नहीं होता, वह घूमता रहता है — मटके से भाप, भाप से बादल, और बादल से बारिश!"
            ),
            "hands_on_activity": {
                "title": "भाप और ठंडक — मिट्टी के मटके का जादू",
                "materials_needed": ["एक छोटा मिट्टी का मटका", "साफ पानी", "धूप", "एक साफ सूती कपड़ा"],
                "steps": [
                    "मटके में पानी भरो और उसे सूती कपड़े से ढक दो।",
                    "उसे बाहर नीम या पीपल के पेड़ की छांव में रखो।",
                    "एक घंटे बाद मटके को छूकर महसूस करो — क्या मटका ठंडा लग रहा है?",
                    "अब एक कटोरी में अलग से पानी रखो और दोनों का तापमान तुलना करो।",
                ],
                "learning_outcome": (
                    "बच्चा महसूस करेगा कि मिट्टी के मटके में वाष्पीकरण से पानी ठंडा होता है — यह प्रकृति का अपना कूलर है!"
                ),
            },
            "reflection_questions": [
                {
                    "question": "सुबह घास या पेड़ों के पत्तों पर पानी की बूँदें कहाँ से आती हैं?",
                    "hint": "रात में हवा ठंडी होने से भाप फिर से पानी की बूँद बन जाती है।",
                },
                {
                    "question": "घर के बुजुर्गों से पूछो — पहले जब फ्रिज नहीं था तब पानी को ठंडा कैसे रखते थे?",
                    "hint": "मटका, सुराही या मिट्टी के घड़े का इस्तेमाल करते थे।",
                },
            ],
            "voice_script": (
                "नमस्ते दोस्तों! आज हम प्रकृति के एक अद्भुत जादू की बात करेंगे — पानी का अनोखा सफर! "
                "सोचो, जब सूरज की धूप नदी या तालाब पर पड़ती है, तो पानी धीरे-धीरे भाप बनकर आसमान में उड़ने लगता है। "
                "इसे वाष्पीकरण कहते हैं। यह भाप ऊपर जाकर ठंडी हवा से मिलती है और बड़े-बड़े बादल बन जाती है। "
                "फिर झमाझम बारिश होती है और पानी वापस हमारे तालाब और नदियों में लौट आता है। "
                "इसे कहते हैं जल चक्र — पानी का अमर सफर! "
                "अब आप भी अपने घर में मटके का पानी पीकर इस ठंडक को महसूस करो!"
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
