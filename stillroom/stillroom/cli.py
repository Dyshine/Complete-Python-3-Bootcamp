"""Command line: `python -m stillroom <command>`."""

import argparse
import sys

from . import db, demo, describe, embeddings, ingest, metadata
from .config import IngestSettings, Library


def _lib(args):
    lib = Library(args.library).ensure()
    lib.apply_settings()
    return lib


def cmd_ingest(args):
    lib = _lib(args)
    conn = db.connect(lib.db_path)
    settings = IngestSettings(
        scene_threshold=args.threshold, min_shot_seconds=args.min_shot, max_shot_seconds=args.max_shot,
        skip_head_seconds=args.skip_head, skip_tail_seconds=args.skip_tail,
        workers=args.workers or IngestSettings().workers,
    )
    videos = ingest.find_videos(args.path)
    if not videos:
        sys.exit(f"No video files found at {args.path}")
    overrides = {
        "title": args.title, "year": args.year, "director": args.director,
        "cinematographer": args.dp, "license": args.license,
        "genres": [g.strip() for g in args.genres.split(",")] if args.genres else None,
    }
    if len(videos) > 1 and (args.title or args.year):
        sys.exit("--title/--year only make sense for a single file")
    film_ids = []
    for v in videos:
        fid = ingest.ingest_file(lib, conn, v, settings, overrides, detector=args.detector,
                                 use_tmdb=args.tmdb, replace=args.replace, candidates=args.candidates)
        if fid:
            film_ids.append(fid)
    if args.embed and film_ids:
        _embed(conn, lib, films=film_ids)
    print(f"\nDone. Run `python -m stillroom serve --library {lib.root}` to browse.")


def _embed(conn, lib, films=None, model=embeddings.DEFAULT_MODEL, pretrained=embeddings.DEFAULT_PRETRAINED,
           labels=True):
    if not embeddings.available():
        print("Semantic search needs PyTorch + OpenCLIP: pip install -r requirements-ai.txt")
        return
    print(f"Loading CLIP {model} ({pretrained})...")
    clip = embeddings.get_clip(model, pretrained)
    for film in films or [None]:
        n = describe.embed_library(conn, lib, clip, film=film, labels=labels)
        print(f"Embedded {n} stills" + (f" for film {film}" if film else ""))


def cmd_embed(args):
    lib = _lib(args)
    _embed(db.connect(lib.db_path), lib, films=[args.film] if args.film else None,
           model=args.model, pretrained=args.pretrained, labels=not args.no_labels)


def cmd_describe(args):
    lib = _lib(args)
    conn = db.connect(lib.db_path)
    if args.backend == "claude":
        d = describe.ClaudeDescriber(model=args.model or "claude-opus-5-5", effort=args.effort)
    else:
        d = describe.OllamaDescriber(model=args.model or "qwen2.5vl:7b", host=args.ollama_host)
    if args.batch and args.backend == "claude":
        pending = conn.execute("SELECT COUNT(*) FROM caption_batches WHERE done = 0").fetchone()[0]
        if pending:
            print(f"Collecting {pending} batch(es) submitted earlier...")
            print(f"Stored {d.collect_batches(conn)} descriptions")
    rows = describe.rows_to_describe(conn, film=args.film, redo=args.redo, limit=args.limit)
    if not rows:
        print("Nothing to describe (use --redo to describe stills again).")
        return
    print(f"Describing {len(rows)} stills with {args.backend} ({d.model})...")
    if args.batch and args.backend == "claude":
        print(f"Stored {d.describe_batch(conn, lib, rows)} descriptions")
        return
    # Try one still first so a missing key or a stopped Ollama fails once, clearly.
    try:
        fields = d.describe(rows[0], lib.root / rows[0]["image"])
    except Exception as e:
        hint = ("Set ANTHROPIC_API_KEY (or run `ant auth login`) and check --model."
                if args.backend == "claude" else
                f"Is Ollama running at {args.ollama_host}? Start it and run `ollama pull {d.model}`.")
        sys.exit(f"Could not describe the first still: {type(e).__name__}: {e}\n{hint}")
    if fields:
        db.update_description(conn, rows[0]["id"], fields, describe.describer_label(d))
        conn.commit()
    done, failed = describe.describe_rows(conn, lib, d, rows[1:], workers=args.workers)
    print(f"Described {done + 1} stills" + (f", {failed} failed" if failed else ""))


