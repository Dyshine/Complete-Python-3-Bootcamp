@echo off
rem Set up and open Stillroom on your own computer (Windows).
rem First run: creates .venv, installs packages, downloads 3 free films. Later runs just start the site.
setlocal
cd /d "%~dp0"

where ffmpeg >nul 2>nul
if errorlevel 1 (
  echo FFmpeg is required. Install it with:  winget install ffmpeg
  echo Then open a new terminal and run start.bat again.
  pause
  exit /b 1
)

if not exist .venv (
  echo Creating a virtual environment in .venv ...
  py -3 -m venv .venv 2>nul || python -m venv .venv
)
call .venv\Scripts\activate.bat
python -m pip install -q --upgrade pip
python -m pip install -q -r requirements.txt

python -c "import open_clip" >nul 2>nul
if errorlevel 1 (
  echo Installing semantic search ^(PyTorch + OpenCLIP^). The first time this is a large download...
  python -m pip install -q -r requirements-ai.txt || echo Semantic search could not be installed; keyword and colour search still work.
)

if not exist library\stillroom.db (
  echo No library yet: downloading 3 free films to start with ^(about 1.5 GB, 15-30 minutes^)...
  python -m stillroom demo
)

python -m stillroom serve --open %*
