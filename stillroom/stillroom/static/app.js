"use strict";

/* Stillroom front end - plain JS, no build step. */

const $ = (sel, el = document) => el.querySelector(sel);
const FILTERS = ["film", "director", "cinematographer", "genre", "decade", "aspect", "shot_type", "framing",
  "angle", "lighting", "time_of_day", "int_ext", "color", "key", "tone", "mood"];
const FACET_ORDER = ["color", "shot_type", "framing", "angle", "lighting", "time_of_day", "int_ext", "key",
  "tone", "film", "director", "cinematographer", "genre", "decade", "aspect", "source"];
const TITLES = {
  film: "Film", director: "Director", cinematographer: "Cinematographer", genre: "Genre", decade: "Decade",
  aspect: "Aspect ratio", shot_type: "Shot type", framing: "Framing", angle: "Camera angle",
  lighting: "Lighting", time_of_day: "Time of day", int_ext: "Interior / exterior", color: "Colour",
  key: "Exposure", tone: "Colour temperature", mood: "Mood", source: "Source",
};
const SOURCE_LABELS = { video: "Film frames", tmdb: "TMDB stills" };
const KEEP_CASE = new Set(["film", "director", "cinematographer"]);
const FAMILY_HEX = {
  red: "#c8352b", orange: "#e5822f", brown: "#7b4a2b", yellow: "#e3c33c", green: "#3f8a4f", teal: "#23898b",
  blue: "#3263b5", purple: "#774bb0", pink: "#dc5b9c", black: "#101010", gray: "#7f7f7f", white: "#f1f1f1",
};
const PRESETS = [
  ["#1f6f78", "Teal"], ["#e07a2f", "Orange"], ["#f2a33a", "Sodium amber"], ["#9b1b30", "Crimson"],
  ["#ff2e88", "Neon pink"], ["#6a3fa0", "Violet"], ["#3b5b8c", "Moonlight blue"], ["#2e5e3a", "Forest green"],
  ["#d4a72c", "Gold"], ["#c9a27e", "Skin / sand"], ["#e9e4d8", "Paper white"], ["#141414", "Ink black"],
];
const EXAMPLES = [
  "a man smoking alone at night", "couple dancing in a ballroom", "silhouette in a doorway",
  "close-up of a frightened face", "car driving at night", "old man with a beard looking out a window",
  "crowd running down a street", "woman reading a letter", "red light", "robot", "staircase", "rain",
];

const state = { q: "", filters: {}, color: "", similar: null, sort: "", seed: 0, page: 1, total: 0,
  results: [], mode: "", loading: false, done: false, token: 0, expanded: new Set() };
let stats = null;
let boards = [];

/* ------------------------------------------------------------ helpers */

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => Number(n || 0).toLocaleString();
function tc(sec) {
  const s = Math.floor(sec || 0);
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((v) => String(v).padStart(2, "0")).join(":");
}
function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch { return null; }
  return value;
}
async function api(path, opts = {}) {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.status === 204 ? null : res.json();
}
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2200);
}

/* ------------------------------------------------------------ URL state */

function readUrl() {
  const p = new URLSearchParams(location.search);
  state.q = p.get("q") || "";
  state.filters = {};
  for (const f of FILTERS) {
    const vals = p.getAll(f);
    if (vals.length) state.filters[f] = vals;
  }
  state.color = p.get("hex") || "";
  state.similar = p.get("similar");
  state.sort = p.get("sort") || "";
  state.seed = Number(p.get("seed")) || 0;
  return p.get("shot");
}
function queryParams() {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  for (const [k, vals] of Object.entries(state.filters)) vals.forEach((v) => p.append(k, v));
  if (state.color) p.set("hex", state.color);
  if (state.similar) p.set("similar", state.similar);
  if (state.sort) p.set("sort", state.sort);
  if (state.sort === "random") p.set("seed", state.seed);
  return p;
}
function writeUrl(push = true) {
  const qs = queryParams().toString();
  history[push ? "pushState" : "replaceState"]({}, "", "/" + (qs ? "?" + qs : ""));
}
function setShotParam(id) {
  const url = new URL(location.href);
  if (id) url.searchParams.set("shot", id);
  else url.searchParams.delete("shot");
  history.replaceState({}, "", url.pathname + url.search);
}

/* ------------------------------------------------------------ routing */

