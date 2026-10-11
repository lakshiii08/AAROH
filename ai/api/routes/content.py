import os
import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from pydantic import BaseModel

from src.aaroh.pipeline.content_ingestion_pipeline import ContentIngestionPipeline
from src.aaroh.database.session import DatabaseManager
from src.aaroh.database.models import DocumentModel, ConceptModel, ContentChunkModel
from src.aaroh.utils.logger import logger

router = APIRouter(prefix="/content", tags=["Content Ingestion & Concept Extraction"])

pipeline = ContentIngestionPipeline()
db_manager = pipeline.db_manager

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5
    grade_level: Optional[int] = None
    subject: Optional[str] = None


@router.post("/upload")
async def upload_and_ingest_lesson(
    file: UploadFile = File(...),
    grade_hint: str = Form("Grade 3"),
    subject_hint: str = Form("Environmental Studies"),
):
    """Uploads a raw curriculum/lesson file and executes parsing, concept extraction, and vector indexing."""
    filename = file.filename
    ext = Path(filename).suffix.lower()
    if ext not in [".pdf", ".txt", ".md"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed: .pdf, .txt, .md",
        )

    temp_dir = Path("data/uploads")
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_file_path = temp_dir / filename

    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        result = pipeline.run_pipeline(
            file_path=temp_file_path,
            grade_hint=grade_hint,
            subject_hint=subject_hint,
        )
        return {
            "status": "success",
            "message": "Lesson parsed, concepts extracted, and vectors indexed successfully.",
            "data": {
                "document_id": result.document_id,
                "filename": result.filename,
                "status": result.status,
                "total_pages": result.total_pages,
                "total_chunks": result.total_chunks,
                "total_concepts": result.total_concepts,
            },
        }
    except Exception as e:
        logger.error(f"Error processing upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents")
def list_documents():
    """Returns all ingested documents with metadata."""
    session = db_manager.get_session()
    try:
        docs = session.query(DocumentModel).order_by(DocumentModel.created_at.desc()).all()
        return [
            {
                "id": d.id,
                "filename": d.filename,
                "title": d.title,
                "subject": d.subject,
                "grade_level": d.grade_level,
                "language": d.language,
                "summary": d.summary,
                "total_pages": d.total_pages,
                "status": d.status,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in docs
        ]
    finally:
        session.close()


@router.get("/documents/{document_id}/concepts")
def get_document_concepts(document_id: str):
    """Retrieves all atomic concepts extracted from a specific document."""
    session = db_manager.get_session()
    try:
        doc = session.query(DocumentModel).filter_by(id=document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        concepts = session.query(ConceptModel).filter_by(document_id=document_id).all()
        return {
            "document_id": doc.id,
            "document_title": doc.title,
            "subject": doc.subject,
            "grade_level": doc.grade_level,
            "concepts": [
                {
                    "id": c.id,
                    "concept_code": c.concept_code,
                    "name": c.name,
                    "definition": c.definition,
                    "blooms_level": c.blooms_level,
                    "difficulty_level": c.difficulty_level,
                    "prerequisite_concepts": c.prerequisite_concepts,
                    "rural_tribal_anchors": c.rural_tribal_anchors,
                    "key_vocabulary": c.key_vocabulary,
                }
                for c in concepts
            ],
        }
    finally:
        session.close()


@router.post("/search")
def search_curriculum_vectors(request: SearchRequest):
    """Searches curriculum vector store using query text similarity."""
    try:
        matches = pipeline.rag_component.search_similar_content(
            query=request.query,
            top_k=request.top_k,
            grade_filter=request.grade_level,
            subject_filter=request.subject,
        )
        return {
            "query": request.query,
            "matches_count": len(matches),
            "results": matches,
        }
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
