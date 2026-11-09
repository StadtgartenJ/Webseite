"""
Prozedurale Texturen für das 3D-Mastermodell (keine Fremd-Assets, frei verwendbar).

  python3 blender/textures.py  →  blender/tex/*.png

- pothos_albedo.png  Efeutute-Blatt (golden pothos): Grün mit cremegelben Streifen entlang der
                     Seitennerven, hellere Mittelrippe; Alpha = Blattumriss
- pothos_normal.png  Normalmap: Mittelrippe als Rinne, Seitennerven, leichte Wölbung dazwischen
- jenny_albedo.png   rundes Blättchen (Pfennigkraut)
- soil_albedo.png / soil_normal.png  kachelbare Erde
- insert_normal.png  feine Spritzguss-Struktur
"""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import gaussian_filter, map_coordinates

OUT = os.path.join(os.path.dirname(__file__), "tex")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(11)


def srgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) for i in (0, 2, 4)], np.float32) / 255


def smooth_noise(shape, scale, seed):
    """glatte Wertrauschen-Textur (0..1), Strukturgröße ≈ scale Pixel"""
    r = np.random.default_rng(seed)
    small = r.random((max(2, shape[0] // scale + 3), max(2, shape[1] // scale + 3))).astype(np.float32)
    big = np.asarray(Image.fromarray(small).resize((shape[1] + 3 * scale, shape[0] + 3 * scale), Image.BICUBIC))
    return big[scale : scale + shape[0], scale : scale + shape[1]]


def fbm(shape, base, seed, octaves=4):
    out = np.zeros(shape, np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        out += amp * smooth_noise(shape, max(2, base // (2**o)), seed + o)
        tot += amp
        amp *= 0.5
    return out / tot


def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def normal_from_height(h, strength):
    gy, gx = np.gradient(h)
    n = np.dstack([-gx * strength, gy * strength, np.ones_like(h)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return ((n * 0.5 + 0.5) * 255).astype(np.uint8)


# ── Efeutute ──────────────────────────────────────────────────────────────
W, H = 512, 1024
SS = 4  # Supersampling für den Umriss


def catmull(points, n=24):
    P = [points[0]] + points + [points[-1]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = (np.array(P[j], np.float64) for j in (i - 1, i, i + 1, i + 2))
        for t in np.linspace(0, 1, n, endpoint=False):
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t**2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t**3))
    out.append(np.array(points[-1], np.float64))
    return out


# rechte Blatthälfte: (Halbbreite, Höhe) mit herzförmiger Basis und ausgezogener Spitze
RIGHT = [(0.0, 0.075), (0.09, 0.03), (0.22, 0.012), (0.34, 0.05), (0.43, 0.16), (0.455, 0.3), (0.42, 0.45), (0.33, 0.62), (0.2, 0.79), (0.08, 0.93), (0.0, 1.0)]


def leaf_outline(w, h):
    r = catmull(RIGHT)
    left = [(-x * 0.97 + 0.01 * y**2, y) for x, y in r]
    poly = [(0.5 + x, 1 - y) for x, y in r] + [(0.5 + x, 1 - y) for x, y in left[::-1]]
    return [(x * w, (0.02 + 0.96 * y) * h) for x, y in poly]


img = Image.new("L", (W * SS, H * SS), 0)
ImageDraw.Draw(img).polygon(leaf_outline(W * SS, H * SS), fill=255)
alpha = np.asarray(img.resize((W, H), Image.LANCZOS)).astype(np.float32) / 255

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
u = (xx - W / 2) / (W / 2)  # -1..1 quer
v = 1 - yy / H  # 0 Basis .. 1 Spitze
au = np.abs(u)

# Koordinate entlang der Seitennerven: Nerven laufen von der Mittelrippe bogig Richtung Spitze
s = v - 0.62 * au**1.15
along = au  # Position entlang eines Nervs

# Streifen der Panaschierung: gestreckt entlang der Nerven, schmal quer dazu, mit Verwirbelung
warp = fbm((H, W), 90, 7) - 0.5
big = fbm((2048, 512), 70, 5, octaves=3)
cs = np.clip((s + 0.08 * warp + 0.7) / 1.8 * 1400, 0, 2047)
ca = np.clip((u + 1 + 0.06 * warp) * 120 + 20, 0, 511)
streak_field = map_coordinates(big, [cs, ca], order=1).reshape(H, W)
N1 = fbm((H, W), 64, 3)
patch = fbm((H, W), 300, 9)  # große Bereiche mit mehr/weniger Gelb
near_mid = 1 - sstep(0.0, 0.8, au)
score = streak_field * 0.7 + patch * 0.45 + near_mid * 0.1
var = sstep(0.66, 0.78, score)
var *= sstep(0.03, 0.12, v) * (1 - 0.5 * sstep(0.8, 1.0, v))
var *= 0.75 + 0.25 * N1

# Mittelrippe und Seitennerven
mid_w = 0.018 * (1 - 0.7 * v) + 0.004
midrib = np.exp(-((u / mid_w) ** 2))
veins = np.zeros_like(u)
for k in range(9):
    s0 = 0.06 + k * 0.105
    veins += np.exp(-(((s - s0) / 0.009) ** 2)) * sstep(0.02, 0.15, au) * (1 - sstep(0.75, 0.98, au))
veins = np.clip(veins, 0, 1)

green_dark = srgb("#2f6a1f")
green = srgb("#54912e")
green_light = srgb("#6ea23a")
yellow = srgb("#c9d457")
cream = srgb("#e0e28a")

g = N1[..., None]
col = green_dark * (1 - g) + green * g
col = col * (1 - 0.35 * near_mid[..., None]) + green_light * (0.35 * near_mid[..., None])
yel = yellow * (1 - N1[..., None]) + cream * N1[..., None]
col = col * (1 - var[..., None]) + yel * var[..., None]
col = col * (1 - 0.55 * midrib[..., None]) + srgb("#cfd677") * (0.55 * midrib[..., None])
col = col * (1 - 0.12 * veins[..., None]) + srgb("#b9cd62") * (0.12 * veins[..., None])
# Rand etwas dunkler, feine Körnung
edge = gaussian_filter(alpha, 6)
col *= (0.82 + 0.18 * sstep(0.2, 0.9, edge))[..., None]
col *= (0.96 + 0.08 * fbm((H, W), 6, 21))[..., None]
print("Anteil Panaschierung:", round(float((var * (alpha > 0.5)).sum() / (alpha > 0.5).sum()), 3))
rgba = np.dstack([np.clip(col, 0, 1) * 255, alpha * 255]).astype(np.uint8)
# Farbe über den Rand hinaus fortsetzen (keine dunklen Säume bei Mip-Mapping)
rgb = rgba[..., :3].astype(np.float32)
mask = alpha > 0.5
for _ in range(24):
    blur = gaussian_filter(rgb * mask[..., None], (3, 3, 0))
    wgt = gaussian_filter(mask.astype(np.float32), 3)
    fill = blur / np.maximum(wgt, 1e-4)[..., None]
    rgb = np.where(mask[..., None], rgb, fill)
    mask = wgt > 0.05
rgba[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
Image.fromarray(rgba, "RGBA").save(os.path.join(OUT, "pothos_albedo.png"))

height = -midrib * 1.0 - veins * 0.35 + 0.25 * fbm((H, W), 40, 33) + 0.4 * np.cos(np.clip(s * 30, -50, 50)) * 0.15
Image.fromarray(normal_from_height(gaussian_filter(height, 1.2), 9.0)).save(os.path.join(OUT, "pothos_normal.png"))

# ── Pfennigkraut ──────────────────────────────────────────────────────────
J = 128
img = Image.new("L", (J * SS, J * SS), 0)
ImageDraw.Draw(img).ellipse([J * SS * 0.08, J * SS * 0.06, J * SS * 0.92, J * SS * 0.96], fill=255)
ja = np.asarray(img.resize((J, J), Image.LANCZOS)).astype(np.float32) / 255
yj, xj = np.mgrid[0:J, 0:J].astype(np.float32) / J
rad = np.hypot(xj - 0.5, yj - 0.5)
jc = srgb("#7aac3a") * (1 - rad[..., None] * 0.6) + srgb("#a7c955") * (rad[..., None] * 0.6)
jc *= (0.9 + 0.2 * fbm((J, J), 16, 44))[..., None]
jc = jc * (1 - 0.3 * np.exp(-(((xj - 0.5) / 0.02) ** 2))[..., None]) + srgb("#c3d57a") * 0.3 * np.exp(-(((xj - 0.5) / 0.02) ** 2))[..., None]
Image.fromarray(np.dstack([np.clip(jc, 0, 1) * 255, ja * 255]).astype(np.uint8), "RGBA").save(os.path.join(OUT, "jenny_albedo.png"))

# ── Erde (kachelbar) ──────────────────────────────────────────────────────
S = 512


def tile_noise(scale, seed):
    n = fbm((S * 2, S * 2), scale, seed)
    return (n[:S, :S] + np.roll(n[:S, S:], 0) + n[S:, :S] + n[S:, S:]) / 4


crumbs = tile_noise(10, 51)
clods = tile_noise(48, 52)
h_soil = 0.6 * clods + 0.5 * crumbs + 0.3 * tile_noise(4, 53)
sc = srgb("#251b14") * (1 - h_soil[..., None]) + srgb("#4a3828") * h_soil[..., None]
fibres = sstep(0.78, 0.86, tile_noise(3, 54)) * 0.25
sc = sc * (1 - fibres[..., None]) + srgb("#8a6d4c") * fibres[..., None]
Image.fromarray((np.clip(sc, 0, 1) * 255).astype(np.uint8)).save(os.path.join(OUT, "soil_albedo.png"))
Image.fromarray(normal_from_height(h_soil, 22.0)).save(os.path.join(OUT, "soil_normal.png"))

# ── Pflanzeinsatz: feine Struktur ────────────────────────────────────────
Image.fromarray(normal_from_height(tile_noise(2, 61) * 0.6 + tile_noise(8, 62) * 0.4, 3.0)).save(os.path.join(OUT, "insert_normal.png"))
print("Texturen in", OUT)

# ── Trennplatte: Lochraster (eine Kachel = ein Loch) ─────────────────────
T = 64
img = Image.new("L", (T * SS, T * SS), 255)
ImageDraw.Draw(img).ellipse([T * SS * 0.22, T * SS * 0.22, T * SS * 0.78, T * SS * 0.78], fill=0)
pa = np.asarray(img.resize((T, T), Image.LANCZOS))
pc = np.full((T, T, 3), (227, 224, 216), np.uint8)
Image.fromarray(np.dstack([pc, pa]), "RGBA").save(os.path.join(OUT, "plate_albedo.png"))

# ── Kapillarelement: Filz/Gewebe ─────────────────────────────────────────
K = 128
yk, xk = np.mgrid[0:K, 0:K].astype(np.float32)
weave = 0.5 + 0.25 * np.sin(xk / K * 2 * np.pi * 16) * np.sin(yk / K * 2 * np.pi * 16)
felt = tile_noise(3, 71)[:K, :K]
wc = srgb("#e6e1d4") * (0.85 + 0.1 * weave + 0.1 * felt)[..., None]
Image.fromarray((np.clip(wc, 0, 1) * 255).astype(np.uint8)).save(os.path.join(OUT, "wick_albedo.png"))
print("Zusatztexturen fertig")
