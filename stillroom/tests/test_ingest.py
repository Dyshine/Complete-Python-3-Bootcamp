import shutil
import subprocess

import pytest

from stillroom import db, ingest
from stillroom.config import IngestSettings, Library

pytestmark = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")


@pytest.fixture(scope="module")
def clip(tmp_path_factory):
    """5 shots (3s, 2.5s, 3s, 4s, 2s) on a 2.39:1 picture letterboxed into 16:9."""
    out = tmp_path_factory.mktemp("media") / "Synthetic Test (2020).mp4"
    size = "640x268"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-f", "lavfi", "-i", f"testsrc2=size={size}:rate=24:duration=3",
        "-f", "lavfi", "-i", f"color=c=0x2040a0:size={size}:rate=24:duration=2.5",
        "-f", "lavfi", "-i", f"mandelbrot=size={size}:rate=24",
        "-f", "lavfi", "-i", f"color=c=0xd08030:size={size}:rate=24:duration=4",
        "-f", "lavfi", "-i", f"smptebars=size={size}:rate=24:duration=2",
        "-filter_complex",
        "[2:v]trim=duration=3,setpts=PTS-STARTPTS[m];[0:v][1:v][m][3:v][4:v]concat=n=5:v=1:a=0,"
        "pad=640:360:0:46:black,format=yuv420p[v]",
        "-map", "[v]", "-c:v", "libx264", "-preset", "veryfast", str(out),
    ], check=True)
    return out


def test_ingest_detects_shots_and_letterbox(tmp_path, clip):
    lib = Library(tmp_path / "lib").ensure()
    conn = db.connect(lib.db_path)
    logs = []
    film_id = ingest.ingest_file(lib, conn, clip, IngestSettings(workers=2), {"director": "Test Bot"},
                                 log=logs.append)
    film = conn.execute("SELECT * FROM films WHERE id = ?", (film_id,)).fetchone()
    assert film["title"] == "Synthetic Test" and film["year"] == 2020 and film["director"] == "Test Bot"
    assert film["aspect_ratio"] == 2.39
    shots = conn.execute("SELECT * FROM shots WHERE film_id = ? ORDER BY idx", (film_id,)).fetchall()
    starts = [round(s["t_start"], 1) for s in shots]
    assert starts == [0.0, 3.0, 5.5, 8.5, 12.5]
    for s in shots:
        assert s["t_start"] <= s["frame_time"] <= s["t_end"]
        assert (lib.root / s["image"]).exists() and (lib.root / s["thumb"]).exists()
        assert round(s["width"] / s["height"], 2) == 2.39   # black bars removed
    assert "blue" in shots[1]["colors"]
    assert conn.execute("SELECT COUNT(*) FROM shots_fts").fetchone()[0] == 5

    # Re-ingesting skips unless replace=True.
    assert ingest.ingest_file(lib, conn, clip, log=logs.append) is None
    new_id = ingest.ingest_file(lib, conn, clip, IngestSettings(workers=2), replace=True, log=logs.append)
    assert conn.execute("SELECT COUNT(*) FROM shots WHERE film_id = ?", (new_id,)).fetchone()[0] == 5
    assert conn.execute("SELECT COUNT(*) FROM shots").fetchone()[0] == 5
    assert conn.execute("SELECT COUNT(*) FROM shots_fts").fetchone()[0] == 5
