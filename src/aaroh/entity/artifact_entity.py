from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

@dataclass
class ParsedDocumentPage:
    page_number: int
    text: str
    char_count: int
    word_count: int
    tables: List[Dict[str, Any]] = field(default_factory=list)

@dataclass
class ParsedDocument:
    file_id: str
    filename: str
    file_path: Optional[str]
    file_hash: str
    file_size_bytes: int
    total_pages: int
    full_text: str
    pages: List[ParsedDocumentPage]
    s3_bucket: Optional[str] = None
    s3_key: Optional[str] = None

@dataclass
class ConceptEntity:
    concept_code: str
    name: str
    definition: str
    blooms_level: str
    difficulty_level: int
    prerequisite_concepts: List[str] = field(default_factory=list)
    rural_tribal_anchors: List[str] = field(default_factory=list)
    key_vocabulary: List[str] = field(default_factory=list)

@dataclass
class DocumentMetadataEntity:
    title: str
    subject: str
    grade_level: int
    language: str
    summary: str
    target_competencies: List[str] = field(default_factory=list)

@dataclass
class ContentChunkEntity:
    chunk_index: int
    page_number: int
    content: str
    token_count: int
    concept_code: Optional[str] = None
    embedding: Optional[List[float]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ConceptExtractionArtifact:
    document_id: str
    metadata: DocumentMetadataEntity
    concepts: List[ConceptEntity]
    chunks: List[ContentChunkEntity]
    extracted_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

@dataclass
class IngestionPipelineResult:
    document_id: str
    filename: str
    status: str
    total_pages: int
    total_chunks: int
    total_concepts: int
    s3_uri: Optional[str] = None
    message: str = ""

# Phase 2: Translation Entities
@dataclass
class GlossaryEntryEntity:
    source_term: str
    translated_term: str
    source_lang: str
    target_lang: str
    domain: str = "general"
    dialects: Dict[str, str] = field(default_factory=dict)
    phonetic_hint: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

@dataclass
class TranslationResponseEntity:
    original_text: str
    translated_text: str
    source_lang: str
    target_lang: str
    applied_glossary_terms: List[Dict[str, str]] = field(default_factory=list)
    latency_ms: float = 0.0
    backend_used: str = "indictrans2"

@dataclass
class BatchTranslationResponseEntity:
    results: List[TranslationResponseEntity]
    total_count: int
    total_time_ms: float

# Phase 3: Simplification & Localization Entities
@dataclass
class LocalizedLessonEntity:
    concept_code: str
    concept_name: str
    grade_level: int
    target_language: str
    target_dialect: Optional[str]
    simplified_explanation: str
    local_analogies: List[str]
    story_narrative: str
    hands_on_activity: Dict[str, Any]
    reflection_questions: List[Dict[str, str]]
    voice_script: str
    source_chunks: List[str] = field(default_factory=list)
    cultural_anchors_used: List[str] = field(default_factory=list)
    cached: bool = False
    s3_uri: Optional[str] = None
    generated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
