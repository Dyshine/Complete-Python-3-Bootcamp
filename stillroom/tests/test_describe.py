import io
import json
from types import SimpleNamespace

import pytest

from stillroom import db, describe


def test_clean_fields_normalises_model_output():
    out = describe.clean_fields({
        "description": "  A lone rider at dusk. ",
        "shot_type": "Extreme Wide", "framing": "single", "angle": "unknown-ish",
        "lighting": ["backlight", "made up"], "time_of_day": "sunset", "int_ext": "unknown",
        "location": "Desert", "people": "1", "mood": "lonely", "tags": "horse, Desert ,",
    })
    assert out["description"] == "A lone rider at dusk."
    assert out["shot_type"] == "extreme wide"
    assert "angle" not in out and "int_ext" not in out
    assert out["lighting"] == ["backlight"]
    assert out["time_of_day"] == "dusk/dawn"
    assert out["people"] == 1
    assert out["mood"] == ["lonely"]
    assert out["tags"] == ["horse", "desert"]


def test_schema_enums_are_strict():
    assert describe.SCHEMA["additionalProperties"] is False
    assert set(describe.SCHEMA["required"]) == set(describe.SCHEMA["properties"])


class FakeMessages:
    def __init__(self, reply, stop_reason="end_turn"):
        self.reply, self.stop_reason, self.calls = reply, stop_reason, []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(stop_reason=self.stop_reason,
                               content=[SimpleNamespace(type="text", text=json.dumps(self.reply))])


REPLY = {"description": "A man in a hat.", "shot_type": "medium", "framing": "single", "angle": "eye level",
         "lighting": ["hard light"], "time_of_day": "night", "int_ext": "exterior", "location": "street",
         "people": 1, "mood": ["tense"], "tags": ["hat", "street"]}


def make_claude(model, reply=REPLY, stop_reason="end_turn"):
    d = describe.ClaudeDescriber.__new__(describe.ClaudeDescriber)
    d.model, d.effort, d.max_side = model, "low", 512
    msgs = FakeMessages(reply, stop_reason)
    d.client = SimpleNamespace(messages=msgs, beta=SimpleNamespace(messages=msgs))
    return d, msgs


def first_row(conn):
    return describe.rows_to_describe(conn, redo=True)[0]


def test_claude_request_shape(library):
    lib, conn = library
    row = first_row(conn)
    d, msgs = make_claude("claude-opus-5-5")
    fields = d.describe(row, lib.root / row["image"])
    assert fields["shot_type"] == "medium"
    call = msgs.calls[0]
    assert call["model"] == "claude-opus-5-5"
    assert call["fallbacks"] == "default" and call["betas"] == ["server-side-fallback-2026-07-01"]
    assert call["output_config"]["effort"] == "low"
    assert call["output_config"]["format"]["type"] == "json_schema"
    content = call["messages"][0]["content"]
    assert content[0]["type"] == "image" and content[0]["source"]["media_type"] == "image/jpeg"
    assert row["title"] in content[1]["text"]


def test_claude_without_fallback_support(library):
    lib, conn = library
    row = first_row(conn)
    d, msgs = make_claude("claude-haiku-5-5")
    d.describe(row, lib.root / row["image"])
    assert "fallbacks" not in msgs.calls[0]
    assert msgs.calls[0]["output_config"]["effort"] == "low"


def test_claude_refusal_is_skipped(library):
    lib, conn = library
    row = first_row(conn)
    d, _ = make_claude("claude-opus-5-5", stop_reason="refusal")
    assert d.describe(row, lib.root / row["image"]) is None


def test_describe_rows_writes_and_reindexes(library):
    lib, conn = library
    rows = describe.rows_to_describe(conn, redo=True)
    d, _ = make_claude("claude-opus-5-5", reply={**REPLY, "description": "Zeppelin over a harbour."})
    done, failed = describe.describe_rows(conn, lib, d, rows[:1], workers=1, log=lambda *_: None)
    assert (done, failed) == (1, 0)
    hit = conn.execute("SELECT rowid FROM shots_fts WHERE shots_fts MATCH 'zeppelin'").fetchone()
    assert hit[0] == rows[0]["id"]
    assert conn.execute("SELECT describer FROM shots WHERE id = ?", (rows[0]["id"],)).fetchone()[0] == \
        "claude:claude-opus-5-5"
    # Without --redo, already-described stills are left alone.
    assert rows[0]["id"] not in [r["id"] for r in describe.rows_to_describe(conn)]


def test_ollama_describer(library, monkeypatch):
    lib, conn = library
    row = first_row(conn)
    seen = {}

    def fake_urlopen(req, timeout):
        seen["body"] = json.loads(req.data)
        return io.BytesIO(json.dumps({"message": {"content": json.dumps(REPLY)}}).encode())

    monkeypatch.setattr(describe.urllib.request, "urlopen", fake_urlopen)
    out = describe.OllamaDescriber(model="llava").describe(row, lib.root / row["image"])
    assert out["location"] == "street"
    assert seen["body"]["format"] == describe.SCHEMA
    assert seen["body"]["messages"][1]["images"]


def test_update_description_keeps_unrelated_columns(library):
    _, conn = library
    sid = conn.execute("SELECT id FROM shots LIMIT 1").fetchone()[0]
    before = conn.execute("SELECT palette, light_key FROM shots WHERE id = ?", (sid,)).fetchone()
    db.update_description(conn, sid, {"description": "New words"}, "x")
    after = conn.execute("SELECT palette, light_key, description FROM shots WHERE id = ?", (sid,)).fetchone()
    assert tuple(before) == tuple(after)[:2] and after[2] == "New words"


@pytest.mark.parametrize("model", ["claude-opus-5-5", "claude-sonnet-5-5", "claude-fable-5-1"])
def test_fallback_models(model):
    assert model in describe._FALLBACK_MODELS
