"""Stage 2: per-scene TTS. One audio file per scene keeps b-roll aligned to narration."""

import subprocess

from providers.tts import make_tts
from stages.script import load_script


def run(ctx):
    manifest = ctx["manifest"]
    tts = make_tts(ctx["config"], manifest.dry_run)
    audio_dir = ctx["project_dir"] / "audio"
    audio_dir.mkdir(exist_ok=True)

    scenes = []
    for scene in load_script(ctx)["scenes"]:
        out_path = audio_dir / f"scene_{scene['id']:02d}.{tts.extension}"
        if not out_path.exists():  # per-file checkpoint within the stage
            print(f"  scene {scene['id']}: synthesizing {len(scene['text'].split())} words...")
            tts.synthesize(scene["text"], out_path)
        scenes.append({
            "id": scene["id"],
            "audio": str(out_path.relative_to(ctx["project_dir"])),
            "duration": media_duration(out_path),
        })
    return {"scenes": scenes}


def media_duration(path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(result.stdout.strip())
