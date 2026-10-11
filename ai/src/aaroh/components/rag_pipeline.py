import uuid
from typing import List, Dict, Any, Optional
from src.aaroh.database.session import DatabaseManager
from src.aaroh.database.models import DocumentModel, ConceptModel, ContentChunkModel
from src.aaroh.entity.artifact_entity import (
    ParsedDocument,
    ConceptExtractionArtifact,
    ContentChunkEntity,
    IngestionPipelineResult,
)
from src.aaroh.components.content_transformation import ContentTransformationComponent
from src.aaroh.utils.logger import logger
from src.aaroh.utils.exception import AarohException
import sys

class RAGPipelineComponent:
    def __init__(self, db_manager: DatabaseManager, transformer: ContentTransformationComponent):
        self.db = db_manager
        self.transformer = transformer

    def index_document_and_concepts(
        self,
        parsed_doc: ParsedDocument,
        extraction_artifact: ConceptExtractionArtifact,
        chunks: List[ContentChunkEntity],
    ) -> IngestionPipelineResult:
        """Stores structured document, concepts, and embeddings into the database/vector store."""
        session = self.db.get_session()
        try:
            logger.info(f"Indexing document '{parsed_doc.filename}' into database/vector store...")

            # 1. Insert or Update Document Record
            doc_record = session.query(DocumentModel).filter_by(file_hash=parsed_doc.file_hash).first()
            if not doc_record:
                doc_record = DocumentModel(
                    id=parsed_doc.file_id,
                    filename=parsed_doc.filename,
                    file_hash=parsed_doc.file_hash,
                    file_size_bytes=parsed_doc.file_size_bytes,
                    s3_bucket=parsed_doc.s3_bucket,
                    s3_key=parsed_doc.s3_key,
                    total_pages=parsed_doc.total_pages,
                )
                session.add(doc_record)

            meta = extraction_artifact.metadata
            doc_record.title = meta.title
            doc_record.subject = meta.subject
            doc_record.grade_level = meta.grade_level
            doc_record.language = meta.language
            doc_record.summary = meta.summary
            doc_record.target_competencies = meta.target_competencies
            doc_record.status = "EXTRACTED"
            session.flush()

            # 2. Insert Concepts
            # Remove any previous concepts for this document if re-indexing
            session.query(ConceptModel).filter_by(document_id=doc_record.id).delete()
            session.flush()

            concept_id_map: Dict[str, str] = {}
            for c in extraction_artifact.concepts:
                c_id = str(uuid.uuid4())
                c_model = ConceptModel(
                    id=c_id,
                    document_id=doc_record.id,
                    concept_code=c.concept_code,
                    name=c.name,
                    definition=c.definition,
                    blooms_level=c.blooms_level,
                    difficulty_level=c.difficulty_level,
                    prerequisite_concepts=c.prerequisite_concepts,
                    rural_tribal_anchors=c.rural_tribal_anchors,
                    key_vocabulary=c.key_vocabulary,
                )
                session.add(c_model)
                concept_id_map[c.concept_code] = c_id

            session.flush()

            # 3. Generate Vector Embeddings for Chunks
            chunk_texts = [chunk.content for chunk in chunks]
            embeddings = self.transformer.generate_embeddings(chunk_texts)

            # 4. Insert Content Chunks with Embeddings
            session.query(ContentChunkModel).filter_by(document_id=doc_record.id).delete()
            session.flush()

            for idx, chunk in enumerate(chunks):
                emb = embeddings[idx] if idx < len(embeddings) else None
                # Map chunk to best matching concept code if available
                matching_concept_id = None
                matched_code = None
                for concept in extraction_artifact.concepts:
                    if concept.name.lower() in chunk.content.lower() or any(k.lower() in chunk.content.lower() for k in concept.key_vocabulary):
                        matching_concept_id = concept_id_map.get(concept.concept_code)
                        matched_code = concept.concept_code
                        break

                chunk_model = ContentChunkModel(
                    id=str(uuid.uuid4()),
                    document_id=doc_record.id,
                    concept_id=matching_concept_id,
                    concept_code=matched_code,
                    chunk_index=chunk.chunk_index,
                    page_number=chunk.page_number,
                    content=chunk.content,
                    token_count=chunk.token_count,
                    embedding=emb,
                    chunk_metadata=chunk.metadata,
                )
                session.add(chunk_model)

            doc_record.status = "INDEXED"
            session.commit()
            logger.info(f"Successfully indexed {len(chunks)} chunks and {len(extraction_artifact.concepts)} concepts.")

            return IngestionPipelineResult(
                document_id=doc_record.id,
                filename=doc_record.filename,
                status="SUCCESS",
                total_pages=doc_record.total_pages,
                total_chunks=len(chunks),
                total_concepts=len(extraction_artifact.concepts),
                s3_uri=f"s3://{doc_record.s3_bucket}/{doc_record.s3_key}" if doc_record.s3_bucket and doc_record.s3_key else None,
                message="Lesson ingested, concepts extracted, and vector embeddings indexed.",
            )
        except Exception as e:
            session.rollback()
            logger.error(f"Error during document indexing: {e}")
            raise AarohException(e, sys)
        finally:
            session.close()

    def search_similar_content(
        self,
        query: str,
        top_k: int = 5,
        grade_filter: Optional[int] = None,
        subject_filter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Generates embedding for query and searches the vector store."""
        query_vec = self.transformer.generate_embeddings([query])[0]
        return self.db.vector_similarity_search(
            query_embedding=query_vec,
            top_k=top_k,
            filter_grade=grade_filter,
            filter_subject=subject_filter,
        )
