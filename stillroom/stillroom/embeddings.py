"""CLIP embeddings: type a sentence, find the frames that look like it.

Optional - needs `pip install torch open_clip_torch` (see requirements-ai.txt).
Runs locally on CPU or GPU, no API key. The same model also guesses shot
type, interior/exterior, time of day and so on (zero-shot) for frames no
vision-language model has described.
"""

import threading

import numpy as np

DEFAULT_MODEL = "ViT-B-32"
DEFAULT_PRETRAINED = "laion2b_s34b_b79k"

_lock = threading.Lock()
_cache = {}


def available():
    try:
        import open_clip  # noqa: F401
        import torch  # noqa: F401
    except ImportError:
        return False
    return True


def model_key(name=DEFAULT_MODEL, pretrained=DEFAULT_PRETRAINED):
    return f"{name}/{pretrained}"


class Clip:
    def __init__(self, name=DEFAULT_MODEL, pretrained=DEFAULT_PRETRAINED, device=None):
        import open_clip
        import torch

        self.torch = torch
        self.key = model_key(name, pretrained)
        if device is None:
            if torch.cuda.is_available():
                device = "cuda"
            elif getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
                device = "mps"
            else:
                device = "cpu"
        self.device = device
        self.model, _, self.preprocess = open_clip.create_model_and_transforms(name, pretrained=pretrained)
        self.model.eval().to(device)
        self.tokenizer = open_clip.get_tokenizer(name)
        self._label_cache = {}

    def encode_images(self, images, batch_size=32):
        out = []
        with self.torch.no_grad():
            for i in range(0, len(images), batch_size):
                batch = self.torch.stack([self.preprocess(im.convert("RGB")) for im in images[i:i + batch_size]])
                feats = self.model.encode_image(batch.to(self.device)).float()
                out.append((feats / feats.norm(dim=-1, keepdim=True)).cpu().numpy())
        return np.concatenate(out) if out else np.zeros((0, 0), dtype=np.float32)

    def encode_text(self, texts):
        with self.torch.no_grad():
            tokens = self.tokenizer(list(texts)).to(self.device)
            feats = self.model.encode_text(tokens).float()
            return (feats / feats.norm(dim=-1, keepdim=True)).cpu().numpy()

    def encode_query(self, query):
        """Average a few phrasings so short queries ('rain') work as well as sentences."""
        vecs = self.encode_text([query, f"a film still of {query}", f"a movie scene showing {query}"])
        v = vecs.mean(axis=0)
        return v / np.linalg.norm(v)

    # ------------------------------------------------------------ zero-shot labels

    def _label_vectors(self, field):
        if field not in self._label_cache:
            labels, prompts = zip(*ZERO_SHOT[field])
            self._label_cache[field] = (labels, self.encode_text([f"a film still: {p}" for p in prompts]))
        return self._label_cache[field]

    def zero_shot(self, image_vecs, min_prob=0.35):
        """Guess categorical fields for each image vector. Returns a list of dicts."""
        results = [dict() for _ in range(len(image_vecs))]
        for field in ZERO_SHOT:
            labels, text_vecs = self._label_vectors(field)
            logits = 100.0 * image_vecs @ text_vecs.T
            logits -= logits.max(axis=1, keepdims=True)
            probs = np.exp(logits)
            probs /= probs.sum(axis=1, keepdims=True)
            best = probs.argmax(axis=1)
            for i, j in enumerate(best):
                if probs[i, j] >= min_prob and labels[j] is not None:
                    results[i][field] = labels[j]
        return results


ZERO_SHOT = {
    "shot_type": [
        ("extreme wide", "an extreme wide establishing shot, a vast landscape or city with tiny people"),
        ("wide", "a wide shot showing people head to toe within their surroundings"),
        ("medium wide", "a medium wide shot of a person framed from the knees up"),
        ("medium", "a medium shot of a person framed from the waist up"),
        ("medium close-up", "a medium close-up of a person framed from the chest up"),
        ("close-up", "a close-up of a person's face filling the frame"),
        ("extreme close-up", "an extreme close-up of an eye, lips or a tiny detail"),
        ("insert", "an insert shot of an object, a hand, a letter or a prop"),
    ],
    "int_ext": [
        ("interior", "an interior scene inside a room or building"),
        ("exterior", "an exterior scene outdoors under the sky"),
    ],
    "time_of_day": [
        ("day", "a scene in bright daylight"),
        ("night", "a scene at night in the dark"),
        ("dusk/dawn", "a scene at sunset or dawn with golden light"),
    ],
    "framing": [
        ("single", "one person alone in the frame"),
        ("two shot", "two people together in the frame"),
        ("group", "a small group of people"),
        ("crowd", "a large crowd of people"),
        ("empty frame", "an empty scene with no people"),
    ],
    "angle": [
        ("eye level", "a shot at eye level"),
        ("low angle", "a low angle shot looking up at the subject"),
        ("high angle", "a high angle shot looking down at the subject"),
        ("overhead", "a top-down overhead bird's eye view"),
        ("aerial", "an aerial view from a drone or helicopter"),
    ],
}


def get_clip(name=DEFAULT_MODEL, pretrained=DEFAULT_PRETRAINED):
    """Process-wide cached model (loading takes a few seconds)."""
    key = model_key(name, pretrained)
    with _lock:
        if key not in _cache:
            _cache[key] = Clip(name, pretrained)
        return _cache[key]


def label_sentence(labels):
    """'close-up, interior, night' style prefix added to heuristic descriptions."""
    order = ["shot_type", "framing", "angle", "int_ext", "time_of_day"]
    words = []
    for f in order:
        v = labels.get(f)
        if not v or (f == "angle" and v == "eye level"):
            continue
        if f == "shot_type":
            v = f"{v} shot"
        words.append(v)
    return (", ".join(words).capitalize() + ". ") if words else ""
