"""
Teardown-Bildsequenz für die Website aufbereiten.

    python3 scripts/build-film.py <Ordner mit teardown_0000.png …>

Erzeugt public/film/teardown-1080/f000.webp … und public/film/teardown-720/… (WebP, Qualität 74).
Erwartet die Bilder 0, 2, 4 … 186 aus blender/v6/sg_run.render_sequence(step=2).
"""
import os
import sys

from PIL import Image

SRC = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "public", "film")
SIZES = (1080, 720)
QUALITY = {1080: 74, 720: 72}

files = sorted(f for f in os.listdir(SRC) if f.startswith("teardown_") and f.endswith(".png"))
frames = [int(f[9:13]) for f in files]
expected = list(range(0, 187, 2))
missing = sorted(set(expected) - set(frames))
if missing:
    sys.exit(f"Es fehlen Bilder: {missing[:10]} …")
total = {s: 0 for s in SIZES}
for k, fr in enumerate(expected):
    im = Image.open(os.path.join(SRC, f"teardown_{fr:04d}.png")).convert("RGB")
    for s in SIZES:
        d = os.path.join(OUT, f"teardown-{s}")
        os.makedirs(d, exist_ok=True)
        p = os.path.join(d, f"f{k:03d}.webp")
        (im if im.width == s else im.resize((s, s), Image.LANCZOS)).save(p, "WEBP", quality=QUALITY[s], method=6)
        total[s] += os.path.getsize(p)
for s in SIZES:
    print(f"{s}px: {len(expected)} Bilder, {total[s] / 1e6:.1f} MB")
