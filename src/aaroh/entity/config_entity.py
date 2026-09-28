from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Dict, Any, Optional

@dataclass(frozen=True)
class IngestionConfig:
    raw_bucket: str
    processed_bucket: str
    upload_prefix: str
    processed_prefix: str
    allowed_extensions: List[str]
    max_file_size_mb: int
    target_chunk_size: int
    chunk_overlap: int
    min_chunk_length: int

@dataclass(frozen=True)
class DatabaseConfig:
    dialect: str
    host: str
    port: int
    name: str
    user: str
    password: str
    pool_size: int
    max_overflow: int
    echo: bool
    use_sqlite_fallback: bool
    sqlite_db_path: Path

@dataclass(frozen=True)
class BedrockModelConfig:
    region_name: str
    llm_model_id: str
    fast_llm_model_id: str
    embedding_model_id: str
    embedding_dimension: int
    max_tokens: int
    temperature: float
    top_p: float
    enable_mock_llm: bool
    enable_mock_embeddings: bool

@dataclass(frozen=True)
class VectorStoreConfig:
    backend: str
    dimension: int
    metric: str
    table_name: str

@dataclass(frozen=True)
class DynamoDBConfig:
    table_name: str
    region_name: str
    cache_table_name: Optional[str] = "aaroh_localized_content_cache"

@dataclass(frozen=True)
class TranslationConfig:
    backend: str
    default_source_lang: str
    default_target_lang: str
    enable_glossary_lookup: bool
    glossary_cache_size: int
    max_batch_size: int
    sagemaker_endpoint_name: str
    region_name: str
    enable_mock_translation: bool
    supported_languages: List[Dict[str, Any]]

@dataclass(frozen=True)
class LocalizationConfig:
    enable_cache: bool
    cache_ttl_days: int
    max_retrieved_chunks: int
    cache_table_name: str
    s3_localized_prefix: str
    local_cache_path: Path

# Phase 4 — Quiz & Assessment
@dataclass(frozen=True)
class QuizConfig:
    max_questions_per_quiz: int
    mcq_options_count: int
    enable_difficulty_adaptation: bool
    enable_bilingual_questions: bool
    student_results_table: str
    local_results_path: Path
    remedial_threshold_pct: float

# Phase 5 — Voice / Speech Intelligence
@dataclass(frozen=True)
class VoiceConfig:
    tts_engine: str
    stt_engine: str
    default_voice_gender: str
    audio_output_dir: Path
    sample_rate: int
    enable_mock_voice: bool
    polly_language_voice_map: Dict[str, str]

# Phase 6 — Teacher Copilot & Edge Sync
@dataclass(frozen=True)
class CopilotEdgeConfig:
    packages_export_dir: Path
    sync_import_dir: Path
    max_bundle_size_mb: int
    enable_offline_compression: bool
    multigrade_support: bool

# Phase 7 — Gamification & Visual Storytelling
@dataclass(frozen=True)
class GamificationConfig:
    points_per_lesson_complete: int
    points_per_quiz_pass: int
    points_per_quest_complete: int
    streak_bonus_multiplier: float
    badges_catalog_path: Path
    flashcards_output_dir: Path

# Phase 8 — District Administration & Parent Voice Bridge
@dataclass(frozen=True)
class DistrictAdminConfig:
    parent_voice_output_dir: Path     # data/parent_audio
    enable_mock_ivr_dispatch: bool
    district_code: str               # e.g., "CG-BASTAR"
    state_name: str                  # e.g., "Chhattisgarh"
    max_pathway_steps: int           # 4 steps per remedial pathway
