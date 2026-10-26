"""Local web server: JSON API + the single-page UI in ./static."""

import csv
import io
import re
import urllib.error
import zipfile
from pathlib import Path

from flask import Flask, abort, g, jsonify, request, send_file, send_from_directory

from . import archive, db, demo, describe, embeddings, images, ingest, loc, metadata, search, taxonomy, tmdb
from .config import Library
from .jobs import JobQueue

STATIC = Path(__file__).parent / "static"
TMDB_NOTICE = ("This application uses TMDB and the TMDB APIs but is not endorsed, certified, "
               "or otherwise approved by TMDB.")
LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", "[::1]"}


def timecode(seconds):
    s = int(seconds or 0)
    return f"{s // 3600:02d}:{s % 3600 // 60:02d}:{s % 60:02d}"


def position(row):
    """'00.12.34 shot 56' for video frames, 'still 3' / 'screenshot 3' otherwise."""
    if row["origin"] == "image":
        return f"screenshot {row['idx']}"
    if row["source"] == "tmdb":
        return f"still {row['idx']}"
    return f"{timecode(row['frame_time']).replace(':', '.')} shot {row['idx']}"


def safe_name(text):
    return re.sub(r'[\\/:*?"<>|]+', "-", text).strip() or "still"


def zip_of_shots(lib, rows, name):
    """A ZIP of full-size stills plus shots.csv with credits and timecodes."""
    buf = io.BytesIO()
    sheet = io.StringIO()
    writer = csv.writer(sheet)
    writer.writerow(["file", "film", "year", "director", "cinematographer", "timecode", "shot",
                     "shot type", "lighting", "description"])
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_STORED) as z:
        for n, r in enumerate(rows, 1):
            fname = safe_name(f"{n:03d} {r['title']} ({r['year']}) {position(r)}") + ".jpg"
            z.write(lib.root / r["image"], fname)
            has_time = r["source"] not in ("tmdb", "images") and r["origin"] != "image"
            writer.writerow([fname, r["title"], r["year"], r["director"], r["cinematographer"],
                             timecode(r["frame_time"]) if has_time else "", r["idx"], r["shot_type"],
                             ", ".join(taxonomy.unpack(r["lighting"])), r["description"]])
        z.writestr("shots.csv", sheet.getvalue())
    buf.seek(0)
    return send_file(buf, mimetype="application/zip", as_attachment=True, download_name=safe_name(name) + ".zip")


