import io
import zipfile

from stillroom import search
from stillroom.server import create_app


def ids_for(conn, **kw):
    r = search.search(conn, per_page=50, **kw)
    return [x["description"] for x in r["results"]], r


def test_parse_query():
    phrases, words, exclude = search.parse_query('woman "red dress" in the rain -car')
    assert phrases == ["red dress"]
    assert words == ["woman", "rain"]
    assert exclude == ["car"]


def test_text_search_prefix_and_stemming(library):
    _, conn = library
    descs, r = ids_for(conn, q="smoking")          # porter stemmer: smoking -> smoke
    assert r["total"] == 1 and "cigarette" in descs[0]
    descs, _ = ids_for(conn, q="danc")             # prefix match
    assert descs == ["Couple dancing in a ballroom with chandeliers."]


def test_text_search_falls_back_to_any_word(library):
    _, conn = library
    descs, r = ids_for(conn, q="neon spaceship")   # no still has both words
    assert r["total"] == 1 and "neon" in descs[0]


def test_text_search_matches_metadata_and_excludes(library):
    _, conn = library
    _, r = ids_for(conn, q="Ann Example")         # director name lives in the meta column
    assert r["total"] == 3
    descs, r = ids_for(conn, q="woman -neon")
    assert r["total"] == 1 and "red dress" in descs[0]


def test_filters_and_facets(library):
    _, conn = library
    _, r = ids_for(conn, filters={"time_of_day": ["night"]})
    assert r["total"] == 2
    # Facets for a field ignore that field's own filter, so other options stay visible.
    tod = {f["value"]: f["count"] for f in r["facets"]["time_of_day"]}
    assert tod == {"night": 2, "day": 1}
    # OR within a field, AND across fields; multi-value fields match exact values.
    _, r = ids_for(conn, filters={"lighting": ["neon", "backlight"]})
    assert r["total"] == 2
    _, r = ids_for(conn, filters={"lighting": ["neon", "backlight"], "film": ["golden-ballroom-1951"]})
    assert r["total"] == 1
    _, r = ids_for(conn, filters={"lighting": ["light"]})  # partial values must not match
    assert r["total"] == 0
    _, r = ids_for(conn, filters={"decade": ["1950"]})
    assert r["total"] == 2


def test_colour_search(library):
    _, conn = library
    descs, r = ids_for(conn, color="#1e6e78")
    assert r["mode"] == "color"
    assert descs[0].startswith("Close-up of a woman's face lit by a teal")
    descs, r = ids_for(conn, q="woman", color="#b41e32")
    assert r["total"] == 1 and "red dress" in descs[0]


def test_similar_falls_back_to_palette_without_clip(library):
    _, conn = library
    first = conn.execute("SELECT id FROM shots WHERE description LIKE 'A man in a fedora%'").fetchone()[0]
    assert first not in search.similar_ids(conn, first)


def test_rrf_prefers_items_ranked_by_both():
    assert search.rrf([1, 2, 3], [3, 4, 1])[0] in (1, 3)
    assert search.rrf([1, 2], [2, 1], weights=[1, 2])[0] == 2


def test_sort_random_is_stable_per_seed(library):
    _, conn = library
    a = [x["id"] for x in search.search(conn, sort="random", seed=7)["results"]]
    b = [x["id"] for x in search.search(conn, sort="random", seed=7)["results"]]
    assert a == b


# ---------------------------------------------------------------- HTTP

def client_for(library):
    lib, _ = library
    app = create_app(lib.root)
    app.testing = True
    c = app.test_client()
    c.environ_base["HTTP_X_STILLROOM"] = "1"   # what the real front end sends on every change
    return c


def test_changes_need_the_app_header_and_a_local_host(library):
    lib, _ = library
    app = create_app(lib.root)
    bare = app.test_client()
    assert bare.post("/api/boards", json={"name": "x"}).status_code == 403
    assert bare.get("/api/stats").status_code == 200
    # DNS rebinding: a request arriving under some other host name is refused...
    assert bare.get("/api/stats", headers={"Host": "evil.example:8765"}).status_code == 403
    # ...unless the user chose to share on their network (serve --host 0.0.0.0).
    shared = create_app(lib.root, local_only=False).test_client()
    assert shared.get("/api/stats", headers={"Host": "192.168.1.20:8765"}).status_code == 200


def test_api_search_and_detail(library):
    c = client_for(library)
    r = c.get("/api/search?q=chandelier").get_json()
    assert r["total"] == 1
    shot = r["results"][0]
    detail = c.get(f"/api/shots/{shot['id']}").get_json()
    assert detail["title"] == "Golden Ballroom"
    assert detail["timecode"] == "00:00:12"
    assert "chandelier" in detail["tags"]
    assert c.get(shot["thumb"]).status_code == 200
    # hex= is the exact colour search, color= the colour-family filter
    assert c.get("/api/search?hex=%23b41e32&facets=0").get_json()["mode"] == "color"
    assert c.get("/api/search?hex=nonsense&facets=0").get_json()["mode"] == "browse"


def test_media_is_confined_to_stills(library):
    c = client_for(library)
    assert c.get("/media/stillroom.db").status_code == 404
    assert c.get("/media/frames/../stillroom.db").status_code == 404


def test_boards_crud_and_export(library):
    c = client_for(library)
    board = c.post("/api/boards", json={"name": "Night look"}).get_json()
    shot_ids = [s["id"] for s in c.get("/api/search?filters=0&time_of_day=night").get_json()["results"]]
    for sid in shot_ids:
        assert c.post(f"/api/boards/{board['id']}/shots", json={"shot_id": sid}).status_code == 201
    assert c.post(f"/api/boards/{board['id']}/shots", json={"shot_id": "x"}).status_code == 400
    listing = c.get("/api/boards").get_json()
    assert listing[0]["count"] == 2
    detail = c.get(f"/api/boards/{board['id']}").get_json()
    assert [s["id"] for s in detail["shots"]] == shot_ids
    assert board["id"] in c.get(f"/api/shots/{shot_ids[0]}").get_json()["boards"]

    z = zipfile.ZipFile(io.BytesIO(c.get(f"/api/boards/{board['id']}/export.zip").data))
    names = z.namelist()
    assert "shots.csv" in names and len(names) == 3
    assert "Night Street" in z.read("shots.csv").decode()

    assert c.patch(f"/api/boards/{board['id']}", json={"name": "Renamed"}).get_json()["name"] == "Renamed"
    assert c.delete(f"/api/boards/{board['id']}/shots/{shot_ids[0]}").status_code == 204
    assert c.get(f"/api/boards/{board['id']}").get_json()["shots"][0]["id"] == shot_ids[1]
    assert c.delete(f"/api/boards/{board['id']}").status_code == 204
    assert c.get(f"/api/boards/{board['id']}").status_code == 404


def test_pages_and_films(library):
    c = client_for(library)
    for path in ("/", "/films", "/boards", "/boards/3"):
        assert c.get(path).status_code == 200
    films = c.get("/api/films").get_json()
    assert {f["title"] for f in films} == {"Night Street", "Golden Ballroom"}
    assert all(f["cover"] for f in films)
    assert "source_path" not in films[0]
    stats = c.get("/api/stats").get_json()
    assert stats["shots"] == 5 and stats["films"] == 2
