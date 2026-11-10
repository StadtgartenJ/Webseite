"""
Stadtgarden v7 – Blatttexturen für Efeutute (Epipremnum aureum) und Pfennigkraut (Lysimachia nummularia 'Aurea').
Eigene, prozedural erzeugte Texturen (keine fremden Assets). Ausführen außerhalb von Blender:
    python3 blender/v6/sg_leaftex.py      → blender/v6/tex_v7/*.png
Atlas 2048 × 2048 (siehe main); in jeder Blattkachel u = quer (0,5 = Mittelrippe), v = Blattgrund (0) → Spitze (1).
"""
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "tex_v7")


def value_noise(shape, cells, rng):
    """Glatte Wertrauschen-Fläche (bikubisch interpoliertes Zufallsraster)."""
    h, w = shape
    gy, gx = cells
    g = rng.random((gy + 3, gx + 3))
    y = np.linspace(0, gy, h, endpoint=False)[:, None] + 1
    x = np.linspace(0, gx, w, endpoint=False)[None, :] + 1
    y0, x0 = np.floor(y).astype(int), np.floor(x).astype(int)
    fy, fx = y - y0, x - x0
    sy, sx = fy * fy * (3 - 2 * fy), fx * fx * (3 - 2 * fx)
    a = g[y0, x0]
    b = g[y0, x0 + 1]
    c = g[y0 + 1, x0]
    d = g[y0 + 1, x0 + 1]
    return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy


def sample(field, yy, xx):
    """field an beliebigen (normierten) Koordinaten abtasten (bilinear, periodisch)."""
    h, w = field.shape
    y = (yy % 1.0) * (h - 1)
    x = (xx % 1.0) * (w - 1)
    y0, x0 = np.floor(y).astype(int), np.floor(x).astype(int)
    y1, x1 = np.minimum(y0 + 1, h - 1), np.minimum(x0 + 1, w - 1)
    fy, fx = y - y0, x - x0
    return (field[y0, x0] * (1 - fx) + field[y0, x1] * fx) * (1 - fy) + (field[y1, x0] * (1 - fx) + field[y1, x1] * fx) * fy


def fbm(rng, yy, xx, octaves=4, cells=(8, 8), size=1024):
    """Fraktales Rauschen; yy/xx etwa im Bereich 0…1, Frequenz über cells (getrennt für y und x)."""
    out = np.zeros_like(yy)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        cy, cx = min(cells[0] * 2 ** o, size // 2), min(cells[1] * 2 ** o, size // 2)
        f = value_noise((size, size), (cy, cx), rng)
        out += amp * sample(f, yy * 0.98 + 0.01, xx * 0.98 + 0.01)
        tot += amp
        amp *= 0.5
    return out / tot


def hexc(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)])


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def mix(a, b, t):
    return a * (1 - t[..., None]) + b * t[..., None]


def normal_from_height(h, strength):
    gy, gx = np.gradient(h)
    n = np.dstack((-gx * strength, gy * strength, np.ones_like(h)))  # OpenGL (+Y), Bild oben = Spitze
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return n * 0.5 + 0.5


def pothos_tile(seed, variegation, W=512, H=1024):
    rng = np.random.default_rng(seed)
    v = np.linspace(0, 1, H)[:, None] * np.ones((1, W))
    u = np.ones((H, 1)) * np.linspace(0, 1, W)[None, :]
    d = np.abs(u - 0.5) * 2
    q = v - 0.38 * d ** 1.15  # Seitennerven laufen schräg zur Spitze
    qn = (q + 0.45) / 1.45
    # Grundgrün mit leichter Wolkigkeit, Rand etwas dunkler
    cloud = fbm(rng, v, u, 3, (3, 2))
    base = mix(hexc("#2B571F"), hexc("#457F2F"), np.clip(cloud * 1.3 - 0.2 + 0.12 * v, 0, 1))
    base = mix(base, hexc("#22461A"), smooth(0.72, 1.0, d) * 0.45)
    # Goldene Panaschierung: dünne, unregelmäßige Streifen entlang der Seitennerven,
    # nur in einzelnen Zonen (links und rechts verschieden)
    zones = fbm(rng, v, u, 3, (3, 3))
    streak = fbm(rng, qn, u, 4, (34, 3))
    marble = fbm(rng, qn, u, 3, (10, 6))
    th = 0.70 - 0.16 * variegation
    m = smooth(th, th + 0.05, streak * 0.65 + marble * 0.35)
    m *= smooth(0.55 - 0.25 * variegation, 0.7 - 0.25 * variegation, zones)
    m = np.clip(m, 0, 1) * smooth(0.0, 0.1, 1 - d)
    gold = mix(hexc("#D6C86A"), hexc("#EEE4A2"), fbm(rng, v, u, 2, (12, 8)))
    col = mix(base, gold, m * 0.9)
    # Mittelrippe hell, zur Spitze schmaler
    rib_w = 0.014 * (1.2 - 0.85 * v)
    rib = np.exp(-((u - 0.5) ** 2) / (2 * rib_w ** 2))
    col = mix(col, hexc("#A9B860"), rib * 0.7)
    # Seitennerven fein
    vein = np.exp(-((np.mod(q * 6.0, 1.0) - 0.5) ** 2) / (2 * 0.03 ** 2)) * smooth(0.04, 0.2, d) * (1 - smooth(0.7, 0.95, d))
    col = mix(col, col * 1.15 + 0.015, vein * 0.3)
    col = np.clip(col, 0, 1)
    height = -rib * 1.0 - vein * 0.35 + (fbm(rng, v, u, 2, (60, 30)) - 0.5) * 0.06 + 0.25 * (1 - d) ** 0.5
    nor = normal_from_height(height, 18.0)
    return col, nor


