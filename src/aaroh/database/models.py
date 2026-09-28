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
    status = Column(String(32), default="PENDING", index=True)
    error_message = Column(Text, nullable=True)

    title = Column(String(255), nullable=True)
    subject = Column(String(64), nullable=True, index=True)
    grade_level = Column(Integer, nullable=True, index=True)
    language = Column(String(32), nullable=True)
    summary = Column(Text, nullable=True)
    target_competencies = Column(JSON, default=list)

    total_pages = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    concepts = relationship("ConceptModel", back_populates="document", cascade="all, delete-orphan")
    chunks = relationship("ContentChunkModel", back_populates="document", cascade="all, delete-orphan")


class ConceptModel(Base):
    __tablename__ = "concepts"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(64), ForeignKey("raw_documents.id"), nullable=False, index=True)
    concept_code = Column(String(64), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    definition = Column(Text, nullable=False)
    blooms_level = Column(String(32), nullable=False)
    difficulty_level = Column(Integer, default=1)
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
    embedding = Column(JSON, nullable=True)
    chunk_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    document = relationship("DocumentModel", back_populates="chunks")
    concept = relationship("ConceptModel", back_populates="chunks")


# ──────────────────────────────────────────────────────────────
# Phase 4 — Quiz & Assessment Tables
# ──────────────────────────────────────────────────────────────

class QuizModel(Base):
    """Stores generated quizzes (concept + language + grade)."""
    __tablename__ = "quizzes"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    concept_code = Column(String(64), nullable=False, index=True)
    concept_name = Column(String(255), nullable=True)
    grade_level = Column(Integer, nullable=False, index=True)
    target_language = Column(String(16), nullable=False)
    target_dialect = Column(String(32), nullable=True)
    questions = Column(JSON, nullable=False)   # List[QuizQuestion dicts]
    total_questions = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    submissions = relationship("QuizSubmissionModel", back_populates="quiz", cascade="all, delete-orphan")


class QuizSubmissionModel(Base):
    """Records a student's full quiz attempt."""
    __tablename__ = "quiz_submissions"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    quiz_id = Column(String(64), ForeignKey("quizzes.id"), nullable=False, index=True)
    student_id = Column(String(64), nullable=False, index=True)
    concept_code = Column(String(64), nullable=False, index=True)
    answers = Column(JSON, nullable=False)      # List[{question_id, student_answer, is_correct}]
    score_pct = Column(Float, nullable=False)
    submitted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    quiz = relationship("QuizModel", back_populates="submissions")
    assessment = relationship("AssessmentResultModel", back_populates="submission", uselist=False,
                               cascade="all, delete-orphan")


class AssessmentResultModel(Base):
    """Stores gap analysis + remedial recommendation per submission."""
    __tablename__ = "assessment_results"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    submission_id = Column(String(64), ForeignKey("quiz_submissions.id"), nullable=False, unique=True)
    student_id = Column(String(64), nullable=False, index=True)
    concept_code = Column(String(64), nullable=False, index=True)
    score_pct = Column(Float, nullable=False)
    gaps = Column(JSON, default=list)          # List[LearningGap dicts]
    remedial_concepts = Column(JSON, default=list)
    teacher_insight = Column(Text, nullable=True)
    needs_remedial = Column(Boolean, default=False)
    assessed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    submission = relationship("QuizSubmissionModel", back_populates="assessment")


# ──────────────────────────────────────────────────────────────
# Phase 5 — Voice & Speech Intelligence Tables
# ──────────────────────────────────────────────────────────────

class VoiceLessonModel(Base):
    """Stores synthesized voice lessons metadata and file paths."""
    __tablename__ = "voice_lessons"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    concept_code = Column(String(64), nullable=False, index=True)
    concept_name = Column(String(255), nullable=True)
    target_language = Column(String(16), nullable=False)
    target_dialect = Column(String(32), nullable=True)
    audio_file_path = Column(String(512), nullable=False)
    segments = Column(JSON, default=list)        # List[AudioSegment dicts]
    total_duration_seconds = Column(Float, default=0.0)
    voice_id = Column(String(64), default="hi-IN-Kajal")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class OralQuizAttemptModel(Base):
    """Stores oral audio responses submitted by students and their grading."""
    __tablename__ = "oral_quiz_attempts"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(64), nullable=False, index=True)
    quiz_id = Column(String(64), nullable=False, index=True)
    question_id = Column(String(64), nullable=False)
    audio_file_path = Column(String(512), nullable=True)
    transcribed_text = Column(Text, nullable=False)
    expected_answer = Column(Text, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    confidence_score = Column(Float, default=1.0)
    feedback_audio_path = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ──────────────────────────────────────────────────────────────
# Phase 6 — Teacher Copilot & Offline Edge Sync Tables
# ──────────────────────────────────────────────────────────────

class LessonPlanModel(Base):
    """Stores generated teacher multigrade lesson plans."""
    __tablename__ = "lesson_plans"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    grade_level = Column(Integer, nullable=False, index=True)
    target_language = Column(String(16), nullable=False)
    target_dialect = Column(String(32), nullable=True)
    concept_codes = Column(JSON, default=list)
    content_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class OfflinePackageModel(Base):
    """Stores exported offline bundle zip packages for Edge devices."""
    __tablename__ = "offline_packages"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    package_name = Column(String(255), nullable=False)
    grade_level = Column(Integer, nullable=False, index=True)
    subject = Column(String(64), nullable=False)
    target_language = Column(String(16), nullable=False)
    target_dialect = Column(String(32), nullable=True)
    zip_file_path = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class EdgeSyncLogModel(Base):
    """Logs data sync events from offline kiosks/tablets to central server."""
    __tablename__ = "edge_sync_logs"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = Column(String(64), nullable=False, index=True)
    school_id = Column(String(64), nullable=False, index=True)
    total_synced_attempts = Column(Integer, default=0)
    sync_status = Column(String(32), default="SUCCESS")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ──────────────────────────────────────────────────────────────
# Phase 7 — Gamification, Badges & Visual Flashcard Tables
# ──────────────────────────────────────────────────────────────

class StudentProfileModel(Base):
    """Tracks individual student learning profile, XP, streak, and level."""
    __tablename__ = "student_profiles"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(64), nullable=False, unique=True, index=True)
    student_name = Column(String(128), default="Student")
    school_id = Column(String(64), default="primary_school_01", index=True)
    grade_level = Column(Integer, default=3)
    total_xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    current_streak_days = Column(Integer, default=1)
    completed_quests_count = Column(Integer, default=0)
    concepts_mastered = Column(JSON, default=list)
    last_active = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class StudentBadgeModel(Base):
    """Stores educational badges unlocked by students."""
    __tablename__ = "student_badges"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(64), nullable=False, index=True)
    badge_id = Column(String(64), nullable=False)
    badge_name = Column(String(128), nullable=False)
    title_local = Column(String(128), nullable=False)
    icon_symbol = Column(String(32), default="🏆")
    tier = Column(String(32), default="Bronze")
    unlocked_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class LearningQuestModel(Base):
    """Stores generated nature observation micro-quests for concepts."""
    __tablename__ = "learning_quests"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    quest_id = Column(String(64), nullable=False, index=True)
    concept_code = Column(String(64), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    story_mission = Column(Text, nullable=False)
    action_prompt = Column(Text, nullable=False)
    reward_xp = Column(Integer, default=75)
    badge_unlock = Column(String(64), nullable=True)
    target_language = Column(String(16), default="hi")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class VisualFlashcardModel(Base):
    """Stores generated multilingual visual flashcards."""
    __tablename__ = "visual_flashcards"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    concept_code = Column(String(64), nullable=False, index=True)
    primary_term = Column(String(128), nullable=False)
    english_term = Column(String(128), nullable=False)
    mother_tongue_term = Column(String(128), nullable=False)
    phonetic_transliteration = Column(String(128), nullable=True)
    svg_icon = Column(Text, nullable=True)
    definition_simple = Column(Text, nullable=False)
    village_example = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))



