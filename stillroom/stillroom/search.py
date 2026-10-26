"""Search: full-text (SQLite FTS5) + CLIP semantic ranking + filters + facets."""

import json
import re
import sqlite3
import threading

import numpy as np

from . import analyze, db, embeddings, taxonomy

STOPWORDS = set("""a an the of in on at to for with and or by from into onto over under is are
was were be being been this that these those it its shot shots frame frames scene scenes still
stills image picture some any very""".split())

# filter name -> (SQL expression, multi-valued?)
FILTER_COLUMNS = {
    "film": ("f.slug", False),
    "director": ("f.director", False),
    "cinematographer": ("f.cinematographer", False),
    "genre": ("f.genres", True),
    "decade": ("(f.year / 10) * 10", False),
    "aspect": ("f.aspect_ratio", False),
    "shot_type": ("s.shot_type", False),
    "framing": ("s.framing", False),
    "angle": ("s.angle", False),
    "lighting": ("s.lighting", True),
    "time_of_day": ("s.time_of_day", False),
    "int_ext": ("s.int_ext", False),
    "color": ("s.colors", True),
    "key": ("s.light_key", False),
    "tone": ("s.tone", False),
    "mood": ("s.mood", True),
    "source": ("f.source", False),
}

FACETS = ["film", "director", "cinematographer", "genre", "decade", "aspect", "shot_type", "framing",
          "angle", "lighting", "time_of_day", "int_ext", "color", "key", "tone", "source"]

LIST_COLUMNS = """s.id, s.film_id, s.idx, s.frame_time, s.image, s.thumb, s.width, s.height,
                  s.palette, s.shot_type, s.description, f.title, f.year, f.director, f.source"""


# ---------------------------------------------------------------- text query

def parse_query(q):
    """Split a query into phrases, required words and excluded words.

    'woman "red coat" -car rain' -> phrases ['red coat'], words ['woman', 'rain'], exclude ['car']
    """
    phrases = [p.strip() for p in re.findall(r'"([^"]+)"', q) if p.strip()]
    rest = re.sub(r'"[^"]*"', " ", q)
    words, exclude = [], []
    for tok in re.findall(r"-?[\w'/-]+", rest.lower()):
        if tok.startswith("-") and len(tok) > 1:
            exclude.append(tok[1:])
        else:
            tok = re.sub(r"'s$", "", tok.strip("-'")).replace("'", "")  # "woman's" -> "woman"
            if tok and tok not in STOPWORDS:
                words.append(tok)
    return phrases, words, exclude


def _fts_term(word):
    word = re.sub(r"[^\w]+", " ", word).strip()
    if not word:
        return None
    parts = word.split()
    if len(parts) > 1:
        return '"' + " ".join(parts) + '"'
    return f'"{word}"*' if len(word) >= 3 else f'"{word}"'


def fts_expression(q, mode="and"):
    phrases, words, exclude = parse_query(q)
    terms = [t for t in ([f'"{p}"' for p in phrases] + [_fts_term(w) for w in words]) if t]
    if not terms:
        return None
    expr = (" AND " if mode == "and" else " OR ").join(terms)
    if len(terms) > 1:
        expr = f"({expr})"
    for w in exclude:
        t = _fts_term(w)
        if t:
            expr += f" NOT {t}"
    return expr


def fts_ranked(conn, q, limit=5000):
    """Ranked shot ids for a text query and how they matched.

    Tries all-words first ("and"); if nothing has every word, any-word ("or").
    """
    for mode in ("and", "or"):
        expr = fts_expression(q, mode)
        if not expr:
            return [], None
        try:
            rows = conn.execute(
                "SELECT rowid FROM shots_fts WHERE shots_fts MATCH ? "
                "ORDER BY bm25(shots_fts, 4.0, 2.0, 1.0) LIMIT ?", (expr, limit)).fetchall()
        except sqlite3.OperationalError:
            return [], None
        if rows:
            return [r[0] for r in rows], mode
    return [], None


# ---------------------------------------------------------------- semantic