def cmd_serve(args):
    from .server import create_app

    lib = _lib(args)
    app = create_app(lib.root, local_only=args.host in ("127.0.0.1", "localhost", "::1"))
    conn = db.connect(lib.db_path)
    from .tmdb import MAX_CACHE_DAYS, expired_films
    stale = expired_films(conn)
    if stale:
        print(f"Note: {len(stale)} film(s) imported from TMDB are older than {MAX_CACHE_DAYS} days. "
              "TMDB's terms limit caching to 6 months: run `python -m stillroom tmdb --refresh-expired`.")
    conn.close()
    url = f"http://{'localhost' if args.host in ('127.0.0.1', '0.0.0.0') else args.host}:{args.port}"
    print(f"Stillroom is running at {url}  (library: {lib.root})")
    if args.open:
        import threading
        import webbrowser
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    app.run(host=args.host, port=args.port, threaded=True, debug=False)


def cmd_demo(args):
    if args.list:
        for f in demo.CATALOG:
            star = "*" if f["key"] in demo.DEFAULT_KEYS else " "
            print(f"{star} {f['key']:<24} {f['title']} ({f['year']}), {f['director']} - ~{f['size_mb']} MB - {f['license']}")
        print("\n* = downloaded by default. Pick others with --films key1,key2 or --films all")
        return
    lib = _lib(args)
    conn = db.connect(lib.db_path)
    keys = [f["key"] for f in demo.CATALOG] if args.films == "all" else (
        [k.strip() for k in args.films.split(",")] if args.films else demo.DEFAULT_KEYS)
    film_ids = []
    for film in demo.find(keys):
        path = demo.download(film, lib.downloads)
        overrides = {k: film.get(k) for k in ("title", "year", "director", "cinematographer", "genres", "license")}
        fid = ingest.ingest_file(lib, conn, path, overrides=overrides, replace=args.replace)
        if fid:
            film_ids.append(fid)
    if not args.no_embed and film_ids:
        _embed(conn, lib, films=film_ids)
    print(f"\nDone. Run `python -m stillroom serve --library {lib.root}` to browse.")


def cmd_archive(args):
    from . import archive

    lib = _lib(args)
    conn = db.connect(lib.db_path)
    known = {r["slug"] for r in conn.execute("SELECT slug FROM films")}
    film_ids, page, tried = [], 1, set()
    while len(film_ids) < args.count:
        docs = archive.search(count=50, query=args.query, min_year=args.min_year,
                              max_year=args.max_year, page=page, collection=args.collection)
        docs = [d for d in docs if d["identifier"] not in tried]
        if not docs:
            break
        for doc in docs:
            if len(film_ids) >= args.count:
                break
            tried.add(doc["identifier"])
            url, meta = archive.pick_file(doc["identifier"], archive.min_seconds_for(args.collection))
            info = archive.film_info(doc, meta)
            slug = metadata.slugify(f"{info['title']} {info['year'] or ''}")
            if slug in known:
                continue
            if not url:
                print(f"Skipping {info['title']}: no single-file copy of the whole film")
                continue
            path = demo.download({**info, "url": url}, lib.downloads)
            try:
                fid = ingest.ingest_file(lib, conn, path, overrides=info, use_tmdb=args.tmdb)
            except Exception as e:  # a broken download must not stop a long batch
                print(f"  failed: {e}")
                fid = None
            finally:
                if not args.keep_video:
                    path.unlink(missing_ok=True)
            known.add(slug)
            if fid:
                film_ids.append(fid)
                print(f"[{len(film_ids)}/{args.count}]")
        page += 1
    if not args.no_embed and film_ids:
        _embed(conn, lib, films=film_ids)
    print(f"\nAdded {len(film_ids)} films.")


def cmd_tmdb(args):
    from . import tmdb

    lib = _lib(args)
    conn = db.connect(lib.db_path)
    if args.purge:
        tmdb.purge(lib, conn)
        return
    if not metadata.tmdb_available():
        sys.exit("Set TMDB_API_KEY (free at https://www.themoviedb.org/settings/api) or TMDB_TOKEN first.")
    ids = []
    replace = args.replace
    if args.refresh_expired:
        ids += [r["tmdb_id"] for r in tmdb.expired_films(conn) if r["tmdb_id"]]
        replace = True
        print(f"{len(ids)} TMDB film(s) are older than {tmdb.MAX_CACHE_DAYS} days; refreshing them")
    titles = list(args.titles)
    if args.file:
        with open(args.file, encoding="utf-8") as f:
            titles += [line.strip() for line in f if line.strip() and not line.startswith("#")]
    for t in titles:
        parsed = metadata.parse_filename(t + ".x")
        movie_id = tmdb.search_movie(parsed["title"], parsed["year"])
        if movie_id:
            ids.append(movie_id)
        else:
            print(f"Not found on TMDB: {t}")
    if args.top_rated:
        ids += tmdb.list_movies("top_rated", args.top_rated)
    if args.popular:
        ids += tmdb.list_movies("popular", args.popular)
    if args.director:
        ids += tmdb.director_movies(args.director)
    if not ids:
        sys.exit("Nothing to import. Give titles, --file, --top-rated N, --popular N or --director NAME.")
    film_ids = []
    for movie_id in dict.fromkeys(ids):
        try:
            fid = tmdb.import_movie(lib, conn, movie_id, limit=args.limit, replace=replace)
        except Exception as e:
            print(f"TMDB movie {movie_id} failed: {e}")
            continue
        if fid:
            film_ids.append(fid)
    if not args.no_embed and film_ids:
        _embed(conn, lib, films=film_ids)
    print(f"\nImported stills for {len(film_ids)} films. {tmdb.ATTRIBUTION}")


