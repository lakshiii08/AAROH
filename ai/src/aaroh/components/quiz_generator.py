import json
import re
import uuid
import boto3
from typing import List, Optional, Dict, Any
from src.aaroh.entity.config_entity import BedrockModelConfig
from src.aaroh.entity.artifact_entity import (
    QuizEntity,
    QuizQuestionEntity,
    ConceptEntity,
)
from src.aaroh.utils.logger import logger


QUESTION_TYPE_MCQ = "mcq"
QUESTION_TYPE_FILL = "fill_blank"
QUESTION_TYPE_TF = "true_false"


class QuizGeneratorComponent:
    """Generates culturally-localized quizzes from lesson content via Bedrock LLM.

    Each worksheet contains five MCQs and five open-ended theory questions.
    """

    def __init__(self, config: BedrockModelConfig, prompt_config: dict):
        self.config = config
        self.prompt_config = prompt_config
        self.bedrock_runtime = self._init_bedrock()

    def _init_bedrock(self):
        try:
            return boto3.client("bedrock-runtime", region_name=self.config.region_name)
        except Exception as e:
            logger.warning(f"Bedrock unavailable for quiz generation ({e}). Using fallback.")
            return None

    def generate_quiz(
        self,
        concept: ConceptEntity,
        localized_explanation: str,
        grade_level: int,
        target_language: str = "sat",
        target_dialect: Optional[str] = None,
        num_mcq: int = 5,
    ) -> QuizEntity:
        """Generates a full quiz for a concept in the child's mother tongue."""
        quiz_id = str(uuid.uuid4())

        raw = self._call_llm(concept, localized_explanation, grade_level, target_language, target_dialect, num_mcq)
        questions = self._parse_questions(raw, concept)

        fallback_used = not bool(questions) or raw == self._fallback_raw_json(concept, target_language)
        if fallback_used:
            logger.warning("LLM returned no parseable questions. Using structured fallback.")
            questions = self._fallback_questions(concept, target_language)

        mcqs = [q for q in questions if q.question_type == QUESTION_TYPE_MCQ][:5]
        theory = [q for q in questions if q.question_type in {"theory", "short_answer", "open_ended"}][:5]
        if len(mcqs) != 5 or len(theory) != 5:
            logger.warning("Quiz did not contain exactly 5 MCQs and 5 theory questions; using worksheet fallback.")
            questions = self._fallback_questions(concept, target_language)
            fallback_used = True
        else:
            questions = mcqs + theory

        if target_language == "sat" or fallback_used:
            if target_language == "sat":
                from src.aaroh.components.santali_engine import translate_to_santali
                translator = lambda text: self._to_santali(text, translate_to_santali)
            else:
                translator = lambda text: self._translate_fallback_text(text, target_language)

            fields = []
            for question in questions:
                fields.extend([(question, "question_text", question.question_text), (question, "explanation", question.explanation)])
                for index, option in enumerate(question.options):
                    prefix, text = (option[:3], option[3:]) if len(option) > 3 and option[:2] in {"A)", "B)", "C)", "D)"} else ("", option)
                    fields.append((question, f"option:{index}:{prefix}", text))

            unique_texts = list(dict.fromkeys(text for _, _, text in fields if text))
            from concurrent.futures import ThreadPoolExecutor
            with ThreadPoolExecutor(max_workers=8) as executor:
                translations = dict(zip(unique_texts, executor.map(translator, unique_texts)))
            for question, field, text in fields:
                if not text:
                    continue
                translated = translations.get(text, text)
                if field.startswith("option:"):
                    _, index, prefix = field.split(":", 2)
                    question.options[int(index)] = f"{prefix}{translated}"
                else:
                    setattr(question, field, translated)

        quiz = QuizEntity(
            quiz_id=quiz_id,
            concept_code=concept.concept_code,
            concept_name=concept.name,
            grade_level=grade_level,
            target_language=target_language,
            target_dialect=target_dialect,
            questions=questions,
        )
        logger.info(f"Quiz generated: '{concept.concept_code}' — {len(questions)} questions")
        return quiz

    def _call_llm(self, concept, explanation, grade, lang, dialect, num_mcq) -> str:
        quiz_prompt = self._build_quiz_prompt(concept, explanation, grade, lang, dialect, num_mcq)

        if self.bedrock_runtime and not self.config.enable_mock_llm:
            try:
                response = self.bedrock_runtime.converse(
                    modelId=self.config.llm_model_id,
                    messages=[{"role": "user", "content": [{"text": quiz_prompt}]}],
                    inferenceConfig={"maxTokens": 2000, "temperature": 0.3},
                )
                return response["output"]["message"]["content"][0]["text"]
            except Exception as e:
                logger.warning(f"Bedrock quiz call failed ({e}). Using fallback.")

        return self._fallback_raw_json(concept, lang)

    def _build_quiz_prompt(self, concept, explanation, grade, lang, dialect, num_mcq) -> str:
        anchors = "\n".join(f"- {a}" for a in concept.rural_tribal_anchors[:3])
        dialect_note = f" Adapt for {dialect} dialect." if dialect else ""
        language_names = {"sat": "Santali, written only in Ol Chiki", "hi": "Hindi, written in Devanagari", "en": "English"}
        language = language_names.get(lang, lang)
        return f"""You are an expert worksheet designer for Grade {grade} rural Indian children.
Language: {language}.{dialect_note}

CONCEPT: {concept.name}
DEFINITION: {concept.definition}
SIMPLIFIED EXPLANATION (already given to child): {explanation[:800]}

CULTURAL ANCHORS (use these in questions):
{anchors}

Generate a worksheet with EXACTLY this structure in JSON:
{{
  "questions": [
    {{
      "question_id": "Q1",
      "question_type": "mcq",
      "question_text": "<question in {language}, using village context>",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "A",
      "explanation": "<1-2 sentence explanation in {language} why this is correct>",
      "blooms_level": "Remember",
      "difficulty_level": 1,
      "cultural_anchor": "<which anchor was used>"
    }},
    {{
      "question_id": "Q6",
      "question_type": "theory",
      "question_text": "<open-ended written question in {language}>",
      "options": [],
      "correct_answer": "",
      "explanation": "",
      "blooms_level": "Understand",
      "difficulty_level": 2,
      "cultural_anchor": "<which anchor was used>"
    }},
    ... (exactly 5 MCQs followed by exactly 5 theory questions; 10 total)
  ]
}}

RULES:
- All question_text, options, explanation MUST be in {language}.
- MCQ options must have EXACTLY 4 items prefixed A) B) C) D).
- correct_answer for MCQ is just "A" or "B" or "C" or "D".
- Theory questions use question_type "theory", have no options and an empty correct_answer, and ask for a short written explanation in the student's own words.
- Do not include fill-in-the-blank or true/false questions.
- Use valid Ol Chiki Unicode (U+1C50–U+1C7F) for Santali; never write Santali in Devanagari or Roman script.
- Difficulty should increase gradually across the five MCQs; then ask five age-appropriate theory questions.
- Use characters like Ramu, Budhiya, Soma from the village in question scenarios.
- NO English words in questions (except proper nouns if unavoidable).
Output ONLY the JSON object, no extra text."""

    def _parse_questions(self, raw: str, concept: ConceptEntity) -> List[QuizQuestionEntity]:
        try:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if not match:
                return []
            data = json.loads(match.group(0))
            questions = []
            for q in data.get("questions", []):
                questions.append(QuizQuestionEntity(
                    question_id=q.get("question_id", str(uuid.uuid4())[:8]),
                    concept_code=concept.concept_code,
                    question_type=q.get("question_type", QUESTION_TYPE_MCQ),
                    question_text=q.get("question_text", ""),
                    options=q.get("options", []),
                    correct_answer=q.get("correct_answer", "A"),
                    explanation=q.get("explanation", ""),
                    blooms_level=q.get("blooms_level", "Remember"),
                    difficulty_level=q.get("difficulty_level", 1),
                    cultural_anchor=q.get("cultural_anchor"),
                ))
            return questions
        except Exception as e:
            logger.error(f"Failed to parse quiz JSON: {e}")
            return []

    def _fallback_raw_json(self, concept: ConceptEntity, lang: str) -> str:
        """Rich pre-built quiz for EVS water concept (fallback when no LLM)."""
        return json.dumps({
            "questions": [
                {
                    "question_id": "Q1",
                    "question_type": "mcq",
                    "question_text": "Ramu ke gaon ka kuan ek baar sookh gaya. Paani wahan se gaya kahan?",
                    "options": [
                        "A) Paani zameen mein chala gaya",
                        "B) Paani bhaap banke upar uth gaya aur badal bana",
                        "C) Paani khatam ho gaya hamesha ke liye",
                        "D) Paani naali mein bah gaya",
                    ],
                    "correct_answer": "B",
                    "explanation": "Suraj ki garmi se paani bhaap banke upar uth jaata hai — ise 'vashpikaran' kehte hain. Phir badal banta hai aur baarish hoti hai.",
                    "blooms_level": "Understand",
                    "difficulty_level": 1,
                    "cultural_anchor": "Village well (kuan)",
                },
                {
                    "question_id": "Q2",
                    "question_type": "mcq",
                    "question_text": "Soma ki daadi mitti ke matke mein paani rakhti hain. Iska paani thanda kyu rehta hai?",
                    "options": [
                        "A) Matke mein jaadu hota hai",
                        "B) Mitti bahut gehri hoti hai",
                        "C) Matke ke chhedon se paani baahar aata hai aur bhaap banta hai, jo thandi deta hai",
                        "D) Matka andar se barif bana hota hai",
                    ],
                    "correct_answer": "C",
                    "explanation": "Mitti ke matke mein chhote-chhote chhed hote hain. Paani un chhedon se baahar aakar bhaap banta hai aur thanda feel hota hai — yeh vashpikaran ka hi jaadu hai!",
                    "blooms_level": "Apply",
                    "difficulty_level": 2,
                    "cultural_anchor": "Mitti ka matka (clay pot cooling)",
                },
                {
                    "question_id": "Q3",
                    "question_type": "mcq",
                    "question_text": "Jal ka safar sahi order mein kaunsa hai?",
                    "options": [
                        "A) Baarish → Nadi → Bhaap → Badal",
                        "B) Bhaap → Badal → Baarish → Nadi",
                        "C) Badal → Nadi → Baarishk → Bhaap",
                        "D) Nadi → Baarish → Badal → Bhaap",
                    ],
                    "correct_answer": "B",
                    "explanation": "Paani ka chakkar: Nadi/talab se bhaap uthti hai, badal banta hai, baarish girti hai, phir nadi. Ise 'jal chakra' kehte hain.",
                    "blooms_level": "Remember",
                    "difficulty_level": 3,
                    "cultural_anchor": "Monsoon rain",
                },
                {
                    "question_id": "Q4",
                    "question_type": "mcq",
                    "question_text": "Suraj ki garmi se paani bhaap banke upar uthta hai. Is badlav ko kya kehte hain?",
                    "options": ["A) Vashpikaran", "B) Jamna", "C) Pighalna", "D) Barasna"],
                    "correct_answer": "A",
                    "explanation": "Vashpikaran matlab paani ka bhaap mein badalna. Yahi jal chakra ki pehli seedi hai.",
                    "blooms_level": "Remember",
                    "difficulty_level": 4,
                    "cultural_anchor": "Monsoon rain",
                },
                {
                    "question_id": "Q5",
                    "question_type": "mcq",
                    "question_text": "Bhaap thandi hokar kya ban sakti hai?",
                    "options": ["A) Mitti", "B) Badal", "C) Pathar", "D) Lakdi"],
                    "correct_answer": "B",
                    "explanation": "Paani kabhi khatam nahi hota! Bhaap se badal, badal se baarish, baarish se nadi — yeh jal chakra hamesha chalti rehti hai.",
                    "blooms_level": "Understand",
                    "difficulty_level": 5,
                    "cultural_anchor": "Forest stream (jharna)",
                },
                *[
                    {
                        "question_id": f"Q{index}",
                        "question_type": "theory",
                        "question_text": prompt,
                        "options": [],
                        "correct_answer": "",
                        "explanation": "",
                        "blooms_level": "Understand" if index < 9 else "Apply",
                        "difficulty_level": 2 if index < 9 else 3,
                        "cultural_anchor": "Water cycle and village life",
                    }
                    for index, prompt in enumerate([
                        "Apne shabdon mein batao, paani bhaap kaise banta hai?",
                        "Badal banne mein thandi hawa ki kya bhoomika hai?",
                        "Baarish ka paani gaon ke kuen ya talab tak kaise pahunchta hai?",
                        "Mitti ka matka paani ko thanda kaise karta hai?",
                        "Apne gaon mein paani bachane ke do tareeke likho.",
                    ], start=6)
                ],
            ]
        }, ensure_ascii=False)

    def _fallback_questions(self, concept: ConceptEntity, lang: str) -> List[QuizQuestionEntity]:
        return self._parse_questions(self._fallback_raw_json(concept, lang), concept)

    @staticmethod
    def _translate_fallback_text(text: str, target_language: str) -> str:
        """Return stable fallback quiz text when a live translation service is unavailable.

        The structured fallback content is already authored in classroom-friendly
        Hindi/Hinglish. Keeping it intact is better than failing quiz generation
        or returning partially translated options.
        """
        if not text:
            return text

        target = (target_language or "hi").lower()
        if target in {"hi", "en", "gon", "hne"}:
            return text

        try:
            import json as _json
            import urllib.parse
            import urllib.request

            target_code = "hi" if target in {"bhi", "kud", "sad"} else target
            trans_url = (
                "https://translate.googleapis.com/translate_a/single"
                f"?client=gtx&sl=auto&tl={target_code}&dt=t&q={urllib.parse.quote(text)}"
            )
            req = urllib.request.Request(trans_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=3) as resp:
                data = _json.loads(resp.read().decode())
                translated = "".join(part[0] for part in data[0] if part[0])
                return translated or text
        except Exception as err:
            logger.warning(f"Fallback quiz translation unavailable ({err}). Keeping source text.")
            return text

    @staticmethod
    def _to_santali(text: str, translator) -> str:
        if not text:
            return text
        has_ol_chiki = any("\u1c50" <= char <= "\u1c7f" for char in text)
        has_other_letters = any(char.isalpha() and not ("\u1c50" <= char <= "\u1c7f") for char in text)
        if has_ol_chiki and not has_other_letters:
            return text
        return translator(text, "auto")
