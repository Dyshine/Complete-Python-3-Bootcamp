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
get assets/anim/idle.glb            hf_20261011_170715_f65a22aa-5c28-40af-b0e5-2cf722709df5.glb  # Idle
mkdir -p assets/zombies/anim
get assets/zombies/trucker.glb      hf_20261011_192258_4e790188-b9ee-4b5b-8af6-58af35690278.glb  # boomer, Slow_Orc_Walk
get assets/zombies/hulk.glb         hf_20261011_192300_2d73ef70-59e6-4a3d-bbf8-cf442b8a8879.glb  # brute, Monster_Walk
get assets/zombies/grandma.glb      hf_20261011_192301_bcf453af-edd6-4b5f-aff6-f89e3513651a.glb  # walker/runner, Elderly_Shaky_Walk
get assets/zombies/office.glb       hf_20261011_203740_ebe6f7fe-a969-4d1a-a870-376a2c9cfc48.glb  # walker/runner, Stumble_Walk (milder concept)
get assets/zombies/anim/attack.glb  hf_20261011_203548_97cdc9b3-698e-402d-9c64-a9c4bc3f04b5.glb  # shared zombie attack: Left_Hook_from_Guard
get assets/zombies/anim/death.glb   hf_20261011_203549_2287f39c-c8ab-43d0-a49c-c27cf968def4.glb  # shared zombie death: dying_backwards
