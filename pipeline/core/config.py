"""Load config.yaml + .env into a single config object."""

import os
from pathlib import Path

import yaml

try:
    from dotenv import load_dotenv
except ImportError:  # dotenv is optional; env vars may be set directly
    load_dotenv = None

PIPELINE_ROOT = Path(__file__).resolve().parent.parent


class Config:
    def __init__(self, data: dict):
        self._data = data

    def get(self, dotted_key: str, default=None):
        """Config lookup with dotted keys, e.g. cfg.get('video.width')."""
        node = self._data
        for part in dotted_key.split("."):
            if not isinstance(node, dict) or part not in node:
                return default
            node = node[part]
        return node

    @property
    def workdir(self) -> Path:
        path = Path(self.get("paths.workdir", "videos"))
        if not path.is_absolute():
            path = PIPELINE_ROOT / path
        return path


def load_config(config_path: Path | None = None) -> Config:
    if load_dotenv is not None:
        load_dotenv(PIPELINE_ROOT / ".env")
    path = config_path or PIPELINE_ROOT / "config.yaml"
    with open(path) as f:
        return Config(yaml.safe_load(f))


def env(name: str) -> str:
    """Fetch a required environment variable with a helpful error."""
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(
            f"Missing environment variable {name}. "
            f"Copy pipeline/.env.example to pipeline/.env and fill it in."
        )
    return value
