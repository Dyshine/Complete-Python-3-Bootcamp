import sys
from pathlib import Path

import pytest
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from stillroom import analyze, db  # noqa: E402
from stillroom.config import Library  # noqa: E402

SHOTS = [
    # (film, rgb, description, tags, extra fields)
    ("noir", (20, 24, 40), "A man in a fedora smokes a cigarette under a streetlight in the rain.",
     "rain, cigarette, fedora, streetlight", {"shot_type": "medium", "time_of_day": "night", "int_ext": "exterior",
                                              "lighting": ["hard light", "low key"]}),
    ("noir", (200, 190, 170), "Two detectives argue across a desk in a bright office.",
     "office, desk, detectives", {"shot_type": "wide", "time_of_day": "day", "int_ext": "interior",
                                  "lighting": ["soft light"]}),
    ("noir", (30, 110, 120), "Close-up of a woman's face lit by a teal neon sign.",
     "neon, woman, face", {"shot_type": "close-up", "time_of_day": "night", "int_ext": "exterior",
                           "lighting": ["neon"]}),
    ("musical", (220, 120, 40), "Couple dancing in a ballroom with chandeliers.",
     "dancing, ballroom, chandelier", {"shot_type": "wide", "int_ext": "interior",
                                       "lighting": ["high key"]}),
    ("musical", (180, 30, 50), "A woman in a red dress sings on a stage.",
     "singing, stage, red dress", {"shot_type": "medium", "int_ext": "interior", "lighting": ["backlight"]}),
]

FILMS = {
    "noir": {"slug": "night-street-1946", "title": "Night Street", "year": 1946, "director": "Ann Example",
             "cinematographer": "Bo Lens", "genres": ["Film-Noir"]},
    "musical": {"slug": "golden-ballroom-1951", "title": "Golden Ballroom", "year": 1951, "director": "Cy Sample",
                "genres": ["Musical", "Romance"]},
}


@pytest.fixture
def library(tmp_path):
    """A small library with real (solid-colour) images and described shots."""
    lib = Library(tmp_path / "lib").ensure()
    conn = db.connect(lib.db_path)
    film_ids = {k: db.upsert_film(conn, {**v, "aspect_ratio": 1.85}) for k, v in FILMS.items()}
    counters = {}
    for film, rgb, desc, tags, extra in SHOTS:
        counters[film] = counters.get(film, 0) + 1
        idx = counters[film]
        slug = FILMS[film]["slug"]
        for base in (lib.frames, lib.thumbs):
            (base / slug).mkdir(parents=True, exist_ok=True)
            Image.new("RGB", (370, 200), rgb).save(base / slug / f"{idx:05d}.jpg")
        stats = analyze.analyze(Image.new("RGB", (370, 200), rgb))
        shot_id = db.insert_shot(conn, {
            "film_id": film_ids[film], "idx": idx, "t_start": idx * 10.0, "t_end": idx * 10.0 + 4,
            "frame_time": idx * 10.0 + 2, "image": f"frames/{slug}/{idx:05d}.jpg",
            "thumb": f"thumbs/{slug}/{idx:05d}.jpg", "width": 370, "height": 200, **stats,
        })
        db.update_description(conn, shot_id, {"description": desc, "tags": tags, **extra}, "test")
    conn.commit()
    yield lib, conn
    conn.close()