function setPage(name) {
  $("#searchbar").hidden = name !== "search";
  $("#layout").hidden = name !== "search";
  $("#filmsPage").hidden = name !== "films";
  $("#boardsPage").hidden = name !== "boards";
  $("#boardPage").hidden = name !== "board";
  $("#aboutPage").hidden = name !== "about";
  document.querySelectorAll("[data-nav]").forEach((a) =>
    a.classList.toggle("active", a.dataset.nav === name || (name === "board" && a.dataset.nav === "boards")));
}
function route() {
  const path = location.pathname;
  const m = path.match(/^\/boards\/(\d+)/);
  if (path === "/films") showFilms();
  else if (path === "/about") showAbout();
  else if (path === "/boards") showBoards();
  else if (m) showBoard(Number(m[1]));
  else showSearch();
}
function navigate(url) {
  history.pushState({}, "", url);
  closeViewer(false);
  route();
  window.scrollTo(0, 0);
}
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-link]");
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  navigate(a.getAttribute("href"));
});
window.addEventListener("popstate", () => { closeViewer(false); route(); });

/* ------------------------------------------------------------ search page */

function showSearch() {
  setPage("search");
  const shot = readUrl();
  syncControls();
  runSearch();
  if (shot) openViewer([{ id: Number(shot) }], 0);
}
function syncControls() {
  $("#q").value = state.q;
  $("#sort").value = state.sort;
  $("#colorDot").style.background = state.color || "";
  $("#colorInput").value = state.color || "#1f6f78";
  const n = Object.values(state.filters).reduce((a, v) => a + v.length, 0) + (state.color ? 1 : 0);
  $("#filterCount").hidden = !n;
  $("#filterCount").textContent = n;
}
const sessionSeed = Math.floor(Math.random() * 1e6);
function fetchPage(page, facets) {
  const p = queryParams();
  // With nothing typed, show a shuffled mix rather than every film's opening titles.
  if (!state.sort && !state.q && !state.color && !state.similar) {
    p.set("sort", "random");
    p.set("seed", sessionSeed);
  }
  p.set("page", page);
  p.set("per_page", 60);
  p.set("facets", facets ? 1 : 0);
  return api("/api/search?" + p.toString());
}
async function runSearch() {
  const token = ++state.token;
  state.page = 1;
  state.done = false;
  state.loading = true;
  const grid = $("#grid");
  if (!state.results.length) {
    grid.innerHTML = Array.from({ length: 18 }, () => '<div class="tile skeleton" style="--ar:1.85"><i></i></div>').join("");
  }
  grid.setAttribute("aria-busy", "true");
  let data;
  try {
    data = await fetchPage(1, true);
  } catch (err) {
    if (token === state.token) {
      grid.innerHTML = "";
      showEmpty(`<h2>Search failed</h2><p>${esc(err.message)}</p>`);
    }
    return;
  } finally {
    if (token === state.token) state.loading = false;
  }
  if (token !== state.token) return;
  state.total = data.total;
  state.mode = data.mode;
  state.results = data.results;
  state.done = state.results.length >= state.total;
  grid.innerHTML = "";
  grid.removeAttribute("aria-busy");
  appendTiles(grid, data.results, 0, state.results);
  renderFacets(data.facets);
  renderChips();
  renderHead();
  if (!state.total) renderNoResults();
  else $("#empty").hidden = true;
}
async function loadMore() {
  if (state.loading || state.done || $("#layout").hidden) return;
  state.loading = true;
  const token = state.token;
  try {
    const data = await fetchPage(state.page + 1, false);
    if (token !== state.token) return;
    state.page += 1;
    const start = state.results.length;
    state.results.push(...data.results);
    appendTiles($("#grid"), data.results, start, state.results);
    state.done = !data.results.length || state.results.length >= state.total;
  } finally {
    state.loading = false;
  }
}
new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && loadMore(),
  { rootMargin: "1400px" }).observe($("#sentinel"));

function newSearch(changes = {}, { keepFilters = true } = {}) {
  if (!keepFilters) Object.assign(state, { q: "", filters: {}, color: "", similar: null });
  Object.assign(state, changes);
  state.results = [];
  writeUrl(true);
  setPage("search");
  syncControls();
  window.scrollTo({ top: 0 });
  runSearch();
}

/* ------------------------------------------------------------ tiles */

