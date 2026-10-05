from typing import Optional, List
from src.aaroh.configuration.configuration import ConfigurationManager
from src.aaroh.components.simplification import SimplificationComponent
from src.aaroh.components.localization import LocalizationComponent
from src.aaroh.components.rag_pipeline import RAGPipelineComponent
from src.aaroh.components.content_transformation import ContentTransformationComponent
from src.aaroh.database.session import DatabaseManager
from src.aaroh.database.content_cache import ContentCacheManager
from src.aaroh.pipeline.simplification_graph import SimplificationLocalizationGraph
from src.aaroh.entity.artifact_entity import LocalizedLessonEntity
from src.aaroh.utils.logger import logger
from src.aaroh.utils.exception import AarohException
import sys


class SimplificationLocalizationPipeline:
    """Phase 3 orchestrator: RAG + LangGraph + Bedrock → Localized Lesson."""

    def __init__(self, config_manager: Optional[ConfigurationManager] = None):
        self.config_manager = config_manager or ConfigurationManager()

        model_config = self.config_manager.get_bedrock_model_config()
        db_config = self.config_manager.get_database_config()
        loc_config = self.config_manager.get_localization_config()
        prompt_config = self.config_manager.get_prompt_config()

        self.db_manager = DatabaseManager(db_config)
        transformer = ContentTransformationComponent(model_config, prompt_config)
        self.rag_component = RAGPipelineComponent(self.db_manager, transformer)
        self.simplifier = SimplificationComponent(model_config, prompt_config)
        self.cache = ContentCacheManager(loc_config)
        self.langgraph_agent = SimplificationLocalizationGraph(
            simplifier=self.simplifier,
            rag=self.rag_component,
            cache=self.cache,
        )
        self.localization_component = LocalizationComponent(
            localization_config=loc_config,
            simplification_component=self.simplifier,
            rag_component=self.rag_component,
            db_manager=self.db_manager,
        )

    def run_for_concept(
        self,
        concept_code: str,
        target_language: str = "hi",
        target_dialect: Optional[str] = None,
        grade_level: int = 3,
        force_regenerate: bool = False,
    ) -> LocalizedLessonEntity:
        """Runs the Phase 3 pipeline for a single concept."""
        try:
            logger.info("=" * 60)
            logger.info(f"Phase 3 Pipeline: '{concept_code}' -> {target_language} / {target_dialect or 'Standard'}")
            logger.info("=" * 60)

            result = self.localization_component.generate_localized_lesson(
                concept_code=concept_code,
                target_language=target_language,
                target_dialect=target_dialect,
                grade_level=grade_level,
                force_regenerate=force_regenerate,
            )

            logger.info(f"Phase 3 complete. Cached: {result.cached}")
            return result
        except Exception as e:
            logger.error(f"Phase 3 pipeline failed: {e}")
            raise AarohException(e, sys)

    def run_for_document(
        self,
        document_id: str,
        target_language: str = "hi",
        target_dialect: Optional[str] = None,
    ) -> List[LocalizedLessonEntity]:
        """Generates localized lessons for all concepts in a document."""
        try:
            return self.localization_component.generate_for_document(
                document_id=document_id,
                target_language=target_language,
                target_dialect=target_dialect,
            )
        except Exception as e:
            raise AarohException(e, sys)

    def run_langgraph_for_concept(
        self,
        concept_code: str,
        target_language: str = "hi",
        target_dialect: Optional[str] = None,
        grade_level: int = 3,
        force_regenerate: bool = False,
    ) -> dict:
        """Runs the explicit LangGraph agent pipeline and returns raw lesson dict."""
        concept_entity = self.localization_component._fetch_concept(concept_code)
        if not concept_entity:
            raise AarohException(f"Concept '{concept_code}' not found.")

        return self.langgraph_agent.run(
            concept=concept_entity,
            target_language=target_language,
            target_dialect=target_dialect,
            grade_level=grade_level,
            force_regenerate=force_regenerate,
        )
