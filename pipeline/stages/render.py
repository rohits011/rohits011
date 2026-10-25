"""Stage 4: assemble the final video with ffmpeg.

Per scene: loop the b-roll to the narration's length, scale/crop to the target
resolution, mux the voiceover. Then concat all scenes losslessly (every scene
is encoded with identical settings, so the concat is a stream copy).
"""

import subprocess


def run(ctx):
    cfg, manifest = ctx["config"], ctx["manifest"]
    width, height = cfg.get("video.width", 1920), cfg.get("video.height", 1080)
    fps = cfg.get("video.fps", 30)
    render_dir = ctx["project_dir"] / "render"
    render_dir.mkdir(exist_ok=True)

    audio_scenes = {s["id"]: s for s in manifest.outputs("voiceover")["scenes"]}
    clips = {c["id"]: c for c in manifest.outputs("assets")["clips"]}

    scene_files = []
    for scene_id in sorted(audio_scenes):
        audio = audio_scenes[scene_id]
        out_path = render_dir / f"scene_{scene_id:02d}.mp4"
        scene_files.append(out_path)
        if out_path.exists():  # per-file checkpoint within the stage
            continue
        print(f"  scene {scene_id}: rendering ({audio['duration']:.1f}s)...")
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error",
             "-stream_loop", "-1", "-i", str(ctx["project_dir"] / clips[scene_id]["clip"]),
             "-i", str(ctx["project_dir"] / audio["audio"]),
             "-t", f"{audio['duration']:.3f}",
             "-map", "0:v:0", "-map", "1:a:0",
             "-vf", (f"scale={width}:{height}:force_original_aspect_ratio=increase,"
                     f"crop={width}:{height},fps={fps},format=yuv420p"),
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
             "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
             "-shortest", str(out_path)],
            check=True,
        )

    concat_list = render_dir / "concat.txt"
    concat_list.write_text("".join(f"file '{p.name}'\n" for p in scene_files))
    final_path = ctx["project_dir"] / "final.mp4"
    print("  concatenating scenes...")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error",
         "-f", "concat", "-safe", "0", "-i", str(concat_list),
         "-c", "copy", str(final_path)],
        check=True,
    )

    total = sum(s["duration"] for s in audio_scenes.values())
    return {"final": "final.mp4", "duration_seconds": round(total, 1)}