function appendTiles(grid, shots, offset, list, opts = {}) {
  const frag = document.createDocumentFragment();
  shots.forEach((shot, i) => frag.appendChild(tileEl(shot, offset + i, list, opts)));
  grid.appendChild(frag);
}
function tileEl(shot, index, list, opts) {
  const el = document.createElement("div");
  el.className = "tile";
  el.style.setProperty("--ar", (shot.width / shot.height || 1.78).toFixed(4));
  const where = shot.source === "tmdb" ? "TMDB still" : tc(shot.frame_time);
  const label = `${shot.title}${shot.year ? ` (${shot.year})` : ""}, ${where}`;
  el.innerHTML = `<i></i><img loading="lazy" decoding="async" alt="" src="${esc(shot.thumb)}">
    <span class="meta"><b>${esc(shot.title)}${shot.year ? ` (${shot.year})` : ""}</b>${where}${shot.shot_type ? " · " + esc(shot.shot_type) : ""}</span>`;
  const img = el.querySelector("img");
  img.addEventListener("load", () => img.classList.add("loaded"), { once: true });
  const open = document.createElement("a");
  open.href = `?shot=${shot.id}`;
  open.className = "open";
  open.setAttribute("aria-label", `Open still: ${label}. ${shot.description || ""}`);
  open.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    openViewer(list, index);
  });
  el.appendChild(open);
  const quick = document.createElement("button");
  quick.className = "quick";
  if (opts.remove) {
    quick.setAttribute("aria-label", "Remove from board");
    quick.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    quick.addEventListener("click", () => opts.remove(shot, el));
  } else {
    quick.setAttribute("aria-label", "Save to board");
    quick.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z"/></svg>';
    quick.addEventListener("click", () => quickSave(shot));
  }
  el.appendChild(quick);
  return el;
}

/* ------------------------------------------------------------ facets & chips */

function renderFacets(facets) {
  const box = $("#facets");
  box.innerHTML = "";
  for (const name of FACET_ORDER) {
    let items = facets[name] || [];
    const selected = (state.filters[name] || []).map(String);
    for (const v of selected) {
      if (!items.some((it) => String(it.value) === v)) items = [{ value: v, label: v, count: 0 }, ...items];
    }
    if (!items.length) continue;
    const sec = document.createElement("section");
    sec.className = "facet";
    sec.innerHTML = `<h3>${TITLES[name]}</h3>`;
    if (name === "color") {
      const wrap = document.createElement("div");
      wrap.className = "colors";
      for (const it of items) {
        const id = `f-color-${it.value}`;
        const lab = document.createElement("label");
        lab.title = `${it.value} (${fmt(it.count)})`;
        lab.innerHTML = `<input type="checkbox" id="${id}" ${selected.includes(String(it.value)) ? "checked" : ""}>
          <span style="background:${FAMILY_HEX[it.value] || "#888"}"></span><span class="sr-only">${esc(it.value)} ${it.count}</span>`;
        lab.querySelector("input").addEventListener("change", () => toggleFilter(name, it.value));
        wrap.appendChild(lab);
      }
      sec.appendChild(wrap);
    } else {
      const limit = state.expanded.has(name) ? Infinity : 8;
      const ul = document.createElement("ul");
      items.slice(0, limit).forEach((it) => {
        const li = document.createElement("li");
        const text = name === "source" ? SOURCE_LABELS[it.value] || it.label : it.label;
        li.innerHTML = `<label><input type="checkbox" ${selected.includes(String(it.value)) ? "checked" : ""}>
          <span class="label ${KEEP_CASE.has(name) ? "keep-case" : ""}">${esc(text)}</span><span class="count">${fmt(it.count)}</span></label>`;
        li.querySelector("input").addEventListener("change", () => toggleFilter(name, it.value));
        ul.appendChild(li);
      });
      sec.appendChild(ul);
      if (items.length > 8) {
        const more = document.createElement("button");
        more.className = "link-btn more";
        more.textContent = state.expanded.has(name) ? "Show fewer" : `Show all ${items.length}`;
        more.addEventListener("click", () => {
          state.expanded.has(name) ? state.expanded.delete(name) : state.expanded.add(name);
          renderFacets(facets);
        });
        sec.appendChild(more);
      }
    }
    box.appendChild(sec);
  }
}
function toggleFilter(name, value) {
  const vals = (state.filters[name] || []).map(String);
  const v = String(value);
  const next = vals.includes(v) ? vals.filter((x) => x !== v) : [...vals, v];
  if (next.length) state.filters[name] = next;
  else delete state.filters[name];
  newSearch();
}
function renderChips() {
  const box = $("#activeChips");
  const chips = [];
  for (const [name, vals] of Object.entries(state.filters)) {
    for (const v of vals) {
      const label = name === "decade" ? `${v}s` : name === "aspect" ? `${v}:1` : name === "source" ? SOURCE_LABELS[v] || v : v;
      const dot = name === "color" ? `<span class="dot" style="background:${FAMILY_HEX[v] || "#888"}"></span>` : "";
      chips.push({ html: `${dot}<b>${esc(TITLES[name])}</b> ${esc(label)}`, remove: () => toggleFilter(name, v) });
    }
  }
  if (state.color) {
    chips.push({ html: `<span class="dot" style="background:${esc(state.color)}"></span><b>Contains</b> ${esc(state.color)}`,
      remove: () => newSearch({ color: "" }) });
  }
  if (state.similar) chips.push({ html: `<b>Similar to</b> still #${esc(state.similar)}`, remove: () => newSearch({ similar: null }) });
  box.innerHTML = "";
  for (const c of chips) {
    const b = document.createElement("button");
    b.className = "chip";
    b.innerHTML = `${c.html}<span class="x" aria-hidden="true">✕</span>`;
    b.setAttribute("aria-label", b.textContent.replace("✕", "").trim() + " - remove");
    b.addEventListener("click", c.remove);
    box.appendChild(b);
  }
  if (chips.length > 1) {
    const clear = document.createElement("button");
    clear.className = "link-btn";
    clear.textContent = "Clear all";
    clear.addEventListener("click", () => newSearch({}, { keepFilters: false }));
    box.appendChild(clear);
  }
}
function renderHead() {
  const modes = { hybrid: "semantic + keyword", text: "keyword", color: "colour match", similar: "visual similarity" };
  const tag = modes[state.mode] ? `<span class="mode-tag">${modes[state.mode]}</span>` : "";
  $("#resultHead").innerHTML = `<span><strong>${fmt(state.total)}</strong> still${state.total === 1 ? "" : "s"}${state.q ? ` for “${esc(state.q)}”` : ""}</span>${tag}`;
}
function showEmpty(html) {
  const el = $("#empty");
  el.innerHTML = html;
  el.hidden = false;
}
function renderNoResults() {
  if (stats && stats.shots === 0) {
    showEmpty(`<h2>Your library is empty</h2>
      <p>Add films you own, or start with free public-domain classics:</p>
      <pre>python -m stillroom demo            # downloads 3 free films and indexes them
python -m stillroom ingest "/path/to/Movie (1999).mkv"</pre>
      <p>Then refresh this page.</p>`);
  } else {
    showEmpty(`<h2>No stills match</h2><p>Try fewer words, remove a filter, or describe the picture differently
      (“woman at a window” rather than a character's name).</p>`);
  }
}

