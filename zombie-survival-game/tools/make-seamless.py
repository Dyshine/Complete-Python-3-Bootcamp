"""Turn a generated texture into a seamless tile: blend it with a half-offset copy so every edge matches, then save a web JPEG.
usage: python3 tools/make-seamless.py in.png out.jpg [size]"""
import sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
size = int(sys.argv[3]) if len(sys.argv) > 3 else 512
a = np.asarray(Image.open(src).convert('RGB').resize((size, size), Image.LANCZOS), dtype=np.float32)
b = np.roll(a, (size // 2, size // 2), axis=(0, 1))  # its edges are a's seamless centre
t = np.linspace(-1, 1, size)
d = np.maximum(np.abs(t)[None, :], np.abs(t)[:, None])  # 0 at centre, 1 at the border
w = np.clip((1 - d) / 0.35, 0, 1)[..., None]  # keep the original in the middle, fade to the offset copy near edges
out = a * w + b * (1 - w)
Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(dst, quality=82, optimize=True)
