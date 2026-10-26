"""Film-level metadata: parse file names, read sidecar JSON, optional TMDb lookup."""

import json
import os
import re
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

_YEAR_RE = re.compile(r"[\(\[\. _-]((?:18|19|20)\d{2})(?:[\)\]\. _-]|$)")
_JUNK_RE = re.compile(
    r"\b(1080p|2160p|720p|480p|4k|uhd|hdr|bluray|blu-ray|bdrip|brrip|webrip|web-dl|dvdrip|x264|x265|"
    r"h264|h265|hevc|aac|dts|remux|proper|repack|extended|unrated|criterion)\b.*$",
    re.I,
)


def slugify(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "film"


def parse_filename(path):
    """'Blade Runner (1982) 1080p.mkv' -> {'title': 'Blade Runner', 'year': 1982}."""
    stem = Path(path).stem
    year = None
    m = None
    for m in _YEAR_RE.finditer(" " + stem + " "):
        pass  # keep the last year-looking token ("2001 A Space Odyssey (1968)")
    if m:
        year = int(m.group(1))
        title = (" " + stem + " ")[: m.start()].strip()
    else:
        title = _JUNK_RE.sub("", stem)
    title = re.sub(r"[._]+", " ", title)
    title = re.sub(r"\s+", " ", title).strip(" -[(")
    return {"title": title or stem, "year": year}


def read_sidecar(path):
    """Metadata from 'Movie (Year).json' next to the video, if present."""
    side = Path(path).with_suffix(".json")
    if side.exists():
        with open(side, encoding="utf-8") as f:
            data = json.load(f)
        return {k: v for k, v in data.items() if v not in (None, "")}
    return {}


# ---------------------------------------------------------------- TMDb

TMDB_API = "https://api.themoviedb.org/3"


def _tmdb_get(endpoint, params):
    params = dict(params)
    headers = {"Accept": "application/json"}
    token = os.environ.get("TMDB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    else:
        params["api_key"] = os.environ["TMDB_API_KEY"]
    url = f"{TMDB_API}{endpoint}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def tmdb_available():
    return bool(os.environ.get("TMDB_TOKEN") or os.environ.get("TMDB_API_KEY"))


def tmdb_lookup(title, year=None):
    """Director, cinematographer, genres and overview from The Movie Database.

    Needs a free API key in TMDB_API_KEY (v3) or a read token in TMDB_TOKEN.
    Returns {} when nothing matches.
    """
    params = {"query": title, "include_adult": "false"}
    if year:
        params["year"] = year
    results = _tmdb_get("/search/movie", params).get("results") or []
    if not results and year:
        results = _tmdb_get("/search/movie", {"query": title}).get("results") or []
    if not results:
        return {}
    movie = _tmdb_get(f"/movie/{results[0]['id']}", {"append_to_response": "credits"})
    crew = (movie.get("credits") or {}).get("crew") or []

    def people(job):
        names = [c["name"] for c in crew if c.get("job") == job]
        return ", ".join(dict.fromkeys(names)) or None

    release = movie.get("release_date") or ""
    return {
        "title": movie.get("title") or title,
        "year": int(release[:4]) if release[:4].isdigit() else year,
        "director": people("Director"),
        "cinematographer": people("Director of Photography"),
        "genres": [g["name"] for g in movie.get("genres") or []],
        "overview": movie.get("overview"),
        "tmdb_id": movie.get("id"),
    }