def cmd_images(args):
    from . import images

    lib = _lib(args)
    conn = db.connect(lib.db_path)
    groups = images.group_by_folder(args.path)
    if not groups:
        sys.exit(f"No images (.jpg, .png, .webp, ...) found at {args.path}")
    if len(groups) > 1 and args.title:
        sys.exit("--title only makes sense for one folder; name each sub-folder 'Title (Year)' instead")
    film_ids = []
    for folder, files in groups.items():
        meta = metadata.parse_filename(folder.name + ".x") if not args.title else {"title": args.title, "year": args.year}
        if args.year:
            meta["year"] = args.year
        meta.update({k: v for k, v in {"director": args.director, "cinematographer": args.dp,
                                       "license": args.license}.items() if v})
        items = [(f.name, f.read_bytes()) for f in files]
        film_id, added, _ = images.import_images(lib, conn, items, meta)
        if added:
            film_ids.append(film_id)
    if not args.no_embed and film_ids:
        _embed(conn, lib, films=film_ids)


def cmd_films(args):
    conn = db.connect(_lib(args).db_path)
    rows = conn.execute("""SELECT f.id, f.slug, f.title, f.year, f.director, f.aspect_ratio, COUNT(s.id) n,
                                  SUM(s.describer NOT IN ('heuristic', 'clip')) described
                           FROM films f LEFT JOIN shots s ON s.film_id = f.id GROUP BY f.id ORDER BY f.title""")
    for r in rows:
        print(f"{r['id']:>4}  {r['slug']:<36} {r['n']:>5} shots  {r['described'] or 0:>5} described  "
              f"{r['aspect_ratio']}:1  {r['director'] or ''}")


def cmd_remove(args):
    lib = _lib(args)
    conn = db.connect(lib.db_path)
    row = conn.execute("SELECT id, slug, title FROM films WHERE slug = ? OR CAST(id AS TEXT) = ?",
                       (args.film, args.film)).fetchone()
    if not row:
        sys.exit(f"No film {args.film!r}")
    db.delete_film(conn, row["id"])
    ingest.remove_film_files(lib, row["slug"])
    print(f"Removed {row['title']}")


