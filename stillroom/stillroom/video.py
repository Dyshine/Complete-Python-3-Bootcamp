"""Everything that touches the video file: probing, letterbox detection,
shot-boundary detection and frame grabbing. Uses the ffmpeg/ffprobe binaries;
PySceneDetect is used instead of ffmpeg's scene filter when it is installed
and requested."""

import io
import json
import re
import shutil
import subprocess
import threading
from dataclasses import dataclass

from PIL import Image

COMMON_RATIOS = [1.19, 1.33, 1.37, 1.43, 1.5, 1.66, 1.75, 1.78, 1.85, 2.0, 2.2, 2.35, 2.39, 2.55, 2.76]


class FFmpegMissing(RuntimeError):
    pass


def require_ffmpeg():
    for tool in ("ffmpeg", "ffprobe"):
        if shutil.which(tool) is None:
            raise FFmpegMissing(
                f"'{tool}' was not found on PATH. Install FFmpeg (https://ffmpeg.org/download.html, "
                "or `brew install ffmpeg` / `sudo apt install ffmpeg` / `winget install ffmpeg`)."
            )


@dataclass
class VideoInfo:
    path: str
    duration: float
    width: int
    height: int
    sar: float  # sample (pixel) aspect ratio; 1.0 for square pixels
    fps: float

    @property
    def display_width(self):
        return int(round(self.width * self.sar))


def _ratio(text, default=1.0):
    if not text or text in ("N/A", "0:1", "0/1"):
        return default
    m = re.match(r"^(\d+)[:/](\d+)$", text)
    if not m or int(m.group(2)) == 0:
        return default
    return int(m.group(1)) / int(m.group(2))


def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height,sample_aspect_ratio,avg_frame_rate,r_frame_rate:format=duration",
         "-of", "json", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout
    data = json.loads(out)
    if not data.get("streams"):
        raise ValueError(f"No video stream in {path}")
    s = data["streams"][0]
    duration = float(data.get("format", {}).get("duration") or 0)
    fps = _ratio(s.get("avg_frame_rate"), 0) or _ratio(s.get("r_frame_rate"), 24.0)
    return VideoInfo(
        path=str(path), duration=duration, width=int(s["width"]), height=int(s["height"]),
        sar=_ratio(s.get("sample_aspect_ratio")), fps=fps,
    )


def snap_ratio(ratio, tolerance=0.025):
    best = min(COMMON_RATIOS, key=lambda r: abs(r - ratio))
    return best if abs(best - ratio) / best <= tolerance else round(ratio, 2)


# ---------------------------------------------------------------- letterbox

_CROP_RE = re.compile(r"crop=(\d+):(\d+):(\d+):(\d+)")


def detect_crop(info, samples=12):
    """Find black bars by running cropdetect at several points of the film.

    Dark scenes make cropdetect over-crop, so the union of all detected
    rectangles is used. Returns (w, h, x, y) or None if nothing to crop.
    """
    rects = []
    usable = info.duration * 0.8
    for i in range(samples):
        t = info.duration * 0.1 + usable * (i + 0.5) / samples
        proc = subprocess.run(
            ["ffmpeg", "-hide_banner", "-nostats", "-ss", f"{t:.2f}", "-i", info.path,
             "-frames:v", "8", "-vf", "cropdetect=limit=24:round=2:reset=0", "-an", "-f", "null", "-"],
            capture_output=True, text=True,
        )
        found = _CROP_RE.findall(proc.stderr)
        if found:
            rects.append(tuple(int(v) for v in found[-1]))
    if not rects:
        return None
    # Ignore samples that are almost entirely black (cropdetect returns tiny boxes).
    rects = [r for r in rects if r[0] > info.width * 0.3 and r[1] > info.height * 0.3] or rects
    x0 = min(r[2] for r in rects)
    y0 = min(r[3] for r in rects)
    x1 = max(r[2] + r[0] for r in rects)
    y1 = max(r[3] + r[1] for r in rects)
    w, h = x1 - x0, y1 - y0
    # Only crop when the bars are meaningful (> 1.5% of the frame each side).
    if w >= info.width * 0.97 and h >= info.height * 0.97:
        return None
    if w < info.width * 0.97 and h >= info.height * 0.97:
        y0, h = 0, info.height
    if h < info.height * 0.97 and w >= info.width * 0.97:
        x0, w = 0, info.width
    return (w - w % 2, h - h % 2, x0, y0)


def active_aspect(info, crop):
    w, h = (crop[0], crop[1]) if crop else (info.width, info.height)
    return snap_ratio(w * info.sar / h)


def picture_filter(info, crop):
    """ffmpeg filter chain that removes black bars and squares the pixels."""
    parts = []
    if crop:
        parts.append("crop={}:{}:{}:{}".format(*crop))
    if abs(info.sar - 1.0) > 0.01:
        parts.append("scale=trunc(iw*sar/2)*2:ih,setsar=1")
    return ",".join(parts)


# ---------------------------------------------------------------- shot detection

_PTS_RE = re.compile(r"pts_time:([0-9.]+)")
_SCORE_RE = re.compile(r"lavfi\.scene_score=([0-9.]+)")
_PROGRESS_RE = re.compile(r"out_time_us=(\d+)")


