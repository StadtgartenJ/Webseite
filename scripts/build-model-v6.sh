#!/usr/bin/env bash
# Stadtgarden v6: Web-GLB aus dem Blender-Mastermodell bauen.
#   Voraussetzungen: pip install bpy==5.2.3 pillow matplotlib · Node (npx)
#   Scan-Assets in blender/assets/ (siehe docs/3d-rendering-report.md, Abschnitt Lizenzen)
set -euo pipefail
cd "$(dirname "$0")/.."
python3 blender/v6/sg_export.py -- public/models/stadtgarden-v6-raw.glb
npx --yes @gltf-transform/cli@4.5.1 optimize public/models/stadtgarden-v6-raw.glb public/models/stadtgarden-v6.glb \
  --compress meshopt --texture-compress webp --texture-size 1024 \
  --simplify false --join false --palette false --flatten false --instance false
rm -f public/models/stadtgarden-v6-raw.glb
ls -la public/models/stadtgarden-v6.glb