/* ------------------------------------------------------------ search controls */

let typingTimer;
$("#q").addEventListener("input", () => {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    state.q = $("#q").value.trim();
    state.results = [];
    writeUrl(false);
    runSearch();
  }, 380);
});
$("#queryForm").addEventListener("submit", (e) => {
  e.preventDefault();
  clearTimeout(typingTimer);
  newSearch({ q: $("#q").value.trim(), similar: null });
  $("#q").blur();
});
$("#sort").addEventListener("change", (e) => newSearch({ sort: e.target.value, seed: Math.floor(Math.random() * 1e6) }));
$("#shuffleBtn").addEventListener("click", () => newSearch({ sort: "random", seed: Math.floor(Math.random() * 1e6) }));
$("#filtersToggle").addEventListener("click", () => {
  const layout = $("#layout");
  const mobile = matchMedia("(max-width: 900px)").matches;
  const cls = mobile ? "show-facets-mobile" : "no-facets";
  layout.classList.toggle(cls);
  const open = mobile ? layout.classList.contains(cls) : !layout.classList.contains(cls);
  $("#filtersToggle").setAttribute("aria-expanded", String(open));
});
if (matchMedia("(max-width: 900px)").matches) $("#filtersToggle").setAttribute("aria-expanded", "false");

const colorPop = $("#colorPop");
function setColorPop(open) {
  colorPop.hidden = !open;
  $("#colorBtn").setAttribute("aria-expanded", String(open));
}
$("#colorBtn").addEventListener("click", (e) => { e.stopPropagation(); setColorPop(colorPop.hidden); });
document.addEventListener("click", (e) => { if (!colorPop.hidden && !e.target.closest(".popover-wrap")) setColorPop(false); });
$("#presetColors").innerHTML = PRESETS.map(([hex, name]) =>
  `<button style="background:${hex}" data-hex="${hex}" title="${name}" aria-label="${name}"></button>`).join("");