def create_app(library=None, local_only=True):
    lib = Library(library).ensure()
    lib.apply_settings()
    app = Flask(__name__, static_folder=str(STATIC), static_url_path="/static")
    app.config["LIBRARY"] = lib
    app.config["MAX_CONTENT_LENGTH"] = 4 * 1024 ** 3   # screenshot uploads
    app.json.sort_keys = False
    app.jobs = jobs = JobQueue(lib)

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

    @app.before_request
    def protect():
        # Another website open in the same browser must not be able to drive
        # this local server: changes need a header that cross-site pages can't
        # send without permission, and the Host check blocks DNS rebinding.
        if local_only and request.host.rsplit(":", 1)[0] not in LOCAL_HOSTS:
            abort(403)
        if request.method not in ("GET", "HEAD", "OPTIONS") and request.headers.get("X-Stillroom") != "1":
            abort(403)

    # ------------------------------------------------------------ pages

    @app.get("/")
    @app.get("/films")
    @app.get("/boards")
    @app.get("/about")
    @app.get("/add")
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
        embedded = c.execute("SELECT COUNT(*) FROM embeddings").fetchone()[0]
        return jsonify({
            "shots": row["shots"] or 0,
            "described": row["described"] or 0,
            "films": c.execute("SELECT COUNT(*) FROM films").fetchone()[0],
            "embedded": embedded,
            "unindexed": (row["shots"] or 0) - embedded,
            "semantic": search.semantic_status(c),
            "semantic_installed": embeddings.available(),
            "tmdb_films": c.execute("SELECT COUNT(*) FROM films WHERE source = 'tmdb'").fetchone()[0],
            "tmdb_notice": TMDB_NOTICE,
            "jobs_active": jobs.active(),
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
            "SELECT s.image, s.frame_time, s.idx, s.origin, f.title, f.year, f.source FROM shots s "
            "JOIN films f ON f.id = s.film_id WHERE s.id = ?", (shot_id,)).fetchone()
        if not row:
            abort(404)
        name = safe_name(f"{row['title']} ({row['year']}) {position(row)}") + ".jpg"
        return send_file(lib.root / row["image"], as_attachment=True, download_name=name)

    @app.get("/api/export.zip")
    def export_selection():
        """Download several stills at once: /api/export.zip?ids=1,2,3"""
        ids = [int(x) for x in re.findall(r"\d+", request.args.get("ids", ""))][:2000]
        if not ids:
            abort(400)
        rows = conn().execute(
            f"""SELECT s.*, f.title, f.year, f.director, f.cinematographer, f.source
                FROM shots s JOIN films f ON f.id = s.film_id
                WHERE s.id IN ({", ".join("?" for _ in ids)})""", ids).fetchall()
        order = {i: n for n, i in enumerate(ids)}
        rows = sorted(rows, key=lambda r: order[r["id"]])
        return zip_of_shots(lib, rows, f"stillroom-{len(rows)}-stills")

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
        """Body: {"shot_id": 5} or {"shot_ids": [5, 6, 7]}."""
        board_or_404(board_id)
        body = request.get_json(silent=True) or {}
        ids = body.get("shot_ids") if "shot_ids" in body else [body.get("shot_id")]
        if not isinstance(ids, list) or not ids or not all(isinstance(i, int) for i in ids):
            abort(400)
        stamp = db.now()
        conn().executemany(
            "INSERT OR IGNORE INTO board_shots (board_id, shot_id, added_at) "
            "SELECT ?, id, ? FROM shots WHERE id = ?", [(board_id, stamp, i) for i in ids])
        conn().commit()
        return jsonify({"ok": True, "added": len(ids)}), 201

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
        return zip_of_shots(lib, rows, b["name"])

    # ------------------------------------------------------------ adding films (Add page)

    def index_new(job, c, film_id):
        """Make a freshly added film findable by picture content (CLIP)."""
        if not film_id or not embeddings.available():
            return
        job.set_progress("indexing for picture search", 0.0)
        search.VECTORS.refresh(c)
        name, pretrained = (search.VECTORS.model or embeddings.model_key()).split("/", 1)
        try:
            clip = embeddings.get_clip(name, pretrained)
            describe.embed_library(c, lib, clip, film=film_id, log=job.log)
        except Exception as e:
            job.log(f"Picture-search indexing skipped: {e}")

    def video_job(path_fn, overrides=None, delete_after=False):
        def run(job, c):
            path = path_fn(job)
            fid = None
            try:
                fid = ingest.ingest_file(lib, c, path, overrides=overrides, log=job.log, progress=job.set_progress)
            finally:
                if delete_after:
                    Path(path).unlink(missing_ok=True)
            index_new(job, c, fid)
            return {"film_id": fid}
        return run

    def downloaded(url, info):
        return lambda job: demo.download({**info, "url": url}, lib.downloads, log=job.log, progress=job.set_progress)

    @app.get("/api/jobs")
    def list_jobs():
        return jsonify(jobs.list())

    @app.get("/api/sources")
    def sources():
        return jsonify({
            "archive_collections": [{"id": k, "label": v} for k, v in archive.COLLECTIONS.items()],
            "tmdb_ready": metadata.tmdb_available(),
            "semantic_installed": embeddings.available(),
            "demo": [{k: f.get(k) for k in ("key", "title", "year", "director", "license", "size_mb")}
                     for f in demo.CATALOG],
        })

    @app.get("/api/sources/archive")
    def archive_search():
        collection = request.args.get("collection", "feature_films")
        if collection not in archive.COLLECTIONS:
            abort(400)
        try:
            docs = archive.search(count=24, query=request.args.get("q") or None,
                                  page=request.args.get("page", 1, type=int), collection=collection)
        except Exception as e:
            return jsonify({"error": f"Internet Archive search failed: {e}"}), 502
        known = {r["slug"] for r in conn().execute("SELECT slug FROM films")}
        out = []
        for d in docs:
            title = archive.clean_title(d.get("title"))
            year = d.get("year")
            out.append({"id": d["identifier"], "title": title, "year": year, "thumb": archive.thumbnail(d["identifier"]),
                        "in_library": metadata.slugify(f"{title} {year or ''}") in known})
        return jsonify(out)

    @app.post("/api/jobs/archive")
    def archive_job():
        body = request.get_json(silent=True) or {}
        identifier, collection = body.get("id"), body.get("collection", "feature_films")
        if not identifier or not re.fullmatch(r"[\w.\-]+", identifier) or collection not in archive.COLLECTIONS:
            abort(400)

        def run(job, c):
            url, meta = archive.pick_file(identifier, archive.min_seconds_for(collection))
            info = archive.film_info({"identifier": identifier, "title": meta.get("title"), "year": meta.get("year")}, meta)
            if not url:
                raise RuntimeError("No single-file download of the whole film on the Internet Archive")
            return video_job(downloaded(url, info), info, delete_after=True)(job, c)

        job = jobs.submit("archive", body.get("title") or identifier, run)
        return jsonify(job.to_dict()), 202

    @app.get("/api/sources/loc")
    def loc_search():
        try:
            items = loc.search(request.args.get("q") or None, page=request.args.get("page", 1, type=int), count=24)
        except Exception as e:
            return jsonify({"error": f"Library of Congress search failed: {e}"}), 502
        return jsonify(items)

    @app.post("/api/jobs/loc")
    def loc_job():
        body = request.get_json(silent=True) or {}
        item_id = body.get("id")
        if not item_id or not re.fullmatch(r"[\w.\-]+", item_id):
            abort(400)

        def run(job, c):
            url, info = loc.pick_file(item_id)
            if not url:
                raise RuntimeError("The Library of Congress only streams this film (no public-domain download)")
            return video_job(downloaded(url, info), info, delete_after=True)(job, c)

        job = jobs.submit("loc", body.get("title") or item_id, run)
        return jsonify(job.to_dict()), 202

    @app.post("/api/jobs/demo")
    def demo_job():
        key = (request.get_json(silent=True) or {}).get("key")
        if key not in {f["key"] for f in demo.CATALOG}:
            abort(400)
        film = demo.find([key])[0]
        overrides = {k: film.get(k) for k in ("title", "year", "director", "cinematographer", "genres", "license")}
        job = jobs.submit("demo", film["title"], video_job(
            lambda j: demo.download(film, lib.downloads, log=j.log, progress=j.set_progress), overrides))
        return jsonify(job.to_dict()), 202

    @app.get("/api/sources/tmdb")
    def tmdb_search():
        if not metadata.tmdb_available():
            return jsonify({"error": "Add a TMDB API key first."}), 400
        try:
            return jsonify(tmdb.search_movies(request.args.get("q", "")))
        except urllib.error.HTTPError as e:
            if e.code == 401:
                return jsonify({"error": "TMDB didn't accept that API key. Copy the \"API Key\" from "
                                         "themoviedb.org → Settings → API and save it again."}), 400
            return jsonify({"error": f"TMDB search failed: {e}"}), 502
        except Exception as e:
            return jsonify({"error": f"TMDB search failed: {e}"}), 502

    @app.post("/api/jobs/tmdb")
    def tmdb_job():
        body = request.get_json(silent=True) or {}
        movie_id = body.get("id")
        if not isinstance(movie_id, int) or not metadata.tmdb_available():
            abort(400)

        def run(job, c):
            job.set_progress("downloading stills", 0.2)
            fid = tmdb.import_movie(lib, c, movie_id, log=job.log)
            index_new(job, c, fid)
            return {"film_id": fid}

        job = jobs.submit("tmdb", body.get("title") or f"TMDB {movie_id}", run)
        return jsonify(job.to_dict()), 202

    @app.post("/api/jobs/video")
    def local_video_job():
        """Ingest a video file (or a folder of them) already on this computer."""
        raw = ((request.get_json(silent=True) or {}).get("path") or "").strip().strip('"')
        path = Path(raw).expanduser()
        if not raw or not path.exists():
            return jsonify({"error": f"Not found on this computer: {raw}"}), 400
        videos = ingest.find_videos(path)
        if not videos:
            return jsonify({"error": "No video files there."}), 400
        submitted = [jobs.submit("video", v.name, video_job(lambda j, v=v: v)).to_dict() for v in videos]
        return jsonify(submitted), 202

    @app.post("/api/jobs/images")
    def images_job():
        """Upload screenshots / stills (multipart: files, title, year, director)."""
        files = request.files.getlist("files")
        items = [(f.filename or "image", f.read()) for f in files if f]
        if not items:
            return jsonify({"error": "Choose at least one image."}), 400
        form = request.form
        year = form.get("year", "").strip()
        meta = {"title": form.get("title", "").strip() or "My screenshots",
                "year": int(year) if year.isdigit() else None,
                "director": form.get("director", "").strip() or None}

        def run(job, c):
            film_id, added, skipped = images.import_images(lib, c, items, meta, log=job.log, progress=job.set_progress)
            index_new(job, c, film_id)
            return {"film_id": film_id, "added": added, "skipped": skipped}

        job = jobs.submit("images", f"{len(items)} picture(s) for {meta['title']}", run)
        return jsonify(job.to_dict()), 202

    @app.post("/api/jobs/embed")
    def embed_job():
        if not embeddings.available():
            return jsonify({"error": "Picture search isn't installed (requirements-ai.txt)."}), 400

        def run(job, c):
            search.VECTORS.refresh(c)
            name, pretrained = (search.VECTORS.model or embeddings.model_key()).split("/", 1)
            clip = embeddings.get_clip(name, pretrained)
            return {"embedded": describe.embed_library(c, lib, clip, log=job.log)}

        job = jobs.submit("embed", "Index stills for picture search", run)
        return jsonify(job.to_dict()), 202

    @app.get("/api/settings")
    def get_settings():
        key = lib.load_settings().get("tmdb_api_key") or ""
        return jsonify({"tmdb_ready": metadata.tmdb_available(),
                        "tmdb_key_hint": f"…{key[-4:]}" if key else ""})

    @app.post("/api/settings")
    def set_settings():
        body = request.get_json(silent=True) or {}
        if "tmdb_api_key" in body:
            key = str(body["tmdb_api_key"] or "").strip()
            if key and not re.fullmatch(r"[\w.\-]{16,400}", key):
                return jsonify({"error": "That doesn't look like a TMDB API key."}), 400
            lib.save_settings(tmdb_api_key=key)
        return get_settings()

    return app
