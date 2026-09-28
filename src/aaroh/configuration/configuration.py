import os
import json
from functools import lru_cache
from pathlib import Path
from dotenv import load_dotenv
from src.aaroh.entity.config_entity import (
    IngestionConfig,
    DatabaseConfig,
    BedrockModelConfig,
    VectorStoreConfig,
    DynamoDBConfig,
    TranslationConfig,
    LocalizationConfig,
    QuizConfig,
    VoiceConfig,
    CopilotEdgeConfig,
    GamificationConfig,
    DistrictAdminConfig,
)
from src.aaroh.utils.common import read_yaml
from src.aaroh.utils.logger import logger


@lru_cache(maxsize=8)
def _get_database_password_from_secret(secret_arn: str) -> str:
    import boto3

    response = boto3.client("secretsmanager", region_name=os.getenv("AWS_REGION", "ap-south-1")).get_secret_value(
        SecretId=secret_arn
    )
    secret = json.loads(response["SecretString"])
    return secret["password"]

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
            password=(
                os.getenv("DB_PASSWORD")
                or (_get_database_password_from_secret(os.environ["DB_SECRET_ARN"]) if os.getenv("DB_SECRET_ARN") else db["password"])
            ),
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

    def get_dynamodb_config(self) -> DynamoDBConfig:
        d_conf = self.config.get("aws", {}).get("dynamodb", {})
        return DynamoDBConfig(
            table_name=os.getenv("DYNAMODB_GLOSSARY_TABLE", d_conf.get("glossary_table", "aaroh_glossary")),
            region_name=os.getenv("AWS_REGION", self.config.get("aws", {}).get("region", "ap-south-1")),
        )

    def get_translation_config(self) -> TranslationConfig:
        t_conf = self.config.get("translation", {})
        m_conf = self.model_config.get("translation", {})
        f_conf = self.model_config.get("fallback", {})

        return TranslationConfig(
            backend=m_conf.get("backend", "indictrans2"),
            default_source_lang=t_conf.get("default_source_lang", "en"),
            default_target_lang=t_conf.get("default_target_lang", "hi"),
            enable_glossary_lookup=bool(t_conf.get("enable_glossary_lookup", True)),
            glossary_cache_size=int(t_conf.get("glossary_cache_size", 10000)),
            max_batch_size=int(t_conf.get("max_batch_size", 50)),
            sagemaker_endpoint_name=os.getenv(
                "SAGEMAKER_TRANSLATION_ENDPOINT",
                m_conf.get("sagemaker", {}).get("endpoint_name", "aaroh-indictrans2-endpoint")
            ),
            region_name=os.getenv("AWS_REGION", self.config.get("aws", {}).get("region", "ap-south-1")),
            enable_mock_translation=os.getenv(
                "ENABLE_MOCK_TRANSLATION",
                str(f_conf.get("enable_mock_translation", True))
            ).lower() == "true",
            supported_languages=t_conf.get("supported_languages", []),
        )

    def get_localization_config(self) -> LocalizationConfig:
        l_conf = self.config.get("localization", {})
        d_conf = self.config.get("aws", {}).get("dynamodb", {})
        s_conf = self.config.get("aws", {}).get("s3", {})

        return LocalizationConfig(
            enable_cache=bool(l_conf.get("enable_cache", True)),
            cache_ttl_days=int(l_conf.get("cache_ttl_days", 30)),
            max_retrieved_chunks=int(l_conf.get("max_retrieved_chunks", 3)),
            cache_table_name=os.getenv(
                "DYNAMODB_CONTENT_CACHE_TABLE",
                d_conf.get("content_cache_table", "aaroh_localized_content_cache")
            ),
            s3_localized_prefix=s_conf.get("localized_prefix", "localized_lessons/"),
            local_cache_path=Path(l_conf.get("local_cache_path", "data/cache/localized_content_cache.json")),
        )

    def get_quiz_config(self) -> QuizConfig:
        q_conf = self.config.get("quiz", {})
        return QuizConfig(
            max_questions_per_quiz=int(q_conf.get("max_questions_per_quiz", 5)),
            mcq_options_count=int(q_conf.get("mcq_options_count", 4)),
            enable_difficulty_adaptation=bool(q_conf.get("enable_difficulty_adaptation", True)),
            enable_bilingual_questions=bool(q_conf.get("enable_bilingual_questions", False)),
            student_results_table=os.getenv(
                "DYNAMODB_STUDENT_RESULTS_TABLE",
                q_conf.get("student_results_table", "aaroh_student_assessment_results")
            ),
            local_results_path=Path(q_conf.get("local_results_path", "data/cache/student_assessment_results.json")),
            remedial_threshold_pct=float(q_conf.get("remedial_threshold_pct", 60.0)),
        )

    def get_voice_config(self) -> VoiceConfig:
        v_conf = self.config.get("voice", {})
        return VoiceConfig(
            tts_engine=v_conf.get("tts_engine", "polly"),
            stt_engine=v_conf.get("stt_engine", "whisper"),
            default_voice_gender=v_conf.get("default_voice_gender", "FEMALE"),
            audio_output_dir=Path(v_conf.get("audio_output_dir", "data/audio")),
            sample_rate=int(v_conf.get("sample_rate", 22050)),
            enable_mock_voice=os.getenv(
                "ENABLE_MOCK_VOICE",
                str(v_conf.get("enable_mock_voice", True))
            ).lower() == "true",
            polly_language_voice_map=v_conf.get("polly_voices", {
                "hi": "Kajal",
                "en": "Aditi",
                "bn": "Kajal",
                "mr": "Kajal",
                "te": "Kajal",
                "or": "Kajal",
                "gon": "Kajal",
                "sat": "Kajal",
            }),
        )

    def get_copilot_edge_config(self) -> CopilotEdgeConfig:
        c_conf = self.config.get("copilot_edge", {})
        return CopilotEdgeConfig(
            packages_export_dir=Path(c_conf.get("packages_export_dir", "data/packages")),
            sync_import_dir=Path(c_conf.get("sync_import_dir", "data/sync")),
            max_bundle_size_mb=int(c_conf.get("max_bundle_size_mb", 250)),
            enable_offline_compression=bool(c_conf.get("enable_offline_compression", True)),
            multigrade_support=bool(c_conf.get("multigrade_support", True)),
        )

    def get_gamification_config(self) -> GamificationConfig:
        g_conf = self.config.get("gamification", {})
        return GamificationConfig(
            points_per_lesson_complete=int(g_conf.get("points_per_lesson_complete", 50)),
            points_per_quiz_pass=int(g_conf.get("points_per_quiz_pass", 100)),
            points_per_quest_complete=int(g_conf.get("points_per_quest_complete", 75)),
            streak_bonus_multiplier=float(g_conf.get("streak_bonus_multiplier", 1.2)),
            badges_catalog_path=Path(g_conf.get("badges_catalog_path", "data/gamification/badges.json")),
            flashcards_output_dir=Path(g_conf.get("flashcards_output_dir", "data/flashcards")),
        )

    def get_district_admin_config(self) -> DistrictAdminConfig:
        d_conf = self.config.get("district_admin", {})
        return DistrictAdminConfig(
            parent_voice_output_dir=Path(d_conf.get("parent_voice_output_dir", "data/parent_audio")),
            enable_mock_ivr_dispatch=bool(d_conf.get("enable_mock_ivr_dispatch", True)),
            district_code=str(d_conf.get("district_code", "CG-BASTAR")),
            state_name=str(d_conf.get("state_name", "Chhattisgarh")),
            max_pathway_steps=int(d_conf.get("max_pathway_steps", 4)),
        )

    def get_prompt_config(self) -> dict:
        return self.prompt_config




