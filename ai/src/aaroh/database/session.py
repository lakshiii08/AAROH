import os
import math
from pathlib import Path
from typing import List, Dict, Any, Optional
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from src.aaroh.database.models import Base, DocumentModel, ConceptModel, ContentChunkModel
from src.aaroh.entity.config_entity import DatabaseConfig
from src.aaroh.configuration.configuration import ConfigurationManager
from src.aaroh.utils.logger import logger
from src.aaroh.utils.exception import AarohException
import sys

class DatabaseManager:
    def __init__(self, config: Optional[DatabaseConfig] = None):
        if config is None:
            config = ConfigurationManager().get_database_config()
        self.config = config
        self.engine = self._create_engine()
        self.SessionFactory = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self._init_db()

    def _create_engine(self):
        """Creates SQLAlchemy engine with PostgreSQL or SQLite fallback."""
        if self.config.dialect == "postgresql" and not self.config.use_sqlite_fallback:
            url = f"postgresql://{self.config.user}:{self.config.password}@{self.config.host}:{self.config.port}/{self.config.name}"
            try:
                engine = create_engine(
                    url,
                    pool_size=self.config.pool_size,
                    max_overflow=self.config.max_overflow,
                    echo=self.config.echo,
                )
                # Test connection
                with engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                logger.info(f"Connected successfully to PostgreSQL at {self.config.host}:{self.config.port}/{self.config.name}")
                return engine
            except Exception as e:
                logger.warning(f"PostgreSQL connection failed ({e}). Falling back to SQLite.")
        
        # SQLite Fallback
        db_path = Path(self.config.sqlite_db_path)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        url = f"sqlite:///{db_path}"
        engine = create_engine(url, echo=self.config.echo, connect_args={"check_same_thread": False})
        logger.info(f"Using SQLite database at {url}")
        return engine

    def _init_db(self):
        """Initializes tables and pgvector extension if PostgreSQL."""
        try:
            if "postgresql" in str(self.engine.url):
                with self.engine.connect() as conn:
                    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                    conn.commit()
                    logger.info("Ensured pgvector extension is enabled in PostgreSQL.")

            Base.metadata.create_all(bind=self.engine)
            logger.info("Database schema initialized successfully.")
        except Exception as e:
            logger.error(f"Error initializing database: {e}")
            raise AarohException(e, sys)

    def get_session(self) -> Session:
        return self.SessionFactory()

    def vector_similarity_search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        filter_grade: Optional[int] = None,
        filter_subject: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Performs vector similarity search over content_chunks.
        Uses pgvector native operator (<=>) on Postgres, or cosine similarity on SQLite.
        """
        session = self.get_session()
        try:
            is_postgres = "postgresql" in str(self.engine.url)
            if is_postgres:
                # Native pgvector cosine distance query
                filter_clauses = []
                params = {"query_vec": str(query_embedding), "limit": top_k}
                if filter_grade:
                    filter_clauses.append("d.grade_level = :grade")
                    params["grade"] = filter_grade
                if filter_subject:
                    filter_clauses.append("d.subject ILIKE :subject")
                    params["subject"] = f"%{filter_subject}%"

                where_sql = ("WHERE " + " AND ".join(filter_clauses)) if filter_clauses else ""
                sql = text(f"""
                    SELECT c.id, c.content, c.chunk_index, c.page_number, c.concept_code,
                           d.title as doc_title, d.grade_level, d.subject,
                           1 - (c.embedding <=> :query_vec) as similarity
                    FROM content_chunks c
                    JOIN raw_documents d ON c.document_id = d.id
                    {where_sql}
                    ORDER BY c.embedding <=> :query_vec
                    LIMIT :limit
                """)
                result = session.execute(sql, params).fetchall()
                return [dict(row._mapping) for row in result]
            else:
                # Python-based cosine similarity for SQLite fallback
                query = session.query(ContentChunkModel, DocumentModel).join(
                    DocumentModel, ContentChunkModel.document_id == DocumentModel.id
                )
                if filter_grade:
                    query = query.filter(DocumentModel.grade_level == filter_grade)
                if filter_subject:
                    query = query.filter(DocumentModel.subject.ilike(f"%{filter_subject}%"))

                rows = query.all()
                scored_results = []
                for chunk, doc in rows:
                    if chunk.embedding:
                        sim = self._cosine_similarity(query_embedding, chunk.embedding)
                        scored_results.append({
                            "id": chunk.id,
                            "content": chunk.content,
                            "chunk_index": chunk.chunk_index,
                            "page_number": chunk.page_number,
                            "concept_code": chunk.concept_code,
                            "doc_title": doc.title,
                            "grade_level": doc.grade_level,
                            "subject": doc.subject,
                            "similarity": round(float(sim), 4),
                        })

                scored_results.sort(key=lambda x: x["similarity"], reverse=True)
                return scored_results[:top_k]
        finally:
            session.close()

    @staticmethod
    def _cosine_similarity(v1: List[float], v2: List[float]) -> float:
        dot = sum(a * b for a, b in zip(v1, v2))
        norm1 = math.sqrt(sum(a * a for a in v1))
        norm2 = math.sqrt(sum(b * b for b in v2))
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return dot / (norm1 * norm2)
