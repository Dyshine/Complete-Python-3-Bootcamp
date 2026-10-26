"""Command line: `python -m stillroom <command>`."""

import argparse
import sys

from . import db, demo, describe, embeddings, ingest
from .config import IngestSettings, Library


def _lib(args):
    return Library(args.library).ensure()


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
    app = create_app(lib.root)
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

    s = sub.add_parser("films", help="list films in the library")
    s.set_defaults(func=cmd_films)

    s = sub.add_parser("remove", help="remove a film and its stills")
    s.add_argument("film", help="slug or id")
    s.set_defaults(func=cmd_remove)

    args = p.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
