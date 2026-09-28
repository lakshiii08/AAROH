import sys
from pathlib import Path
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
sys.path.insert(0, str(Path(__file__).parent.parent))

import io
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)


def test_root_shows_phase5():
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert "5" in data["phase"]
    assert any("Voice & Speech" in p for p in data["phases_active"])


def test_synthesize_text_api():
    r = client.post(
        "/api/v1/voice/synthesize",
        json={
            "text": "Ramu ne mitti ke matke mein paani daala aur dekha paani thanda ho gaya.",
            "target_language": "hi",
            "section_name": "story",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert "audio_file_path" in data
    assert "stream_url" in data
    print(f"\nSynthesize API: {data['stream_url']} ({data['duration_seconds']}s)")


def test_generate_voice_lesson_api():
    r = client.post(
        "/api/v1/voice/lessons/EVS-G3-WAT-01",
        json={
            "target_language": "hi",
            "target_dialect": "gon",
            "grade_level": 3,
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert len(data["audio_segments"]) >= 2
    print(f"\nVoice Lesson API: {len(data['audio_segments'])} audio tracks generated.")


def test_stream_audio_api():
    # 1. Synthesize audio first
    syn_r = client.post(
        "/api/v1/voice/synthesize",
        json={"text": "Namaste", "target_language": "hi", "section_name": "test_stream"},
    )
    stream_url = syn_r.json()["stream_url"]

    # 2. Stream audio file
    r = client.get(stream_url)
    assert r.status_code == 200
    assert r.headers["content-type"] in ["audio/wav", "audio/mpeg", "application/octet-stream"]
    assert len(r.content) > 100
    print(f"\nStream Audio API: Received {len(r.content)} bytes of audio data.")


def test_oral_quiz_audio_submit_api():
    # Create simulated in-memory WAV file
    wav_bytes = b"RIFF....WAVEfmt ....data...." + b"\x00" * 500
    audio_file = ("student_water_ans.wav", io.BytesIO(wav_bytes), "audio/wav")

    r = client.post(
        "/api/v1/voice/oral-quiz/submit-audio",
        data={
            "quiz_id": "quiz_101",
            "question_id": "Q1",
            "student_id": "student_ramu_oral",
            "expected_answer": "matka",
            "target_language": "hi",
        },
        files={"audio_file": audio_file},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert "transcribed_speech" in data
    assert "feedback_script" in data
    print(f"\nOral Quiz Submit API:")
    print(f"  - Spoken: '{data['transcribed_speech']}'")
    print(f"  - Correct: {data['is_correct']}")
    print(f"  - Feedback URL: {data['feedback_audio_url']}")


if __name__ == "__main__":
    test_root_shows_phase5()
    test_synthesize_text_api()
    test_generate_voice_lesson_api()
    test_stream_audio_api()
    test_oral_quiz_audio_submit_api()
    print("\nAll Phase 5 API Tests Passed Successfully!")
