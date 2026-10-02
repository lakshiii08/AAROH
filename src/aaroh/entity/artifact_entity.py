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

# ──────────────────────────────────────────────────────────────
# Phase 4: Quiz Generation & Student Assessment Entities
# ──────────────────────────────────────────────────────────────

@dataclass
class QuizQuestionEntity:
    """A worksheet question: multiple-choice or teacher-reviewed theory."""
    question_id: str
    concept_code: str
    question_type: str          # "mcq" | "theory"
    question_text: str          # In target language (e.g., Hindi)
    options: List[str]          # MCQ options (A, B, C, D); empty for fill_blank
    correct_answer: str         # "A" / "B" / exact text / "True" / "False"
    explanation: str            # Why this answer is correct (in mother tongue)
    blooms_level: str           # Remember / Understand / Apply
    difficulty_level: int       # 1-5
    cultural_anchor: Optional[str] = None  # Village analogy hint


@dataclass
class QuizEntity:
    """A full quiz for one concept and student."""
    quiz_id: str
    concept_code: str
    concept_name: str
    grade_level: int
    target_language: str
    target_dialect: Optional[str]
    questions: List[QuizQuestionEntity]
    generated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class StudentAnswerEntity:
    """A student's answer to one question."""
    question_id: str
    student_answer: str
    is_correct: bool
    time_taken_sec: Optional[float] = None


@dataclass
class QuizSubmissionEntity:
    """Full quiz submission by one student."""
    submission_id: str
    quiz_id: str
    student_id: str
    concept_code: str
    answers: List[StudentAnswerEntity]
    score_pct: float            # 0.0 – 100.0
    submitted_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class LearningGapEntity:
    """A detected gap for one concept + student."""
    concept_code: str
    concept_name: str
    blooms_level: str
    gap_severity: str           # "low" | "medium" | "high" | "critical"
    weak_question_ids: List[str]
    wrong_answers: List[Dict[str, str]]
    remedial_suggested: bool = True


@dataclass
class AssessmentResultEntity:
    """Full assessment result: score + gaps + remedial suggestions."""
    student_id: str
    quiz_id: str
    concept_code: str
    score_pct: float
    grade_level: int
    target_language: str
    gaps: List[LearningGapEntity]
    remedial_concepts: List[str]   # concept_codes that need re-teaching
    teacher_insight: str           # 1-paragraph actionable summary for teacher
    needs_remedial: bool = False
    assessed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

# ──────────────────────────────────────────────────────────────
# Phase 5: Voice & Speech Intelligence Entities
# ──────────────────────────────────────────────────────────────

@dataclass
class AudioSegmentEntity:
    """A generated audio track for one section of a lesson."""
    segment_id: str
    section_name: str           # "simplified_explanation" | "story_narrative" | "activity" | "voice_script"
    text_content: str
    audio_file_path: str
    duration_seconds: float
    format: str = "wav"
    sample_rate: int = 22050
    voice_id: str = "hi-IN-Kajal"


@dataclass
class VoiceLessonEntity:
    """Full voice package for a localized concept lesson."""
    concept_code: str
    concept_name: str
    target_language: str
    target_dialect: Optional[str]
    segments: List[AudioSegmentEntity]
    total_duration_seconds: float
    audio_output_dir: str
    generated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class TranscriptionResultEntity:
    """Result of transcribing student oral audio response."""
    audio_file_path: str
    transcribed_text: str
    confidence_score: float
    detected_language: str
    latency_ms: float = 0.0


@dataclass
class OralQuizResultEntity:
    """Grading of a student's spoken answer against expected answer."""
    question_id: str
    student_id: str
    transcribed_speech: str
    expected_answer: str
    is_correct: bool
    confidence_score: float
    feedback_audio_script: str
    feedback_audio_path: Optional[str] = None


# ──────────────────────────────────────────────────────────────
# Phase 6: Teacher Copilot & Offline Edge Sync Entities
# ──────────────────────────────────────────────────────────────

