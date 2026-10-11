#!/usr/bin/env bash
# Downloads the Higgsfield-generated hero model and animation clips next to dead-acre.html.
# The game loads hero.glb and anim/*.glb if present, and falls back to the box survivor otherwise.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p assets/anim
H=https://d8j0ntlcm91z4.cloudfront.net/user_38lXl82Wxa7QrVQLQ427zJ1K5yL

get() { curl -sSf --retry 3 -o "$1" "$H/$2" && echo "ok   $1 ($(du -h "$1" | cut -f1))"; }

get assets/hero.glb                 hf_20261011_164356_3e77ff37-b1c9-4332-9ecc-f18418308a9a.glb  # textured + rigged, casual walk
get assets/anim/walk_shoot.glb      hf_20261011_170716_a9b0a19f-cd44-4b6a-9e15-d5ab23e3b922.glb  # Walk_Forward_While_Shooting_inplace
get assets/anim/walk_back_shoot.glb hf_20261011_170717_9735ae9c-19d9-4b2e-aab8-9deb0207e81f.glb  # Walk_Backward_While_Shooting_inplace
get assets/anim/run.glb             hf_20261011_170718_6f45da2f-907a-4620-8b56-6d989a46f88d.glb  # RunFast
get assets/anim/hit.glb             hf_20261011_170719_281734fc-bf97-4cc6-a56c-63afc147fcdb.glb  # Face_Punch_Reaction
get assets/anim/death.glb           hf_20261011_170720_f6aa6cde-a2fb-4096-bc4c-31ffe5ce702b.glb  # Shot_and_Fall_Backward
# idle (job f65a22aa-5c28-40af-b0e5-2cf722709df5): filename added once the job finishes
