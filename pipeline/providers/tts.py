"""Text-to-speech providers behind one interface.

Provider shutdowns and price changes are a documented hazard in this space,
so everything downstream depends only on TTSProvider.synthesize(). Adding a
provider (e.g. self-hosted Kokoro) means one new class + one factory line.
"""

import subprocess
from pathlib import Path

import requests

from core.config import env


class TTSProvider:
    extension = "mp3"

    def synthesize(self, text: str, out_path: Path) -> None:
        raise NotImplementedError


class ElevenLabsTTS(TTSProvider):
    def __init__(self, voice_id: str, model_id: str = "eleven_multilingual_v2"):
        self.voice_id = voice_id
        self.model_id = model_id

    def synthesize(self, text: str, out_path: Path) -> None:
        response = requests.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}",
            headers={"xi-api-key": env("ELEVENLABS_API_KEY")},
            json={"text": text, "model_id": self.model_id},
            timeout=300,
        )
        response.raise_for_status()
        out_path.write_bytes(response.content)


class OpenAITTS(TTSProvider):
    def __init__(self, voice: str = "alloy", model: str = "gpt-4o-mini-tts"):
        self.voice = voice
        self.model = model

    def synthesize(self, text: str, out_path: Path) -> None:
        response = requests.post(
            "https://api.openai.com/v1/audio/speech",
            headers={"Authorization": f"Bearer {env('OPENAI_API_KEY')}"},
            json={"model": self.model, "voice": self.voice, "input": text},
            timeout=300,
        )
        response.raise_for_status()
        out_path.write_bytes(response.content)


class DryRunTTS(TTSProvider):
    """Generates silent audio so --dry-run exercises the render stage for free."""

    extension = "wav"

    def synthesize(self, text: str, out_path: Path) -> None:
        # ~2.5 words/second of silence approximates real narration length.
        duration = max(3.0, len(text.split()) / 2.5)
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error",
             "-f", "lavfi", "-i", "anullsrc=channel_layout=mono:sample_rate=24000",
             "-t", f"{duration:.1f}", "-c:a", "pcm_s16le", str(out_path)],
            check=True,
        )


def make_tts(config, dry_run: bool) -> TTSProvider:
    if dry_run:
        return DryRunTTS()
    provider = config.get("tts.provider", "openai")
    if provider == "elevenlabs":
        return ElevenLabsTTS(
            voice_id=config.get("tts.elevenlabs.voice_id"),
            model_id=config.get("tts.elevenlabs.model_id", "eleven_multilingual_v2"),
        )
    if provider == "openai":
        return OpenAITTS(
            voice=config.get("tts.openai.voice", "alloy"),
            model=config.get("tts.openai.model", "gpt-4o-mini-tts"),
        )
    raise RuntimeError(f"Unknown tts.provider '{provider}' in config.yaml")
