"""Import official stills ("backdrops") for any film from The Movie Database.

You do not need the movie file: TMDB hosts stills that studios and fans have
uploaded for nearly every film. Textless backdrops (no title text) are mostly
frames and production stills, which suits a reference library.

Needs a free TMDB API key (TMDB_API_KEY) or read access token (TMDB_TOKEN):
https://www.themoviedb.org/settings/api. TMDB's API terms allow this for
personal, non-commercial use only, and this module follows them:
- the UI's About box shows TMDB's required notice;
- stills are stored exactly as TMDB serves them (the thumbnail is TMDB's own
  smaller size, not a resized copy);
- nothing from TMDB is kept longer than 6 months (`tmdb --refresh-expired`
  re-downloads, `tmdb --purge` deletes everything that came from TMDB).
"""

import io
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

from PIL import Image

from . import analyze, db, metadata

IMAGE_BASE = "https://image.tmdb.org/t/p/"
ATTRIBUTION = ("This application uses TMDB and the TMDB APIs but is not endorsed, certified, "
               "or otherwise approved by TMDB.")
LICENSE = "Stills from TMDB (themoviedb.org), for personal, non-commercial use"
MAX_CACHE_DAYS = 180   # TMDB API terms: no caching for longer than 6 months


def _get(endpoint, params=None):
    time.sleep(0.03)  # stay far below TMDB's rate limit
    return metadata._tmdb_get(endpoint, params or {})


def movie_details(movie_id):
    """Details, credits and textless backdrops for one movie."""
    movie = _get(f"/movie/{movie_id}", {"append_to_response": "credits,images",
                                        "include_image_language": "null"})
    if not (movie.get("images") or {}).get("backdrops"):
        # Some films only have backdrops tagged with a language; take English ones.
        images = _get(f"/movie/{movie_id}/images", {"include_image_language": "en,null"})
        movie["images"] = images
    return movie


def search_movie(title, year=None):
    params = {"query": title, "include_adult": "false"}
    if year:
        params["year"] = year
    results = _get("/search/movie", params).get("results") or []
    if not results and year:
        results = _get("/search/movie", {"query": title, "include_adult": "false"}).get("results") or []
    return results[0]["id"] if results else None


def list_movies(kind, count):
    """Movie ids from a TMDB list: top_rated, popular, now_playing, upcoming."""
    ids, page = [], 1
    while len(ids) < count:
        data = _get(f"/movie/{kind}", {"page": page})
        ids += [m["id"] for m in data.get("results") or []]
        if page >= (data.get("total_pages") or 1):
            break
        page += 1
    return ids[:count]


def director_movies(name):
    people = _get("/search/person", {"query": name}).get("results") or []
    if not people:
        return []
    credits = _get(f"/person/{people[0]['id']}/movie_credits")
    films = [c for c in credits.get("crew") or [] if c.get("job") in ("Director", "Director of Photography")]
    films.sort(key=lambda c: c.get("release_date") or "")
    return list(dict.fromkeys(c["id"] for c in films))


def _crew(movie, job):
    names = [c["name"] for c in (movie.get("credits") or {}).get("crew") or [] if c.get("job") == job]
    return ", ".join(dict.fromkeys(names)) or None


def pick_backdrops(movie, limit):
    shots = (movie.get("images") or {}).get("backdrops") or []
    shots = [b for b in shots if (b.get("width") or 0) >= 1000]
    shots.sort(key=lambda b: (-(b.get("vote_count") or 0), -(b.get("vote_average") or 0), -(b.get("width") or 0)))
    return shots[:limit]


