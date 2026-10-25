"""Stage 3: fetch one b-roll clip per scene from the visuals provider."""

from providers.visuals import make_visuals
from stages.script import load_script


def run(ctx):
    cfg, manifest = ctx["config"], ctx["manifest"]
    visuals = make_visuals(cfg, manifest.dry_run)
    assets_dir = ctx["project_dir"] / "assets"
    assets_dir.mkdir(exist_ok=True)
    width, height = cfg.get("video.width", 1920), cfg.get("video.height", 1080)

    clips = []
    for scene in load_script(ctx)["scenes"]:
        out_path = assets_dir / f"scene_{scene['id']:02d}.mp4"
        if not out_path.exists():  # per-file checkpoint within the stage
            print(f"  scene {scene['id']}: fetching b-roll for '{scene['broll_keywords']}'...")
            visuals.fetch_clip(scene["broll_keywords"], out_path, width, height)
        clips.append({"id": scene["id"],
                      "clip": str(out_path.relative_to(ctx["project_dir"]))})
    return {"clips": clips}
