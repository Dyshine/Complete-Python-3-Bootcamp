"""Controlled vocabularies for shot metadata.

Every describer (Claude, Ollama, CLIP, heuristic) maps its output onto these
values so the filters in the UI stay consistent no matter which one ran.
"""

SHOT_TYPES = [
    "extreme wide", "wide", "medium wide", "medium", "medium close-up",
    "close-up", "extreme close-up", "insert",
]

FRAMINGS = [
    "single", "two shot", "three shot", "group", "crowd",
    "over the shoulder", "point of view", "empty frame",
]

ANGLES = [
    "eye level", "low angle", "high angle", "overhead", "dutch angle", "aerial", "ground level",
]

LIGHTING = [
    "soft light", "hard light", "backlight", "silhouette", "side light", "top light",
    "underlight", "practical light", "neon", "firelight", "moonlight", "daylight",
    "overcast", "high key", "low key", "mixed color",
]

TIME_OF_DAY = ["day", "night", "dusk/dawn", "unknown"]

INT_EXT = ["interior", "exterior", "unknown"]

# Colour families used by the palette analyser and the colour filter.
COLOR_FAMILIES = [
    "red", "orange", "brown", "yellow", "green", "teal", "blue", "purple", "pink",
    "black", "gray", "white",
]

KEYS = ["low key", "mid key", "high key"]
TONES = ["warm", "neutral", "cool", "monochrome"]

# Fields that can hold several values per shot. They are stored as "|a|b|" so
# a single LIKE '%|a|%' matches one value exactly.
MULTI_VALUE_FIELDS = {"lighting", "mood", "colors"}

ENUMS = {
    "shot_type": SHOT_TYPES,
    "framing": FRAMINGS,
    "angle": ANGLES,
    "lighting": LIGHTING,
    "time_of_day": TIME_OF_DAY,
    "int_ext": INT_EXT,
}

_ALIASES = {
    "shot_type": {
        "ews": "extreme wide", "els": "extreme wide", "extreme long": "extreme wide",
        "establishing": "extreme wide", "long shot": "wide", "long": "wide", "full": "wide",
        "full shot": "wide", "ws": "wide", "mws": "medium wide", "medium long": "medium wide",
        "cowboy": "medium wide", "ms": "medium", "mid": "medium", "mcu": "medium close-up",
        "medium closeup": "medium close-up", "cu": "close-up", "closeup": "close-up",
        "ecu": "extreme close-up", "extreme closeup": "extreme close-up", "detail": "insert",
    },
    "framing": {
        "ots": "over the shoulder", "pov": "point of view", "2 shot": "two shot",
        "two-shot": "two shot", "three-shot": "three shot", "empty": "empty frame",
        "no people": "empty frame",
    },
    "angle": {
        "eye-level": "eye level", "low": "low angle", "high": "high angle",
        "birds eye": "overhead", "bird's eye": "overhead", "top down": "overhead",
        "dutch": "dutch angle", "canted": "dutch angle", "drone": "aerial",
    },
    "time_of_day": {
        "dusk": "dusk/dawn", "dawn": "dusk/dawn", "sunset": "dusk/dawn", "sunrise": "dusk/dawn",
        "golden hour": "dusk/dawn", "magic hour": "dusk/dawn", "daytime": "day", "nighttime": "night",
    },
    "int_ext": {"int": "interior", "ext": "exterior", "inside": "interior", "outside": "exterior"},
}


def normalize(field, value):
    """Map a free-form value onto the vocabulary for `field`, or None."""
    if value is None:
        return None
    v = str(value).strip().lower().replace("_", " ")
    if not v:
        return None
    allowed = ENUMS.get(field)
    if allowed is None:
        return v
    if v in allowed:
        return v
    alias = _ALIASES.get(field, {}).get(v)
    if alias:
        return alias
    for option in allowed:  # tolerate "close-up shot", "a wide shot" etc.
        if option in v:
            return option
    return None


def pack(values):
    """Store a list of values as '|a|b|' (empty string for none)."""
    clean = []
    for v in values or []:
        v = str(v).strip().lower()
        if v and v not in clean:
            clean.append(v.replace("|", "/"))
    return "|" + "|".join(clean) + "|" if clean else ""


def unpack(packed):
    return [v for v in (packed or "").split("|") if v]
