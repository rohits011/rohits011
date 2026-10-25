"""Stock footage providers. Pexels is free (200 req/hr, 20K/mo) with attribution optional."""

import subprocess
from pathlib import Path

import requests

from core.config import env


class VisualsProvider:
    def fetch_clip(self, keywords: str, out_path: Path, width: int, height: int) -> None:
        raise NotImplementedError


class PexelsVisuals(VisualsProvider):
    def fetch_clip(self, keywords: str, out_path: Path, width: int, height: int) -> None:
        orientation = "landscape" if width >= height else "portrait"
        response = requests.get(
            "https://api.pexels.com/videos/search",
            headers={"Authorization": env("PEXELS_API_KEY")},
            params={"query": keywords, "per_page": 5, "orientation": orientation},
            timeout=60,
        )
        response.raise_for_status()
        videos = response.json().get("videos", [])
        if not videos:
            raise RuntimeError(f"Pexels returned no results for '{keywords}'")

        # Pick the file whose resolution is closest to (but at least) the target.
        best_url, best_score = None, None
        for video in videos:
            for f in video.get("video_files", []):
                w, h = f.get("width") or 0, f.get("height") or 0
                if w < width or h < height:
                    continue
                score = (w - width) + (h - height)
                if best_score is None or score < best_score:
                    best_url, best_score = f["link"], score
        if best_url is None:  # nothing at target res; take the largest available
            largest = max(
                (f for v in videos for f in v.get("video_files", [])),
                key=lambda f: (f.get("width") or 0) * (f.get("height") or 0),
            )
            best_url = largest["link"]

        with requests.get(best_url, stream=True, timeout=300) as download:
            download.raise_for_status()
            with open(out_path, "wb") as out:
                for chunk in download.iter_content(chunk_size=1 << 20):
                    out.write(chunk)


class DryRunVisuals(VisualsProvider):
    """Generates ffmpeg test-pattern clips so --dry-run needs no API key."""

    def fetch_clip(self, keywords: str, out_path: Path, width: int, height: int) -> None:
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error",
             "-f", "lavfi", "-i", f"testsrc2=size={width}x{height}:rate=30",
             "-t", "10", "-c:v", "libx264", "-preset", "veryfast",
             "-pix_fmt", "yuv420p", str(out_path)],
            check=True,
        )


def make_visuals(config, dry_run: bool) -> VisualsProvider:
    if dry_run:
        return DryRunVisuals()
    provider = config.get("visuals.provider", "pexels")
    if provider == "pexels":
        return PexelsVisuals()
    raise RuntimeError(f"Unknown visuals.provider '{provider}' in config.yaml")