def pick_cuts(times, scores, threshold=0.3, floor=0.12, ratio=2.5, window=12):
    """Choose cuts from per-frame scene scores.

    A frame is a cut when its score clears `threshold`, or when it clears
    `floor` and is `ratio` times higher than every other score around it. The
    second rule catches cuts between shots of similar brightness without
    firing on motion. Comparing against the neighbours' maximum (not their
    mean) matters for telecined video: 3:2 pulldown repeats frames, so a camera
    move produces a spike every fifth frame, separated by near-zero scores.
    """
    cuts = []
    n = len(scores)
    for i, s in enumerate(scores):
        if s < floor:
            continue
        if s >= threshold:
            cuts.append(times[i])
            continue
        lo, hi = max(0, i - window), min(n, i + window + 1)
        neighbours = scores[lo:i] + scores[i + 1:hi]
        if s >= ratio * max(neighbours, default=0.0) + 0.02:
            cuts.append(times[i])
    return cuts


def detect_cuts_ffmpeg(info, crop, threshold=0.3, progress=None):
    """Return sorted cut timestamps using ffmpeg's per-frame scene-change score."""
    chain = picture_filter(info, crop)
    vf = (chain + "," if chain else "") + (
        "scale=320:-2,select='gte(scene,0)',metadata=print:key=lavfi.scene_score")
    proc = subprocess.Popen(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", info.path, "-an", "-sn", "-vf", vf,
         "-f", "null", "-", "-progress", "pipe:1"],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors="replace",
    )
    times, scores = [], []

    def read_stderr():
        pending = None
        for line in proc.stderr:
            m = _PTS_RE.search(line)
            if m:
                pending = float(m.group(1))
                continue
            m = _SCORE_RE.search(line)
            if m and pending is not None:
                times.append(pending)
                scores.append(float(m.group(1)))
                pending = None

    t = threading.Thread(target=read_stderr, daemon=True)
    t.start()
    for line in proc.stdout:
        m = _PROGRESS_RE.search(line)
        if m and progress and info.duration:
            progress(min(1.0, int(m.group(1)) / 1e6 / info.duration))
    proc.wait()
    t.join()
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg scene detection failed for {info.path}")
    if progress:
        progress(1.0)
    return sorted(pick_cuts(times, scores, threshold))


def detect_cuts_pyscenedetect(info, threshold=27.0):
    from scenedetect import ContentDetector, detect  # optional dependency

    scenes = detect(info.path, ContentDetector(threshold=threshold))
    return [start.get_seconds() for start, _ in scenes[1:]]


def cuts_to_shots(cuts, duration, min_len=0.6, max_len=20.0, skip_head=0.0, skip_tail=0.0):
    """Turn cut timestamps into (start, end) shots, merging tiny ones and
    splitting long takes."""
    bounds = [0.0] + [c for c in cuts if 0 < c < duration] + [duration]
    merged = [bounds[0]]
    for b in bounds[1:]:
        if b - merged[-1] < min_len and b != duration:
            continue
        if b == duration and len(merged) > 1 and b - merged[-1] < min_len:
            merged[-1] = b
            continue
        merged.append(b)
    shots = []
    end_limit = duration - skip_tail
    for a, b in zip(merged, merged[1:]):
        if b <= skip_head or a >= end_limit:
            continue
        a, b = max(a, skip_head), min(b, end_limit)
        if b - a < min_len * 0.5:
            continue
        parts = max(1, int((b - a) // max_len) + (1 if (b - a) % max_len > max_len * 0.25 else 0))
        step = (b - a) / parts
        for i in range(parts):
            shots.append((a + i * step, a + (i + 1) * step))
    return shots


# ---------------------------------------------------------------- frames

def grab_frame(info, t, crop=None):
    """Decode a single frame at time t (seconds) and return a PIL image."""
    chain = picture_filter(info, crop)
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", f"{max(0.0, t):.3f}", "-i", info.path,
           "-frames:v", "1", "-an", "-sn"]
    if chain:
        cmd += ["-vf", chain]
    cmd += ["-f", "image2pipe", "-c:v", "png", "-"]
    data = subprocess.run(cmd, capture_output=True, check=True).stdout
    if not data:
        raise RuntimeError(f"No frame decoded at {t:.2f}s")
    img = Image.open(io.BytesIO(data))
    img.load()
    return img.convert("RGB")


def sharpness(img):
    """Variance of a Laplacian-ish high-pass, used to pick the crispest candidate."""
    import numpy as np

    g = np.asarray(img.convert("L").resize((256, max(1, int(256 * img.height / img.width)))), dtype=np.float32)
    lap = g[1:-1, 1:-1] * 4 - g[:-2, 1:-1] - g[2:, 1:-1] - g[1:-1, :-2] - g[1:-1, 2:]
    return float(lap.var())


def best_frame(info, start, end, crop=None, candidates=3):
    """Grab a few frames from the middle of a shot and keep the sharpest one
    (avoids motion blur and the first/last frames of dissolves)."""
    length = end - start
    if candidates <= 1 or length < 1.0:
        t = start + length / 2
        return t, grab_frame(info, t, crop)
    times = [start + length * f for f in (0.35, 0.5, 0.65)[:candidates]]
    frames = [(t, grab_frame(info, t, crop)) for t in times]
    scored = [(sharpness(img), t, img) for t, img in frames]
    _, t, img = max(scored, key=lambda s: s[0])
    return t, img
