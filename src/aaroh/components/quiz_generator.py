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

    Each quiz contains:
      - 3 MCQ questions (A/B/C/D) with correct answer + explanation
      - 1 Fill-in-the-blank question using a village analogy
      - 1 True/False question on a common misconception
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
        target_language: str,
        target_dialect: Optional[str] = None,
        num_mcq: int = 3,
    ) -> QuizEntity:
        """Generates a full quiz for a concept in the child's mother tongue."""
        quiz_id = str(uuid.uuid4())

        raw = self._call_llm(concept, localized_explanation, grade_level, target_language, target_dialect, num_mcq)
        questions = self._parse_questions(raw, concept)

        if not questions:
            logger.warning("LLM returned no parseable questions. Using structured fallback.")
            questions = self._fallback_questions(concept, target_language)

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
        return f"""You are an expert quiz designer for Grade {grade} rural Indian children.
Language: {lang}.{dialect_note}

CONCEPT: {concept.name}
DEFINITION: {concept.definition}
SIMPLIFIED EXPLANATION (already given to child): {explanation[:800]}

CULTURAL ANCHORS (use these in questions):
{anchors}

Generate a quiz with EXACTLY this structure in JSON:
{{
  "questions": [
    {{
      "question_id": "Q1",
      "question_type": "mcq",
      "question_text": "<question in {lang}, using village context>",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "A",
      "explanation": "<1-2 sentence explanation in {lang} why this is correct>",
      "blooms_level": "Remember",
      "difficulty_level": 1,
      "cultural_anchor": "<which anchor was used>"
    }},
    ... (total {num_mcq} MCQs, then 1 fill_blank, then 1 true_false)
  ]
}}

RULES:
- All question_text, options, explanation MUST be in {lang}.
- MCQ options must have EXACTLY 4 items prefixed A) B) C) D).
- correct_answer for MCQ is just "A" or "B" or "C" or "D".
- fill_blank question_text contains "______" as blank; correct_answer is the word.
- true_false correct_answer is "True" or "False".
- Difficulty levels: first MCQ=1, second MCQ=2, third MCQ=3, fill_blank=2, true_false=1.
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
                    "question_type": "fill_blank",
                    "question_text": "Suraj ki garmi se paani bhaap banke upar uthta hai — ise ______ kehte hain.",
                    "options": [],
                    "correct_answer": "vashpikaran",
                    "explanation": "Vashpikaran matlab paani ka bhaap mein badalna. Yahi jal chakra ki pehli seedi hai.",
                    "blooms_level": "Remember",
                    "difficulty_level": 1,
                    "cultural_anchor": "Monsoon rain",
                },
                {
                    "question_id": "Q5",
                    "question_type": "true_false",
                    "question_text": "Paani ek baar bhaap ban jaata hai toh hamesha ke liye khatam ho jaata hai — Sach hai ya Jhooth?",
                    "options": [],
                    "correct_answer": "False",
                    "explanation": "Paani kabhi khatam nahi hota! Bhaap se badal, badal se baarish, baarish se nadi — yeh jal chakra hamesha chalti rehti hai.",
                    "blooms_level": "Understand",
                    "difficulty_level": 1,
                    "cultural_anchor": "Forest stream (jharna)",
                },
            ]
        }, ensure_ascii=False)

    def _fallback_questions(self, concept: ConceptEntity, lang: str) -> List[QuizQuestionEntity]:
        return self._parse_questions(self._fallback_raw_json(concept, lang), concept)
