"""SQLite storage: films, shots, a full-text index, embeddings and boards."""

import json
import sqlite3
from datetime import datetime, timezone

from . import taxonomy

SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS films (
    id              INTEGER PRIMARY KEY,
    slug            TEXT UNIQUE NOT NULL,
    title           TEXT NOT NULL,
    year            INTEGER,
    director        TEXT,
    cinematographer TEXT,
    genres          TEXT DEFAULT '',      -- packed '|a|b|'
    overview        TEXT,
    license         TEXT,
    source_path     TEXT,
    duration        REAL,
    width           INTEGER,
    height          INTEGER,
    aspect_ratio    REAL,
    crop            TEXT,                 -- ffmpeg crop=w:h:x:y applied to every frame
    tmdb_id         INTEGER,
    added_at        TEXT
);

CREATE TABLE IF NOT EXISTS shots (
    id           INTEGER PRIMARY KEY,
    film_id      INTEGER NOT NULL REFERENCES films(id) ON DELETE CASCADE,
    idx          INTEGER NOT NULL,        -- shot number within the film
    t_start      REAL NOT NULL,
    t_end        REAL NOT NULL,
    frame_time   REAL NOT NULL,
    image        TEXT NOT NULL,           -- path relative to the library root
    thumb        TEXT NOT NULL,
    width        INTEGER,
    height       INTEGER,
    palette      TEXT,                    -- JSON [[hex, weight], ...]
    colors       TEXT DEFAULT '',         -- packed colour families
    brightness   REAL,
    contrast     REAL,
    saturation   REAL,
    warmth       REAL,
    light_key    TEXT,
    tone         TEXT,
    description  TEXT DEFAULT '',
    shot_type    TEXT,
    framing      TEXT,
    angle        TEXT,
    lighting     TEXT DEFAULT '',         -- packed
    time_of_day  TEXT,
    int_ext      TEXT,
    location     TEXT,
    people       INTEGER,
    mood         TEXT DEFAULT '',         -- packed
    tags         TEXT DEFAULT '',         -- comma separated keywords
    describer    TEXT,
    described_at TEXT,
    UNIQUE (film_id, idx)
);
CREATE INDEX IF NOT EXISTS shots_film ON shots(film_id, idx);

CREATE VIRTUAL TABLE IF NOT EXISTS shots_fts USING fts5(
    description, tags, meta, tokenize = 'porter unicode61'
);

CREATE TABLE IF NOT EXISTS embeddings (
    shot_id INTEGER PRIMARY KEY REFERENCES shots(id) ON DELETE CASCADE,
    model   TEXT NOT NULL,
    vec     BLOB NOT NULL               -- float16, L2-normalised
);

