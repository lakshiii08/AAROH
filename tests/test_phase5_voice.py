import sys
from pathlib import Path
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.aaroh.pipeline.voice_intelligence_pipeline import VoiceIntelligencePipeline


def test_phase5_voice_pipeline():
    pipeline = VoiceIntelligencePipeline()

    # 1. Test custom text TTS synthesis
    segment = pipeline.synthesize_custom_text(
        text="Namaste baccho! Aaj hum paani ke jaadu ke baare mein seekhenge.",
        section_name="intro",
        target_language="hi",
    )
    assert segment is not None
    assert Path(segment.audio_file_path).exists()
    assert segment.duration_seconds > 0
    print(f"\nCustom TTS generated: {segment.audio_file_path} ({segment.duration_seconds}s)")

    # 2. Test full voice lesson package generation for EVS-G3-WAT-01
    voice_pkg = pipeline.generate_voice_lesson(
        concept_code="EVS-G3-WAT-01",
        target_language="hi",
        target_dialect="gon",
        grade_level=3,
    )
    assert voice_pkg is not None
    assert len(voice_pkg.segments) >= 2
    assert voice_pkg.total_duration_seconds > 0
    for s in voice_pkg.segments:
        assert Path(s.audio_file_path).exists()
        print(f"  - Track [{s.section_name}]: {Path(s.audio_file_path).name} ({s.duration_seconds}s)")

    print(f"Total Lesson Audio Duration: {voice_pkg.total_duration_seconds}s")

    # 3. Test Oral Quiz STT and Grading
    # Create sample dummy student audio file for testing
    dummy_audio_path = pipeline.config_manager.get_voice_config().audio_output_dir / "student_water_ans.wav"
    pipeline.tts._generate_local_wav(dummy_audio_path, "matke ka paani bhaap banke thanda hota hai", 3.0)

    oral_res = pipeline.process_oral_quiz_answer(
        quiz_id="quiz_dummy_101",
        question_id="Q2",
        student_id="student_soma_01",
        audio_file_path=str(dummy_audio_path),
        expected_answer="matka",
        target_language="hi",
    )

    assert oral_res is not None
    assert oral_res.is_correct is True
    assert oral_res.feedback_audio_script != ""
    assert oral_res.feedback_audio_path is not None
    assert Path(oral_res.feedback_audio_path).exists()
    print(f"\nOral Quiz Graded:")
    print(f"  - Transcribed: '{oral_res.transcribed_speech}'")
    print(f"  - Is Correct: {oral_res.is_correct}")
    print(f"  - Verbal Feedback Script: {oral_res.feedback_audio_script}")
    print(f"  - Feedback Audio Track: {Path(oral_res.feedback_audio_path).name}")


if __name__ == "__main__":
    test_phase5_voice_pipeline()
    print("\nPhase 5 Voice & Speech Intelligence Pipeline Tests Passed!")