def jenny_tile(seed, hue, W=512, H=512):
    rng = np.random.default_rng(seed)
    v = np.linspace(0, 1, H)[:, None] * np.ones((1, W))
    u = np.ones((H, 1)) * np.linspace(0, 1, W)[None, :]
    d = np.abs(u - 0.5) * 2
    r = np.sqrt((u - 0.5) ** 2 + (v - 0.45) ** 2) * 2
    c0 = mix(hexc("#6B9230"), hexc("#8EAD34"), np.full((H, W), hue))
    c1 = mix(hexc("#527A26"), hexc("#73962D"), np.full((H, W), hue))
    col = mix(c1, c0, np.clip(r * 0.9 + (fbm(rng, v, u, 3, (3, 3)) - 0.5) * 0.5, 0, 1))
    rib = np.exp(-((u - 0.5) ** 2) / (2 * 0.012 ** 2)) * (1 - smooth(0.7, 0.95, v))
    q = v - 0.5 * d
    vein = np.exp(-((np.mod(q * 4.0, 1.0) - 0.5) ** 2) / (2 * 0.04 ** 2)) * smooth(0.05, 0.25, d) * (1 - smooth(0.6, 0.9, r))
    col = mix(col, col * 1.12 + 0.03, rib * 0.6 + vein * 0.25)
    # feine dunkle Drüsenpunkte (typisch für Pfennigkraut)
    dots = smooth(0.88, 0.9, fbm(rng, v, u, 1, (90, 90)))
    col = mix(col, col * 0.8, dots * 0.3)
    col = mix(col, hexc("#BCC655"), smooth(0.85, 1.05, r) * 0.25)  # Rand leicht gelblich
    col = np.clip(col, 0, 1)
    height = -rib * 0.8 - vein * 0.3 + (1 - np.clip(r, 0, 1)) ** 0.5 * 0.3 + (fbm(rng, v, u, 2, (60, 60)) - 0.5) * 0.06
    nor = normal_from_height(height, 12.0)
    return col, nor


def save(arr, name):
    img = Image.fromarray((np.flipud(np.clip(arr, 0, 1)) * 255 + 0.5).astype(np.uint8))
    img.save(os.path.join(OUT, name), optimize=True)


def stem_strip(W=2048, H=512, seed=5):
    """Stängelfarben: u 0–0,45 Efeutute-Stängel (grün), 0,45–0,7 Pfennigkraut (rötlich-grün), 0,7–1 Blattstiele (hellgrün)."""
    rng = np.random.default_rng(seed)
    v = np.linspace(0, 1, H)[:, None] * np.ones((1, W))
    u = np.ones((H, 1)) * np.linspace(0, 1, W)[None, :]
    n = fbm(rng, v, u, 3, (6, 24))
    a = mix(hexc("#4E7330"), hexc("#6A8C3C"), n)
    b = mix(hexc("#6B6236"), hexc("#86793F"), n)
    c = mix(hexc("#7E9E46"), hexc("#9DB65A"), n)
    col = np.where((u < 0.45)[..., None], a, np.where((u < 0.7)[..., None], b, c))
    return np.clip(col, 0, 1)


def main():
    """Ein gemeinsamer Atlas (2048 × 2048) für Master und Web:
    oben (v 0,5–1) vier Efeutute-Blätter, darunter (v 0,25–0,5) vier Pfennigkraut-Blätter, unten (v 0–0,25) Stängel."""
    os.makedirs(OUT, exist_ok=True)
    pt = [pothos_tile(11 + i, var) for i, var in enumerate((0.9, 0.55, 0.3, 0.7))]
    jt = [jenny_tile(31 + i, h) for i, h in enumerate((0.85, 0.55, 0.95, 0.35))]
    st = stem_strip()
    # Zeilen hier von unten (v = 0) nach oben; save() dreht das Bild
    col = np.vstack([st, np.hstack([t[0] for t in jt]), np.hstack([t[0] for t in pt])])
    flat = np.dstack((np.full(st.shape[:2], 0.5), np.full(st.shape[:2], 0.5), np.ones(st.shape[:2])))
    nor = np.vstack([flat, np.hstack([t[1] for t in jt]), np.hstack([t[1] for t in pt])])
    rng = np.random.default_rng(3)
    H, W = col.shape[:2]
    v = np.linspace(0, 1, H)[:, None] * np.ones((1, W))
    u = np.ones((H, 1)) * np.linspace(0, 1, W)[None, :]
    rough = np.where(v < 0.25, 0.55, np.where(v < 0.5, 0.48, 0.30)) + (fbm(rng, v, u, 2, (40, 40)) - 0.5) * 0.08
    save(col, "blatt_atlas_farbe.png")
    save(nor, "blatt_atlas_normal.png")
    save(np.dstack([rough] * 3), "blatt_atlas_rauheit.png")
    print("Atlas in", OUT)


if __name__ == "__main__":
    main()
