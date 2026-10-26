"""Describe stills with a vision model so they can be found by what is in them.

Two backends write the same structured fields:

* ClaudeDescriber - Anthropic API (needs ANTHROPIC_API_KEY or `ant auth login`)
* OllamaDescriber - a local vision model served by Ollama (free, offline)

Plus `embed_library`, which stores CLIP vectors for semantic search and fills
basic labels on frames that no describer has touched.
"""

import base64
import io
import json
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

from PIL import Image

from . import db, taxonomy

SYSTEM_PROMPT = """You catalogue film stills for a searchable reference library used by \
directors, cinematographers, production designers and students. People search it by \
typing what they want to see ("woman in a red coat alone on a rainy street at night", \
"low angle hero shot backlit by the sun", "two men arguing in a smoky office").

For the still you are given, fill every field:
- description: 1-3 plain sentences a filmmaker would recognise: who/what is in frame \
(by appearance, wardrobe and action), the setting, composition and camera, the light \
and the colour. Be concrete and visual. Do not identify real people from their faces; \
describe them instead. Do not guess plot points.
- shot_type, framing, angle, time_of_day, int_ext: pick the closest option ("unknown" \
when it cannot be told).
- lighting: every option that clearly applies.
- location: a short noun phrase for the setting ("diner booth", "desert highway").
- people: how many people are visible (0 if none).
- mood: 1-3 adjectives.
- tags: 8-20 lowercase search keywords - objects, props, wardrobe, actions, weather, \
setting, colours, visual techniques (e.g. "silhouette", "reflection", "shallow focus")."""

