# Stillroom: a local film-still search engine

Stillroom builds a searchable library of film stills on your own computer, similar in spirit to
reference sites like ShotDeck. Point it at movie files and it:

1. **Cuts each film into shots.** It finds cuts with FFmpeg and keeps the sharpest frame of every shot.
   Letterbox bars are removed, so the frames come out at the real aspect ratio (1.85, 2.39, ...).
2. **Analyses every frame.** It extracts the colour palette, colour families, exposure (low, mid or
   high key), colour temperature and black-and-white.
3. **Makes frames searchable by what is in them:**
   - **CLIP semantic search** (free, local). Type "a man smoking alone at night" and it finds frames
     that *look* like that, even with no written description.
   - **Vision-model descriptions** (optional). Claude or a local Ollama model writes a description and
     tags for every frame: shot type, framing, angle, lighting, time of day, interior/exterior,
     location, mood and keywords.
4. **Serves a web UI** at `http://localhost:8765`. It has a search box, filters with live counts,
   colour search, a justified image grid, a detail viewer with keyboard navigation, "looks similar",
   the neighbouring shots in sequence, boards (collections) and ZIP export.

Everything stays on your machine: one folder of JPEGs plus one SQLite database.

> **About content.** ShotDeck's stills are licensed from studios, so Stillroom does not copy or scrape
> them. You bring the films: ones you own (your Blu-ray/DVD rips or digital purchases, for personal
> reference) or films that are free to use. `python -m stillroom demo` downloads a starter set of
> US public-domain features from the Internet Archive plus the Creative Commons film *Tears of Steel*.

---

## Quick start

```bash
# 1. FFmpeg (needed for reading video)
#    macOS: brew install ffmpeg   Ubuntu: sudo apt install ffmpeg   Windows: winget install ffmpeg

# 2. Python packages (Python 3.10+)
cd stillroom
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install torch --index-url https://download.pytorch.org/whl/cpu   # skip if you have an NVIDIA GPU
pip install -r requirements-ai.txt                      # CLIP semantic search + Claude describer

# 3. Get some films and index them (about 1.5 GB download, 10-20 minutes)
python -m stillroom demo

# 4. Browse
python -m stillroom serve --open
```

Run `python -m stillroom demo --list` to see the whole free catalogue, then add more films with
`--films detour,carnival-of-souls` or `--films all`.

## Adding your own films

```bash
python -m stillroom ingest "/movies/Blade Runner (1982).mkv" --director "Ridley Scott" --dp "Jordan Cronenweth" --genres "Sci-Fi,Noir"
python -m stillroom ingest /movies --embed        # a whole folder, then compute CLIP vectors
```

- **Name files `Title (Year).ext`.** Title and year are read from the file name.
- **Sidecar metadata.** A `Title (Year).json` next to the video can set any of `title`, `year`,
  `director`, `cinematographer`, `genres`, `license` and `overview`.