class VectorIndex:
    """In-memory copy of the CLIP vectors, reloaded when the table changes."""

    def __init__(self):
        self.lock = threading.Lock()
        self.signature = None
        self.ids = np.zeros(0, dtype=np.int64)
        self.mat = np.zeros((0, 0), dtype=np.float32)
        self.model = None
        self.pos = {}

    def refresh(self, conn):
        sig = conn.execute("SELECT COUNT(*), MAX(rowid) FROM embeddings").fetchone()
        sig = (sig[0], sig[1])
        with self.lock:
            if sig == self.signature:
                return
            models = db.embedding_models(conn)
            self.model = models[0] if models else None
            self.ids, self.mat = db.load_embeddings(conn, self.model)
            self.pos = {int(i): n for n, i in enumerate(self.ids)}
            self.signature = sig

    def ready(self):
        return self.model is not None and len(self.ids) > 0

    def vector(self, shot_id):
        n = self.pos.get(int(shot_id))
        return None if n is None else self.mat[n]

    def rank(self, query_vec, candidate_ids=None, keep_delta=0.075, min_z=2.0, min_keep=24, max_keep=1500):
        """Shot ids ranked by cosine similarity, cut off where relevance fades.

        A still counts as a match when it is close to the best score AND stands
        out from the library as a whole (min_z standard deviations above the
        mean). The second test stops vague queries ("rain" in a library with no
        rain) from matching half the library; min_keep always shows the best few.
        """
        if not self.ready():
            return [], {}
        if candidate_ids is not None:
            idx = np.array([self.pos[i] for i in candidate_ids if i in self.pos], dtype=np.int64)
            if idx.size == 0:
                return [], {}
        else:
            idx = np.arange(len(self.ids))
        sims = self.mat[idx] @ query_vec
        order = np.argsort(-sims)
        top = sims[order[0]]
        floor = max(top - keep_delta, float(sims.mean() + min_z * sims.std()))
        keep = [o for n, o in enumerate(order[:max_keep]) if n < min_keep or sims[o] >= floor]
        ranked = [int(self.ids[idx[o]]) for o in keep]
        scores = {int(self.ids[idx[o]]): float(sims[o]) for o in keep}
        return ranked, scores


VECTORS = VectorIndex()


def semantic_status(conn):
    """Whether picture-content search can run: 'on', 'loading', 'off'
    (PyTorch/OpenCLIP not installed or failed to load) or 'unindexed'."""
    if not embeddings.available():
        return "off"
    VECTORS.refresh(conn)
    if not VECTORS.ready():
        return "unindexed"
    name, pretrained = VECTORS.model.split("/", 1)
    state = embeddings.load_state(name, pretrained)
    return {"ready": "on", "failed": "off"}.get(state, "loading")


def warm_up(conn):
    """Start loading the CLIP model in the background so the first search is fast."""
    if embeddings.available():
        VECTORS.refresh(conn)
        if VECTORS.ready():
            embeddings.get_clip_nowait(*VECTORS.model.split("/", 1))


def semantic_ranked(conn, q, candidate_ids=None, wait=False):
    """(ranked ids, scores, status). Never blocks on model loading unless wait=True."""
    status = semantic_status(conn)
    if status in ("off", "unindexed"):
        return [], {}, status
    name, pretrained = VECTORS.model.split("/", 1)
    clip = embeddings.get_clip(name, pretrained) if wait else embeddings.get_clip_nowait(name, pretrained)
    if clip is None:
        return [], {}, semantic_status(conn)
    ids, scores = VECTORS.rank(clip.encode_query(q), candidate_ids)
    return ids, scores, "on"


def rrf(*rankings, k=60, weights=None):
    """Reciprocal-rank fusion of several ranked id lists."""
    weights = weights or [1.0] * len(rankings)
    scores = {}
    for ranking, w in zip(rankings, weights):
        for r, shot_id in enumerate(ranking):
            scores[shot_id] = scores.get(shot_id, 0.0) + w / (k + r + 1)
    return sorted(scores, key=lambda i: -scores[i])


# ---------------------------------------------------------------- colour

