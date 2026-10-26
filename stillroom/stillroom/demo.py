"""A starter library of films you are free to use: US public-domain features
from the Internet Archive and Creative Commons films from the Blender Foundation."""

import shutil
import urllib.request

CATALOG = [
    {
        "key": "tears-of-steel", "title": "Tears of Steel", "year": 2012, "director": "Ian Hubert",
        "genres": ["Sci-Fi", "Short"], "license": "CC BY 3.0 - (c) Blender Foundation | mango.blender.org",
        "url": "https://download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov", "size_mb": 372,
    },
    {
        "key": "royal-wedding", "title": "Royal Wedding", "year": 1951, "director": "Stanley Donen",
        "cinematographer": "Robert H. Planck", "genres": ["Musical", "Romance"],
        "license": "Public domain (Internet Archive)",
        "url": "https://archive.org/download/royal_wedding/royal_wedding.mp4", "size_mb": 572,
    },
    {
        "key": "the-stranger", "title": "The Stranger", "year": 1946, "director": "Orson Welles",
        "cinematographer": "Russell Metty", "genres": ["Film-Noir", "Thriller"],
        "license": "Public domain (Internet Archive)",
        "url": "https://archive.org/download/TheStranger_0/The_Stranger.mp4", "size_mb": 570,
    },
    {
        "key": "night-of-the-living-dead", "title": "Night of the Living Dead", "year": 1968,
        "director": "George A. Romero", "cinematographer": "George A. Romero", "genres": ["Horror"],
        "license": "Public domain (Internet Archive)",
        "url": "https://archive.org/download/Night.Of.The.Living.Dead_1080p/NightOfTheLivingDead_720p.mp4",
        "size_mb": 597,
    },
    {
        "key": "sherlock-jr", "title": "Sherlock Jr.", "year": 1924, "director": "Buster Keaton",
        "cinematographer": "Elgin Lessley, Byron Houck", "genres": ["Comedy", "Silent"],
        "license": "Public domain (Internet Archive)",
        "url": "https://archive.org/download/sherlockjr1924_201909/"
               "Sherlock%20Jr.%20-%20Buster%20Keaton%20%281924%29%20HD%20%5B720p%5D.mp4",
        "size_mb": 354,
    },
    {
        "key": "scarlet-street", "title": "Scarlet Street", "year": 1945, "director": "Fritz Lang",
        "cinematographer": "Milton R. Krasner", "genres": ["Film-Noir", "Crime"],
        "license": "Public domain (Internet Archive)",
        "url": "https://archive.org/download/ScarletStreet/Scarlet_Street.mp4", "size_mb": 633,
    },
    {
        "key": "his-girl-friday", "title": "His Girl Friday", "year": 1940, "director": "Howard Hawks",
        "cinematographer": "Joseph Walker", "genres": ["Comedy", "Romance"],
        "license": "Public domain (Internet Archive)",
        "url": "https://archive.org/download/his_girl_friday/his_girl_friday.mp4", "size_mb": 575,
    },
    {
        "key": "carnival-of-souls", "title": "Carnival of Souls", "year": 1962, "director": "Herk Harvey",
        "cinematographer": "Maurice Prather", "genres": ["Horror"],
        "license": "Public domain (Internet Archive)",
        "url": "https://archive.org/download/CarnivalofSouls/CarnivalOfSouls.mp4", "size_mb": 518,
    },
    {
        "key": "detour", "title": "Detour", "year": 1945, "director": "Edgar G. Ulmer",
        "cinematographer": "Benjamin H. Kline", "genres": ["Film-Noir"],
        "license": "Public domain (Internet Archive)",
        "url": "https://archive.org/download/Detour/Detour.mp4", "size_mb": 423,
    },
    {
        "key": "the-last-man-on-earth", "title": "The Last Man on Earth", "year": 1964,
        "director": "Ubaldo Ragona, Sidney Salkow", "cinematographer": "Franco Delli Colli",
        "genres": ["Horror", "Sci-Fi"], "license": "Public domain (Internet Archive)",
        "url": "https://archive.org/download/TheLastManOnEarth_72/the_last_man_on_earth.mp4", "size_mb": 539,
    },
]

DEFAULT_KEYS = ["tears-of-steel", "royal-wedding", "the-stranger"]


def find(keys):
    by_key = {f["key"]: f for f in CATALOG}
    missing = [k for k in keys if k not in by_key]
    if missing:
        raise SystemExit(f"Unknown demo film(s): {', '.join(missing)}. Run `stillroom demo --list`.")
    return [by_key[k] for k in keys]


def download(film, dest_dir, log=print):
    dest_dir.mkdir(parents=True, exist_ok=True)
    ext = film["url"].rsplit(".", 1)[-1]
    dest = dest_dir / f"{film['title']} ({film['year']}).{ext}"
    if dest.exists() and dest.stat().st_size > 1_000_000:
        return dest
    log(f"Downloading {film['title']} (~{film['size_mb']} MB)...")
    tmp = dest.with_suffix(dest.suffix + ".part")
    req = urllib.request.Request(film["url"], headers={"User-Agent": "stillroom/0.1"})
    with urllib.request.urlopen(req, timeout=60) as resp, open(tmp, "wb") as out:
        shutil.copyfileobj(resp, out, length=1 << 20)
    tmp.rename(dest)
    return dest
