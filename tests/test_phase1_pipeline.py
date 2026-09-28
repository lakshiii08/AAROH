import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.aaroh.pipeline.content_ingestion_pipeline import ContentIngestionPipeline
from src.aaroh.database.models import DocumentModel, ConceptModel, ContentChunkModel

def test_phase1_end_to_end_pipeline():
    sample_pdf_path = Path("data/raw/sample_class3_evs_water.pdf")
    assert sample_pdf_path.exists(), "Sample PDF file must exist"

    pipeline = ContentIngestionPipeline()
    result = pipeline.run_pipeline(
        file_path=sample_pdf_path,
        grade_hint="Grade 3",
        subject_hint="Environmental Studies",
    )

    # 1. Verify Pipeline Result
    assert result.status == "SUCCESS"
    assert result.total_pages == 2
    assert result.total_chunks > 0
    assert result.total_concepts > 0

    # 2. Verify Database Persistence
    session = pipeline.db_manager.get_session()
    try:
        doc = session.query(DocumentModel).filter_by(id=result.document_id).first()
        assert doc is not None
        assert doc.grade_level == 3
        assert doc.status == "INDEXED"

        concepts = session.query(ConceptModel).filter_by(document_id=result.document_id).all()
        assert len(concepts) == result.total_concepts
        concept_codes = [c.concept_code for c in concepts]
        assert "EVS-G3-WAT-01" in concept_codes

        chunks = session.query(ContentChunkModel).filter_by(document_id=result.document_id).all()
        assert len(chunks) == result.total_chunks
        assert any(chunk.embedding is not None for chunk in chunks)
    finally:
        session.close()

    # 3. Verify Vector Similarity Search
    query = "How do villagers store drinking water in earthen pots?"
    matches = pipeline.rag_component.search_similar_content(query=query, top_k=3)
    assert len(matches) > 0
    assert "content" in matches[0]
    assert "similarity" in matches[0]
    print(f"Top search match for '{query}':")
    print(f"Content: {matches[0]['content'][:150]}...")
    print(f"Similarity Score: {matches[0]['similarity']}")

if __name__ == "__main__":
    test_phase1_end_to_end_pipeline()
    print("\nPhase 1 End-to-End Pipeline Test Passed Successfully!")
