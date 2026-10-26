"""Bulk-import public-domain feature films from the Internet Archive.

The archive's `feature_films` collection holds thousands of films whose
uploaders marked them public domain (mostly US films whose copyright lapsed).
Each one is downloaded, cut into shots like any other video, and - unless
--keep-video is given - the video is deleted afterwards so only the stills
take up space.
"""

import json
import re
import urllib.parse
import urllib.request

API = "https://archive.org"
UA = {"User-Agent": "stillroom/0.1 (personal film-still library)"}
MIN_FEATURE_SECONDS = 40 * 60

# Collections with many public-domain films (counts of items marked public
# domain, checked October 2026). Only feature_films is limited to features.
COLLECTIONS = {
    "feature_films": "Feature films (7,600+)",
    "Film_Noir": "Film noir (240+)",
    "silent_films": "Silent films (580+)",
    "SciFi_Horror": "Sci-fi & horror (280+)",
    "prelinger": "Prelinger Archives: industrial, educational & home movies (1,800+)",
}


def min_seconds_for(collection):
    return MIN_FEATURE_SECONDS if collection == "feature_films" else 60


def _get_json(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def search(count=20, query=None, min_year=None, max_year=None, page=1, collection="feature_films"):
    """Public-domain films in a collection, most downloaded first."""
    if not re.fullmatch(r"[\w-]+", collection or ""):
        raise ValueError(f"Bad collection name: {collection!r}")
    q = f"collection:{collection} AND mediatype:movies AND licenseurl:*publicdomain*"
    if query:
        q += f" AND ({query})"
    if min_year or max_year:
        q += f" AND year:[{min_year or 1880} TO {max_year or 2100}]"
    params = [("q", q), ("rows", count), ("page", page), ("output", "json"),
              ("sort[]", "downloads desc")]
    params += [("fl[]", f) for f in ("identifier", "title", "year", "downloads")]
    data = _get_json(f"{API}/advancedsearch.php?{urllib.parse.urlencode(params)}")
    return data["response"]["docs"]


def _length(f):
    raw = f.get("length")
    if not raw:
        return 0.0
    try:
        if ":" in str(raw):
            secs = 0.0
            for part in str(raw).split(":"):
                secs = secs * 60 + float(part)
            return secs
        return float(raw)
    except ValueError:
        return 0.0


def thumbnail(identifier):
    return f"{API}/services/img/{urllib.parse.quote(identifier)}"


def pick_file(identifier, min_seconds=MIN_FEATURE_SECONDS):
    """Choose the best single-file MP4 of a whole film (None if the film is
    split into parts or there is no MP4). Returns (url, metadata dict)."""
    data = _get_json(f"{API}/metadata/{urllib.parse.quote(identifier)}")
    files = data.get("files") or []
    meta = data.get("metadata") or {}
    candidates = []
    for f in files:
        name = f.get("name", "")
        if not name.lower().endswith((".mp4", ".m4v")):
            continue
        length = _length(f)
        if length and length < min_seconds:
            continue  # trailers, reels, one part of a split film
        width = int(f.get("width") or 0)
        rank = (
            0 if f.get("format") == "h.264" else 1 if f.get("format") == "MPEG4" else 2,
            0 if 0 < width <= 1280 else 1,      # 720p-ish is plenty for stills, 1080p is slow
            -width,
        )
        candidates.append((rank, name, length))
    if not candidates:
        return None, meta
    _, name, _ = min(candidates)
    url = f"{API}/download/{urllib.parse.quote(identifier)}/{urllib.parse.quote(name)}"
    return url, meta


def clean_title(title):
    """'Charade ( 1963) Cary Grant ...' -> 'Charade'."""
    title = re.split(r"\s*[\(\[]\s*(?:18|19|20)\d{2}", title or "")[0]
    title = re.sub(r"\s+", " ", title).strip(" -:|")
    return title or "Untitled"


def film_info(doc, meta):
    year = doc.get("year") or meta.get("year") or (meta.get("date") or "")[:4]
    try:
        year = int(str(year)[:4])
    except ValueError:
        year = None
    director = meta.get("director")
    if isinstance(director, list):
        director = ", ".join(director)
    return {
        "title": clean_title(doc.get("title") or meta.get("title")),
        "year": year,
        "director": director,
        "license": f"Public domain per uploader (Internet Archive: {doc['identifier']})",
    }