@dataclass
class LessonPlanEntity:
    """A multigrade pedagogical lesson plan for rural single-teacher classrooms."""
    plan_id: str
    title: str
    grade_level: int
    target_language: str
    target_dialect: Optional[str]
    concept_codes: List[str]
    time_allocation_mins: Dict[str, int]
    multigrade_strategies: Dict[str, str]
    blackboard_activity: str
    teaching_aids: List[str]
    hands_on_experiments: List[str]
    homework_village_inquiry: str
    generated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class RemedialTeachingAidEntity:
    """Targeted remedial aid generated for teachers based on class gap analysis."""
    aid_id: str
    concept_code: str
    concept_name: str
    target_language: str
    identified_gap_summary: str
    simplified_activity: str
    story_analogy: str
    check_questions: List[Dict[str, str]]
    printable_guide: str
    generated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class OfflinePackageMetadataEntity:
    """Metadata for an exported offline .zip bundle for zero-internet rural schools."""
    package_id: str
    package_name: str
    grade_level: int
    subject: str
    target_language: str
    target_dialect: Optional[str]
    total_lessons: int
    total_quizzes: int
    total_audio_files: int
    package_size_bytes: int
    package_zip_path: str
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class SyncPayloadEntity:
    """Offline quiz attempts batch imported from an Edge device (kiosk / tablet)."""
    batch_id: str
    device_id: str
    school_id: str
    total_submissions: int
    synced_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class ClassroomMasteryEntity:
    """Mastery metrics for teacher dashboard analytics."""
    concept_code: str
    concept_name: str
    grade_level: int
    total_students_assessed: int
    mastery_rate_pct: float
    average_score_pct: float
    common_gap_bloom: str


# ──────────────────────────────────────────────────────────────
# Phase 7: Gamification, Quests & Visual Storytelling Entities
# ──────────────────────────────────────────────────────────────

@dataclass
class BadgeEntity:
    """An educational achievement badge earned by a child."""
    badge_id: str
    badge_name: str
    title_local: str            # e.g., "जल रक्षक (Water Protector)"
    description: str
    icon_symbol: str            # e.g., "💧", "🌱", "🔬"
    tier: str = "Bronze"        # "Bronze" | "Silver" | "Gold" | "Diamond"
    xp_bonus: int = 100
    unlocked_at: Optional[datetime] = None


@dataclass
class LearningQuestEntity:
    """A 2-minute daily village observation micro-challenge."""
    quest_id: str
    concept_code: str
    concept_name: str
    title: str
    story_mission: str
    action_prompt: str
    reward_xp: int = 75
    badge_unlock: Optional[str] = None
    target_language: str = "hi"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class VisualFlashcardEntity:
    """A multilingual visual flashcard with village iconography."""
    card_id: str
    concept_code: str
    concept_name: str
    primary_term: str
    english_term: str
    mother_tongue_term: str
    phonetic_transliteration: str
    svg_icon_or_symbol: str
    simple_definition: str
    village_example: str


@dataclass
class StudentPortfolioEntity:
    """Complete gamified learning portfolio for a student."""
    student_id: str
    student_name: str
    school_id: str
    grade_level: int
    total_xp: int
    level: int
    current_streak_days: int
    badges: List[BadgeEntity]
    completed_quests_count: int
    concepts_mastered: List[str]
    last_active: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


# ──────────────────────────────────────────────────────────────
# Phase 8: District Administration & Parent Voice Advisory Entities
# ──────────────────────────────────────────────────────────────

@dataclass
class InterventionStepEntity:
    """A single step in a child's personalized remedial learning pathway."""
    step_number: int
    step_type: str              # "story_audio" | "hands_on_activity" | "micro_quest" | "oral_quiz"
    title: str
    instruction: str
    resource_url: Optional[str] = None
    is_completed: bool = False


@dataclass
class InterventionPathwayEntity:
    """Complete 4-step personalized remedial roadmap for struggling students."""
    pathway_id: str
    student_id: str
    student_name: str
    concept_code: str
    concept_name: str
    weak_bloom_level: str
    steps: List[InterventionStepEntity]
    status: str = "ASSIGNED"    # "ASSIGNED" | "IN_PROGRESS" | "COMPLETED"
    assigned_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class ParentVoiceAdvisoryEntity:
    """A 45-second mother-tongue audio advisory call/note for non-literate parents."""
    advisory_id: str
    student_id: str
    student_name: str
    parent_phone: str
    target_language: str
    target_dialect: Optional[str]
    concept_learned: str
    speech_script: str
    audio_file_path: str
    stream_url: str
    dispatch_status: str = "SENT" # "SENT" | "SCHEDULED" | "DELIVERED"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class DistrictAnalyticsSummaryEntity:
    """High-level district administrative metrics across tribal schools."""
    district_code: str
    state_name: str
    total_schools: int
    total_students: int
    total_assessments_conducted: int
    district_average_score_pct: float
    total_remedials_active: int
    top_performing_concepts: List[str]
    critical_gap_concepts: List[str]
    school_rankings: List[Dict[str, Any]]