$("#presetColors").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-hex]");
  if (!b) return;
  setColorPop(false);
  newSearch({ color: b.dataset.hex, sort: "" });
});
$("#colorInput").addEventListener("change", (e) => { setColorPop(false); newSearch({ color: e.target.value, sort: "" }); });
$("#colorClear").addEventListener("click", () => { setColorPop(false); newSearch({ color: "" }); });

let exampleIdx = 0;
setInterval(() => {
  const q = $("#q");
  if (document.activeElement === q || q.value) return;
  exampleIdx = (exampleIdx + 1) % EXAMPLES.length;
  q.placeholder = `Try “${EXAMPLES[exampleIdx]}”`;
}, 3500);

/* ------------------------------------------------------------ viewer */

const viewer = { list: [], index: 0, shot: null, returnFocus: null, menuOpen: false };

function openViewer(list, index) {
  viewer.list = list;
  viewer.index = index;
  if ($("#viewer").hidden) viewer.returnFocus = document.activeElement;
  $("#viewer").hidden = false;
  document.body.style.overflow = "hidden";
  loadShot(list[index].id, list[index].thumb);
  $("#vClose").focus();
}
function closeViewer(updateUrl = true) {
  if ($("#viewer").hidden) return;
  $("#viewer").hidden = true;
  document.body.style.overflow = "";
  viewer.menuOpen = false;
  if (updateUrl) setShotParam(null);
  if (viewer.returnFocus && document.contains(viewer.returnFocus)) viewer.returnFocus.focus();
}
function step(delta) {
  const i = viewer.index + delta;
  if (i < 0 || i >= viewer.list.length) return;
  viewer.index = i;
  loadShot(viewer.list[i].id, viewer.list[i].thumb);
  if (viewer.list === state.results && i > state.results.length - 8) loadMore();
}
async function loadShot(id, thumb) {
  const img = $("#vImg");
  if (thumb) img.src = thumb;
  $("#vPrev").disabled = viewer.index <= 0;
  $("#vNext").disabled = viewer.index >= viewer.list.length - 1;
  $("#vCount").textContent = viewer.list.length > 1 ? `${viewer.index + 1} / ${viewer.list === state.results ? fmt(state.total) : viewer.list.length}` : "";
  let shot;
  try {
    shot = await api(`/api/shots/${id}`);
  } catch {
    $("#vBody").innerHTML = '<p class="muted">This still could not be loaded.</p>';
    return;
  }
  if (viewer.list[viewer.index] && viewer.list[viewer.index].id !== id) return;
  viewer.shot = shot;
  const full = new Image();
  full.onload = () => { if (viewer.shot && viewer.shot.id === id) img.src = shot.image; };
  full.src = shot.image;
  img.alt = shot.description || `Still from ${shot.title}`;
  setShotParam(id);
  renderPanel(shot);
  for (const d of [1, -1]) {
    const n = viewer.list[viewer.index + d];
    if (n && n.thumb) new Image().src = n.thumb.replace("/thumbs/", "/frames/");
  }
}
function attr(label, field, values) {
  const list = (Array.isArray(values) ? values : [values]).filter((v) => v !== null && v !== undefined && v !== "");
  if (!list.length) return "";
  const pills = list.map((v) => field
    ? `<button class="pill" data-filter="${field}" data-value="${esc(v)}">${esc(v)}</button>`
    : `<span>${esc(v)}</span>`).join("");
  return `<dt>${label}</dt><dd>${pills}</dd>`;
}
function renderPanel(s) {
  const credits = [];
  if (s.director) credits.push(`Directed by <button data-filter="director" data-value="${esc(s.director)}">${esc(s.director)}</button>`);
  if (s.cinematographer) credits.push(`Cinematography <button data-filter="cinematographer" data-value="${esc(s.cinematographer)}">${esc(s.cinematographer)}</button>`);
  const palette = s.palette.map(([hex, w]) =>
    `<button style="flex-grow:${w};background:${hex}" data-color="${hex}" aria-label="Find stills containing ${hex}" title="Find stills with ${hex} · shift-click to copy"><span>${hex}</span></button>`).join("");
  const strip = (items, current) => items.map((x, i) =>
    `<button data-strip="${i}" class="${x.id === current ? "current" : ""}" aria-label="${esc(x.title)} ${tc(x.frame_time)}"><img src="${esc(x.thumb)}" alt="" loading="lazy"></button>`).join("");
  $("#vBody").innerHTML = `
    <h2 class="v-film"><button data-filter="film" data-value="${esc(s.slug)}">${esc(s.title)}</button>
      ${s.year ? `<span class="muted">(${s.year})</span>` : ""}</h2>
    <p class="v-credits">${credits.join("<br>")}${credits.length ? "<br>" : ""}
      ${s.source === "tmdb" ? `Still ${s.idx} · from TMDB` : `Shot ${s.idx} · ${s.timecode} · ${s.duration}s`}${s.aspect_ratio ? ` · ${s.aspect_ratio}:1` : ""}</p>
    <div class="v-actions">
      <button class="btn primary" id="vSave" aria-expanded="false">Save <kbd>S</kbd></button>
      <a class="btn" href="/api/shots/${s.id}/download">Download <kbd>D</kbd></a>
      <button class="btn" id="vSimilar">Similar <kbd>F</kbd></button>
      <button class="btn" id="vCopy">Copy link</button>
    </div>
    <div id="vBoards"></div>
    <p class="v-desc">${esc(s.description) || '<span class="muted">No description yet. Run <code>python -m stillroom describe</code> to add one.</span>'}</p>
    <div class="v-palette">${palette}</div>
    <dl class="v-grid">
      ${attr("Shot type", "shot_type", s.shot_type)}
      ${attr("Framing", "framing", s.framing)}
      ${attr("Angle", "angle", s.angle)}
      ${attr("Lighting", "lighting", s.lighting)}
      ${attr("Time of day", "time_of_day", s.time_of_day)}
      ${attr("Int / Ext", "int_ext", s.int_ext)}
      ${attr("Location", null, s.location)}
      ${attr("People", null, s.people)}
      ${attr("Mood", "mood", s.mood)}
      ${attr("Exposure", "key", s.light_key)}
      ${attr("Colour temp.", "tone", s.tone)}
      ${attr("Colours", "color", s.colors)}
      ${attr("Genre", "genre", s.genres)}
    </dl>
    ${s.tags.length ? `<div class="v-section"><h4>Tags</h4>${s.tags.map((t) => `<button class="pill" data-tag="${esc(t)}">${esc(t)}</button>`).join("")}</div>` : ""}
    ${s.sequence.length > 1 ? `<div class="v-section"><h4>${s.source === "tmdb" ? "More from this film" : "In sequence"}</h4><div class="strip" data-list="sequence">${strip(s.sequence, s.id)}</div></div>` : ""}
    ${s.similar.length ? `<div class="v-section"><h4>Looks similar <button class="link-btn" id="vAllSimilar">See all</button></h4><div class="strip" data-list="similar">${strip(s.similar)}</div></div>` : ""}
    ${s.license ? `<p class="license">Source: ${esc(s.license)}</p>` : ""}
    ${s.source === "tmdb" && stats ? `<p class="license">${esc(stats.tmdb_notice)}</p>` : ""}
    <p class="license">Described by ${esc(s.describer || "—")}</p>`;
  if (viewer.menuOpen) renderBoardsMenu();
}
$("#vBody").addEventListener("click", async (e) => {
  const s = viewer.shot;
  if (!s) return;
  const f = e.target.closest("[data-filter]");
  if (f) {
    closeViewer(false);
    newSearch({ filters: { [f.dataset.filter]: [f.dataset.value] }, q: "", color: "", similar: null, sort: "" });
    return;
  }
  const tag = e.target.closest("[data-tag]");
  if (tag) { closeViewer(false); newSearch({ q: tag.dataset.tag, filters: {}, color: "", similar: null, sort: "" }); return; }
  const col = e.target.closest("[data-color]");
  if (col) {
    if (e.shiftKey) { navigator.clipboard?.writeText(col.dataset.color); toast(`Copied ${col.dataset.color}`); return; }
    closeViewer(false);
    newSearch({ color: col.dataset.color, q: "", filters: {}, similar: null, sort: "" });
    return;
  }
  const st = e.target.closest("[data-strip]");
  if (st) {
    const list = st.parentElement.dataset.list === "sequence" ? s.sequence : s.similar;
    openViewer(list, Number(st.dataset.strip));
    return;
  }
  if (e.target.closest("#vSave")) toggleBoardsMenu();
  else if (e.target.closest("#vSimilar") || e.target.closest("#vAllSimilar")) findSimilar();
  else if (e.target.closest("#vCopy")) {
    const url = `${location.origin}/?shot=${s.id}`;
    navigator.clipboard?.writeText(url);
    toast("Link copied");
  }
});
function findSimilar() {
  if (!viewer.shot) return;
  const id = viewer.shot.id;
  closeViewer(false);
  newSearch({ similar: String(id), q: "", filters: {}, color: "", sort: "" });
}
$("#vClose").addEventListener("click", () => closeViewer());
$("#vPrev").addEventListener("click", () => step(-1));
$("#vNext").addEventListener("click", () => step(1));
$("#viewer").addEventListener("click", (e) => { if (e.target.classList.contains("viewer-stage")) closeViewer(); });

