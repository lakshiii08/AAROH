import os
from pathlib import Path
from dotenv import load_dotenv
from src.aaroh.entity.config_entity import (
    IngestionConfig,
    DatabaseConfig,
    BedrockModelConfig,
    VectorStoreConfig,
)
from src.aaroh.utils.common import read_yaml
from src.aaroh.utils.logger import logger

load_dotenv()

class ConfigurationManager:
    def __init__(
        self,
        config_filepath: str = "config/config.yaml",
        model_config_filepath: str = "config/model_config.yaml",
        prompt_config_filepath: str = "config/prompt_config.yaml",
    ):
        self.config = read_yaml(config_filepath)
        self.model_config = read_yaml(model_config_filepath)
        self.prompt_config = read_yaml(prompt_config_filepath)

    def get_ingestion_config(self) -> IngestionConfig:
        config = self.config["aws"]["s3"]
        ingestion = self.config["ingestion"]
        chunking = ingestion["chunking"]

        return IngestionConfig(
            raw_bucket=os.getenv("S3_RAW_BUCKET", config["raw_bucket"]),
            processed_bucket=os.getenv("S3_PROCESSED_BUCKET", config["processed_bucket"]),
            upload_prefix=config.get("upload_prefix", "raw_uploads/"),
            processed_prefix=config.get("processed_prefix", "extracted_artifacts/"),
            allowed_extensions=ingestion.get("allowed_extensions", [".pdf", ".txt", ".md"]),
            max_file_size_mb=ingestion.get("max_file_size_mb", 50),
            target_chunk_size=chunking.get("target_chunk_size", 800),
            chunk_overlap=chunking.get("chunk_overlap", 120),
            min_chunk_length=chunking.get("min_chunk_length", 80),
        )

    def get_database_config(self) -> DatabaseConfig:
        db = self.config["database"]
        return DatabaseConfig(
            dialect=os.getenv("DB_DIALECT", db["dialect"]),
            host=os.getenv("DB_HOST", db["host"]),
            port=int(os.getenv("DB_PORT", db["port"])),
            name=os.getenv("DB_NAME", db["name"]),
            user=os.getenv("DB_USER", db["user"]),
            password=os.getenv("DB_PASSWORD", db["password"]),
            pool_size=int(db.get("pool_size", 10)),
            max_overflow=int(db.get("max_overflow", 20)),
            echo=bool(db.get("echo", False)),
            use_sqlite_fallback=os.getenv(
                "DB_USE_SQLITE_FALLBACK", str(db.get("use_sqlite_fallback", True))
            ).lower() == "true",
            sqlite_db_path=Path(db.get("sqlite_db_path", "data/aaroh_local.db")),
        )

    def get_bedrock_model_config(self) -> BedrockModelConfig:
        b_conf = self.model_config["bedrock"]
        f_conf = self.model_config.get("fallback", {})

        return BedrockModelConfig(
            region_name=os.getenv("AWS_REGION", b_conf["region_name"]),
            llm_model_id=os.getenv("BEDROCK_MODEL_ID", b_conf["llm_model_id"]),
            fast_llm_model_id=b_conf.get("fast_llm_model_id", "anthropic.claude-3-haiku-20240307-v1:0"),
            embedding_model_id=os.getenv("BEDROCK_EMBEDDING_MODEL_ID", b_conf["embedding_model_id"]),
            embedding_dimension=int(b_conf.get("embedding_dimension", 1536)),
            max_tokens=int(b_conf["inference_params"].get("max_tokens", 4096)),
            temperature=float(b_conf["inference_params"].get("temperature", 0.1)),
            top_p=float(b_conf["inference_params"].get("top_p", 0.9)),
            enable_mock_llm=os.getenv("ENABLE_MOCK_LLM_FALLBACK", str(f_conf.get("enable_mock_llm", True))).lower() == "true",
            enable_mock_embeddings=bool(f_conf.get("enable_mock_embeddings", True)),
        )

    def get_vector_store_config(self) -> VectorStoreConfig:
        v_conf = self.config["vector_store"]
        return VectorStoreConfig(
            backend=v_conf.get("backend", "pgvector"),
            dimension=int(v_conf.get("dimension", 1536)),
            metric=v_conf.get("metric", "cosine"),
            table_name=v_conf.get("table_name", "content_chunks"),
        )

    def get_prompt_config(self) -> dict:
        return self.prompt_config