class PaletteIndex:
    def __init__(self):
        self.lock = threading.Lock()
        self.signature = None
        self.ids = np.zeros(0, dtype=np.int64)
        self.labs = np.zeros((0, 6, 3))
        self.weights = np.zeros((0, 6))

    def refresh(self, conn):
        sig = tuple(conn.execute("SELECT COUNT(*), MAX(id) FROM shots").fetchone())
        with self.lock:
            if sig == self.signature:
                return
            rows = conn.execute("SELECT id, palette FROM shots ORDER BY id").fetchall()
            ids, labs, ws = [], [], []
            for r in rows:
                pal = json.loads(r["palette"] or "[]")[:6]
                if not pal:
                    continue
                lab = analyze.hex_to_lab([p[0] for p in pal])
                w = np.array([p[1] for p in pal])
                pad = 6 - len(pal)
                labs.append(np.vstack([lab, np.zeros((pad, 3))]))
                ws.append(np.concatenate([w, np.zeros(pad)]))
                ids.append(r["id"])
            self.ids = np.array(ids, dtype=np.int64)
            self.labs = np.array(labs) if labs else np.zeros((0, 6, 3))
            self.weights = np.array(ws) if ws else np.zeros((0, 6))
            self.signature = sig

    def match(self, hex_color, max_distance=22.0):
        """Shots containing a colour close to hex_color, best matches first.

        Score favours a near colour that also covers a large part of the frame.
        """
        if len(self.ids) == 0:
            return []
        target = analyze.hex_to_lab([hex_color])[0]
        dist = np.linalg.norm(self.labs - target, axis=2)  # (N, 6) delta-E 76
        dist = np.where(self.weights > 0, dist, np.inf)
        cost = dist - 18.0 * self.weights   # coverage makes a near colour count more
        best = cost.min(axis=1)
        near = dist.min(axis=1) <= max_distance
        order = np.argsort(best)
        return [int(self.ids[i]) for i in order if near[i]]


PALETTES = PaletteIndex()


# ---------------------------------------------------------------- filters

def _filter_sql(filters, skip=None):
    """WHERE fragments for the active filters (OR within a field, AND across)."""
    clauses, args = [], []
    for name, values in filters.items():
        if name == skip or name not in FILTER_COLUMNS or not values:
            continue
        col, multi = FILTER_COLUMNS[name]
        if multi:
            clauses.append("(" + " OR ".join(f"{col} LIKE ?" for _ in values) + ")")
            args += [f"%|{v.lower()}|%" for v in values]
        else:
            clauses.append(f"{col} IN ({', '.join('?' for _ in values)})")
            args += values
    return clauses, args


def _coerce(name, values):
    if name in ("decade",):
        return [int(v) for v in values if str(v).lstrip("-").isdigit()]
    if name == "aspect":
        out = []
        for v in values:
            try:
                out.append(float(v))
            except ValueError:
                pass
        return out
    return [str(v) for v in values if str(v).strip()]


def normalize_filters(raw):
    return {k: _coerce(k, v) for k, v in raw.items() if k in FILTER_COLUMNS and v}


# ---------------------------------------------------------------- main entry

def search(conn, q="", filters=None, color=None, similar_to=None, sort=None, page=1, per_page=60,
           seed=0, with_facets=True, wait_for_model=False):
    filters = normalize_filters(filters or {})
    q = (q or "").strip()
    ranked = None          # ordered candidate ids (None = no text/colour constraint)
    mode = "browse"
    semantic = None        # status of picture-content search, reported for text queries

    if similar_to:
        mode = "similar"
        ranked = similar_ids(conn, similar_to, limit=600)
    elif q:
        mode = "text"
        text_ids, matched = fts_ranked(conn, q)
        sem_ids, _, semantic = semantic_ranked(conn, q, wait=wait_for_model)
        if sem_ids:
            mode = "hybrid"
            if matched == "or":
                # Any-word matches of a sentence ("...at night") are mostly noise
                # next to the semantic ranking; keep only the strongest.
                text_ids = text_ids[:200]
            ranked = rrf(text_ids, sem_ids, weights=[1.0, 1.2])
        else:
            ranked = text_ids
    if color:
        PALETTES.refresh(conn)
        color_ids = PALETTES.match(color)
        if ranked is None:
            ranked = color_ids
            mode = "color" if mode == "browse" else mode
        else:
            allowed = set(color_ids)
            ranked = [i for i in ranked if i in allowed]

    conn.execute("CREATE TEMP TABLE IF NOT EXISTS hits (shot_id INTEGER PRIMARY KEY, rank INTEGER)")
    conn.execute("DELETE FROM hits")
    if ranked is not None:
        conn.executemany("INSERT OR IGNORE INTO hits VALUES (?, ?)", [(i, n) for n, i in enumerate(ranked)])

    base_from = "shots s JOIN films f ON f.id = s.film_id"
    if ranked is not None:
        base_from += " JOIN hits h ON h.shot_id = s.id"

    clauses, args = _filter_sql(filters)
    where = (" WHERE " + " AND ".join(clauses)) if clauses else ""

    total = conn.execute(f"SELECT COUNT(*) FROM {base_from}{where}", args).fetchone()[0]

    sort = sort or ("relevance" if ranked is not None else "film")
    if sort == "relevance" and ranked is not None:
        order = "h.rank"
    elif sort == "random":
        order = f"((s.id * 2654435761 + {int(seed)}) % 4294967296)"
    elif sort == "newest":
        order = "f.year DESC, f.title, s.idx"
    elif sort == "oldest":
        order = "f.year, f.title, s.idx"
    else:
        order = "f.title, f.year, s.idx"

    per_page = max(1, min(int(per_page), 200))
    page = max(1, int(page))
    rows = conn.execute(
        f"SELECT {LIST_COLUMNS} FROM {base_from}{where} ORDER BY {order} LIMIT ? OFFSET ?",
        args + [per_page, (page - 1) * per_page],
    ).fetchall()

    result = {
        "total": total,
        "page": page,
        "per_page": per_page,
        "mode": mode,
        "semantic": semantic,
        "results": [db.shot_to_dict(r) for r in rows],
    }
    if with_facets:
        result["facets"] = facets(conn, base_from, filters)
    return result