/* ------------------------------------------------------------ boards */

async function loadBoards() {
  boards = await api("/api/boards");
  return boards;
}
function toggleBoardsMenu() {
  viewer.menuOpen = !viewer.menuOpen;
  if (viewer.menuOpen) renderBoardsMenu();
  else $("#vBoards").innerHTML = "";
  $("#vSave")?.setAttribute("aria-expanded", String(viewer.menuOpen));
}
async function renderBoardsMenu() {
  await loadBoards();
  const s = viewer.shot;
  const box = $("#vBoards");
  if (!s || !box) return;
  box.innerHTML = `<div class="boards-menu">
    ${boards.map((b) => `<label><input type="checkbox" data-board="${b.id}" ${s.boards.includes(b.id) ? "checked" : ""}> ${esc(b.name)} <span class="muted">(${b.count})</span></label>`).join("") || '<p class="muted" style="margin:0">No boards yet.</p>'}
    <form id="vNewBoard"><input placeholder="New board…" aria-label="New board name" maxlength="120"><button class="btn">Add</button></form>
  </div>`;
  box.querySelectorAll("[data-board]").forEach((cb) => cb.addEventListener("change", async () => {
    const id = Number(cb.dataset.board);
    if (cb.checked) {
      await api(`/api/boards/${id}/shots`, { method: "POST", body: JSON.stringify({ shot_id: s.id }) });
      s.boards.push(id);
      store("lastBoard", id);
      toast(`Saved to ${boards.find((b) => b.id === id)?.name}`);
    } else {
      await api(`/api/boards/${id}/shots/${s.id}`, { method: "DELETE" });
      s.boards = s.boards.filter((x) => x !== id);
    }
  }));
  $("#vNewBoard").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = e.target.querySelector("input").value.trim();
    if (!name) return;
    const b = await api("/api/boards", { method: "POST", body: JSON.stringify({ name }) });
    await api(`/api/boards/${b.id}/shots`, { method: "POST", body: JSON.stringify({ shot_id: s.id }) });
    s.boards.push(b.id);
    store("lastBoard", b.id);
    toast(`Saved to ${name}`);
    renderBoardsMenu();
  });
}
async function quickSave(shot) {
  await loadBoards();
  let id = Number(store("lastBoard"));
  let board = boards.find((b) => b.id === id);
  if (!board) board = boards[0];
  if (!board) board = await api("/api/boards", { method: "POST", body: JSON.stringify({ name: "My board" }) });
  await api(`/api/boards/${board.id}/shots`, { method: "POST", body: JSON.stringify({ shot_id: shot.id }) });
  store("lastBoard", board.id);
  toast(`Saved to ${board.name}`);
}

