import os
import uuid
import json
import zipfile
import shutil
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from src.aaroh.entity.config_entity import CopilotEdgeConfig
from src.aaroh.entity.artifact_entity import (
    OfflinePackageMetadataEntity,
    SyncPayloadEntity,
    LocalizedLessonEntity,
    QuizEntity,
)
from src.aaroh.database.session import DatabaseManager
from src.aaroh.database.models import (
    QuizSubmissionModel,
    AssessmentResultModel,
    EdgeSyncLogModel,
)
from src.aaroh.utils.logger import logger


class EdgeSyncComponent:
    """Manages offline bundle generation and data synchronization for zero-internet rural classrooms.
    
    1. Export: Packages lessons, stories, quizzes, and audio tracks into an offline ZIP bundle.
    2. Sync: Ingests completed offline quiz submissions from school tablets/kiosks and merges into central RDS/SQLite.
    """

    def __init__(self, config: CopilotEdgeConfig):
        self.config = config
        self.export_dir = Path(config.packages_export_dir)
        self.sync_dir = Path(config.sync_import_dir)
        self.export_dir.mkdir(parents=True, exist_ok=True)
        self.sync_dir.mkdir(parents=True, exist_ok=True)

    def export_offline_package(
        self,
        grade_level: int,
        subject: str,
        target_language: str,
        target_dialect: Optional[str],
        lessons: List[Dict[str, Any]],
        quizzes: List[Dict[str, Any]],
        audio_file_paths: List[str],
        glossary_terms: List[Dict[str, Any]],
    ) -> OfflinePackageMetadataEntity:
        """Packages localized content into an offline-first .zip bundle for Edge devices."""
        package_id = str(uuid.uuid4())[:8]
        safe_dialect = target_dialect or "std"
        package_name = f"aaroh_bundle_g{grade_level}_{subject.lower()[:3]}_{target_language}_{safe_dialect}_{package_id}"
        temp_bundle_dir = self.export_dir / package_name
        temp_bundle_dir.mkdir(parents=True, exist_ok=True)

        # 1. Write Lessons
        lessons_dir = temp_bundle_dir / "lessons"
        lessons_dir.mkdir(exist_ok=True)
        for idx, l in enumerate(lessons, 1):
            code = l.get("concept_code", f"L{idx}")
            with open(lessons_dir / f"{code}.json", "w", encoding="utf-8") as f:
                json.dump(l, f, ensure_ascii=False, indent=2)

        # 2. Write Quizzes
        quizzes_dir = temp_bundle_dir / "quizzes"
        quizzes_dir.mkdir(exist_ok=True)
        for idx, q in enumerate(quizzes, 1):
            qid = q.get("quiz_id", f"Q{idx}")
            with open(quizzes_dir / f"{qid}.json", "w", encoding="utf-8") as f:
                json.dump(q, f, ensure_ascii=False, indent=2)

        # 3. Write Glossary
        with open(temp_bundle_dir / "glossary.json", "w", encoding="utf-8") as f:
            json.dump(glossary_terms, f, ensure_ascii=False, indent=2)

        # 4. Copy Audio Files
        audio_dir = temp_bundle_dir / "audio"
        audio_dir.mkdir(exist_ok=True)
        copied_audio_count = 0
        for audio_path_str in audio_file_paths:
            src_audio = Path(audio_path_str)
            if src_audio.exists():
                shutil.copy2(src_audio, audio_dir / src_audio.name)
                copied_audio_count += 1

        # 5. Manifest / Catalog metadata
        manifest = {
            "package_id": package_id,
            "package_name": package_name,
            "version": "1.0.0",
            "grade_level": grade_level,
            "subject": subject,
            "target_language": target_language,
            "target_dialect": target_dialect,
            "total_lessons": len(lessons),
            "total_quizzes": len(quizzes),
            "total_audio_files": copied_audio_count,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "offline_player_compatible": True,
        }
        with open(temp_bundle_dir / "manifest.json", "w", encoding="utf-8") as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)

        # 6. Compress into .zip
        zip_path = self.export_dir / f"{package_name}.zip"
        with zipfile.ZipFile(str(zip_path), "w", zipfile.ZIP_DEFLATED) as zipf:
            for root, _, files in os.walk(temp_bundle_dir):
                for file in files:
                    file_path = Path(root) / file
                    arcname = file_path.relative_to(temp_bundle_dir)
                    zipf.write(file_path, arcname)

        # Clean up temporary folder
        shutil.rmtree(temp_bundle_dir, ignore_errors=True)

        size_bytes = zip_path.stat().st_size
        logger.info(f"Offline package exported: {zip_path.name} ({size_bytes} bytes)")

        return OfflinePackageMetadataEntity(
            package_id=package_id,
            package_name=package_name,
            grade_level=grade_level,
            subject=subject,
            target_language=target_language,
            target_dialect=target_dialect,
            total_lessons=len(lessons),
            total_quizzes=len(quizzes),
            total_audio_files=copied_audio_count,
            package_size_bytes=size_bytes,
            package_zip_path=str(zip_path),
        )

    def import_and_sync_offline_attempts(
        self,
        payload: Dict[str, Any],
        db_manager: DatabaseManager,
    ) -> SyncPayloadEntity:
        """Ingests a batch of offline quiz attempts submitted by an Edge device."""
        batch_id = payload.get("batch_id", str(uuid.uuid4())[:8])
        device_id = payload.get("device_id", "kiosk_unknown")
        school_id = payload.get("school_id", "rural_primary_01")
        submissions = payload.get("submissions", [])

        session = db_manager.get_session()
        synced_count = 0
        try:
            for s in submissions:
                sub_id = s.get("submission_id", str(uuid.uuid4()))
                quiz_id = s.get("quiz_id", "quiz_unknown")
                student_id = s.get("student_id", "student_unknown")
                concept_code = s.get("concept_code", "concept_unknown")
                answers = s.get("answers", [])
                score_pct = float(s.get("score_pct", 0.0))

                # Check if already synced (upsert)
                existing = session.query(QuizSubmissionModel).filter_by(id=sub_id).first()
                if existing:
                    existing.score_pct = score_pct
                    existing.answers = answers
                else:
                    sub_model = QuizSubmissionModel(
                        id=sub_id,
                        quiz_id=quiz_id,
                        student_id=student_id,
                        concept_code=concept_code,
                        answers=answers,
                        score_pct=score_pct,
                    )
                    session.add(sub_model)

                    assess_model = AssessmentResultModel(
                        submission_id=sub_id,
                        student_id=student_id,
                        concept_code=concept_code,
                        score_pct=score_pct,
                        gaps=s.get("gaps", []),
                        teacher_insight=s.get("teacher_insight", "Synced from offline edge device."),
                        needs_remedial=score_pct < 60.0,
                    )
                    session.add(assess_model)
                synced_count += 1

            # Log sync batch (Idempotent update or insert)
            existing_log = session.query(EdgeSyncLogModel).filter_by(id=batch_id).first()
            if existing_log:
                existing_log.total_synced_attempts += synced_count
                existing_log.sync_status = "SUCCESS"
            else:
                log_model = EdgeSyncLogModel(
                    id=batch_id,
                    device_id=device_id,
                    school_id=school_id,
                    total_synced_attempts=synced_count,
                    sync_status="SUCCESS",
                )
                session.add(log_model)

            session.commit()
            logger.info(f"Edge Sync: {synced_count} submissions ingested from device '{device_id}' (School: {school_id})")

            return SyncPayloadEntity(
                batch_id=batch_id,
                device_id=device_id,
                school_id=school_id,
                total_submissions=synced_count,
            )
        except Exception as e:
            session.rollback()
            logger.error(f"Edge Sync failed: {e}")
            raise
        finally:
            session.close()