def main(argv=None):
    p = argparse.ArgumentParser(prog="stillroom", description="A local, searchable film-still library.")
    p.add_argument("--library", help="library folder (default: ./library or $STILLROOM_LIBRARY)")
    sub = p.add_subparsers(dest="command", required=True)

    s = sub.add_parser("ingest", help="cut video file(s) into shots and add them to the library")
    s.add_argument("path", help="a video file or a folder of videos")
    s.add_argument("--title")
    s.add_argument("--year", type=int)
    s.add_argument("--director")
    s.add_argument("--dp", help="cinematographer / director of photography")
    s.add_argument("--genres", help="comma separated")
    s.add_argument("--license", help="where the film came from / its licence")
    s.add_argument("--tmdb", action="store_true", help="fill director, DP and genres from TMDb (needs TMDB_API_KEY)")
    s.add_argument("--threshold", type=float, default=0.30, help="cut sensitivity 0-1, lower = more cuts (0.30)")
    s.add_argument("--min-shot", type=float, default=0.6, help="ignore shots shorter than this (seconds)")
    s.add_argument("--max-shot", type=float, default=20.0, help="split long takes every N seconds")
    s.add_argument("--skip-head", type=float, default=0.0, help="skip N seconds at the start (logos)")
    s.add_argument("--skip-tail", type=float, default=0.0, help="skip N seconds at the end (credits)")
    s.add_argument("--detector", choices=["ffmpeg", "pyscenedetect"], default="ffmpeg")
    s.add_argument("--candidates", type=int, default=3, help="frames tried per shot; the sharpest is kept")
    s.add_argument("--workers", type=int)
    s.add_argument("--replace", action="store_true", help="re-ingest films already in the library")
    s.add_argument("--embed", action="store_true", help="compute CLIP vectors right away")
    s.set_defaults(func=cmd_ingest)

    s = sub.add_parser("embed", help="compute CLIP vectors for semantic search")
    s.add_argument("--film", help="only this film (slug or id)")
    s.add_argument("--model", default=embeddings.DEFAULT_MODEL)
    s.add_argument("--pretrained", default=embeddings.DEFAULT_PRETRAINED)
    s.add_argument("--no-labels", action="store_true", help="don't guess shot type etc. with CLIP")
    s.set_defaults(func=cmd_embed)

    s = sub.add_parser("describe", help="write rich descriptions with a vision model")
    s.add_argument("--with", dest="backend", choices=["claude", "ollama"], default="claude")
    s.add_argument("--model", help="claude-opus-5-5 (default for claude) or an Ollama model name")
    s.add_argument("--effort", default="low", choices=["low", "medium", "high"], help="Claude effort level")
    s.add_argument("--film", help="only this film (slug or id)")
    s.add_argument("--limit", type=int, help="describe at most N stills (try a small run first)")
    s.add_argument("--redo", action="store_true", help="also re-describe stills that already have one")
    s.add_argument("--batch", action="store_true", help="Claude Message Batches API: half price, slower")
    s.add_argument("--workers", type=int, default=4)
    s.add_argument("--ollama-host", default="http://localhost:11434")
    s.set_defaults(func=cmd_describe)

    s = sub.add_parser("serve", help="start the web UI")
    s.add_argument("--host", default="127.0.0.1")
    s.add_argument("--port", type=int, default=8765)
    s.add_argument("--open", action="store_true", help="open a browser tab")
    s.set_defaults(func=cmd_serve)

    s = sub.add_parser("demo", help="download public-domain / CC films and ingest them")
    s.add_argument("--films", help="comma separated keys, or 'all'")
    s.add_argument("--list", action="store_true")
    s.add_argument("--replace", action="store_true")
    s.add_argument("--no-embed", action="store_true")
    s.set_defaults(func=cmd_demo)

    s = sub.add_parser("images", help="import screenshots / still images (a file, a folder, or a folder of folders)")
    s.add_argument("path", help="image file or folder; sub-folders named 'Title (Year)' become separate films")
    s.add_argument("--title", help="film title (default: the folder name)")
    s.add_argument("--year", type=int)
    s.add_argument("--director")
    s.add_argument("--dp", help="cinematographer")
    s.add_argument("--license", help="where the pictures came from")
    s.add_argument("--no-embed", action="store_true")
    s.set_defaults(func=cmd_images)

    s = sub.add_parser("archive", help="bulk-import public-domain feature films from the Internet Archive")
    s.add_argument("--count", type=int, default=10, help="how many new films to add (10)")
    s.add_argument("--collection", default="feature_films",
                   help="feature_films (default), Film_Noir, silent_films, SciFi_Horror or prelinger")
    s.add_argument("--query", help='archive.org search terms, e.g. "noir" or subject:"Film Noir"')
    s.add_argument("--min-year", type=int)
    s.add_argument("--max-year", type=int)
    s.add_argument("--keep-video", action="store_true", help="keep the downloaded video (default: delete)")
    s.add_argument("--tmdb", action="store_true", help="fill credits from TMDB (needs TMDB_API_KEY)")
    s.add_argument("--no-embed", action="store_true")
    s.set_defaults(func=cmd_archive)

    s = sub.add_parser("tmdb", help="import official stills for any film from TMDB (needs TMDB_API_KEY)")
    s.add_argument("titles", nargs="*", help='film titles, e.g. "Blade Runner (1982)"')
    s.add_argument("--file", help="text file with one 'Title (Year)' per line")
    s.add_argument("--top-rated", type=int, metavar="N", help="the N top-rated films on TMDB")
    s.add_argument("--popular", type=int, metavar="N", help="the N currently popular films")
    s.add_argument("--director", help="every film directed or shot by this person")
    s.add_argument("--limit", type=int, default=40, help="stills per film (40)")
    s.add_argument("--replace", action="store_true", help="re-download films already imported")
    s.add_argument("--refresh-expired", action="store_true",
                   help="re-download TMDB films older than 6 months (TMDB's cache limit)")
    s.add_argument("--purge", action="store_true", help="delete everything imported from TMDB")
    s.add_argument("--no-embed", action="store_true")
    s.set_defaults(func=cmd_tmdb)

    s = sub.add_parser("films", help="list films in the library")
    s.set_defaults(func=cmd_films)

    s = sub.add_parser("remove", help="remove a film and its stills")
    s.add_argument("film", help="slug or id")
    s.set_defaults(func=cmd_remove)

    args = p.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