async function showBoards() {
  setPage("boards");
  await loadBoards();
  $("#boardCards").innerHTML = boards.length ? boards.map((b) => `
    <a class="card" href="/boards/${b.id}" data-link>
      <div class="cover" style="background-image:url('${esc(b.cover || "")}')"></div>
      <div class="body"><h2>${esc(b.name)}</h2><p>${fmt(b.count)} still${b.count === 1 ? "" : "s"}</p></div>
    </a>`).join("") : '<p class="muted">No boards yet. Create one here, or press <kbd>S</kbd> on any still.</p>';
}
$("#newBoardForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("#newBoardName").value.trim();
  if (!name) return;
  await api("/api/boards", { method: "POST", body: JSON.stringify({ name }) });
  $("#newBoardName").value = "";
  showBoards();
});

let currentBoard = null;
async function showBoard(id) {
  setPage("board");
  let b;
  try {
    b = await api(`/api/boards/${id}`);
  } catch {
    $("#boardTitle").textContent = "Board not found";
    $("#boardGrid").innerHTML = "";
    return;
  }
  currentBoard = b;
  $("#boardTitle").textContent = b.name;
  $("#boardSub").textContent = `${fmt(b.shots.length)} still${b.shots.length === 1 ? "" : "s"}`;
  $("#boardExport").href = `/api/boards/${id}/export.zip`;
  const grid = $("#boardGrid");
  grid.innerHTML = "";
  appendTiles(grid, b.shots, 0, b.shots, {
    remove: async (shot, el) => {
      await api(`/api/boards/${id}/shots/${shot.id}`, { method: "DELETE" });
      el.remove();
      b.shots = b.shots.filter((x) => x.id !== shot.id);
      $("#boardSub").textContent = `${fmt(b.shots.length)} stills`;
    },
  });
  $("#boardEmpty").hidden = b.shots.length > 0;
  const shot = new URLSearchParams(location.search).get("shot");
  if (shot) openViewer([{ id: Number(shot) }], 0);
}
$("#boardRename").addEventListener("click", async () => {
  if (!currentBoard) return;
  const name = prompt("Rename board", currentBoard.name);
  if (!name || !name.trim()) return;
  await api(`/api/boards/${currentBoard.id}`, { method: "PATCH", body: JSON.stringify({ name: name.trim() }) });
  showBoard(currentBoard.id);
});
$("#boardDelete").addEventListener("click", async () => {
  if (!currentBoard || !confirm(`Delete the board “${currentBoard.name}”? The stills stay in your library.`)) return;
  await api(`/api/boards/${currentBoard.id}`, { method: "DELETE" });
  navigate("/boards");
});

