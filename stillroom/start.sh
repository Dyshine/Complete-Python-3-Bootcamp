#!/usr/bin/env sh
# Set up and open Stillroom on your own computer (macOS / Linux).
# First run: creates .venv, installs packages, downloads 3 free films. Later runs just start the site.
# Extra arguments go to `serve`, e.g.  ./start.sh --port 9000
set -e
cd "$(dirname "$0")"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "FFmpeg is required. Install it, then run ./start.sh again:"
  echo "  macOS:  brew install ffmpeg"
  echo "  Ubuntu: sudo apt install ffmpeg"
  exit 1
fi

PY=python3
command -v python3 >/dev/null 2>&1 || PY=python
if [ ! -d .venv ]; then
  echo "Creating a virtual environment in .venv ..."
  "$PY" -m venv .venv
fi
. .venv/bin/activate
python -m pip install -q --upgrade pip
python -m pip install -q -r requirements.txt

if ! python -c "import open_clip" >/dev/null 2>&1; then
  echo "Installing semantic search (PyTorch + OpenCLIP). The first time this is a large download..."
  if [ "$(uname)" = "Linux" ] && ! command -v nvidia-smi >/dev/null 2>&1; then
    # torch and torchvision must come from the same build, or OpenCLIP fails to import.
    python -m pip install -q torch torchvision --index-url https://download.pytorch.org/whl/cpu || true
  fi
  python -m pip install -q -r requirements-ai.txt \
    || echo "Semantic search could not be installed; keyword and colour search still work."
fi

if [ ! -f library/stillroom.db ]; then
  echo "No library yet: downloading 3 free films to start with (about 1.5 GB, 15-30 minutes)..."
  python -m stillroom demo
fi

exec python -m stillroom serve --open "$@"
