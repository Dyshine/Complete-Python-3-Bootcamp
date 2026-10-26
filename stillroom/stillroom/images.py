"""Import still images - your own screenshots, stills from an archive - as a film's shots.

Each picture gets the same treatment as a frame cut from video: black bars are
trimmed, then palette / exposure analysis, full-text indexing and (via the
embed step) CLIP picture search. Importing the same file twice is a no-op.
"""

import hashlib
import io
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

from . import analyze, db, metadata, video

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff", ".gif"}


def find_images(path):
    p = Path(path)
    if p.is_file():
        return [p] if p.suffix.lower() in IMAGE_EXTENSIONS else []
    return sorted(f for f in p.rglob("*") if f.suffix.lower() in IMAGE_EXTENSIONS and not f.name.startswith("."))


def group_by_folder(path):
    """{folder: [images]} - a folder of folders is one film per sub-folder."""
    groups = {}
    for f in find_images(path):
        groups.setdefault(f.parent, []).append(f)
    return groups


def trim_borders(img, threshold=20, min_bar=0.015):
    """Remove black letterbox / pillarbox bars (common in player screenshots)."""
    luma = np.asarray(img.convert("L"), dtype=np.float32)
    # A bar is black almost everywhere; a dark part of the picture still has
    # some brighter pixels, so test the 99th percentile rather than the mean.
    rows = np.where(np.percentile(luma, 99, axis=1) > threshold)[0]
    cols = np.where(np.percentile(luma, 99, axis=0) > threshold)[0]
    if rows.size == 0 or cols.size == 0:
        return img  # an all-black frame: keep as is
    top, bottom = int(rows[0]), int(rows[-1]) + 1
    left, right = int(cols[0]), int(cols[-1]) + 1
    h, w = luma.shape
    # Only trim real bars, and never leave a sliver of the picture.
    if top < h * min_bar:
        top = 0
    if h - bottom < h * min_bar:
        bottom = h
    if left < w * min_bar:
        left = 0
    if w - right < w * min_bar:
        right = w
    if (bottom - top) * (right - left) < 0.4 * h * w:
        return img
    return img.crop((left, top, right, bottom)) if (top, left, bottom, right) != (0, 0, h, w) else img


def import_images(lib, conn, items, meta, log=print, progress=None, max_width=1920, thumb_width=640):
    """Add pictures to the film described by `meta` (title, year, ...).

    items: iterable of (file name, bytes). Pictures are appended if the film
    already exists. Returns (film_id, added, skipped).
    """
    title = (meta.get("title") or "").strip() or "My screenshots"
    year = meta.get("year")
    slug = metadata.slugify(f"{title} {year or ''}")
    film = conn.execute("SELECT id FROM films WHERE slug = ?", (slug,)).fetchone()
    if film:
        film_id = film["id"]
    else:
        film_id = db.upsert_film(conn, {
            "slug": slug, "title": title, "year": year,
            "director": meta.get("director"), "cinematographer": meta.get("cinematographer"),
            "genres": meta.get("genres") or [], "license": meta.get("license") or "Your own screenshots",
            "source": "images",
        })
    known = {r["content_hash"] for r in conn.execute(
        "SELECT content_hash FROM shots WHERE film_id = ? AND content_hash IS NOT NULL", (film_id,))}
    next_idx = (conn.execute("SELECT MAX(idx) FROM shots WHERE film_id = ?", (film_id,)).fetchone()[0] or 0) + 1
    frame_dir, thumb_dir = lib.frames / slug, lib.thumbs / slug
    frame_dir.mkdir(parents=True, exist_ok=True)
    thumb_dir.mkdir(parents=True, exist_ok=True)

    items = list(items)
    added = skipped = 0
    aspects = []
    for n, (name, data) in enumerate(items, 1):
        digest = hashlib.sha1(data).hexdigest()
        if digest in known:
            skipped += 1
            continue
        try:
            img = Image.open(io.BytesIO(data))
            img = ImageOps.exif_transpose(img).convert("RGB")
        except Exception as e:
            log(f"  {name}: not a readable image ({e})")
            skipped += 1
            continue
        img = trim_borders(img)
        if img.width > max_width:
            img = img.resize((max_width, round(img.height * max_width / img.width)), Image.LANCZOS)
        fname = f"{next_idx:05d}.jpg"
        img.save(frame_dir / fname, quality=90, optimize=True)
        tw = min(thumb_width, img.width)
        img.resize((tw, max(1, round(img.height * tw / img.width))), Image.LANCZOS).save(
            thumb_dir / fname, quality=82, optimize=True)
        stats = analyze.analyze(img)
        aspect = video.snap_ratio(img.width / img.height)
        aspects.append(aspect)
        db.insert_shot(conn, {
            "film_id": film_id, "idx": next_idx, "t_start": 0.0, "t_end": 0.0, "frame_time": 0.0,
            "image": f"frames/{slug}/{fname}", "thumb": f"thumbs/{slug}/{fname}",
            "width": img.width, "height": img.height,
            "description": analyze.heuristic_description(stats, aspect), "describer": "heuristic",
            "origin": "image", "content_hash": digest, **stats,
        })
        known.add(digest)
        next_idx += 1
        added += 1
        if progress:
            progress("importing", n / len(items))
    if aspects and not film:
        conn.execute("UPDATE films SET aspect_ratio = ? WHERE id = ?",
                     (max(set(aspects), key=aspects.count), film_id))
    conn.commit()
    log(f"{title}: added {added} picture(s)" + (f", skipped {skipped} (duplicates or unreadable)" if skipped else ""))
    return film_id, added, skipped