/* ------------------------------------------------------------ films */

async function showFilms() {
  setPage("films");
  const films = await api("/api/films");
  $("#filmsSub").textContent = `${films.length} film${films.length === 1 ? "" : "s"} in your library`;
  $("#filmCards").innerHTML = films.map((f) => `
    <a class="card" href="/?film=${encodeURIComponent(f.slug)}" data-link>
      <div class="cover" style="background-image:url('${esc(f.cover || "")}')"></div>
      <div class="body">
        <h2>${esc(f.title)} ${f.year ? `<span class="muted">(${f.year})</span>` : ""}</h2>
        <p>${esc(f.director || "Director unknown")}${f.cinematographer ? ` · DP ${esc(f.cinematographer)}` : ""}</p>
        <p>${fmt(f.shot_count)} stills · ${f.aspect_ratio ? `${f.aspect_ratio}:1` : ""}${f.genres.length ? " · " + esc(f.genres.join(", ")) : ""}</p>
      </div>
    </a>`).join("") || '<p class="muted">No films yet.</p>';
}

/* ------------------------------------------------------------ about */

function showAbout() {
  setPage("about");
  const show = Boolean(stats && stats.tmdb_films);
  $("#tmdbCredit").hidden = !show;
  if (show) $("#tmdbNotice").textContent = stats.tmdb_notice;
}

/* ------------------------------------------------------------ keyboard */

document.addEventListener("keydown", (e) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
  if (!$("#viewer").hidden) {
    if (e.key === "Escape") { e.preventDefault(); closeViewer(); return; }
    if (typing) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    else if (e.key.toLowerCase() === "s") { e.preventDefault(); toggleBoardsMenu(); }
    else if (e.key.toLowerCase() === "d" && viewer.shot) location.href = `/api/shots/${viewer.shot.id}/download`;
    else if (e.key.toLowerCase() === "f") findSimilar();
    else if (e.key === "Tab") {
      const panel = $("#viewer");
      if (!panel.contains(document.activeElement)) { e.preventDefault(); $("#vClose").focus(); }
    }
    return;
  }
  if (e.key === "Escape" && !colorPop.hidden) setColorPop(false);
  if (typing) return;
  if (e.key === "/" && !$("#searchbar").hidden) { e.preventDefault(); $("#q").focus(); }
});
document.addEventListener("focusin", (e) => {
  if (!$("#viewer").hidden && !$("#viewer").contains(e.target)) $("#vClose").focus();
});

/* ------------------------------------------------------------ theme & boot */

function applyTheme(t) {
  if (t) document.documentElement.dataset.theme = t;
}
applyTheme(store("theme") || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : null));
$("#themeToggle").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  applyTheme(next);
  store("theme", next);
});

async function boot() {
  try {
    stats = await api("/api/stats");
    $("#stats").textContent = `${fmt(stats.shots)} stills · ${fmt(stats.films)} films` +
      (stats.embedded ? " · semantic search on" : "");
  } catch { /* the search call will surface errors */ }
  route();
}
boot();