CREATE TABLE IF NOT EXISTS boards (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS board_shots (
    board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    shot_id  INTEGER NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
    note     TEXT DEFAULT '',
    added_at TEXT,
    PRIMARY KEY (board_id, shot_id)
);

CREATE TABLE IF NOT EXISTS caption_batches (
    batch_id   TEXT PRIMARY KEY,
    model      TEXT,
    created_at TEXT,
    done       INTEGER DEFAULT 0
);
"""

# Columns a describer is allowed to write.
DESCRIPTION_FIELDS = [
    "description", "shot_type", "framing", "angle", "lighting", "time_of_day",
    "int_ext", "location", "people", "mood", "tags",
]


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect(path):
    conn = sqlite3.connect(str(path), timeout=30, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(SCHEMA)
    return conn


# ---------------------------------------------------------------- films

def upsert_film(conn, film):
    """Insert or update a film by slug and return its id."""
    film = dict(film)
    film.setdefault("added_at", now())
    if isinstance(film.get("genres"), (list, tuple)):
        film["genres"] = taxonomy.pack(film["genres"])
    cols = list(film)
    updates = ", ".join(f"{c} = excluded.{c}" for c in cols if c not in ("slug", "added_at"))
    conn.execute(
        f"INSERT INTO films ({', '.join(cols)}) VALUES ({', '.join('?' for _ in cols)}) "
        f"ON CONFLICT(slug) DO UPDATE SET {updates}",
        [film[c] for c in cols],
    )
    return conn.execute("SELECT id FROM films WHERE slug = ?", (film["slug"],)).fetchone()["id"]


def delete_film(conn, film_id):
    ids = [r["id"] for r in conn.execute("SELECT id FROM shots WHERE film_id = ?", (film_id,))]
    conn.executemany("DELETE FROM shots_fts WHERE rowid = ?", [(i,) for i in ids])
    conn.execute("DELETE FROM films WHERE id = ?", (film_id,))
    conn.commit()
    return ids


# ---------------------------------------------------------------- shots

def insert_shot(conn, shot):
    shot = dict(shot)
    if isinstance(shot.get("palette"), list):
        shot["palette"] = json.dumps(shot["palette"])
    for f in taxonomy.MULTI_VALUE_FIELDS:
        if isinstance(shot.get(f), (list, tuple)):
            shot[f] = taxonomy.pack(shot[f])
    cols = list(shot)
    cur = conn.execute(
        f"INSERT OR REPLACE INTO shots ({', '.join(cols)}) VALUES ({', '.join('?' for _ in cols)})",
        [shot[c] for c in cols],
    )
    shot_id = cur.lastrowid
    reindex_shot(conn, shot_id)
    return shot_id


def update_description(conn, shot_id, fields, describer):
    """Write describer output (already normalised) for one shot."""
    values = {}
    for f in DESCRIPTION_FIELDS:
        if f not in fields or fields[f] is None:
            continue
        v = fields[f]
        if f in taxonomy.MULTI_VALUE_FIELDS:
            v = taxonomy.pack(v if isinstance(v, (list, tuple)) else [v])
        elif f == "tags" and isinstance(v, (list, tuple)):
            v = ", ".join(dict.fromkeys(str(t).strip().lower() for t in v if str(t).strip()))
        values[f] = v
    values["describer"] = describer
    values["described_at"] = now()
    sets = ", ".join(f"{k} = ?" for k in values)
    conn.execute(f"UPDATE shots SET {sets} WHERE id = ?", [*values.values(), shot_id])
    reindex_shot(conn, shot_id)


def reindex_shot(conn, shot_id):
    """Refresh the full-text row for a shot (description, tags and metadata)."""
    row = conn.execute(
        """SELECT s.*, f.title, f.year, f.director, f.cinematographer, f.genres
           FROM shots s JOIN films f ON f.id = s.film_id WHERE s.id = ?""",
        (shot_id,),
    ).fetchone()
    conn.execute("DELETE FROM shots_fts WHERE rowid = ?", (shot_id,))
    if row is None:
        return
    meta_parts = [
        row["title"], str(row["year"] or ""), row["director"], row["cinematographer"],
        " ".join(taxonomy.unpack(row["genres"])), row["shot_type"], row["framing"], row["angle"],
        " ".join(taxonomy.unpack(row["lighting"])), row["time_of_day"], row["int_ext"],
        row["location"], " ".join(taxonomy.unpack(row["mood"])),
        " ".join(taxonomy.unpack(row["colors"])), row["light_key"], row["tone"],
    ]
    meta = " ".join(p for p in meta_parts if p)
    conn.execute(
        "INSERT INTO shots_fts (rowid, description, tags, meta) VALUES (?, ?, ?, ?)",
        (shot_id, row["description"] or "", row["tags"] or "", meta),
    )


def reindex_all(conn):
    conn.execute("DELETE FROM shots_fts")
    for r in conn.execute("SELECT id FROM shots").fetchall():
        reindex_shot(conn, r["id"])
    conn.commit()


# ---------------------------------------------------------------- embeddings

def save_embedding(conn, shot_id, model, vec):
    import numpy as np
    blob = np.asarray(vec, dtype=np.float16).tobytes()
    conn.execute(
        "INSERT OR REPLACE INTO embeddings (shot_id, model, vec) VALUES (?, ?, ?)",
        (shot_id, model, blob),
    )


def load_embeddings(conn, model=None):
    """Return (shot_ids ndarray, matrix ndarray float32) for all stored vectors."""
    import numpy as np
    sql = "SELECT shot_id, vec FROM embeddings"
    args = ()
    if model:
        sql += " WHERE model = ?"
        args = (model,)
    rows = conn.execute(sql + " ORDER BY shot_id", args).fetchall()
    if not rows:
        return np.zeros(0, dtype=np.int64), np.zeros((0, 0), dtype=np.float32)
    ids = np.array([r["shot_id"] for r in rows], dtype=np.int64)
    mat = np.stack([np.frombuffer(r["vec"], dtype=np.float16) for r in rows]).astype(np.float32)
    return ids, mat


def embedding_models(conn):
    return [r["model"] for r in conn.execute(
        "SELECT model, COUNT(*) n FROM embeddings GROUP BY model ORDER BY n DESC")]


# ---------------------------------------------------------------- serialisation

def shot_to_dict(row, full=False):
    d = {
        "id": row["id"],
        "film_id": row["film_id"],
        "idx": row["idx"],
        "frame_time": row["frame_time"],
        "image": "/media/" + row["image"],
        "thumb": "/media/" + row["thumb"],
        "width": row["width"],
        "height": row["height"],
        "palette": json.loads(row["palette"] or "[]"),
        "shot_type": row["shot_type"],
        "description": row["description"] or "",
    }
    keys = row.keys()
    for k in ("title", "year", "director"):
        if k in keys:
            d[k] = row[k]
    if full:
        for k in ("t_start", "t_end", "brightness", "contrast", "saturation", "warmth", "light_key", "tone",
                  "framing", "angle", "time_of_day", "int_ext", "location", "people",
                  "describer", "cinematographer"):
            if k in keys:
                d[k] = row[k]
        for k in ("colors", "lighting", "mood", "genres"):
            if k in keys:
                d[k] = taxonomy.unpack(row[k])
        d["tags"] = [t.strip() for t in (row["tags"] or "").split(",") if t.strip()]
    return d


def film_to_dict(row):
    d = dict(row)
    d["genres"] = taxonomy.unpack(d.get("genres"))
    d.pop("source_path", None)
    return d
