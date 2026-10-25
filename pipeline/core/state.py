"""Per-video checkpoint manifest.

Every stage records its status and outputs in videos/<slug>/manifest.json.
A resumed run skips stages already marked done, so a failure in render never
re-bills the LLM or TTS calls that already succeeded.
"""

import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

STAGES = ["script", "voiceover", "assets", "render", "thumbnail", "upload"]


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text[:60] or "video"


class Manifest:
    def __init__(self, project_dir: Path, data: dict):
        self.project_dir = project_dir
        self.data = data

    # ---- lifecycle -------------------------------------------------

    @classmethod
    def create(cls, workdir: Path, topic: str, slug: str | None, dry_run: bool) -> "Manifest":
        slug = slug or slugify(topic)
        project_dir = workdir / slug
        if project_dir.exists():
            raise RuntimeError(
                f"Project '{slug}' already exists at {project_dir}. "
                f"Use 'resume {slug}' or pick another --slug."
            )
        project_dir.mkdir(parents=True)
        data = {
            "slug": slug,
            "topic": topic,
            "dry_run": dry_run,
            "created_at": _now(),
            "stages": {name: {"status": "pending"} for name in STAGES},
            "meta": {},
        }
        manifest = cls(project_dir, data)
        manifest.save()
        return manifest

    @classmethod
    def load(cls, workdir: Path, slug: str) -> "Manifest":
        path = workdir / slug / "manifest.json"
        if not path.exists():
            raise RuntimeError(f"No project '{slug}' found (expected {path}).")
        with open(path) as f:
            return cls(path.parent, json.load(f))

    def save(self):
        with open(self.project_dir / "manifest.json", "w") as f:
            json.dump(self.data, f, indent=2)

    # ---- stage bookkeeping -----------------------------------------

    def status(self, stage: str) -> str:
        return self.data["stages"][stage]["status"]

    def outputs(self, stage: str) -> dict:
        return self.data["stages"][stage].get("outputs", {})

    def mark_running(self, stage: str):
        self.data["stages"][stage] = {"status": "running", "started_at": _now()}
        self.save()

    def mark_done(self, stage: str, outputs: dict | None = None):
        entry = self.data["stages"][stage]
        entry["status"] = "done"
        entry["completed_at"] = _now()
        if outputs:
            entry["outputs"] = outputs
        self.save()

    def mark_failed(self, stage: str, error: str):
        entry = self.data["stages"][stage]
        entry["status"] = "failed"
        entry["error"] = error
        self.save()

    def invalidate_from(self, stage: str):
        """Reset a stage and everything after it (e.g. after editing the script)."""
        for name in STAGES[STAGES.index(stage):]:
            self.data["stages"][name] = {"status": "pending"}
        self.save()

    @property
    def slug(self) -> str:
        return self.data["slug"]

    @property
    def topic(self) -> str:
        return self.data["topic"]

    @property
    def dry_run(self) -> bool:
        return self.data.get("dry_run", False)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")
