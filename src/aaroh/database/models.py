import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    Text,
    DateTime,
    ForeignKey,
    JSON,
    Boolean,
    Float,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class DocumentModel(Base):
    __tablename__ = "raw_documents"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(255), nullable=False)
    file_hash = Column(String(64), nullable=False, index=True)
    file_size_bytes = Column(Integer, nullable=False)
    s3_bucket = Column(String(128), nullable=True)
    s3_key = Column(String(512), nullable=True)
    status = Column(String(32), default="PENDING", index=True) # PENDING, PARSED, EXTRACTED, INDEXED, FAILED
    error_message = Column(Text, nullable=True)
    
    # Curriculum Metadata
    title = Column(String(255), nullable=True)
    subject = Column(String(64), nullable=True, index=True)
    grade_level = Column(Integer, nullable=True, index=True)
    language = Column(String(32), nullable=True)
    summary = Column(Text, nullable=True)
    target_competencies = Column(JSON, default=list)
    
    total_pages = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    concepts = relationship("ConceptModel", back_populates="document", cascade="all, delete-orphan")
    chunks = relationship("ContentChunkModel", back_populates="document", cascade="all, delete-orphan")

class ConceptModel(Base):
    __tablename__ = "concepts"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(64), ForeignKey("raw_documents.id"), nullable=False, index=True)
    concept_code = Column(String(64), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    definition = Column(Text, nullable=False)
    blooms_level = Column(String(32), nullable=False) # Remember, Understand, Apply, etc.
    difficulty_level = Column(Integer, default=1) # 1-5
    prerequisite_concepts = Column(JSON, default=list)
    rural_tribal_anchors = Column(JSON, default=list)
    key_vocabulary = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    document = relationship("DocumentModel", back_populates="concepts")
    chunks = relationship("ContentChunkModel", back_populates="concept")

class ContentChunkModel(Base):
    __tablename__ = "content_chunks"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(64), ForeignKey("raw_documents.id"), nullable=False, index=True)
    concept_id = Column(String(64), ForeignKey("concepts.id"), nullable=True, index=True)
    concept_code = Column(String(64), nullable=True)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    token_count = Column(Integer, default=0)
    
    # Embedding: If pgvector is enabled, this is a vector column; otherwise stored as JSON array
    # Dynamically handled in session / query layer
    embedding = Column(JSON, nullable=True)
    chunk_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    document = relationship("DocumentModel", back_populates="chunks")
    concept = relationship("ConceptModel", back_populates="chunks")
