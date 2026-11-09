#!/usr/bin/env bash
# Baut das 3D-Modell für den Viewer neu: Texturen → Blender-Export → Kompression.
# Voraussetzungen: Python 3 mit numpy, scipy, pillow und bpy (pip install bpy) oder Blender 4.2+.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 blender/textures.py
python3 blender/stadtgarden_v5.py --glb public/models/stadtgarden-raw.glb
npx -y @gltf-transform/cli@4.5.1 optimize public/models/stadtgarden-raw.glb public/models/stadtgarden.glb \
  --compress meshopt --texture-compress webp --texture-size 1024 \
  --simplify false --join false --instance false --flatten false --palette false
rm public/models/stadtgarden-raw.glb
ls -la public/models
