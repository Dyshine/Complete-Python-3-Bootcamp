"""Pixel-level analysis of a still: palette, colour families, exposure, tone."""

import colorsys

import numpy as np
from PIL import Image


def _small(img, width=192):
    h = max(1, int(round(width * img.height / img.width)))
    return img.convert("RGB").resize((width, h), Image.BILINEAR)


def palette(img, colors=6, min_weight=0.03):
    """Dominant colours as [[hex, weight], ...] sorted by weight."""
    small = _small(img, 160)
    q = small.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, kmeans=3)
    pal = q.getpalette()[: colors * 3]
    counts = q.getcolors(colors) or []
    total = sum(c for c, _ in counts) or 1
    out = []
    for count, index in sorted(counts, reverse=True):
        w = count / total
        if w < min_weight:
            continue
        r, g, b = pal[index * 3: index * 3 + 3]
        out.append([f"#{r:02x}{g:02x}{b:02x}", round(w, 3)])
    return out


def color_family(hex_color):
    r, g, b = (int(hex_color[i: i + 2], 16) / 255 for i in (1, 3, 5))
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    hue = h * 360
    if v < 0.13:
        return "black"
    if s < 0.15 or (s < 0.25 and v < 0.3):
        return "white" if v > 0.82 else "gray"
    if hue < 15 or hue >= 345:
        return "brown" if v < 0.45 and s < 0.75 else "red"
    if hue < 42:
        return "brown" if v < 0.62 else "orange"
    if hue < 68:
        return "brown" if v < 0.5 else "yellow"
    if hue < 165:
        return "green"
    if hue < 200:
        return "teal"
    if hue < 255:
        return "blue"
    if hue < 290:
        return "purple"
    return "pink"


def families(pal, min_weight=0.08):
    """Colour families present in a palette, heaviest first."""
    weights = {}
    for hex_color, w in pal:
        fam = color_family(hex_color)
        weights[fam] = weights.get(fam, 0) + w
    return [f for f, w in sorted(weights.items(), key=lambda kv: -kv[1]) if w >= min_weight]


def measure(img):
    """Exposure / colour statistics in the 0-1 range."""
    a = np.asarray(_small(img), dtype=np.float32) / 255.0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    mx, mn = a.max(axis=2), a.min(axis=2)
    sat = np.where(mx > 0.04, (mx - mn) / np.maximum(mx, 1e-6), 0)
    brightness = float(luma.mean())
    contrast = float(luma.std())
    saturation = float(sat.mean())
    warmth = float((r - b).mean())
    dark_share = float((luma < 0.18).mean())
    bright_share = float((luma > 0.7).mean())

    if saturation < 0.07:
        tone = "monochrome"
    elif warmth > 0.035:
        tone = "warm"
    elif warmth < -0.035:
        tone = "cool"
    else:
        tone = "neutral"

    if brightness < 0.24 or dark_share > 0.6:
        key = "low key"
    elif brightness > 0.58 and bright_share > 0.3:
        key = "high key"
    else:
        key = "mid key"

    return {
        "brightness": round(brightness, 4),
        "contrast": round(contrast, 4),
        "saturation": round(saturation, 4),
        "warmth": round(warmth, 4),
        "light_key": key,
        "tone": tone,
    }


def analyze(img):
    pal = palette(img)
    stats = measure(img)
    stats["palette"] = pal
    fams = families(pal)
    if stats["tone"] == "monochrome":
        fams = [f for f in fams if f in ("black", "gray", "white")] or ["gray"]
    stats["colors"] = fams
    return stats


def heuristic_description(stats, aspect=None):
    """A plain-words summary built from the measurements, used when no vision
    model has described the frame yet (keeps colour/tone searchable)."""
    bits = []
    key = stats.get("light_key")
    tone = stats.get("tone")
    cols = [c for c in stats.get("colors", []) if c not in ("black", "gray", "white")]
    if tone == "monochrome":
        bits.append("Black and white")
    elif tone in ("warm", "cool"):
        bits.append(f"{tone.capitalize()}-toned")
    else:
        bits.append("Neutral-toned")
    if cols:
        bits.append("frame dominated by " + " and ".join(cols[:2]))
    else:
        bits.append("frame")
    desc = " ".join(bits)
    if key == "low key":
        desc += ", low-key lighting with deep shadows"
    elif key == "high key":
        desc += ", bright high-key lighting"
    if stats.get("contrast", 0) > 0.28:
        desc += ", high contrast"
    elif stats.get("contrast", 1) < 0.1:
        desc += ", flat low contrast"
    if aspect:
        desc += f", {aspect}:1 aspect ratio"
    return desc + "."


# ---------------------------------------------------------------- colour search

def hex_to_lab(hex_colors):
    """Convert an array of '#rrggbb' strings to CIE Lab (D65)."""
    rgb = np.array([[int(h[i: i + 2], 16) for i in (1, 3, 5)] for h in hex_colors], dtype=np.float64) / 255
    lin = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = lin @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    L = 116 * f[:, 1] - 16
    A = 500 * (f[:, 0] - f[:, 1])
    B = 200 * (f[:, 1] - f[:, 2])
    return np.stack([L, A, B], axis=1)
