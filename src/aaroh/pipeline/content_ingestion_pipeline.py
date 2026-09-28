from pathlib import Path
from typing import Optional
from src.aaroh.configuration.configuration import ConfigurationManager
from src.aaroh.components.data_ingestion import DocumentIngestionComponent
from src.aaroh.components.content_transformation import ContentTransformationComponent
from src.aaroh.components.rag_pipeline import RAGPipelineComponent
from src.aaroh.database.session import DatabaseManager
from src.aaroh.entity.artifact_entity import IngestionPipelineResult
from src.aaroh.utils.logger import logger
from src.aaroh.utils.exception import AarohException
import sys

class ContentIngestionPipeline:
    def __init__(self, config_manager: Optional[ConfigurationManager] = None):
        self.config_manager = config_manager or ConfigurationManager()
        self.ingestion_config = self.config_manager.get_ingestion_config()
        self.db_config = self.config_manager.get_database_config()
        self.model_config = self.config_manager.get_bedrock_model_config()
        self.prompt_config = self.config_manager.get_prompt_config()

        self.db_manager = DatabaseManager(self.db_config)
        self.ingestion_component = DocumentIngestionComponent(self.ingestion_config)
        self.transformation_component = ContentTransformationComponent(self.model_config, self.prompt_config)
        self.rag_component = RAGPipelineComponent(self.db_manager, self.transformation_component)

    def run_pipeline(
        self,
        file_path: Path | str,
        s3_bucket: Optional[str] = None,
        s3_key: Optional[str] = None,
        grade_hint: str = "Grade 3",
        subject_hint: str = "Environmental Studies",
    ) -> IngestionPipelineResult:
        """Executes the Phase 1 Ingestion and Concept Extraction Pipeline."""
        try:
            logger.info("=" * 60)
            logger.info(f"Starting Content Ingestion Pipeline for: {file_path}")
            logger.info("=" * 60)

            # Step 1: Parse Document
            parsed_doc = self.ingestion_component.parse_document(
                file_path=file_path,
                s3_bucket=s3_bucket,
                s3_key=s3_key,
            )

            # Step 2: Educational Chunking
            chunks = self.ingestion_component.chunk_document(parsed_doc)

            # Step 3: LLM Concept & Metadata Extraction
            extraction_artifact = self.transformation_component.extract_concepts_and_metadata(
                parsed_doc=parsed_doc,
                grade_hint=grade_hint,
                subject_hint=subject_hint,
            )

            # Step 4: Index into PostgreSQL / pgvector
            result = self.rag_component.index_document_and_concepts(
                parsed_doc=parsed_doc,
                extraction_artifact=extraction_artifact,
                chunks=chunks,
            )

            logger.info("=" * 60)
            logger.info(f"Pipeline Completed Successfully: {result.status}")
            logger.info(f"Document ID: {result.document_id} | Chunks: {result.total_chunks} | Concepts: {result.total_concepts}")
            logger.info("=" * 60)
            return result

        except Exception as e:
            logger.error(f"Ingestion Pipeline failed: {e}")
            raise AarohException(e, sys)

    def run_from_s3_event(self, s3_bucket: str, s3_key: str) -> IngestionPipelineResult:
        """Handles S3 object creation event from Lambda or SQS."""
        logger.info(f"Processing S3 upload event: bucket={s3_bucket}, key={s3_key}")
        local_file = self.ingestion_component.download_from_s3(s3_bucket, s3_key)
        return self.run_pipeline(local_file, s3_bucket=s3_bucket, s3_key=s3_key)
