import json

import pytest
from PIL import Image

from stillroom import analyze, metadata, taxonomy, video


# ---------------------------------------------------------------- taxonomy

def test_normalize_maps_aliases_and_rejects_unknown():
    assert taxonomy.normalize("shot_type", "CU") == "close-up"
    assert taxonomy.normalize("shot_type", "a wide shot") == "wide"
    assert taxonomy.normalize("shot_type", "extreme close-up") == "extreme close-up"
    assert taxonomy.normalize("framing", "OTS") == "over the shoulder"
    assert taxonomy.normalize("time_of_day", "golden hour") == "dusk/dawn"
    assert taxonomy.normalize("angle", "sideways") is None


def test_pack_roundtrip_dedupes():
    packed = taxonomy.pack(["Soft Light", "backlight", "soft light"])
    assert packed == "|soft light|backlight|"
    assert taxonomy.unpack(packed) == ["soft light", "backlight"]
    assert taxonomy.pack([]) == ""


# ---------------------------------------------------------------- analysis

@pytest.mark.parametrize("rgb,family", [
    ((200, 30, 30), "red"), ((30, 60, 200), "blue"), ((20, 130, 140), "teal"), ((240, 240, 240), "white"),
    ((10, 10, 10), "black"), ((120, 120, 120), "gray"), ((230, 130, 30), "orange"), ((40, 140, 60), "green"),
])
def test_color_family(rgb, family):
    assert analyze.color_family("#%02x%02x%02x" % rgb) == family


def test_analyze_dark_cool_frame():
    img = Image.new("RGB", (200, 100), (15, 25, 60))
    s = analyze.analyze(img)
    assert s["light_key"] == "low key"
    assert s["tone"] == "cool"
    assert s["colors"][0] in ("blue", "black")
    assert abs(sum(w for _, w in s["palette"]) - 1.0) < 0.05


def test_analyze_black_and_white_is_monochrome():
    img = Image.linear_gradient("L").convert("RGB").resize((200, 100))
    s = analyze.analyze(img)
    assert s["tone"] == "monochrome"
    assert set(s["colors"]) <= {"black", "gray", "white"}
    assert "Black and white" in analyze.heuristic_description(s)


def test_hex_to_lab_reference_values():
    lab = analyze.hex_to_lab(["#ffffff", "#000000"])
    assert lab[0][0] == pytest.approx(100, abs=0.5)
    assert lab[1][0] == pytest.approx(0, abs=0.5)


# ---------------------------------------------------------------- shot logic

def test_pick_cuts_ignores_pulldown_spikes_but_keeps_soft_cut():
    # Camera move on telecined video: a 0.15 spike every 5th frame.
    scores = [0.15 if i % 5 == 0 else 0.004 for i in range(60)]
    times = [i / 30 for i in range(60)]
    assert video.pick_cuts(times, scores) == []
    # A lone 0.2 jump between two static shots is a cut even below 0.3.
    scores = [0.01] * 60
    scores[30] = 0.2
    assert video.pick_cuts(times, scores) == [times[30]]
    # Anything above the hard threshold is always a cut.
    scores[10] = 0.5
    assert video.pick_cuts(times, scores) == [times[10], times[30]]


def test_cuts_to_shots_merges_short_and_splits_long():
    shots = video.cuts_to_shots([0.2, 5.0, 5.3, 50.0], 60.0, min_len=0.6, max_len=20.0)
    # 0.2 is too close to the start, 5.3 too close to 5.0; 5-50 is split in two.
    assert shots[0] == (0.0, 5.0)
    assert len([s for s in shots if s[0] >= 5.0 and s[1] <= 50.0]) == 2
    assert shots[-1] == (50.0, 60.0)
    assert all(b - a <= 25 for a, b in shots)


def test_cuts_to_shots_skips_head_and_tail():
    shots = video.cuts_to_shots([10, 20, 30, 40], 50, skip_head=15, skip_tail=12)
    assert shots[0][0] == 15
    assert shots[-1][1] == 38


def test_snap_ratio():
    assert video.snap_ratio(1280 / 536) == 2.39
    assert video.snap_ratio(4 / 3) == 1.33
    assert video.snap_ratio(1.6) == 1.6


# ---------------------------------------------------------------- metadata

@pytest.mark.parametrize("name,title,year", [
    ("Blade Runner (1982).mkv", "Blade Runner", 1982),
    ("2001 A Space Odyssey (1968) 1080p BluRay.mkv", "2001 A Space Odyssey", 1968),
    ("The.Third.Man.1949.1080p.x264.mkv", "The Third Man", 1949),
    ("home_movie.mp4", "home movie", None),
    ("Sherlock Jr. (1924).mp4", "Sherlock Jr.", 1924),
    ("Mr. Smith Goes to Washington (1939).mkv", "Mr. Smith Goes to Washington", 1939),
])
def test_parse_filename(name, title, year):
    meta = metadata.parse_filename(name)
    assert meta["title"] == title
    assert meta["year"] == year


def test_sidecar_overrides(tmp_path):
    video_file = tmp_path / "Movie (2000).mp4"
    video_file.write_bytes(b"")
    (tmp_path / "Movie (2000).json").write_text(json.dumps({"director": "Someone", "genres": ["Drama"]}))
    assert metadata.read_sidecar(video_file) == {"director": "Someone", "genres": ["Drama"]}


def test_tmdb_lookup(monkeypatch):
    calls = []

    def fake_get(endpoint, params):
        calls.append(endpoint)
        if endpoint == "/search/movie":
            return {"results": [{"id": 42}]}
        return {"id": 42, "title": "The Film", "release_date": "1999-05-01",
                "genres": [{"name": "Drama"}], "overview": "...",
                "credits": {"crew": [{"job": "Director", "name": "D. Rector"},
                                     {"job": "Director of Photography", "name": "C. Inema"},
                                     {"job": "Director of Photography", "name": "C. Inema"}]}}

    monkeypatch.setattr(metadata, "_tmdb_get", fake_get)
    found = metadata.tmdb_lookup("the film", 1999)
    assert found["director"] == "D. Rector"
    assert found["cinematographer"] == "C. Inema"
    assert found["genres"] == ["Drama"]
    assert found["year"] == 1999
    assert calls == ["/search/movie", "/movie/42"]


def test_slugify():
    assert metadata.slugify("Amélie (2001)") == "amelie-2001"
