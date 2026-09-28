import os
import uuid
import wave
import struct
import math
import boto3
from pathlib import Path
from typing import Optional, List, Dict, Any
from src.aaroh.entity.config_entity import VoiceConfig
from src.aaroh.entity.artifact_entity import (
    AudioSegmentEntity,
    VoiceLessonEntity,
    LocalizedLessonEntity,
)
from src.aaroh.utils.logger import logger
from src.aaroh.utils.exception import AarohException
import sys


class VoiceTTSComponent:
    """Text-to-Speech synthesizer for AAROH.
    
    Supports:
      1. AWS Polly Neural Indian English / Hindi voices (e.g., 'Kajal', 'Aditi').
      2. Local WAV generator fallback (generates valid, playable audio waves).
    """

    def __init__(self, config: VoiceConfig):
        self.config = config
        self.output_dir = Path(config.audio_output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.polly_client = self._init_polly()

    def _init_polly(self):
        try:
            return boto3.client(
                "polly",
                region_name=os.getenv("AWS_REGION", "ap-south-1")
            )
        except Exception as e:
            logger.warning(f"AWS Polly client unavailable ({e}). Using local audio synthesizer.")
            return None

    def synthesize_text(
        self,
        text: str,
        section_name: str = "explanation",
        target_language: str = "hi",
        target_dialect: Optional[str] = None,
        custom_voice_id: Optional[str] = None,
    ) -> AudioSegmentEntity:
        """Synthesizes text into a localized audio file and returns an AudioSegmentEntity."""
        segment_id = str(uuid.uuid4())[:8]
        voice_id = custom_voice_id or self.config.polly_language_voice_map.get(target_language, "Kajal")
        out_filename = f"{section_name}_{target_language}_{segment_id}.wav"
        out_path = self.output_dir / out_filename

        # Estimate duration: ~130 words per minute for primary school tempo
        word_count = len(text.split())
        estimated_duration = max(1.5, round((word_count / 130) * 60, 2))

        # 1. Try AWS Polly if enabled and client available
        if self.polly_client and not self.config.enable_mock_voice:
            try:
                logger.info(f"Synthesizing with AWS Polly (Voice: {voice_id}) for {word_count} words...")
                response = self.polly_client.synthesize_speech(
                    Text=text[:3000],
                    OutputFormat="mp3",
                    VoiceId=voice_id,
                    Engine="neural",
                )
                if "AudioStream" in response:
                    mp3_path = out_path.with_suffix(".mp3")
                    with open(mp3_path, "wb") as f:
                        f.write(response["AudioStream"].read())
                    return AudioSegmentEntity(
                        segment_id=segment_id,
                        section_name=section_name,
                        text_content=text,
                        audio_file_path=str(mp3_path),
                        duration_seconds=estimated_duration,
                        format="mp3",
                        sample_rate=self.config.sample_rate,
                        voice_id=voice_id,
                    )
            except Exception as e:
                logger.warning(f"Polly synthesis failed ({e}). Falling back to local audio synthesizer.")

        # 2. Local Audio Waveform Synthesizer Fallback
        self._generate_local_wav(out_path, text, estimated_duration)

        logger.info(f"Local audio synthesized: {out_path} ({estimated_duration}s)")
        return AudioSegmentEntity(
            segment_id=segment_id,
            section_name=section_name,
            text_content=text,
            audio_file_path=str(out_path),
            duration_seconds=estimated_duration,
            format="wav",
            sample_rate=self.config.sample_rate,
            voice_id=f"Local-{voice_id}",
        )

    def synthesize_lesson_package(
        self,
        lesson: LocalizedLessonEntity,
    ) -> VoiceLessonEntity:
        """Synthesizes all sections of a localized lesson (explanation, story, activity, voice script)."""
        logger.info(f"Generating full voice lesson package for '{lesson.concept_code}' ({lesson.target_language})")

        segments = []

        # 1. Simplified Explanation
        if lesson.simplified_explanation:
            seg_exp = self.synthesize_text(
                text=lesson.simplified_explanation,
                section_name="explanation",
                target_language=lesson.target_language,
                target_dialect=lesson.target_dialect,
            )
            segments.append(seg_exp)

        # 2. Story Narrative
        if lesson.story_narrative:
            seg_story = self.synthesize_text(
                text=lesson.story_narrative,
                section_name="story",
                target_language=lesson.target_language,
                target_dialect=lesson.target_dialect,
            )
            segments.append(seg_story)

        # 3. Voice Script (Quick 60-90 sec recap for listening)
        if lesson.voice_script:
            seg_script = self.synthesize_text(
                text=lesson.voice_script,
                section_name="voice_recap",
                target_language=lesson.target_language,
                target_dialect=lesson.target_dialect,
            )
            segments.append(seg_script)

        total_duration = round(sum(s.duration_seconds for s in segments), 2)

        return VoiceLessonEntity(
            concept_code=lesson.concept_code,
            concept_name=lesson.concept_name,
            target_language=lesson.target_language,
            target_dialect=lesson.target_dialect,
            segments=segments,
            total_duration_seconds=total_duration,
            audio_output_dir=str(self.output_dir),
        )

    def _generate_local_wav(self, file_path: Path, text: str, duration_sec: float):
        """Generates a valid, pitch-modulated audio wave simulating spoken cadence."""
        sample_rate = self.config.sample_rate
        total_samples = int(sample_rate * min(duration_sec, 10.0))  # cap at 10s for test speed

        # Base fundamental frequency for warm teacher voice (~220Hz - A3)
        base_freq = 220.0

        with wave.open(str(file_path), "w") as wav_file:
            wav_file.setnchannels(1)        # mono
            wav_file.setsampwidth(2)        # 16-bit
            wav_file.setframerate(sample_rate)

            samples = bytearray()
            for i in range(total_samples):
                t = float(i) / sample_rate
                # Add slight cadence modulation
                freq = base_freq + 20.0 * math.sin(2 * math.pi * 1.5 * t)
                # Formant synthesis wave
                val = int(
                    12000 * math.sin(2 * math.pi * freq * t) * math.exp(-0.05 * (t % 0.4))
                )
                val = max(-32767, min(32767, val))
                samples.extend(struct.pack("<h", val))

            wav_file.writeframes(samples)
