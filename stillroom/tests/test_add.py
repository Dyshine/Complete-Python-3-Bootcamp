import io
import time
import zipfile

import numpy as np
import pytest
from PIL import Image

from stillroom import archive, embeddings, images, loc
from stillroom.server import create_app


def png(size=(1280, 720), picture=(1280, 534), rgb=(40, 120, 160)):
    """A frame letterboxed into `size` with black bars, as a screenshot would be."""
    img = Image.new("RGB", size, (0, 0, 0))
    img.paste(Image.new("RGB", picture, rgb), ((size[0] - picture[0]) // 2, (size[1] - picture[1]) // 2))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture(autouse=True)
def no_clip(monkeypatch):
    # Keep the tests fast and offline: don't load CLIP for indexing.
    monkeypatch.setattr(embeddings, "available", lambda: False)


def client(lib):
    app = create_app(lib.root)
    c = app.test_client()
    c.environ_base["HTTP_X_STILLROOM"] = "1"
    return app, c


def wait_for_jobs(app, timeout=20):
    end = time.time() + timeout
    while time.time() < end:
        jobs = app.jobs.list()
        if jobs and all(j["status"] in ("done", "failed") for j in jobs):
            return jobs
        time.sleep(0.05)
    raise AssertionError(f"jobs still running: {app.jobs.list()}")


# ---------------------------------------------------------------- screenshots

def test_trim_borders_removes_bars_but_not_dark_picture():
    img = Image.open(io.BytesIO(png()))
    assert images.trim_borders(img).size == (1280, 534)
    pillar = Image.open(io.BytesIO(png(size=(1280, 720), picture=(960, 720))))
    assert images.trim_borders(pillar).size == (960, 720)
    # A night scene whose left side is very dark but not uniformly black stays whole.
    a = np.full((400, 600, 3), 90, dtype=np.uint8)
    a[:, :150] = 6
    a[::7, :150] = 120          # street lights / stars in the dark part
    dark = Image.fromarray(a)
    assert images.trim_borders(dark).size == (600, 400)


def test_import_images_dedupes_and_appends(library):
    lib, conn = library
    meta = {"title": "Night Street", "year": 1946}    # an existing film from the fixture
    film_id, added, skipped = images.import_images(lib, conn, [("a.png", png()), ("b.png", png(rgb=(200, 40, 40)))],
                                                   meta, log=lambda *_: None)
    assert (added, skipped) == (2, 0)
    rows = conn.execute("SELECT idx, origin, width, height FROM shots WHERE film_id = ? ORDER BY idx", (film_id,)).fetchall()
    assert [r["idx"] for r in rows] == [1, 2, 3, 4, 5]      # appended after the 3 frames already there
    assert rows[-1]["origin"] == "image" and (rows[-1]["width"], rows[-1]["height"]) == (1280, 534)
    _, added, skipped = images.import_images(lib, conn, [("a-again.png", png())], meta, log=lambda *_: None)
    assert (added, skipped) == (0, 1)
    _, added, skipped = images.import_images(lib, conn, [("junk.png", b"not an image")], meta, log=lambda *_: None)
    assert (added, skipped) == (0, 1)


def test_upload_screenshots_through_the_api(library):
    lib, _ = library
    app, c = client(lib)
    data = {"title": "My Film", "year": "1999", "files": [(io.BytesIO(png()), "one.png"),
                                                          (io.BytesIO(png(rgb=(10, 200, 10))), "two.png")]}
    r = c.post("/api/jobs/images", data=data, content_type="multipart/form-data")
    assert r.status_code == 202
    job = wait_for_jobs(app)[0]
    assert job["status"] == "done" and job["result"]["added"] == 2
    found = c.get("/api/search?source=images").get_json()
    assert found["total"] == 2 and all(s["origin"] == "image" for s in found["results"])
    assert c.post("/api/jobs/images", data={"title": "x"}, content_type="multipart/form-data").status_code == 400


# ---------------------------------------------------------------- selection

def test_bulk_board_add_and_selection_export(library):
    lib, conn = library
    _, c = client(lib)
    ids = [r["id"] for r in conn.execute("SELECT id FROM shots ORDER BY id")]
    board = c.post("/api/boards", json={"name": "Picked"}).get_json()
    assert c.post(f"/api/boards/{board['id']}/shots", json={"shot_ids": ids[:3] + [999999]}).status_code == 201
    assert len(c.get(f"/api/boards/{board['id']}").get_json()["shots"]) == 3   # unknown ids are ignored
    assert c.post(f"/api/boards/{board['id']}/shots", json={"shot_ids": ["x"]}).status_code == 400
    z = zipfile.ZipFile(io.BytesIO(c.get(f"/api/export.zip?ids={ids[1]},{ids[0]}").data))
    names = z.namelist()
    assert len(names) == 3 and names[0].startswith("001 ") and "shots.csv" in names
    assert c.get("/api/export.zip?ids=").status_code == 400


# ---------------------------------------------------------------- online sources

def test_archive_search_endpoint(library, monkeypatch):
    lib, _ = library
    _, c = client(lib)
    seen = {}

    def fake_search(**kw):
        seen.update(kw)
        return [{"identifier": "night_st", "title": "Night Street (1946)", "year": "1946"},
                {"identifier": "other_one", "title": "Other One", "year": "1950"}]

    monkeypatch.setattr(archive, "search", fake_search)
    out = c.get("/api/sources/archive?collection=Film_Noir&q=night").get_json()
    assert seen["collection"] == "Film_Noir" and seen["query"] == "night"
    assert out[0]["in_library"] is True and out[1]["in_library"] is False
    assert out[0]["thumb"].endswith("/services/img/night_st")
    assert c.get("/api/sources/archive?collection=../../etc").status_code == 400


def test_archive_job_reports_split_films(library, monkeypatch):
    lib, _ = library
    app, c = client(lib)
    monkeypatch.setattr(archive, "pick_file", lambda ident, min_seconds: (None, {"title": "Split"}))
    assert c.post("/api/jobs/archive", json={"id": "split_film", "collection": "prelinger"}).status_code == 202
    job = wait_for_jobs(app)[0]
    assert job["status"] == "failed" and "single-file" in job["message"]
    assert c.post("/api/jobs/archive", json={"id": "bad id!"}).status_code == 400


def test_loc_pick_file(monkeypatch):
    item = {"item": {"title": "A film.", "date": "1922"},
            "resources": [{"files": [[{"mimetype": "video/mp4", "url": "big.mp4", "size": 900},
                                      {"mimetype": "video/mp4", "url": "small.mp4", "size": 300},
                                      {"mimetype": "image/jpeg", "url": "x.jpg"}]]}]}
    monkeypatch.setattr(loc, "_get_json", lambda url: item)
    url, info = loc.pick_file("abc")
    assert url == "small.mp4" and info["title"] == "A film" and info["year"] == 1922
    monkeypatch.setattr(loc, "_get_json", lambda url: {**item, "item": {**item["item"], "access_restricted": True}})
    assert loc.pick_file("abc")[0] is None


def test_local_video_job_validates_path(library, tmp_path):
    lib, _ = library
    _, c = client(lib)
    assert c.post("/api/jobs/video", json={"path": str(tmp_path / "missing.mp4")}).status_code == 400
    assert c.post("/api/jobs/video", json={"path": str(tmp_path)}).get_json()["error"] == "No video files there."


def test_tmdb_key_settings(library, monkeypatch):
    monkeypatch.delenv("TMDB_API_KEY", raising=False)
    monkeypatch.delenv("TMDB_TOKEN", raising=False)
    lib, _ = library
    _, c = client(lib)
    assert c.get("/api/settings").get_json()["tmdb_ready"] is False
    assert c.post("/api/settings", json={"tmdb_api_key": "bad key!"}).status_code == 400
    st = c.post("/api/settings", json={"tmdb_api_key": "0123456789abcdef0123456789abcdef"}).get_json()
    assert st == {"tmdb_ready": True, "tmdb_key_hint": "…cdef"}
    assert c.get("/api/sources").get_json()["tmdb_ready"] is True
    assert c.post("/api/settings", json={"tmdb_api_key": ""}).get_json()["tmdb_ready"] is False
