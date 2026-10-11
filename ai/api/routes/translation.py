import time
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field

from src.aaroh.configuration.configuration import ConfigurationManager
from src.aaroh.components.translation import TranslationComponent
from src.aaroh.database.glossary_db import GlossaryDatabaseManager
from src.aaroh.database.session import DatabaseManager
from src.aaroh.database.models import DocumentModel, ContentChunkModel
from src.aaroh.entity.artifact_entity import GlossaryEntryEntity
from src.aaroh.utils.logger import logger

router = APIRouter(prefix="/translation", tags=["Mother-Tongue Translation Layer"])

config_mgr = ConfigurationManager()
translation_config = config_mgr.get_translation_config()
dynamodb_config = config_mgr.get_dynamodb_config()
db_manager = DatabaseManager(config_mgr.get_database_config())

glossary_db = GlossaryDatabaseManager(dynamodb_config)
translation_component = TranslationComponent(translation_config, glossary_db)

# Request & Response Schemas
class TranslateRequest(BaseModel):
    text: str = Field(..., description="Text to translate")
    source_lang: str = Field("en", description="Source language code (e.g. 'en', 'hi')")
    target_lang: str = Field("hi", description="Target language code (e.g. 'hi', 'bn', 'mr', 'or')")
    target_dialect: Optional[str] = Field(None, description="Optional tribal dialect: 'gon' (Gondi), 'sat' (Santhali), 'hne' (Chhattisgarhi), 'bhi' (Bhili)")
    apply_glossary: bool = Field(True, description="Whether to apply DynamoDB glossary terms")

class BatchTranslateRequest(BaseModel):
    texts: List[str] = Field(..., description="List of texts to translate")
    source_lang: str = Field("en", description="Source language code")
    target_lang: str = Field("hi", description="Target language code")
    target_dialect: Optional[str] = Field(None, description="Optional tribal dialect")

class GlossaryAddRequest(BaseModel):
    source_term: str
    translated_term: str
    source_lang: str = "en"
    target_lang: str = "hi"
    domain: str = "general"
    dialects: Dict[str, str] = Field(default_factory=dict)
    phonetic_hint: Optional[str] = None
    notes: Optional[str] = None

class TranslateLessonRequest(BaseModel):
    target_lang: str = Field("hi", description="Target language code")
    target_dialect: Optional[str] = Field(None, description="Optional tribal dialect")

@router.post("/translate")
def translate_single(request: TranslateRequest):
    """Translates text to mother tongue with glossary preservation and dialect adaptation."""
    try:
        result = translation_component.translate_text(
            text=request.text,
            source_lang=request.source_lang,
            target_lang=request.target_lang,
            target_dialect=request.target_dialect,
            apply_glossary=request.apply_glossary,
        )
        return {
            "status": "success",
            "data": {
                "original_text": result.original_text,
                "translated_text": result.translated_text,
                "source_lang": result.source_lang,
                "target_lang": result.target_lang,
                "applied_glossary_terms": result.applied_glossary_terms,
                "latency_ms": result.latency_ms,
                "backend_used": result.backend_used,
            },
        }
    except Exception as e:
        logger.error(f"Translation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch")
def translate_batch(request: BatchTranslateRequest):
    """Batch translates multiple texts (e.g. lesson paragraphs or quiz items)."""
    try:
        result = translation_component.translate_batch(
            texts=request.texts,
            source_lang=request.source_lang,
            target_lang=request.target_lang,
            target_dialect=request.target_dialect,
        )
        return {
            "status": "success",
            "total_count": result.total_count,
            "total_time_ms": result.total_time_ms,
            "results": [
                {
                    "original_text": r.original_text,
                    "translated_text": r.translated_text,
                    "applied_glossary_terms": r.applied_glossary_terms,
                    "latency_ms": r.latency_ms,
                }
                for r in result.results
            ],
        }
    except Exception as e:
        logger.error(f"Batch translation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/languages")
def get_supported_languages():
    """Returns list of supported Indian languages and tribal dialects."""
    return {
        "supported_languages": translation_config.supported_languages,
        "default_source": translation_config.default_source_lang,
        "default_target": translation_config.default_target_lang,
    }

@router.get("/glossary/lookup")
def lookup_glossary_term(
    term: str = Query(..., description="Term to look up"),
    source_lang: str = Query("en"),
    target_lang: str = Query("hi"),
):
    """Ultra-low latency (< 2ms) glossary term lookup in DynamoDB cache."""
    entry = glossary_db.get_term(term, source_lang=source_lang, target_lang=target_lang)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Term '{term}' not found in glossary")
    return {"status": "success", "term": entry}

@router.post("/glossary/term")
def add_glossary_term(request: GlossaryAddRequest):
    """Adds or updates a pedagogical/tribal glossary term in DynamoDB."""
    try:
        entry = GlossaryEntryEntity(
            source_term=request.source_term,
            translated_term=request.translated_term,
            source_lang=request.source_lang,
            target_lang=request.target_lang,
            domain=request.domain,
            dialects=request.dialects,
            phonetic_hint=request.phonetic_hint,
            notes=request.notes,
        )
        glossary_db.put_term(entry)
        return {
            "status": "success",
            "message": f"Term '{request.source_term}' stored in DynamoDB glossary.",
        }
    except Exception as e:
        logger.error(f"Failed to add glossary term: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/lessons/{document_id}")
def translate_lesson_document(
    document_id: str,
    request: TranslateLessonRequest,
):
    """Translates all content chunks of an ingested Phase 1 lesson into child's mother tongue."""
    session = db_manager.get_session()
    try:
        doc = session.query(DocumentModel).filter_by(id=document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        chunks = session.query(ContentChunkModel).filter_by(document_id=document_id).order_by(ContentChunkModel.chunk_index).all()
        if not chunks:
            raise HTTPException(status_code=400, detail="No chunks found for this document")

        texts = [chunk.content for chunk in chunks]
        batch_result = translation_component.translate_batch(
            texts=texts,
            source_lang="en",
            target_lang=request.target_lang,
            target_dialect=request.target_dialect,
        )

        translated_chunks = []
        for idx, chunk in enumerate(chunks):
            tr = batch_result.results[idx]
            translated_chunks.append({
                "chunk_index": chunk.chunk_index,
                "page_number": chunk.page_number,
                "original_content": chunk.content,
                "translated_content": tr.translated_text,
                "applied_glossary_terms": tr.applied_glossary_terms,
            })

        return {
            "status": "success",
            "document_id": doc.id,
            "document_title": doc.title,
            "target_lang": request.target_lang,
            "target_dialect": request.target_dialect,
            "total_chunks": len(translated_chunks),
            "total_time_ms": batch_result.total_time_ms,
            "chunks": translated_chunks,
        }
    finally:
        session.close()