SCHEMA = {
    "type": "object",
    "properties": {
        "description": {"type": "string"},
        "shot_type": {"type": "string", "enum": taxonomy.SHOT_TYPES},
        "framing": {"type": "string", "enum": taxonomy.FRAMINGS},
        "angle": {"type": "string", "enum": taxonomy.ANGLES},
        "lighting": {"type": "array", "items": {"type": "string", "enum": taxonomy.LIGHTING}},
        "time_of_day": {"type": "string", "enum": taxonomy.TIME_OF_DAY},
        "int_ext": {"type": "string", "enum": taxonomy.INT_EXT},
        "location": {"type": "string"},
        "people": {"type": "integer"},
        "mood": {"type": "array", "items": {"type": "string"}},
        "tags": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["description", "shot_type", "framing", "angle", "lighting", "time_of_day",
                 "int_ext", "location", "people", "mood", "tags"],
    "additionalProperties": False,
}


def clean_fields(raw):
    """Validate/normalise a describer's JSON before it touches the database."""
    out = {}
    desc = str(raw.get("description") or "").strip()
    if desc:
        out["description"] = desc
    for f in ("shot_type", "framing", "angle", "time_of_day", "int_ext"):
        v = taxonomy.normalize(f, raw.get(f))
        if v and v != "unknown":
            out[f] = v
    lighting = raw.get("lighting") or []
    if isinstance(lighting, str):
        lighting = [lighting]
    out["lighting"] = [v for v in (taxonomy.normalize("lighting", x) for x in lighting) if v]
    loc = str(raw.get("location") or "").strip().lower()
    if loc and loc != "unknown":
        out["location"] = loc[:80]
    try:
        out["people"] = max(0, min(999, int(raw.get("people"))))
    except (TypeError, ValueError):
        pass
    mood = raw.get("mood") or []
    out["mood"] = [str(m).strip().lower() for m in (mood if isinstance(mood, list) else [mood]) if str(m).strip()][:4]
    tags = raw.get("tags") or []
    if isinstance(tags, str):
        tags = tags.split(",")
    out["tags"] = [str(t).strip().lower() for t in tags if str(t).strip()][:25]
    return out


def encode_image(path, max_side=1024):
    img = Image.open(path).convert("RGB")
    scale = max_side / max(img.size)
    if scale < 1:
        img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.standard_b64encode(buf.getvalue()).decode("ascii")


def context_line(row):
    who = f", directed by {row['director']}" if row["director"] else ""
    year = f" ({row['year']})" if row["year"] else ""
    t = int(row["frame_time"])
    return (f"Still from {row['title']}{year}{who}; shot {row['idx']} at "
            f"{t // 3600}:{t % 3600 // 60:02d}:{t % 60:02d}. Catalogue this frame.")


# ---------------------------------------------------------------- Claude

# Models that accept the server-side refusal fallback parameter.
_FALLBACK_MODELS = ("claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5")
# Older models that reject output_config.effort.
_NO_EFFORT_PREFIXES = ("claude-3", "claude-haiku-4", "claude-sonnet-4-5", "claude-opus-4-1", "claude-opus-4-0")


class ClaudeDescriber:
    name = "claude"

    def __init__(self, model="claude-opus-5-5", effort="low", max_side=1024):
        import anthropic

        self.anthropic = anthropic
        self.client = anthropic.Anthropic(max_retries=6)
        self.model = model
        self.effort = effort
        self.max_side = max_side

    def _params(self, row, image_path):
        params = {
            "model": self.model,
            "max_tokens": 4096,
            "system": SYSTEM_PROMPT,
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                                 "data": encode_image(image_path, self.max_side)}},
                    {"type": "text", "text": context_line(row)},
                ],
            }],
            "output_config": {"format": {"type": "json_schema", "schema": SCHEMA}},
        }
        if not self.model.startswith(_NO_EFFORT_PREFIXES):
            params["output_config"]["effort"] = self.effort
        return params

    @staticmethod
    def _parse(message):
        if message.stop_reason == "refusal":
            return None
        if message.stop_reason == "max_tokens":
            raise RuntimeError("response hit max_tokens before the JSON was complete")
        text = next((b.text for b in message.content if b.type == "text"), None)
        return clean_fields(json.loads(text)) if text else None

    def describe(self, row, image_path):
        params = self._params(row, image_path)
        if self.model in _FALLBACK_MODELS:
            # If a safety classifier declines the frame, let the API retry it on
            # Anthropic's recommended fallback model instead of failing.
            message = self.client.beta.messages.create(
                **params, betas=["server-side-fallback-2026-07-01"], fallbacks="default")
        else:
            message = self.client.messages.create(**params)
        return self._parse(message)

    # ------------------------------------------------------------ batch (50% cheaper)

    def describe_batch(self, conn, lib, rows, log=print, poll_seconds=30, chunk=400):
        """Submit rows through the Message Batches API, wait, and store results.

        Batch ids are recorded so an interrupted run can be resumed with
        `stillroom describe --batch` (finished batches are collected first).
        """
        from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
        from anthropic.types.messages.batch_create_params import Request

        for i in range(0, len(rows), chunk):
            part = rows[i:i + chunk]
            requests = [
                Request(custom_id=f"shot-{r['id']}",
                        params=MessageCreateParamsNonStreaming(**self._params(r, lib.root / r["image"])))
                for r in part
            ]
            batch = self.client.messages.batches.create(requests=requests)
            conn.execute("INSERT INTO caption_batches (batch_id, model, created_at) VALUES (?, ?, ?)",
                         (batch.id, self.model, db.now()))
            conn.commit()
            log(f"  submitted batch {batch.id} ({len(part)} stills)")
        return self.collect_batches(conn, log, poll_seconds)

    def collect_batches(self, conn, log=print, poll_seconds=30):
        pending = [r["batch_id"] for r in conn.execute("SELECT batch_id FROM caption_batches WHERE done = 0")]
        written = 0
        for batch_id in pending:
            while True:
                batch = self.client.messages.batches.retrieve(batch_id)
                if batch.processing_status == "ended":
                    break
                c = batch.request_counts
                log(f"  {batch_id}: {c.processing} processing, {c.succeeded} done - checking again in {poll_seconds}s")
                time.sleep(poll_seconds)
            for result in self.client.messages.batches.results(batch_id):
                shot_id = int(result.custom_id.split("-", 1)[1])
                if result.result.type != "succeeded":
                    log(f"  shot {shot_id}: {result.result.type}")
                    continue
                try:
                    fields = self._parse(result.result.message)
                except (ValueError, RuntimeError) as e:
                    log(f"  shot {shot_id}: {e}")
                    continue
                if fields:
                    db.update_description(conn, shot_id, fields, f"claude:{self.model}")
                    written += 1
            conn.execute("UPDATE caption_batches SET done = 1 WHERE batch_id = ?", (batch_id,))
            conn.commit()
        return written


