"""Paths and tunable defaults."""

import json
import os
from dataclasses import dataclass
from pathlib import Path

DEFAULT_LIBRARY = Path(os.environ.get("STILLROOM_LIBRARY", Path.cwd() / "library"))

_FROM_SETTINGS = set()  # environment variables filled in from settings.json

VIDEO_EXTENSIONS = {
    ".mp4", ".m4v", ".mkv", ".mov", ".avi", ".webm", ".mpg", ".mpeg", ".ts", ".m2ts", ".wmv", ".ogv",
}


@dataclass
class IngestSettings:
    scene_threshold: float = 0.30   # ffmpeg scene-change score that counts as a cut (0-1)
    min_shot_seconds: float = 0.6   # cuts closer together than this are merged
    max_shot_seconds: float = 20.0  # long takes are split so each part gets its own still
    skip_head_seconds: float = 0.0  # skip studio logos / opening titles
    skip_tail_seconds: float = 0.0  # skip end credits
    frame_max_width: int = 1920
    thumb_width: int = 640
    workers: int = max(2, (os.cpu_count() or 4))


class Library:
    """Filesystem layout of a library directory."""

    def __init__(self, root=None):
        self.root = Path(root or DEFAULT_LIBRARY).expanduser().resolve()
        self.db_path = self.root / "stillroom.db"
        self.frames = self.root / "frames"
        self.thumbs = self.root / "thumbs"
        self.downloads = self.root / "downloads"
        self.uploads = self.root / "uploads"
        self.settings_path = self.root / "settings.json"

    def ensure(self):
        for p in (self.root, self.frames, self.thumbs):
            p.mkdir(parents=True, exist_ok=True)
        return self

    # ------------------------------------------------------------ settings

    def load_settings(self):
        try:
            with open(self.settings_path, encoding="utf-8") as f:
                return json.load(f)
        except (OSError, ValueError):
            return {}

    def save_settings(self, **changes):
        settings = {**self.load_settings(), **changes}
        settings = {k: v for k, v in settings.items() if v not in (None, "")}
        self.root.mkdir(parents=True, exist_ok=True)
        with open(self.settings_path, "w", encoding="utf-8") as f:
            json.dump(settings, f, indent=2)
        self.apply_settings()
        return settings

    def apply_settings(self):
        """Expose saved keys (e.g. a TMDB key typed into the web UI) to the code
        that reads them from the environment; real environment variables win."""
        settings = self.load_settings()
        for key, env in (("tmdb_api_key", "TMDB_API_KEY"),):
            value = settings.get(key)
            if os.environ.get(env) and env not in _FROM_SETTINGS:
                continue  # set by the user's shell
            if value:
                os.environ[env] = value
                _FROM_SETTINGS.add(env)
            elif env in _FROM_SETTINGS:
                os.environ.pop(env, None)
                _FROM_SETTINGS.discard(env)
