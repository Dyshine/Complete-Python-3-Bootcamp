"""Paths and tunable defaults."""

import os
from dataclasses import dataclass
from pathlib import Path

DEFAULT_LIBRARY = Path(os.environ.get("STILLROOM_LIBRARY", Path.cwd() / "library"))

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

    def ensure(self):
        for p in (self.root, self.frames, self.thumbs):
            p.mkdir(parents=True, exist_ok=True)
        return self
