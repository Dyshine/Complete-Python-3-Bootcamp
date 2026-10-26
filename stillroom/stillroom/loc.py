"""Films from the Library of Congress National Screening Room.

The Library offers a direct MP4 download only for films it believes are in the
public domain; copyrighted titles are streaming-only. This module imports a
film only when such a download exists.
"""

import http.client
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://www.loc.gov"
COLLECTION = "/collections/national-screening-room/"
UA = {"User-Agent": "stillroom/0.1 (personal film-still library)"}
LICENSE = "Library of Congress National Screening Room (no known U.S. copyright restrictions)"


def _get_json(url, attempts=4):
    """GET JSON, retrying: loc.gov sometimes drops long responses midway."""
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except (http.client.IncompleteRead, urllib.error.URLError, ConnectionError, TimeoutError):
            if attempt == attempts - 1:
                raise
            time.sleep(1.5 * (attempt + 1))


def _item_id(url):
    m = re.search(r"/item/([^/]+)/?", url or "")
    return m.group(1) if m else None


def _year(text):
    m = re.search(r"(18|19|20)\d{2}", str(text or ""))
    return int(m.group(0)) if m else None


def search(query=None, page=1, count=25):
    params = {"fo": "json", "c": count, "sp": page, "fa": "online-format:video", "at": "results,pagination"}
    if query:
        params["q"] = query
    data = _get_json(f"{API}{COLLECTION}?{urllib.parse.urlencode(params)}")
    out = []
    for r in data.get("results") or []:
        item_id = _item_id(r.get("id") or r.get("url"))
        if not item_id:
            continue
        images = r.get("image_url") or []
        out.append({"id": item_id, "title": (r.get("title") or "").strip(" .") or item_id,
                    "year": _year(r.get("date")), "thumb": images[0] if images else None})
    return out


def pick_file(item_id):
    """(mp4 url or None, film info) for one item."""
    data = _get_json(f"{API}/item/{urllib.parse.quote(item_id)}/?fo=json&at=item,resources")
    item = data.get("item") or {}
    info = {"title": (item.get("title") or item_id).strip(" ."), "year": _year(item.get("date")),
            "license": LICENSE}
    if item.get("access_restricted"):
        return None, info
    best = None
    for resource in data.get("resources") or []:
        for group in resource.get("files") or []:
            for f in group:
                if f.get("mimetype") == "video/mp4" and f.get("url"):
                    size = f.get("size") or 0
                    if best is None or (size and size < best[1]):
                        best = (f["url"], size)
    return (best[0] if best else None), info
