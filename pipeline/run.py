#!/usr/bin/env python3
"""Faceless-video pipeline CLI.

  python run.py new "How container shipping ate the world"   # start a video
  python run.py approve <slug>                               # after reviewing script.json
  python run.py resume <slug>                                # continue from checkpoint
  python run.py status <slug>                                # show stage states
  python run.py list                                         # all projects
  python run.py new "..." --dry-run --yes                    # free end-to-end test, no API keys
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from core.config import load_config
from core.state import STAGES, Manifest
from stages import assets, render, script, thumbnail, upload, voiceover

STAGE_FUNCS = {
    "script": script.run,
    "voiceover": voiceover.run,
    "assets": assets.run,
    "render": render.run,
    "thumbnail": thumbnail.run,
    "upload": upload.run,
}


def orchestrate(manifest: Manifest, config, until: str | None, auto_approve: bool):
    ctx = {"manifest": manifest, "config": config, "project_dir": manifest.project_dir}

    for stage in STAGES:
        if manifest.status(stage) == "done":
            print(f"[{stage}] already done, skipping")
        else:
            # Human editorial gate: no money is spent on TTS/footage until the
            # script has been reviewed. This is the line between "AI-assisted"
            # and the mass-produced output YouTube demonetizes.
            if stage == "voiceover" and not _script_approved(manifest) and not auto_approve:
                print(
                    f"\nScript ready for review:\n"
                    f"  {manifest.project_dir / 'script.md'}  (readable)\n"
                    f"  {manifest.project_dir / 'script.json'}  (edit this one)\n\n"
                    f"Edit the script, then run:  python run.py approve {manifest.slug}\n"
                    f"Then continue with:         python run.py resume {manifest.slug}"
                )
                return
            print(f"[{stage}] running...")
            manifest.mark_running(stage)
            try:
                outputs = STAGE_FUNCS[stage](ctx)
            except Exception as exc:
                manifest.mark_failed(stage, str(exc))
                print(f"[{stage}] FAILED: {exc}")
                print(f"Fix the issue and run:  python run.py resume {manifest.slug}")
                raise SystemExit(1)
            manifest.mark_done(stage, outputs)
            print(f"[{stage}] done")

        if until and stage == until:
            print(f"Stopped after '{until}' as requested.")
            return

    print(f"\nPipeline complete: {manifest.project_dir / 'final.mp4'}")
    upload_out = manifest.outputs("upload")
    if upload_out.get("url"):
        print(f"Review the private upload, then publish from YouTube Studio: {upload_out['url']}")


def _script_approved(manifest: Manifest) -> bool:
    return bool(manifest.outputs("script").get("approved"))


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    p_new = sub.add_parser("new", help="start a new video project")
    p_new.add_argument("topic")
    p_new.add_argument("--slug", help="directory name (default: derived from topic)")
    p_new.add_argument("--dry-run", action="store_true",
                       help="run the whole pipeline with offline stub providers (no API keys)")
    p_new.add_argument("--script-file", metavar="PATH",
                       help="use this script.json instead of generating one with the LLM "
                            "(zero-cost mode; see README for the JSON shape)")

    p_resume = sub.add_parser("resume", help="continue a project from its checkpoint")
    p_resume.add_argument("slug")
    p_resume.add_argument("--from", dest="from_stage", choices=STAGES,
                          help="re-run from this stage (invalidates it and later stages)")

    for p in (p_new, p_resume):
        p.add_argument("--until", choices=STAGES, help="stop after this stage")
        p.add_argument("--yes", action="store_true",
                       help="skip the script review gate (not recommended)")

    p_approve = sub.add_parser("approve", help="approve the script after reviewing/editing it")
    p_approve.add_argument("slug")

    p_status = sub.add_parser("status", help="show a project's stage states")
    p_status.add_argument("slug")

    sub.add_parser("list", help="list all projects")

    args = parser.parse_args()
    config = load_config()
    workdir = config.workdir
    workdir.mkdir(parents=True, exist_ok=True)

    if args.command == "new":
        manifest = Manifest.create(workdir, args.topic, args.slug, args.dry_run)
        print(f"Created project '{manifest.slug}' in {manifest.project_dir}")
        if args.script_file:
            script.install_manual_script(manifest, args.script_file)
            print("[script] installed from file (review gate satisfied)")
        orchestrate(manifest, config, args.until, args.yes)

    elif args.command == "resume":
        manifest = Manifest.load(workdir, args.slug)
        if args.from_stage:
            manifest.invalidate_from(args.from_stage)
            print(f"Invalidated '{args.from_stage}' and later stages.")
        orchestrate(manifest, config, args.until, args.yes)

    elif args.command == "approve":
        manifest = Manifest.load(workdir, args.slug)
        if manifest.status("script") != "done":
            raise SystemExit("Script stage hasn't completed yet.")
        # Re-derive title/description/tags in case the human edited script.json.
        from stages.script import load_script
        edited = load_script({"project_dir": manifest.project_dir})
        manifest.data["meta"] = {
            "title": edited.get("title", manifest.topic),
            "description": edited.get("description", ""),
            "tags": edited.get("tags", []),
        }
        outputs = manifest.outputs("script")
        outputs["approved"] = True
        outputs["scene_count"] = len(edited["scenes"])
        manifest.mark_done("script", outputs)
        print(f"Script approved. Continue with:  python run.py resume {manifest.slug}")

    elif args.command == "status":
        manifest = Manifest.load(workdir, args.slug)
        print(f"{manifest.slug}  ({'dry run' if manifest.dry_run else 'live'})")
        print(f"topic: {manifest.topic}")
        for stage in STAGES:
            entry = manifest.data["stages"][stage]
            line = f"  {stage:10s} {entry['status']}"
            if entry.get("error"):
                line += f"  ({entry['error'][:80]})"
            print(line)

    elif args.command == "list":
        projects = sorted(p for p in workdir.iterdir() if (p / "manifest.json").exists()) \
            if workdir.exists() else []
        if not projects:
            print("No projects yet. Start one with:  python run.py new \"Your topic\"")
        for project in projects:
            manifest = Manifest.load(workdir, project.name)
            done = sum(1 for s in STAGES if manifest.status(s) == "done")
            print(f"  {manifest.slug:40s} {done}/{len(STAGES)} stages done")


if __name__ == "__main__":
    main()
