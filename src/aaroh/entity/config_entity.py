from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

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
