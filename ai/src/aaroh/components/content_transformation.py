import os
import json
import re
import boto3
import hashlib
from collections import Counter
from typing import List, Dict, Any, Optional
from src.aaroh.entity.config_entity import BedrockModelConfig
from src.aaroh.entity.artifact_entity import (
    ParsedDocument,
    ConceptEntity,
    DocumentMetadataEntity,
    ContentChunkEntity,
    ConceptExtractionArtifact,
)
from src.aaroh.utils.logger import logger
from src.aaroh.utils.exception import AarohException
import sys

class ContentTransformationComponent:
    def __init__(self, config: BedrockModelConfig, prompt_config: dict):
        self.config = config
        self.prompt_config = prompt_config
        self.bedrock_runtime = self._init_bedrock_runtime()

    def _init_bedrock_runtime(self):
        try:
            return boto3.client(
                "bedrock-runtime",
                region_name=self.config.region_name,
            )
        except Exception as e:
            logger.warning(f"Could not initialize AWS Bedrock runtime ({e}). Fallback mode active.")
            return None

    def extract_concepts_and_metadata(
        self,
        parsed_doc: ParsedDocument,
        grade_hint: str = "Grade 3",
        subject_hint: str = "Environmental Studies",
    ) -> ConceptExtractionArtifact:
        """Extracts concepts, learning objectives, and curriculum metadata using Bedrock LLM."""
        logger.info(f"Extracting concepts for document: {parsed_doc.filename}...")

        # Sample or summarize full text if very large to fit context window
        text_snippet = parsed_doc.full_text[:12000]

        sys_prompt = self.prompt_config["concept_extraction"]["system_prompt"]
        template = self.prompt_config["concept_extraction"]["user_prompt_template"]
        user_prompt = template.format(
            document_title=parsed_doc.filename,
            grade_hint=grade_hint,
            subject_hint=subject_hint,
            document_text=text_snippet,
        )

        raw_llm_output = self._call_llm(sys_prompt, user_prompt, parsed_doc, grade_hint, subject_hint)
        parsed_json = self._parse_json_response(raw_llm_output, parsed_doc)

        # Parse Metadata
        meta_dict = parsed_json.get("metadata", {})
        metadata_entity = DocumentMetadataEntity(
            title=meta_dict.get("title", parsed_doc.filename),
            subject=meta_dict.get("subject", subject_hint),
            grade_level=int(meta_dict.get("grade_level", 3)),
            language=meta_dict.get("language", "en"),
            summary=meta_dict.get("summary", "Curriculum lesson extracted from textbook."),
            target_competencies=meta_dict.get("target_competencies", []),
        )

        # Parse Concepts
        concepts_list = []
        for c in parsed_json.get("concepts", []):
            concepts_list.append(
                ConceptEntity(
                    concept_code=c.get("concept_code", f"CON-{len(concepts_list)+1}"),
                    name=c.get("name", "Key Concept"),
                    definition=c.get("definition", ""),
                    blooms_level=c.get("blooms_level", "Understand"),
                    difficulty_level=int(c.get("difficulty_level", 2)),
                    prerequisite_concepts=c.get("prerequisite_concepts", []),
                    rural_tribal_anchors=c.get("rural_tribal_anchors", []),
                    key_vocabulary=c.get("key_vocabulary", []),
                )
            )

        logger.info(f"Extracted {len(concepts_list)} concepts from '{parsed_doc.filename}'")

        return ConceptExtractionArtifact(
            document_id=parsed_doc.file_id,
            metadata=metadata_entity,
            concepts=concepts_list,
            chunks=[],
        )

    def _call_llm(
        self,
        system_prompt: str,
        user_prompt: str,
        parsed_doc: ParsedDocument,
        grade_hint: str,
        subject_hint: str,
    ) -> str:
        """Invokes Claude on Bedrock with Converse API, falling back to mock parser if needed."""
        if self.bedrock_runtime and not self.config.enable_mock_llm:
            try:
                response = self.bedrock_runtime.converse(
                    modelId=self.config.llm_model_id,
                    messages=[
                        {
                            "role": "user",
                            "content": [{"text": user_prompt}],
                        }
                    ],
                    system=[{"text": system_prompt}],
                    inferenceConfig={
                        "maxTokens": self.config.max_tokens,
                        "temperature": self.config.temperature,
                        "topP": self.config.top_p,
                    },
                )
                output_text = response["output"]["message"]["content"][0]["text"]
                return output_text
            except Exception as e:
                logger.warning(f"Bedrock invocation failed ({e}). Using intelligent fallback extractor.")

        return self._heuristic_concept_extractor(parsed_doc, grade_hint, subject_hint)

    def _parse_json_response(self, text: str, parsed_doc: ParsedDocument) -> Dict[str, Any]:
        """Cleans and extracts JSON payload from LLM output."""
        try:
            # Match json codeblock or outermost braces
            json_match = re.search(r"\{.*\}", text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
            return json.loads(text)
        except Exception:
            logger.warning("Failed to parse LLM JSON output. Generating fallback curriculum structure.")
            return self._heuristic_fallback_json(parsed_doc)

    def _heuristic_concept_extractor(
        self,
        parsed_doc: ParsedDocument,
        grade_hint: str,
        subject_hint: str,
    ) -> str:
        """Document-aware extractor used when Bedrock is offline or mock mode is enabled."""
        text = parsed_doc.full_text or parsed_doc.filename
        grade_level = self._infer_grade_level(grade_hint)
        title = self._infer_title(parsed_doc)
        sections = self._select_concept_sections(text)
        keywords = self._extract_keywords(text, limit=12)
        summary = self._build_summary(text, parsed_doc.filename)
        subject_prefix = self._subject_prefix(subject_hint)

        concepts = []
        used_codes = set()
        for index, section in enumerate(sections[:3], start=1):
            section_keywords = self._extract_keywords(section, limit=5) or keywords[:5]
            concept_name = self._concept_name_from_section(section, section_keywords, index)
            definition = self._definition_from_section(section, concept_name)
            code_key = section_keywords[0] if section_keywords else concept_name
            concept_code = self._make_concept_code(subject_prefix, grade_level, code_key, index, used_codes)
            used_codes.add(concept_code)
            concepts.append(
                {
                    "concept_code": concept_code,
                    "name": concept_name,
                    "definition": definition,
                    "blooms_level": ["Remember", "Understand", "Apply"][min(index - 1, 2)],
                    "difficulty_level": min(index, 3),
                    "prerequisite_concepts": [] if index == 1 else [concepts[index - 2]["name"]],
                    "rural_tribal_anchors": self._local_anchors(section, subject_hint),
                    "key_vocabulary": section_keywords,
                }
            )

        if not concepts:
            concepts.append(
                {
                    "concept_code": self._make_concept_code(subject_prefix, grade_level, title, 1, used_codes),
                    "name": title,
                    "definition": summary,
                    "blooms_level": "Understand",
                    "difficulty_level": 2,
                    "prerequisite_concepts": [],
                    "rural_tribal_anchors": self._local_anchors(text, subject_hint),
                    "key_vocabulary": keywords[:5],
                }
            )

        data = {
            "metadata": {
                "title": title,
                "subject": subject_hint,
                "grade_level": grade_level,
                "language": "en",
                "summary": summary,
                "target_competencies": [
                    f"Explain the main idea of {title}",
                    "Use lesson vocabulary in short written answers",
                    "Connect the uploaded lesson to local examples",
                ],
            },
            "concepts": concepts,
        }
        return json.dumps(data, indent=2)

    @staticmethod
    def _infer_grade_level(grade_hint: str) -> int:
        match = re.search(r"\d+", grade_hint or "")
        if not match:
            return 3
        return max(1, min(int(match.group(0)), 12))

    @staticmethod
    def _infer_title(parsed_doc: ParsedDocument) -> str:
        lines = [line.strip() for line in (parsed_doc.full_text or "").splitlines() if line.strip()]
        for line in lines[:8]:
            words = line.split()
            if 2 <= len(words) <= 12:
                return line[:120]
        return re.sub(r"[_-]+", " ", parsed_doc.filename.rsplit(".", 1)[0]).strip().title() or parsed_doc.filename

    @staticmethod
    def _build_summary(text: str, filename: str) -> str:
        sentences = re.split(r"(?<=[.!?])\s+", text.strip())
        useful = [s.strip() for s in sentences if len(s.strip()) > 30]
        if useful:
            return " ".join(useful[:2])[:420]
        compact = re.sub(r"\s+", " ", text).strip()
        return compact[:420] or f"Ingested lesson from {filename}"

    @staticmethod
    def _select_concept_sections(text: str) -> List[str]:
        blocks = [b.strip() for b in re.split(r"\n{2,}|(?<=[.!?])\s+", text) if len(b.strip()) >= 45]
        if not blocks:
            compact = re.sub(r"\s+", " ", text).strip()
            return [compact] if compact else []

        sections: List[str] = []
        current = ""
        for block in blocks:
            if len(current) + len(block) <= 700:
                current = f"{current} {block}".strip()
            else:
                sections.append(current)
                current = block
            if len(sections) >= 3:
                break
        if current and len(sections) < 3:
            sections.append(current)
        return sections

    @staticmethod
    def _extract_keywords(text: str, limit: int = 8) -> List[str]:
        stopwords = {
            "about", "after", "again", "also", "because", "before", "being", "between",
            "could", "every", "from", "have", "into", "lesson", "should", "their",
            "there", "these", "this", "through", "under", "using", "where", "which",
            "with", "would", "your", "students", "teacher", "class", "slide",
        }
        words = [
            w.lower()
            for w in re.findall(r"[A-Za-z][A-Za-z-]{3,}", text)
            if w.lower() not in stopwords
        ]
        counts = Counter(words)
        return [word for word, _ in counts.most_common(limit)]

    @staticmethod
    def _subject_prefix(subject_hint: str) -> str:
        normalized = (subject_hint or "").lower()
        if "math" in normalized:
            return "MATH"
        if "science" in normalized:
            return "SCI"
        if "environment" in normalized or "evs" in normalized:
            return "EVS"
        if "social" in normalized:
            return "SOC"
        if "language" in normalized or "english" in normalized:
            return "LANG"
        return "GEN"

    @staticmethod
    def _concept_name_from_section(section: str, keywords: List[str], index: int) -> str:
        heading = section.split(".")[0].strip()
        heading_words = heading.split()
        if 2 <= len(heading_words) <= 8:
            return heading[:80].title()
        if keywords:
            return " ".join(keywords[:3]).title()
        return f"Lesson Concept {index}"

    @staticmethod
    def _definition_from_section(section: str, concept_name: str) -> str:
        first_sentence = re.split(r"(?<=[.!?])\s+", section.strip())[0]
        first_sentence = re.sub(r"\s+", " ", first_sentence).strip()
        if len(first_sentence) >= 30:
            return first_sentence[:360]
        return f"{concept_name} is a key idea explained in the uploaded lesson."

    @staticmethod
    def _make_concept_code(prefix: str, grade_level: int, source: str, index: int, used_codes: set[str]) -> str:
        slug = re.sub(r"[^A-Za-z0-9]+", "", source.upper())[:3] or "KEY"
        code = f"{prefix}-G{grade_level}-{slug}-{index:02d}"
        while code in used_codes:
            index += 1
            code = f"{prefix}-G{grade_level}-{slug}-{index:02d}"
        return code

    @staticmethod
    def _local_anchors(section: str, subject_hint: str) -> List[str]:
        text = f"{section} {subject_hint}".lower()
        anchors = []
        if any(word in text for word in ["seed", "plant", "soil", "crop", "water", "rain"]):
            anchors.extend(["School garden observation", "Local farm or kitchen garden"])
        if any(word in text for word in ["fraction", "number", "divide", "measure", "shape"]):
            anchors.extend(["Sharing grains or fruit equally", "Measuring classroom materials"])
        if any(word in text for word in ["story", "poem", "grammar", "sentence", "language"]):
            anchors.extend(["Village story circle", "Home-language sentence practice"])
        if not anchors:
            anchors.extend(["Village community example", "Local classroom observation"])
        return anchors[:3]

    def _heuristic_fallback_json(self, parsed_doc: ParsedDocument) -> Dict[str, Any]:
        return {
            "metadata": {
                "title": parsed_doc.filename,
                "subject": "General Studies",
                "grade_level": 3,
                "language": "en",
                "summary": f"Ingested lesson from {parsed_doc.filename}",
                "target_competencies": ["Foundational Concept Mastery"],
            },
            "concepts": [
                {
                    "concept_code": f"CON-{parsed_doc.filename[:3].upper()}-01",
                    "name": "Primary Chapter Concept",
                    "definition": "Core topic introduced in this chapter.",
                    "blooms_level": "Understand",
                    "difficulty_level": 2,
                    "prerequisite_concepts": [],
                    "rural_tribal_anchors": ["Village community daily observations"],
                    "key_vocabulary": [],
                }
            ],
        }

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generates 1536-dimensional embeddings using AWS Bedrock Titan Embeddings V2 or mock."""
        embeddings: List[List[float]] = []

        for text in texts:
            if self.bedrock_runtime and not self.config.enable_mock_embeddings:
                try:
                    embed_dim = min(self.config.embedding_dimension, 1024) if "titan-embed-text-v2" in self.config.embedding_model_id else self.config.embedding_dimension
                    body = json.dumps({
                        "inputText": text[:2000],
                        "dimensions": embed_dim,
                        "normalize": True,
                    })
                    response = self.bedrock_runtime.invoke_model(
                        body=body,
                        modelId=self.config.embedding_model_id,
                        accept="application/json",
                        contentType="application/json",
                    )
                    res_body = json.loads(response.get("body").read())
                    embeddings.append(res_body.get("embedding", []))
                    continue
                except Exception as e:
                    logger.warning(f"Bedrock embedding failed ({e}). Generating fallback deterministic embedding.")

            # Fallback deterministic pseudo-random embedding normalized to unit sphere
            embeddings.append(self._generate_fallback_embedding(text, self.config.embedding_dimension))

        return embeddings

    @staticmethod
    def _generate_fallback_embedding(text: str, dim: int = 1536) -> List[float]:
        """Creates a deterministic unit-length embedding vector based on text hashing."""
        seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:8], 16)
        import random
        rnd = random.Random(seed)
        vec = [rnd.gauss(0, 1) for _ in range(dim)]
        norm = sum(x * x for x in vec) ** 0.5
        return [x / norm for x in vec]
