"""Local web server: JSON API + the single-page UI in ./static."""

import csv
import io
import re
import zipfile
from pathlib import Path

from flask import Flask, abort, g, jsonify, request, send_file, send_from_directory

from . import db, search, taxonomy
from .config import Library

STATIC = Path(__file__).parent / "static"
TMDB_NOTICE = ("This application uses TMDB and the TMDB APIs but is not endorsed, certified, "
               "or otherwise approved by TMDB.")


def timecode(seconds):
    s = int(seconds or 0)
    return f"{s // 3600:02d}:{s % 3600 // 60:02d}:{s % 60:02d}"


def position(row):
    """'00.12.34 shot 56' for video frames, 'still 3' for TMDB stills."""
    if row["source"] == "tmdb":
        return f"still {row['idx']}"
    return f"{timecode(row['frame_time']).replace(':', '.')} shot {row['idx']}"


def safe_name(text):
    return re.sub(r'[\\/:*?"<>|]+', "-", text).strip() or "still"


def create_app(library=None):
    lib = Library(library).ensure()
    app = Flask(__name__, static_folder=str(STATIC), static_url_path="/static")
    app.config["LIBRARY"] = lib
    app.json.sort_keys = False

    try:  # load the CLIP model now, not on the first search
        search.warm_up(db.connect(lib.db_path))
    except Exception as e:
        print(f"Could not start loading semantic search: {e}")

    def conn():
        if "conn" not in g:
            g.conn = db.connect(lib.db_path)
        return g.conn

    @app.teardown_appcontext
    def close(_exc):
        c = g.pop("conn", None)
        if c is not None:
            c.close()

    # ------------------------------------------------------------ pages

    @app.get("/")
    @app.get("/films")
    @app.get("/boards")
    @app.get("/about")
    @app.get("/boards/<int:_board>")
    @app.get("/shot/<int:_shot>")
    def index(**_):
        return send_from_directory(STATIC, "index.html")

    @app.get("/media/<any(frames, thumbs):kind>/<path:path>")
    def media(kind, path):
        # Serving from the sub-folder means "../" can never reach the database.
        return send_from_directory(lib.root / kind, path, max_age=86400 * 30)

    # ------------------------------------------------------------ search

    @app.get("/api/stats")
    def stats():
        c = conn()
        row = c.execute("""SELECT COUNT(*) shots,
                                  SUM(describer NOT IN ('heuristic', 'clip')) described
                           FROM shots""").fetchone()
        return jsonify({
            "shots": row["shots"] or 0,
            "described": row["described"] or 0,
            "films": c.execute("SELECT COUNT(*) FROM films").fetchone()[0],
            "embedded": c.execute("SELECT COUNT(*) FROM embeddings").fetchone()[0],
            "semantic": search.semantic_status(c),
            "tmdb_films": c.execute("SELECT COUNT(*) FROM films WHERE source = 'tmdb'").fetchone()[0],
            "tmdb_notice": TMDB_NOTICE,
            "vocab": {
                "shot_type": taxonomy.SHOT_TYPES, "framing": taxonomy.FRAMINGS, "angle": taxonomy.ANGLES,
                "lighting": taxonomy.LIGHTING, "time_of_day": taxonomy.TIME_OF_DAY,
                "int_ext": taxonomy.INT_EXT, "color": taxonomy.COLOR_FAMILIES,
            },
        })

    @app.get("/api/search")
    def api_search():
        a = request.args
        filters = {name: a.getlist(name) for name in search.FILTER_COLUMNS if a.getlist(name)}
        color = a.get("hex")  # exact colour; "color" is the colour-family filter
        if color and not re.fullmatch(r"#?[0-9a-fA-F]{6}", color):
            color = None
        if color and not color.startswith("#"):
            color = "#" + color
        result = search.search(
            conn(), q=a.get("q", ""), filters=filters, color=color,
            similar_to=a.get("similar", type=int), sort=a.get("sort"),
            page=a.get("page", 1, type=int), per_page=a.get("per_page", 60, type=int),
            seed=a.get("seed", 0, type=int), with_facets=a.get("facets", "1") != "0",
        )
        return jsonify(result)

    @app.get("/api/shots/<int:shot_id>")
    def shot(shot_id):
        c = conn()
        row = c.execute(
            """SELECT s.*, f.title, f.year, f.director, f.cinematographer, f.genres, f.slug,
                      f.aspect_ratio, f.license, f.overview, f.source
               FROM shots s JOIN films f ON f.id = s.film_id WHERE s.id = ?""", (shot_id,)).fetchone()
        if not row:
            abort(404)
        d = db.shot_to_dict(row, full=True)
        d.update({"slug": row["slug"], "aspect_ratio": row["aspect_ratio"], "license": row["license"],
                  "source": row["source"],
                  "timecode": timecode(row["frame_time"]), "duration": round(row["t_end"] - row["t_start"], 2)})
        neighbours = c.execute(
            "SELECT id FROM shots WHERE film_id = ? AND idx BETWEEN ? AND ? ORDER BY idx",
            (row["film_id"], row["idx"] - 6, row["idx"] + 6)).fetchall()
        d["sequence"] = search.fetch_shots(c, [r["id"] for r in neighbours])
        d["similar"] = search.fetch_shots(c, search.similar_ids(c, shot_id, limit=18))
        d["boards"] = [r["board_id"] for r in c.execute("SELECT board_id FROM board_shots WHERE shot_id = ?", (shot_id,))]
        return jsonify(d)

    @app.get("/api/shots/<int:shot_id>/download")
    def download(shot_id):
        row = conn().execute(
            "SELECT s.image, s.frame_time, s.idx, f.title, f.year, f.source FROM shots s "
            "JOIN films f ON f.id = s.film_id WHERE s.id = ?", (shot_id,)).fetchone()
        if not row:
            abort(404)
        name = safe_name(f"{row['title']} ({row['year']}) {position(row)}") + ".jpg"
        return send_file(lib.root / row["image"], as_attachment=True, download_name=name)

    @app.get("/api/films")
    def films():
        c = conn()
        rows = c.execute(
            """SELECT f.*, COUNT(s.id) AS shot_count,
                      (SELECT s2.thumb FROM shots s2 WHERE s2.film_id = f.id
                       ORDER BY (s2.saturation + s2.contrast) * (s2.brightness > 0.15) DESC LIMIT 1) AS cover
               FROM films f LEFT JOIN shots s ON s.film_id = f.id
               GROUP BY f.id ORDER BY f.title""").fetchall()
        out = []
        for r in rows:
            d = db.film_to_dict(r)
            d["cover"] = "/media/" + r["cover"] if r["cover"] else None
            out.append(d)
        return jsonify(out)

    # ------------------------------------------------------------ boards

    def board_or_404(board_id):
        b = conn().execute("SELECT * FROM boards WHERE id = ?", (board_id,)).fetchone()
        if not b:
            abort(404)
        return b

    @app.get("/api/boards")
    def boards():
        rows = conn().execute(
            """SELECT b.id, b.name, b.created_at, COUNT(bs.shot_id) AS count,
                      (SELECT s.thumb FROM board_shots x JOIN shots s ON s.id = x.shot_id
                       WHERE x.board_id = b.id ORDER BY x.added_at DESC LIMIT 1) AS cover
               FROM boards b LEFT JOIN board_shots bs ON bs.board_id = b.id
               GROUP BY b.id ORDER BY b.created_at DESC""").fetchall()
        return jsonify([{**dict(r), "cover": ("/media/" + r["cover"]) if r["cover"] else None} for r in rows])

    @app.post("/api/boards")
    def create_board():
        name = ((request.get_json(silent=True) or {}).get("name") or "").strip()[:120] or "Untitled board"
        c = conn()
        cur = c.execute("INSERT INTO boards (name, created_at) VALUES (?, ?)", (name, db.now()))
        c.commit()
        return jsonify({"id": cur.lastrowid, "name": name, "count": 0}), 201

    @app.get("/api/boards/<int:board_id>")
    def board(board_id):
        b = board_or_404(board_id)
        ids = [r["shot_id"] for r in conn().execute(
            "SELECT shot_id FROM board_shots WHERE board_id = ? ORDER BY added_at", (board_id,))]
        return jsonify({**dict(b), "shots": search.fetch_shots(conn(), ids)})

    @app.patch("/api/boards/<int:board_id>")
    def rename_board(board_id):
        board_or_404(board_id)
        name = ((request.get_json(silent=True) or {}).get("name") or "").strip()[:120]
        if not name:
            abort(400)
        conn().execute("UPDATE boards SET name = ? WHERE id = ?", (name, board_id))
        conn().commit()
        return jsonify({"id": board_id, "name": name})

    @app.delete("/api/boards/<int:board_id>")
    def delete_board(board_id):
        board_or_404(board_id)
        conn().execute("DELETE FROM boards WHERE id = ?", (board_id,))
        conn().commit()
        return "", 204

    @app.post("/api/boards/<int:board_id>/shots")
    def add_to_board(board_id):
        board_or_404(board_id)
        shot_id = (request.get_json(silent=True) or {}).get("shot_id")
        if not isinstance(shot_id, int):
            abort(400)
        conn().execute("INSERT OR IGNORE INTO board_shots (board_id, shot_id, added_at) VALUES (?, ?, ?)",
                       (board_id, shot_id, db.now()))
        conn().commit()
        return jsonify({"ok": True}), 201

    @app.delete("/api/boards/<int:board_id>/shots/<int:shot_id>")
    def remove_from_board(board_id, shot_id):
        conn().execute("DELETE FROM board_shots WHERE board_id = ? AND shot_id = ?", (board_id, shot_id))
        conn().commit()
        return "", 204

    @app.get("/api/boards/<int:board_id>/export.zip")
    def export_board(board_id):
        b = board_or_404(board_id)
        rows = conn().execute(
            """SELECT s.*, f.title, f.year, f.director, f.cinematographer, f.source FROM board_shots bs
               JOIN shots s ON s.id = bs.shot_id JOIN films f ON f.id = s.film_id
               WHERE bs.board_id = ? ORDER BY bs.added_at""", (board_id,)).fetchall()
        buf = io.BytesIO()
        sheet = io.StringIO()
        writer = csv.writer(sheet)
        writer.writerow(["file", "film", "year", "director", "cinematographer", "timecode", "shot",
                         "shot type", "lighting", "description"])
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_STORED) as z:
            for n, r in enumerate(rows, 1):
                name = safe_name(f"{n:03d} {r['title']} ({r['year']}) {position(r)}") + ".jpg"
                z.write(lib.root / r["image"], name)
                writer.writerow([name, r["title"], r["year"], r["director"], r["cinematographer"],
                                 timecode(r["frame_time"]) if r["source"] != "tmdb" else "", r["idx"], r["shot_type"],
                                 ", ".join(taxonomy.unpack(r["lighting"])), r["description"]])
            z.writestr("shots.csv", sheet.getvalue())
        buf.seek(0)
        return send_file(buf, mimetype="application/zip", as_attachment=True,
                         download_name=safe_name(b["name"]) + ".zip")

    return app
