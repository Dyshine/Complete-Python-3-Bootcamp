"""Turn a video file into rows in the library: one still per shot."""

import shutil
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image

from . import analyze, db, metadata, video
from .config import VIDEO_EXTENSIONS, IngestSettings


def find_videos(path):
    p = Path(path)
    if p.is_file():
        return [p]
    return sorted(f for f in p.rglob("*") if f.suffix.lower() in VIDEO_EXTENSIONS and not f.name.startswith("."))


class Progress:
    """Progress bar on stderr; also reports (label, fraction) to `notify`
    (the web UI's job list uses that)."""

    def __init__(self, label, total=1.0, notify=None):
        self.label, self.total, self.last, self.notify = label, total, 0.0, notify
        self.tty = sys.stderr.isatty()

    def __call__(self, done):
        frac = done / self.total if self.total else 1.0
        if self.notify:
            self.notify(self.label, frac)
        now = time.monotonic()
        if frac < 1.0 and now - self.last < (0.2 if self.tty else 10):
            return
        self.last = now
        bar = "#" * int(frac * 30)
        line = f"  {self.label:<18} [{bar:<30}] {frac * 100:5.1f}%"
        print(("\r" + line) if self.tty else line, end="" if self.tty else "\n", file=sys.stderr, flush=True)
        if frac >= 1.0 and self.tty:
            print(file=sys.stderr)


def film_metadata(path, overrides=None, use_tmdb=False, log=print):
    meta = metadata.parse_filename(path)
    meta.update(metadata.read_sidecar(path))
    if use_tmdb:
        if metadata.tmdb_available():
            try:
                found = metadata.tmdb_lookup(meta["title"], meta.get("year"))
                if found:
                    log(f"  TMDb: {found['title']} ({found.get('year')}) - dir. {found.get('director')}")
                    meta.update({k: v for k, v in found.items() if v})
                else:
                    log("  TMDb: no match")
            except Exception as e:  # network trouble must not stop an ingest
                log(f"  TMDb lookup failed: {e}")
        else:
            log("  TMDb skipped: set TMDB_API_KEY or TMDB_TOKEN")
    meta.update({k: v for k, v in (overrides or {}).items() if v})
    return meta


def remove_film_files(lib, slug):
    for base in (lib.frames, lib.thumbs):
        shutil.rmtree(base / slug, ignore_errors=True)


def ingest_file(lib, conn, path, settings=None, overrides=None, detector="ffmpeg",
                use_tmdb=False, replace=False, candidates=3, log=print, progress=None):
    """Ingest one video. Returns the film id (or None if skipped).

    progress, if given, is called as progress(stage_label, fraction).
    """
    settings = settings or IngestSettings()
    path = Path(path).resolve()
    video.require_ffmpeg()
    meta = film_metadata(path, overrides, use_tmdb, log)
    slug = metadata.slugify(f"{meta['title']} {meta.get('year') or ''}")

    existing = conn.execute("SELECT id FROM films WHERE slug = ?", (slug,)).fetchone()
    if existing:
        n = conn.execute("SELECT COUNT(*) FROM shots WHERE film_id = ?", (existing["id"],)).fetchone()[0]
        if n and not replace:
            log(f"Skipping {meta['title']}: already in library with {n} shots (use --replace to redo)")
            return None
        db.delete_film(conn, existing["id"])
        remove_film_files(lib, slug)

    log(f"Ingesting {meta['title']} ({meta.get('year') or 'year unknown'}) from {path.name}")
    info = video.probe(path)
    crop = video.detect_crop(info)
    aspect = video.active_aspect(info, crop)
    log(f"  {info.width}x{info.height}, {info.duration / 60:.1f} min, active picture {aspect}:1"
        + (f" (cropping bars: crop={crop[0]}:{crop[1]}:{crop[2]}:{crop[3]})" if crop else ""))

    if detector == "pyscenedetect":
        log("  Detecting cuts with PySceneDetect...")
        cuts = video.detect_cuts_pyscenedetect(info)
    else:
        cuts = video.detect_cuts_ffmpeg(info, crop, settings.scene_threshold,
                                        Progress("finding cuts", notify=progress))
    shots = video.cuts_to_shots(
        cuts, info.duration, settings.min_shot_seconds, settings.max_shot_seconds,
        settings.skip_head_seconds, settings.skip_tail_seconds,
    )
    log(f"  {len(cuts)} cuts -> {len(shots)} shots")

    film_id = db.upsert_film(conn, {
        "slug": slug,
        "title": meta["title"],
        "year": meta.get("year"),
        "director": meta.get("director"),
        "cinematographer": meta.get("cinematographer"),
        "genres": meta.get("genres") or [],
        "overview": meta.get("overview"),
        "license": meta.get("license"),
        "tmdb_id": meta.get("tmdb_id"),
        "source_path": str(path),
        "duration": info.duration,
        "width": info.display_width,
        "height": info.height,
        "aspect_ratio": aspect,
        "crop": "{}:{}:{}:{}".format(*crop) if crop else None,
    })
    conn.commit()

    frame_dir = lib.frames / slug
    thumb_dir = lib.thumbs / slug
    frame_dir.mkdir(parents=True, exist_ok=True)
    thumb_dir.mkdir(parents=True, exist_ok=True)

    def process(i, start, end):
        t, img = video.best_frame(info, start, end, crop, candidates)
        if img.width > settings.frame_max_width:
            img = img.resize((settings.frame_max_width, round(img.height * settings.frame_max_width / img.width)),
                             Image.LANCZOS)
        name = f"{i:05d}.jpg"
        img.save(frame_dir / name, quality=90, optimize=True)
        tw = min(settings.thumb_width, img.width)
        thumb = img.resize((tw, max(1, round(img.height * tw / img.width))), Image.LANCZOS)
        thumb.save(thumb_dir / name, quality=82, optimize=True)
        stats = analyze.analyze(img)
        return {
            "film_id": film_id, "idx": i, "t_start": round(start, 3), "t_end": round(end, 3),
            "frame_time": round(t, 3),
            "image": f"frames/{slug}/{name}", "thumb": f"thumbs/{slug}/{name}",
            "width": img.width, "height": img.height,
            "description": analyze.heuristic_description(stats, aspect),
            "describer": "heuristic",
            **stats,
        }

    bar = Progress("grabbing stills", len(shots), notify=progress)
    done = failed = 0
    last_commit = time.monotonic()
    with ThreadPoolExecutor(max_workers=settings.workers) as pool:
        futures = [pool.submit(process, i + 1, a, b) for i, (a, b) in enumerate(shots)]
        for fut in as_completed(futures):
            try:
                db.insert_shot(conn, fut.result())
            except Exception as e:
                failed += 1
                log(f"\n  frame failed: {e}")
            done += 1
            bar(done)
            # Commit often so the web UI (saving to boards etc.) never waits on the write lock.
            if time.monotonic() - last_commit > 1.0:
                conn.commit()
                last_commit = time.monotonic()
    conn.commit()
    log(f"  Saved {done - failed} stills" + (f" ({failed} failed)" if failed else ""))
    return film_id