- **Automatic credits.** `--tmdb` fills director, cinematographer and genres from
  [The Movie Database](https://www.themoviedb.org/settings/api). Set `TMDB_API_KEY` (free) first.
- **Skipping logos and credits.** `--skip-head 60 --skip-tail 300` leaves out the first 60 seconds
  and the last 5 minutes.
- **Cut sensitivity.** `--threshold 0.3` is the default; lower it to find more cuts. Shots longer than
  `--max-shot 20` seconds are split, so long takes get several stills.
  `--detector pyscenedetect` uses [PySceneDetect](https://www.scenedetect.com/) instead of FFmpeg.

A 2-hour 1080p film takes roughly 10-20 minutes on a laptop and produces 800-2,000 stills. It uses
about 0.5 MB per still, or 1 GB per film.

## Making stills searchable by description

There are three layers, and each one improves search:

| Layer | Command | Cost | What you can search |
|---|---|---|---|
| Colour/tone analysis | automatic | free | colour, palette, warm/cool, low/high key, B&W, film, director, decade, aspect |
| CLIP semantic search | `python -m stillroom embed` | free, local (1-3 min per film on CPU) | free-text descriptions ("rain on a window", "crowd in a stadium"), visual similarity, plus guessed shot type, interior/exterior, day/night |
| Vision-model descriptions | `python -m stillroom describe` | see below | precise keywords, wardrobe, props, actions, lighting style, mood, and reliable shot/angle/framing filters |

`embed` runs automatically after `demo`, and after `ingest --embed`.

### Describing frames with Claude

```bash
export ANTHROPIC_API_KEY=...                           # or `ant auth login`
python -m stillroom describe --limit 20                # try a few first and look at the results
python -m stillroom describe --film blade-runner-1982
python -m stillroom describe --batch                   # Message Batches API: half price, results within ~1 hour
```

The default model is `claude-opus-5-5` at `--effort low`. Each still costs about 1,200 input and 400
output tokens. Rough costs per 1,000 stills at list prices (check the
[pricing page](https://www.anthropic.com/pricing) for current numbers):

| Model (`--model`) | Per 1,000 stills | With `--batch` |
|---|---|---|
| `claude-opus-5-5` (default) | ~$13 | ~$6.50 |
| `claude-sonnet-5-5` | ~$6.50 | ~$3.25 |
| `claude-haiku-5-5` | ~$0.35 | ~$0.18 |

For whole-library runs, Haiku with `--batch` costs very little. Use Opus or Sonnet for the richest
descriptions. On Opus and Sonnet, frames that a safety classifier declines are retried on Anthropic's
recommended fallback model automatically. Batch runs can be resumed: if you stop one, running
`describe --batch` again collects the results that are already done.

### Describing frames locally with Ollama (free)

```bash
ollama pull qwen2.5vl:7b
python -m stillroom describe --with ollama --model qwen2.5vl:7b
```

This needs a decent GPU or Apple Silicon to be fast. Any Ollama vision model works.

## Using the UI

- **Search box.** Describe the frame in plain words. Quoted text is matched as a phrase, and `-word`
  excludes a word. Results come from keyword search merged with CLIP semantic search.
- **Filters.** Every facet shows live counts. Selecting several values in one facet means OR;
  combining facets means AND.
- **Colour.** Pick a preset or any colour to find frames whose palette contains it. Clicking a
  swatch in a still's palette searches for that exact colour; shift-click copies its hex value.
- **Viewer.** Use <kbd>←</kbd>/<kbd>→</kbd> to step through stills. <kbd>S</kbd> saves to a board,
  <kbd>D</kbd> downloads the full frame, <kbd>F</kbd> finds similar stills and <kbd>Esc</kbd> closes.
  Clicking any attribute (director, shot type, lighting, a tag, ...) searches for it.
- **Boards.** Collect stills into boards (mood boards, lookbooks, shot lists). Export a board as a ZIP
  of full-resolution frames with a `shots.csv` of credits and timecodes.
- Press <kbd>/</kbd> to jump to the search box. Every search is a URL you can bookmark.

## Commands

```
python -m stillroom [--library DIR] <command>

  ingest PATH      cut video file(s) into shots and add them
  embed            compute CLIP vectors (semantic search + similar stills)
  describe         write descriptions with Claude (--with claude) or Ollama (--with ollama)
  serve            start the web UI (--port 8765, --open)
  demo             download and ingest free films (--list, --films KEYS|all)
  films            list films in the library
  remove FILM      delete a film and its stills
```

The library defaults to `./library`; set `STILLROOM_LIBRARY` or `--library` to keep it elsewhere,
for example on an external drive.

## How it works

```
video ─► ffprobe (size, pixel aspect) ─► cropdetect (letterbox) ─► per-frame scene scores
      ─► cuts (hard threshold + adaptive rule that ignores 3:2 pulldown repeats)
      ─► shots ─► sharpest of 3 frames per shot ─► JPEG + thumbnail
      ─► palette / colour families / exposure / temperature ─► SQLite (+ FTS5 full-text index)
      ─► CLIP image vectors (optional) ─► vision-model JSON description (optional)

search ─► FTS5 BM25 (all words, then any word) ┐
       ─► CLIP text→image cosine similarity    ├─► reciprocal-rank fusion ─► filters ─► facets
       ─► Lab-space palette distance (colour)  ┘
```

| File | What it does |
|---|---|
| `stillroom/video.py` | FFmpeg: probing, letterbox detection, cut detection, frame grabbing |
| `stillroom/analyze.py` | Palette, colour families, exposure, temperature, colour distance |
| `stillroom/ingest.py` | The ingest pipeline (parallel frame extraction) |
| `stillroom/describe.py` | Claude / Ollama describers, batch mode, CLIP embedding job |
| `stillroom/embeddings.py` | OpenCLIP wrapper and zero-shot shot-type labels |
| `stillroom/search.py` | Query parsing, FTS5, semantic ranking, fusion, filters, facets |
| `stillroom/server.py` | Flask JSON API and media serving |
| `stillroom/static/` | Front end in plain HTML/CSS/JS, with no build step |

Run the tests with `python -m pytest`.

## Recommended tools and extensions

- **FFmpeg** (required) does the video work. **PySceneDetect** is an alternative cut detector.
- **OpenCLIP**. Larger models give better semantic search if you have a GPU:
  `python -m stillroom embed --model ViT-L-14 --pretrained laion2b_s32b_b82k`. The server uses the
  model that has the most vectors stored.
- **Claude API** for the best written descriptions; **Ollama** with `qwen2.5vl` or `llava` for
  free, offline descriptions.
- **TMDb API key** for automatic director, DP and genre credits.
- **MakeMKV / HandBrake** to turn discs you own into files Stillroom can read.
- **VS Code** with the Python and SQLite Viewer extensions, to explore `library/stillroom.db`.
- **Eagle or PureRef** to arrange exported boards into mood boards.

## Ideas for improving it

These are roughly in order of value for effort:

1. **Cast and character search.** Pull the cast list from TMDb and let the describer match characters
   to costumes and scenes. This avoids face recognition, which raises privacy concerns.
2. **Better semantic model.** SigLIP 2 or a larger CLIP improves free-text search, and a text
   embedding of the Claude descriptions can be added as a third input to the fusion.
3. **Natural-language filters.** Use Claude to turn "low angle night exteriors in the 70s with neon"
   into structured filters plus a semantic query.
4. **Credits and title-card detection.** OCR or CLIP "text on screen" detection could hide opening
   titles and end credits automatically.
5. **Dialogue search.** Index subtitle files (`.srt`) by timecode so "here's looking at you" finds
   the shot.
6. **A camera and lens data layer.** For example sensor/film stock, lens, and aspect ratio from
   IMDb technical specs, filterable alongside everything else.
7. **Clip export.** Export a 5-second MP4/GIF around any still with `ffmpeg -ss`.
8. **Ingest from the UI.** Drag a folder into the browser and watch progress bars there.
9. **Shared libraries.** Run `serve --host 0.0.0.0` on a home server or NAS so a whole team can
   search one library. Add a login before putting it on the internet.
10. **Scale.** SQLite plus in-memory vectors is fine up to a few hundred thousand stills. Beyond
    that, store vectors in sqlite-vec, LanceDB or FAISS.