# ---------------------------------------------------------------- Ollama

class OllamaDescriber:
    """Any vision model pulled into Ollama, e.g. `ollama pull qwen2.5vl:7b`."""

    name = "ollama"

    def __init__(self, model="qwen2.5vl:7b", host="http://localhost:11434", max_side=1024):
        self.model = model
        self.host = host.rstrip("/")
        self.max_side = max_side

    def describe(self, row, image_path):
        body = {
            "model": self.model,
            "stream": False,
            "format": SCHEMA,
            "options": {"temperature": 0},
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": context_line(row) + " Reply with JSON only.",
                 "images": [encode_image(image_path, self.max_side)]},
            ],
        }
        req = urllib.request.Request(f"{self.host}/api/chat", data=json.dumps(body).encode(),
                                     headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=600) as resp:
            reply = json.loads(resp.read().decode("utf-8"))
        return clean_fields(json.loads(reply["message"]["content"]))


# ---------------------------------------------------------------- running

def rows_to_describe(conn, film=None, redo=False, limit=None):
    sql = """SELECT s.id, s.idx, s.image, s.frame_time, f.title, f.year, f.director
             FROM shots s JOIN films f ON f.id = s.film_id WHERE 1 = 1"""
    args = []
    if film:
        sql += " AND (f.slug = ? OR f.id = ?)"
        args += [film, film]
    if not redo:
        sql += " AND (s.describer IS NULL OR s.describer IN ('heuristic', 'clip'))"
    sql += " ORDER BY f.id, s.idx"
    if limit:
        sql += f" LIMIT {int(limit)}"
    return conn.execute(sql, args).fetchall()


def describe_rows(conn, lib, describer, rows, workers=4, log=print):
    label = describer.name + (f":{describer.model}" if getattr(describer, "model", None) else "")
    done = failed = 0
    started = time.monotonic()
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(describer.describe, r, lib.root / r["image"]): r for r in rows}
        for fut in as_completed(futures):
            row = futures[fut]
            try:
                fields = fut.result()
            except Exception as e:
                failed += 1
                log(f"  shot {row['id']} failed: {type(e).__name__}: {e}")
                continue
            if fields:
                db.update_description(conn, row["id"], fields, label)
                conn.commit()
            done += 1
            if done % 10 == 0 or done == len(rows):
                rate = done / max(1e-6, time.monotonic() - started)
                log(f"  described {done}/{len(rows)} ({rate:.1f}/s)")
    conn.commit()
    return done, failed


def embed_library(conn, lib, clip, film=None, labels=True, batch=32, log=print):
    """Store CLIP vectors for shots that lack them; add zero-shot labels to
    shots that only have a heuristic description."""
    sql = """SELECT s.id, s.thumb, s.image, s.describer, s.description
             FROM shots s JOIN films f ON f.id = s.film_id
             LEFT JOIN embeddings e ON e.shot_id = s.id AND e.model = ?
             WHERE e.shot_id IS NULL"""
    args = [clip.key]
    if film:
        sql += " AND (f.slug = ? OR f.id = ?)"
        args += [film, film]
    rows = conn.execute(sql + " ORDER BY s.id", args).fetchall()
    from .embeddings import label_sentence

    for i in range(0, len(rows), batch):
        part = rows[i:i + batch]
        images = [Image.open(lib.root / r["image"]).convert("RGB") for r in part]
        vecs = clip.encode_images(images)
        guesses = clip.zero_shot(vecs) if labels else [{}] * len(part)
        for r, v, g in zip(part, vecs, guesses):
            db.save_embedding(conn, r["id"], clip.key, v)
            if labels and r["describer"] in (None, "heuristic") and g:
                base = r["description"] or ""
                g["description"] = label_sentence(g) + base
                db.update_description(conn, r["id"], g, "clip")
        conn.commit()
        log(f"  embedded {min(i + batch, len(rows))}/{len(rows)}")
    return len(rows)
