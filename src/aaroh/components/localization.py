import time
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from src.aaroh.entity.config_entity import LocalizationConfig
from src.aaroh.entity.artifact_entity import (
    LocalizedLessonEntity,
    ConceptEntity,
)
from src.aaroh.components.simplification import SimplificationComponent
from src.aaroh.components.rag_pipeline import RAGPipelineComponent
from src.aaroh.database.content_cache import ContentCacheManager
from src.aaroh.database.session import DatabaseManager
from src.aaroh.database.models import ConceptModel, DocumentModel
from src.aaroh.utils.logger import logger
from src.aaroh.utils.exception import AarohException
import sys


class LocalizationComponent:
    """Orchestrates the Phase 3 RAG-powered Simplification & Localization pipeline.
    
    Flow:
      1. Check cache (concept_code + lang + dialect) → return instantly if hit.
      2. RAG retrieval: pull top-k matching curriculum chunks from pgvector.
      3. Call SimplificationComponent → Bedrock (Claude) generates localized lesson.
      4. Store in cache (local JSON → DynamoDB); return structured LocalizedLessonEntity.
    """

    def __init__(
        self,
        localization_config: LocalizationConfig,
        simplification_component: SimplificationComponent,
        rag_component: RAGPipelineComponent,
        db_manager: DatabaseManager,
    ):
        self.config = localization_config
        self.simplifier = simplification_component
        self.rag = rag_component
        self.db = db_manager
        self.cache = ContentCacheManager(localization_config)

    def generate_localized_lesson(
        self,
        concept_code: str,
        target_language: str = "hi",
        target_dialect: Optional[str] = None,
        grade_level: Optional[int] = None,
        force_regenerate: bool = False,
    ) -> LocalizedLessonEntity:
        """Generates (or retrieves from cache) a localized, simplified lesson for a given concept."""
        start_time = time.perf_counter()

        # 1. Cache lookup
        if not force_regenerate and self.cache.is_cached(concept_code, target_language, target_dialect):
            cached_payload = self.cache.get(concept_code, target_language, target_dialect)
            logger.info(f"Cache HIT for concept '{concept_code}' ({target_language}/{target_dialect})")
            return self._payload_to_entity(cached_payload, concept_code, target_language, target_dialect, cached=True)

        # 2. Fetch concept from database
        concept_entity = self._fetch_concept(concept_code)
        if not concept_entity:
            raise AarohException(f"Concept '{concept_code}' not found in database.")

        effective_grade = grade_level or 3

        # 3. RAG retrieval: semantic search for relevant curriculum chunks
        rag_query = f"{concept_entity.name} {' '.join(concept_entity.key_vocabulary[:3])}"
        retrieved_chunks = self.rag.search_similar_content(query=rag_query, top_k=self.config.max_retrieved_chunks)
        curriculum_context = "\n\n---\n\n".join(
            c.get("content", "") for c in retrieved_chunks if c.get("content")
        )

        if not curriculum_context:
            curriculum_context = f"{concept_entity.name}: {concept_entity.definition}"

        # 4. Generate via LLM + cultural anchors
        logger.info(f"Generating localized lesson: '{concept_code}' -> {target_language}/{target_dialect}")
        lesson_dict = self.simplifier.simplify_and_localize(
            concept=concept_entity,
            curriculum_context=curriculum_context,
            grade_level=effective_grade,
            target_language=target_language,
            target_dialect=target_dialect,
        )

        # 5. Store in cache
        self.cache.put(concept_code, target_language, target_dialect, lesson_dict)

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.info(f"Localized lesson generated in {elapsed_ms}ms for '{concept_code}'")

        entity = self._payload_to_entity(lesson_dict, concept_code, target_language, target_dialect, cached=False)
        entity.concept_name = concept_entity.name
        entity.grade_level = effective_grade
        entity.source_chunks = [c.get("content", "")[:80] for c in retrieved_chunks]
        entity.cultural_anchors_used = concept_entity.rural_tribal_anchors
        return entity

    def generate_for_document(
        self,
        document_id: str,
        target_language: str = "hi",
        target_dialect: Optional[str] = None,
    ) -> List[LocalizedLessonEntity]:
        """Generates localized lessons for every concept in a Phase 1 ingested document."""
        session = self.db.get_session()
        try:
            doc = session.query(DocumentModel).filter_by(id=document_id).first()
            if not doc:
                raise AarohException(f"Document '{document_id}' not found.")

            concepts = session.query(ConceptModel).filter_by(document_id=document_id).all()
            if not concepts:
                raise AarohException(f"No concepts found for document '{document_id}'.")

            results = []
            for c in concepts:
                lesson = self.generate_localized_lesson(
                    concept_code=c.concept_code,
                    target_language=target_language,
                    target_dialect=target_dialect,
                    grade_level=doc.grade_level,
                )
                results.append(lesson)

            logger.info(f"Generated {len(results)} localized lessons for document '{document_id}'")
            return results
        finally:
            session.close()

    def _fetch_concept(self, concept_code: str) -> Optional[ConceptEntity]:
        """Fetches concept from RDS and converts to ConceptEntity."""
        session = self.db.get_session()
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

    @staticmethod
    def _payload_to_entity(
        payload: Dict[str, Any],
        concept_code: str,
        target_language: str,
        target_dialect: Optional[str],
        cached: bool = False,
    ) -> LocalizedLessonEntity:
        return LocalizedLessonEntity(
            concept_code=concept_code,
            concept_name=payload.get("concept_name", concept_code),
            grade_level=payload.get("grade_level", 3),
            target_language=target_language,
            target_dialect=target_dialect,
            simplified_explanation=payload.get("simplified_explanation", ""),
            local_analogies=payload.get("local_analogies", []),
            story_narrative=payload.get("story_narrative", ""),
            hands_on_activity=payload.get("hands_on_activity", {}),
            reflection_questions=payload.get("reflection_questions", []),
            voice_script=payload.get("voice_script", ""),
            source_chunks=[],
            cultural_anchors_used=[],
            cached=cached,
        )