def facets(conn, base_from, filters, top=40):
    out = {}
    for name in FACETS:
        col, multi = FILTER_COLUMNS[name]
        clauses, args = _filter_sql(filters, skip=name)
        where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
        if multi:
            counts = {}
            for (packed,) in conn.execute(f"SELECT {col} FROM {base_from}{where}", args):
                for v in taxonomy.unpack(packed):
                    counts[v] = counts.get(v, 0) + 1
            items = sorted(counts.items(), key=lambda kv: -kv[1])
        else:
            items = [(r[0], r[1]) for r in conn.execute(
                f"SELECT {col} AS v, COUNT(*) FROM {base_from}{where} "
                f"GROUP BY v HAVING v IS NOT NULL AND v != '' ORDER BY COUNT(*) DESC", args)]
        if name == "film":
            titles = {r["slug"]: (r["title"], r["year"]) for r in conn.execute("SELECT slug, title, year FROM films")}
            out[name] = [{"value": v, "label": f"{titles.get(v, (v,))[0]}"
                          + (f" ({titles[v][1]})" if v in titles and titles[v][1] else ""), "count": c}
                         for v, c in items[:top]]
        elif name == "decade":
            out[name] = [{"value": v, "label": f"{v}s", "count": c} for v, c in sorted(items, key=lambda kv: kv[0])]
        elif name == "aspect":
            out[name] = [{"value": v, "label": f"{v:g}:1", "count": c} for v, c in sorted(items, key=lambda kv: kv[0])]
        else:
            out[name] = [{"value": v, "label": v, "count": c} for v, c in items[:top]]
    return out


# ---------------------------------------------------------------- similar

def similar_ids(conn, shot_id, limit=48):
    """Visually similar shots: CLIP image vectors if present, else palette."""
    VECTORS.refresh(conn)
    vec = VECTORS.vector(shot_id) if VECTORS.ready() else None
    if vec is not None:
        sims = VECTORS.mat @ vec
        order = np.argsort(-sims)[: limit + 1]
        return [int(VECTORS.ids[o]) for o in order if int(VECTORS.ids[o]) != int(shot_id)][:limit]
    row = conn.execute("SELECT palette FROM shots WHERE id = ?", (shot_id,)).fetchone()
    if not row:
        return []
    pal = json.loads(row["palette"] or "[]")
    if not pal:
        return []
    PALETTES.refresh(conn)
    ranked = PALETTES.match(pal[0][0])
    return [i for i in ranked if i != int(shot_id)][:limit]


def fetch_shots(conn, ids):
    if not ids:
        return []
    rows = conn.execute(
        f"SELECT {LIST_COLUMNS} FROM shots s JOIN films f ON f.id = s.film_id "
        f"WHERE s.id IN ({', '.join('?' for _ in ids)})", list(ids)).fetchall()
    by_id = {r["id"]: r for r in rows}
    return [db.shot_to_dict(by_id[i]) for i in ids if i in by_id]
