import io

from PIL import Image

from stillroom import archive, db, tmdb
from stillroom.server import create_app


# ---------------------------------------------------------------- Internet Archive

def test_archive_pick_file_prefers_whole_film_h264(monkeypatch):
    files = [
        {"name": "film_512kb.mp4", "format": "512Kb MPEG4", "length": "5400", "width": "320"},
        {"name": "film.mp4", "format": "h.264", "length": "5400.2", "width": "640"},
        {"name": "film_1080.mp4", "format": "h.264", "length": "1:30:00", "width": "1920"},
        {"name": "trailer.mp4", "format": "h.264", "length": "120", "width": "640"},
        {"name": "film.ogv", "format": "Ogg Video", "length": "5400"},
    ]
    monkeypatch.setattr(archive, "_get_json", lambda url: {"files": files, "metadata": {"title": "X"}})
    url, meta = archive.pick_file("some_id")
    assert url == "https://archive.org/download/some_id/film.mp4"
    assert meta["title"] == "X"


def test_archive_skips_films_split_into_parts(monkeypatch):
    parts = [{"name": f"part{i}.mp4", "format": "h.264", "length": "1300"} for i in range(5)]
    monkeypatch.setattr(archive, "_get_json", lambda url: {"files": parts, "metadata": {}})
    assert archive.pick_file("split")[0] is None


def test_archive_film_info():
    info = archive.film_info({"identifier": "abc", "title": "Charade ( 1963) Cary Grant & Audrey Hepburn",
                              "year": "1963"}, {"director": ["Stanley Donen"]})
    assert info == {"title": "Charade", "year": 1963, "director": "Stanley Donen",
                    "license": "Public domain per uploader (Internet Archive: abc)"}


# ---------------------------------------------------------------- TMDB

def jpeg_bytes(rgb, size):
    buf = io.BytesIO()
    Image.new("RGB", size, rgb).save(buf, format="JPEG")
    return buf.getvalue()


def fake_tmdb(monkeypatch, backdrops):
    def get(endpoint, params=None):
        if endpoint == "/search/movie":
            return {"results": [{"id": 77}]}
        if endpoint == "/movie/77":
            return {"id": 77, "title": "Neon Harbour", "release_date": "1987-03-01",
                    "genres": [{"name": "Thriller"}], "overview": "...",
                    "credits": {"crew": [{"job": "Director", "name": "Dee Rector"},
                                         {"job": "Director of Photography", "name": "Cam Era"}]},
                    "images": {"backdrops": backdrops}}
        raise AssertionError(endpoint)

    downloads = []

    def download(url):
        downloads.append(url)
        size = (1280, 720) if "/w1280/" in url else (780, 439)
        return jpeg_bytes((30, 110, 120), size)

    monkeypatch.setattr(tmdb, "_get", get)
    monkeypatch.setattr(tmdb, "_download", download)
    return downloads


def test_tmdb_import(tmp_path, monkeypatch, library):
    lib, conn = library
    backdrops = [
        {"file_path": "/a.jpg", "width": 1920, "height": 1080, "aspect_ratio": 1.778, "vote_count": 2},
        {"file_path": "/b.jpg", "width": 3840, "height": 2160, "aspect_ratio": 1.778, "vote_count": 9},
        {"file_path": "/tiny.jpg", "width": 640, "height": 360, "aspect_ratio": 1.778, "vote_count": 99},
    ]
    downloads = fake_tmdb(monkeypatch, backdrops)
    assert tmdb.search_movie("Neon Harbour", 1987) == 77
    film_id = tmdb.import_movie(lib, conn, 77, limit=5, log=lambda *_: None)

    film = conn.execute("SELECT * FROM films WHERE id = ?", (film_id,)).fetchone()
    assert (film["title"], film["year"], film["source"]) == ("Neon Harbour", 1987, "tmdb")
    assert film["director"] == "Dee Rector" and film["cinematographer"] == "Cam Era"
    shots = conn.execute("SELECT * FROM shots WHERE film_id = ? ORDER BY idx", (film_id,)).fetchall()
    assert len(shots) == 2                                  # the 640px backdrop is skipped
    assert "teal" in shots[0]["colors"]
    # Highest-voted first; stored as served: full size + TMDB's own thumbnail size, no resizing.
    assert [b["file_path"] for b in tmdb.pick_backdrops({"images": {"backdrops": backdrops}}, 5)] == ["/b.jpg", "/a.jpg"]
    base = "https://image.tmdb.org/t/p/"
    assert sorted(downloads) == sorted(base + s + f for s in ("w1280", "w780") for f in ("/a.jpg", "/b.jpg"))
    assert Image.open(lib.root / shots[0]["thumb"]).size == (780, 439)

    # A second import is skipped; the API shows TMDB stills without timecodes.
    assert tmdb.import_movie(lib, conn, 77, log=lambda *_: None) is None
    app = create_app(lib.root)
    c = app.test_client()
    c.environ_base["HTTP_X_STILLROOM"] = "1"
    detail = c.get(f"/api/shots/{shots[0]['id']}").get_json()
    assert detail["source"] == "tmdb"
    r = c.get("/api/search?source=tmdb&facets=1").get_json()
    assert r["total"] == 2
    assert {f["value"] for f in r["facets"]["source"]} == {"tmdb", "video"}
    stats = c.get("/api/stats").get_json()
    assert stats["tmdb_films"] == 1 and "not endorsed" in stats["tmdb_notice"]
    disposition = c.get(f"/api/shots/{shots[0]['id']}/download").headers["Content-Disposition"]
    assert "still 1" in disposition


def test_tmdb_never_overwrites_real_frames(monkeypatch, library):
    lib, conn = library
    fake_tmdb(monkeypatch, [{"file_path": "/a.jpg", "width": 1920, "height": 1080}])
    db.upsert_film(conn, {"slug": "neon-harbour-1987", "title": "Neon Harbour", "year": 1987})
    assert tmdb.import_movie(lib, conn, 77, replace=True, log=lambda *_: None) is None


def test_tmdb_expiry_and_purge(monkeypatch, library):
    lib, conn = library
    fake_tmdb(monkeypatch, [{"file_path": "/a.jpg", "width": 1920, "height": 1080}])
    film_id = tmdb.import_movie(lib, conn, 77, log=lambda *_: None)
    assert tmdb.expired_films(conn) == []
    conn.execute("UPDATE films SET added_at = '2020-01-01T00:00:00+00:00' WHERE id = ?", (film_id,))
    assert [r["tmdb_id"] for r in tmdb.expired_films(conn)] == [77]
    slug = conn.execute("SELECT slug FROM films WHERE id = ?", (film_id,)).fetchone()["slug"]
    assert tmdb.purge(lib, conn, log=lambda *_: None) == 1
    assert conn.execute("SELECT COUNT(*) FROM films WHERE source = 'tmdb'").fetchone()[0] == 0
    assert not (lib.frames / slug).exists()
    assert conn.execute("SELECT COUNT(*) FROM shots").fetchone()[0] == 5   # video films untouched


def test_old_libraries_get_the_source_column(tmp_path):
    import sqlite3

    path = tmp_path / "old.db"
    old = sqlite3.connect(path)
    old.execute("CREATE TABLE films (id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL)")
    old.execute("INSERT INTO films (slug, title) VALUES ('x', 'X')")
    old.commit()
    old.close()
    conn = db.connect(path)
    assert conn.execute("SELECT source FROM films").fetchone()[0] == "video"
