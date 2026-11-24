#!/usr/bin/env bash
# Build the GARAP reel: music + SFX -> picture (parallel) -> garap-stickman.mp4 (1920x1080, 30 fps, 120 s).
# Run on a production computer, never on the GARAP Raspberry Pi.
#   bash build.sh            full build
#   AUDIO_ONLY=1 bash build.sh   remix sound only
set -euo pipefail
cd "$(dirname "$0")"
KIT="${KIT:-$HOME/.claude/animation-skills/kit}"
PY="$KIT/.venv/bin/python"; export NODE_PATH="$KIT/node_modules"
WORKERS="${WORKERS:-6}"
mkdir -p audio
echo "== music + sfx"; "$PY" audio.py
if [ "${AUDIO_ONLY:-0}" != "1" ] || [ ! -f silent.mp4 ]; then
  echo "== rendering with $WORKERS workers"
  mkdir -p seg
  N=$(grep -c "^S(" web/shots.js)
  pids=()
  for ((w = 0; w < WORKERS; w++)); do
    ids=""; for ((i = w; i < N; i += WORKERS)); do f=$(printf "seg/shot_%02d.mp4" "$i"); [ -f "$f" ] || ids="${ids:+$ids,}$i"; done   # resume: skip finished shots
    [ -n "$ids" ] && { node tools/render.js segments "$ids" > "seg/log$w.txt" 2>&1 & pids+=($!); }
  done
  for p in "${pids[@]:-}"; do [ -n "$p" ] && wait "$p"; done
  [ "$(ls seg/shot_??.mp4 | wc -l | tr -d ' ')" -eq "$N" ] || { echo "a shot failed, see seg/log*.txt"; exit 1; }
  for f in seg/shot_??.mp4; do echo "file '$PWD/$f'"; done > seg/list.txt
  ffmpeg -v error -y -f concat -safe 0 -i seg/list.txt -c copy silent.mp4
fi
echo "== mux"
ffmpeg -v error -y -i silent.mp4 -i audio/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart garap-stickman.part.mp4
mv garap-stickman.part.mp4 garap-stickman.mp4
ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate -show_entries format=duration -of compact garap-stickman.mp4