def _download(url):
    req = urllib.request.Request(url, headers={"User-Agent": "stillroom/0.1"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


def import_movie(lib, conn, movie_id, limit=40, size="w1280", thumb_size="w780", replace=False, log=print):
    """Download up to `limit` stills for one movie. Returns the film id or None."""
    movie = movie_details(movie_id)
    title = movie.get("title") or movie.get("original_title") or f"TMDB {movie_id}"
    release = movie.get("release_date") or ""
    year = int(release[:4]) if release[:4].isdigit() else None
    slug = metadata.slugify(f"{title} {year or ''}")

    existing = conn.execute("SELECT id, source FROM films WHERE slug = ?", (slug,)).fetchone()
    if existing:
        if existing["source"] != "tmdb":
            log(f"Skipping {title}: already ingested from the video file (real frames beat stills)")
            return None
        if not replace:
            log(f"Skipping {title}: already imported (use --replace to refresh)")
            return None
        db.delete_film(conn, existing["id"])

    backdrops = pick_backdrops(movie, limit)
    if not backdrops:
        log(f"Skipping {title}: TMDB has no usable stills")
        return None

    film_id = db.upsert_film(conn, {
        "slug": slug, "title": title, "year": year,
        "director": _crew(movie, "Director"),
        "cinematographer": _crew(movie, "Director of Photography"),
        "genres": [g["name"] for g in movie.get("genres") or []],
        "overview": movie.get("overview"),
        "license": LICENSE, "source": "tmdb", "tmdb_id": movie.get("id"),
    })
    conn.commit()
    frame_dir, thumb_dir = lib.frames / slug, lib.thumbs / slug
    frame_dir.mkdir(parents=True, exist_ok=True)
    thumb_dir.mkdir(parents=True, exist_ok=True)

    def fetch(item):
        i, b = item
        name = f"{i:05d}.jpg"
        # Saved byte-for-byte as served: TMDB's terms don't allow derivative copies.
        raw = _download(IMAGE_BASE + size + b["file_path"])
        (frame_dir / name).write_bytes(raw)
        (thumb_dir / name).write_bytes(_download(IMAGE_BASE + thumb_size + b["file_path"]))
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        stats = analyze.analyze(img)
        aspect = round(img.width / img.height, 2)
        return {
            "film_id": film_id, "idx": i, "t_start": 0.0, "t_end": 0.0, "frame_time": 0.0,
            "image": f"frames/{slug}/{name}", "thumb": f"thumbs/{slug}/{name}",
            "width": img.width, "height": img.height,
            "description": analyze.heuristic_description(stats, aspect), "describer": "heuristic",
            **stats,
        }

    saved = 0
    with ThreadPoolExecutor(max_workers=4) as pool:
        for result in pool.map(_safe(fetch, log), enumerate(backdrops, 1)):
            if result:
                db.insert_shot(conn, result)
                saved += 1
    if saved:
        ratios = [r["aspect_ratio"] for r in backdrops if r.get("aspect_ratio")]
        conn.execute("UPDATE films SET aspect_ratio = ? WHERE id = ?",
                     (round(sum(ratios) / len(ratios), 2) if ratios else None, film_id))
    conn.commit()
    log(f"{title} ({year or '?'}): {saved} stills")
    return film_id if saved else None


def _safe(fn, log):
    def run(item):
        try:
            return fn(item)
        except Exception as e:
            log(f"  still {item[0]} failed: {e}")
            return None
    return run


def expired_films(conn, days=MAX_CACHE_DAYS):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat(timespec="seconds")
    return conn.execute("SELECT id, slug, title, tmdb_id, added_at FROM films "
                        "WHERE source = 'tmdb' AND added_at < ?", (cutoff,)).fetchall()


def purge(lib, conn, films=None, log=print):
    """Delete TMDB-sourced films (all of them by default) and their files."""
    from .ingest import remove_film_files

    films = films if films is not None else conn.execute(
        "SELECT id, slug, title FROM films WHERE source = 'tmdb'").fetchall()
    for f in films:
        db.delete_film(conn, f["id"])
        remove_film_files(lib, f["slug"])
    log(f"Removed {len(films)} film(s) imported from TMDB")
    return len(films)
