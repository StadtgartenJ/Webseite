"""
Stadtgarden – Mastermodell v5 (Blender, reproduzierbar per Skript).

Ein Modell für beides:
  1. GLB für den 3D-Viewer der Website (public/models/stadtgarden.glb)
  2. Cycles-Standbilder als Referenz für das Qualitätstor

Aufruf (pip-Paket bpy 5.x oder blender -b -P … -- …):
  python3 blender/textures.py                                    # Texturen erzeugen
  python3 blender/stadtgarden_v5.py --glb public/models/stadtgarden-raw.glb
  python3 blender/stadtgarden_v5.py --render renders/v5-assembled.png --state assembled
  python3 blender/stadtgarden_v5.py --render renders/v5-exploded.png --state exploded

Koordinaten: identisch mit dem Viewer (three.js, y nach oben, Vorderseite +z, 1 Einheit ≈ 33 cm,
Kasten ≈ 80 cm lang). Alle Maße sind normierte Annahmen aus den Konzeptbildern, keine Konstruktion.
In Blender wird (x, y, z)_three als (x, -z, y) abgelegt; der glTF-Export dreht das zurück.

Hierarchie (Knotennamen im GLB):
  part_shell      Außenschale
  part_indicator  Sichtfenster für den Wasserstand
  part_reservoir  Reservoir + Wasser
  part_wick       zwei Kapillarelemente
  part_plate      gelochte Trennplatte
  part_service    Einfüllschacht
  part_insert     Pflanzeinsatz, Erde, Pflanzen
  part_mount      Spannstange (rod), Hülsen (sleeve_l/r), Endkappen (cap_l/r), zwei Halterungen
Jedes Bauteil bewegt sich im Viewer als Ganzes; die Geometrie ändert sich nie.
"""
import argparse
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, "tex")

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
ap = argparse.ArgumentParser()
ap.add_argument("--glb", default="")
ap.add_argument("--render", default="")
ap.add_argument("--state", default="assembled", choices=["assembled", "exploded"])
ap.add_argument("--samples", type=int, default=128)
ap.add_argument("--res", default="1600x1000")
ap.add_argument("--save", default="")
args = ap.parse_args(argv)

rng = np.random.default_rng(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ── Maße (wie components/explorer/geometry.ts + PlanterScene.tsx) ─────────
A, B, H, Rx, Rz, rc, t = 1.2, 0.36, 0.82, 0.4, 0.3, 0.28, 0.028
GAP = 0.012
INS = dict(x0=-(A - t - GAP), x1=0.88, bottom=0.34, top=0.8, halfD=B - t - 0.03)
INS_W = INS["x1"] - INS["x0"]
INS_CX = (INS["x0"] + INS["x1"]) / 2
SOIL_TOP = 0.76
PLATE_Y = 0.31
RES_TOP = 0.285
WATER_TOP = 0.2
WICK_X = 0.62
WICK = dict(w=0.15, bottom=0.045, top=0.5, z=-0.03, th=0.012)
SHAFT = dict(x=1.02, z=-0.04, r=0.045, bottom=0.14, top=0.83)
ROD = dict(y=H + 0.08, z=-B, r=0.032)
HOOK_X = 0.78
STRAP = dict(w=0.18, th=0.016)
ROD_HALF = 1.5

EXPLODED = dict(mount=1.35, insert=0.8, plate=0.26, wick=0.08, reservoir=-0.14, service=-0.14, shell=-1.05, indicator=-1.05)


def to_bl(p):
    """three (x, y, z) → Blender (x, -z, y)"""
    p = np.asarray(p, np.float64)
    return np.stack([p[..., 0], -p[..., 2], p[..., 1]], axis=-1)


# ── Materialien ───────────────────────────────────────────────────────────
def hexc(h):
    h = h.lstrip("#")
    c = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (1.0,)


def image(name, colorspace="sRGB"):
    img = bpy.data.images.load(os.path.join(TEX, name))
    img.colorspace_settings.name = colorspace
    return img


def material(name, color, rough=0.5, metal=0.0, coat=0.0, coat_rough=0.3, alpha=1.0, albedo=None, normal=None,
             normal_strength=1.0, alpha_clip=False, blend=False, double=True, trans=0.0, sss=0.0, spec=0.5):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = hexc(color)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Coat Weight"].default_value = coat
    bsdf.inputs["Coat Roughness"].default_value = coat_rough
    bsdf.inputs["Alpha"].default_value = alpha
    bsdf.inputs["Transmission Weight"].default_value = trans
    bsdf.inputs["Subsurface Weight"].default_value = sss
    bsdf.inputs["Specular IOR Level"].default_value = spec
    if albedo:
        tx = nt.nodes.new("ShaderNodeTexImage")
        tx.image = image(albedo)
        nt.links.new(tx.outputs["Color"], bsdf.inputs["Base Color"])
        if alpha_clip:
            nt.links.new(tx.outputs["Alpha"], bsdf.inputs["Alpha"])
    if normal:
        tn = nt.nodes.new("ShaderNodeTexImage")
        tn.image = image(normal, "Non-Color")
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = normal_strength
        nt.links.new(tn.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    if alpha_clip:
        m.blend_method = "CLIP" if hasattr(m, "blend_method") else None
        m.alpha_threshold = 0.5 if hasattr(m, "alpha_threshold") else None
    if blend:
        m.surface_render_method = "BLENDED"
    m.use_backface_culling = not double
    return m


M = dict(
    satin=material("Satin", "#F5F2EB", rough=0.4, coat=0.2, coat_rough=0.35),
    powder=material("Pulverlack", "#F4F2EC", rough=0.36, metal=0.0, coat=0.3, coat_rough=0.3),
    rubber=material("Endkappe", "#E2DED5", rough=0.8),
    insert=material("Einsatz", "#2B2D2A", rough=0.62, normal="insert_normal.png", normal_strength=0.4),
    soil=material("Erde", "#3A2C22", rough=0.95, albedo="soil_albedo.png", normal="soil_normal.png", normal_strength=1.2),
    plate=material("Trennplatte", "#E3E0D8", rough=0.5, albedo="plate_albedo.png", alpha_clip=True),
    plate_rim=material("Trennplatte-Rand", "#E3E0D8", rough=0.5),
    wick=material("Kapillarelement", "#F2EFE6", rough=0.95, albedo="wick_albedo.png"),
    reservoir=material("Reservoir", "#E4EEF0", rough=0.08, alpha=0.3, blend=True, spec=0.6),
    water=material("Wasser", "#6FA9C2", rough=0.05, alpha=0.6, blend=True, spec=0.6),
    gauge_frame=material("Sichtfenster-Rahmen", "#DAD7CF", rough=0.3, coat=0.5),
    gauge_water=material("Sichtfenster-Wasser", "#4F9DC0", rough=0.18, coat=0.6),
    hole=material("Öffnung", "#585B56", rough=0.8),
    leaf=material("Efeutute", "#5A9432", rough=0.42, albedo="pothos_albedo.png", normal="pothos_normal.png", normal_strength=0.8, alpha_clip=True, coat=0.25, coat_rough=0.4, sss=0.05),
    jenny=material("Pfennigkraut", "#86B243", rough=0.45, albedo="jenny_albedo.png", alpha_clip=True, coat=0.15),
    stem=material("Stängel", "#6E9A3A", rough=0.55),
)


# ── Mesh-Helfer ───────────────────────────────────────────────────────────
def make_mesh(name, verts_three, faces, uvs=None, mat=None, smooth=True, parent=None):
    me = bpy.data.meshes.new(name)
    v = to_bl(np.asarray(verts_three, np.float64))
    me.from_pydata(v.tolist(), [], [list(map(int, f)) for f in faces])
    if uvs is not None:
        uv = me.uv_layers.new(name="UVMap")
        loop_uvs = np.asarray(uvs, np.float32)[[li.vertex_index for li in me.loops]]
        uv.data.foreach_set("uv", loop_uvs.ravel())
    for p in me.polygons:
        p.use_smooth = smooth
    me.validate(clean_customdata=False)
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    if mat:
        me.materials.append(mat)
    if parent:
        ob.parent = parent
    return ob


def empty(name, parent=None):
    e = bpy.data.objects.new(name, None)
    scene.collection.objects.link(e)
    if parent:
        e.parent = parent
    return e


def translate_three(ob, x, y, z):
    ob.location = Vector(to_bl([x, y, z]).tolist())


# ── Loft wie geometry.ts (Kapselwanne) ────────────────────────────────────
NC, NX, NZ = 14, 26, 6


def rounded_ring(a, b, r, y):
    r = max(0.0005, min(r, a - 1e-4, b - 1e-4))
    ax, bz = max(0, a - r), max(0, b - r)
    out = []

    def line(x0, z0, x1, z1, n):
        for i in range(n):
            s = i / n
            out.append((x0 + (x1 - x0) * s, y, z0 + (z1 - z0) * s))

    def arc(cx, cz, p0):
        for i in range(NC):
            p = p0 + i / NC * (math.pi / 2)
            out.append((cx + r * math.cos(p), y, cz + r * math.sin(p)))

    line(a, -bz, a, bz, NZ)
    arc(ax, bz, 0)
    line(ax, b, -ax, b, NX)
    arc(-ax, bz, math.pi / 2)
    line(-a, bz, -a, -bz, NZ)
    arc(-ax, -bz, math.pi)
    line(-ax, -b, ax, -b, NX)
    arc(ax, -bz, 3 * math.pi / 2)
    return out


RING = 2 * NZ + 2 * NX + 4 * NC


def section_at(s, y):
    inset = lambda R: 0 if y >= R else R - math.sqrt(max(0, R * R - (R - y) ** 2))
    a = s["A"] - inset(s["Rx"])
    b = s["B"] - inset(s["Rz"])
    return a, b, min(s["rc"], a, b)


def levels(s, nb=20, nt=6):
    R = max(s["Rx"], s["Rz"])
    ys = [min(s["H"], R * (1 - math.cos(i / nb * math.pi / 2))) for i in range(nb + 1)]
    ys += [R + (s["H"] - R) * i / nt for i in range(1, nt + 1)]
    out = []
    for y in ys:
        if not out or y > out[-1] + 1e-5:
            out.append(y)
    return out


def loft(s, outward=True, y_off=0.0, cap_bottom=True, cap_top=False):
    ys = levels(s)
    V, F = [], []
    for y in ys:
        V += rounded_ring(*section_at(s, y), y + y_off)
    rows = len(ys)
    for j in range(rows - 1):
        for i in range(RING):
            i2 = (i + 1) % RING
            p, q, p1, q1 = j * RING + i, j * RING + i2, (j + 1) * RING + i, (j + 1) * RING + i2
            F.append((p, q, q1, p1) if outward else (p, p1, q1, q))

    def cap(row, up):
        c = len(V)
        V.append((0, ys[row] + y_off, 0))
        for i in range(RING):
            p, q = row * RING + i, row * RING + (i + 1) % RING
            F.append((c, p, q) if up else (c, q, p))

    if cap_bottom:
        cap(0, not outward)
    if cap_top:
        cap(rows - 1, outward)
    return V, F


def open_vessel(s, th):
    Vo, Fo = loft(s, True)
    si = dict(A=s["A"] - th, B=s["B"] - th, H=s["H"] - th, Rx=max(0.01, s["Rx"] - th), Rz=max(0.01, s["Rz"] - th), rc=max(0.01, s["rc"] - th))
    Vi, Fi = loft(si, False, th)
    off = len(Vo)
    V = Vo + Vi
    F = Fo + [tuple(i + off for i in f) for f in Fi]
    # Rand
    o = rounded_ring(*section_at(s, s["H"]), s["H"])
    i_ = rounded_ring(*section_at(si, si["H"]), s["H"])
    base = len(V)
    V += o + i_
    for k in range(RING):
        k2 = (k + 1) % RING
        F.append((base + k, base + RING + k, base + RING + k2, base + k2))
    return V, F


def rounded_rect_ring(w, d, r, y, n=10):
    a, b = w / 2, d / 2
    return rounded_ring(a, b, r, y)


def slab(w, d, r, y0, h, top_uv=False):
    """gerundete Platte/Block: Unterseite y0, Höhe h"""
    bot = rounded_rect_ring(w, d, r, y0)
    top = rounded_rect_ring(w, d, r, y0 + h)
    V = bot + top + [(0, y0, 0), (0, y0 + h, 0)]
    F = []
    for k in range(RING):
        k2 = (k + 1) % RING
        F.append((k, k2, RING + k2, RING + k))
    cb, ct = 2 * RING, 2 * RING + 1
    for k in range(RING):
        k2 = (k + 1) % RING
        F.append((cb, k2, k))
        F.append((ct, RING + k, RING + k2))
    uvs = [((x / w) + 0.5, (z / d) + 0.5) for x, y, z in V]
    return V, F, uvs


# ── Bauteile ──────────────────────────────────────────────────────────────
root = empty("stadtgarden")
P = {k: empty(f"part_{k}", root) for k in ["shell", "indicator", "reservoir", "wick", "plate", "service", "insert", "mount"]}

# Außenschale
V, F = open_vessel(dict(A=A, B=B, H=H, Rx=Rx, Rz=Rz, rc=rc), t)
make_mesh("shell", V, F, mat=M["satin"], parent=P["shell"])
# Überlauf (Konzept) rechts
cyl_cache = {}


def cylinder(name, r, h, n=32, axis="y", center=(0, 0, 0), mat=None, parent=None, caps=True):
    ang = np.linspace(0, 2 * math.pi, n, endpoint=False)
    ring = np.stack([np.cos(ang) * r, np.sin(ang) * r], 1)
    V = []
    for yy in (-h / 2, h / 2):
        for cx, cz in ring:
            V.append((cx, yy, cz))
    F = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    if caps:
        V += [(0, -h / 2, 0), (0, h / 2, 0)]
        for i in range(n):
            F.append((2 * n, (i + 1) % n, i))
            F.append((2 * n + 1, n + i, n + (i + 1) % n))
    V = np.array(V, np.float64)
    if axis == "x":
        V = V[:, [1, 0, 2]] * [1, 1, 1]
        V[:, [0, 1]] = V[:, [0, 1]]
        F = [f[::-1] for f in F]
    elif axis == "z":
        V = V[:, [0, 2, 1]]
        F = [f[::-1] for f in F]
    V += np.array(center)
    return make_mesh(name, V, F, mat=mat, parent=parent)


# Sichtfenster: schmale Kapsel vorne (Rahmen + Wasserstand)
def capsule_plate(name, r, length, depth, center, mat, parent, n=16):
    pts = []
    for i in range(n + 1):
        a = math.pi * i / n
        pts.append((r * math.cos(a), length / 2 + r * math.sin(a)))
    for i in range(n + 1):
        a = math.pi + math.pi * i / n
        pts.append((r * math.cos(a), -length / 2 + r * math.sin(a)))
    m = len(pts)
    V = [(x, y, 0) for x, y in pts] + [(x, y, depth) for x, y in pts] + [(0, 0, depth)]
    F = [(i, (i + 1) % m, m + (i + 1) % m, m + i) for i in range(m)]
    F += [(2 * m, m + i, m + (i + 1) % m) for i in range(m)]
    V = np.array(V) + np.array(center)
    return make_mesh(name, V, F, mat=mat, parent=parent)


capsule_plate("gauge_frame", 0.032, 0.17, 0.006, (0, 0.47, B - 0.002), M["gauge_frame"], P["indicator"])
capsule_plate("gauge_water", 0.019, 0.065, 0.008, (0, 0.47 - 0.048, B - 0.001), M["gauge_water"], P["indicator"])

# Reservoir + Wasser
ins = t + GAP
V, F = loft(dict(A=A - ins, B=B - ins, H=RES_TOP - ins, Rx=Rx - ins, Rz=Rz - ins, rc=rc - ins), True, ins, True, True)
make_mesh("reservoir", V, F, mat=M["reservoir"], parent=P["reservoir"])
i2 = ins + 0.01
V, F = loft(dict(A=A - i2, B=B - i2, H=WATER_TOP - i2, Rx=Rx - i2, Rz=Rz - i2, rc=rc - i2), True, i2, True, True)
make_mesh("water", V, F, mat=M["water"], parent=P["reservoir"])

# Kapillarelemente
for k, x in enumerate((-WICK_X, WICK_X)):
    w, h, th = WICK["w"], WICK["top"] - WICK["bottom"], WICK["th"]
    cx, cy, cz = x, WICK["bottom"] + h / 2, WICK["z"]
    V = [(cx + sx * w / 2, cy + sy * h / 2, cz + sz * th / 2) for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)]
    F = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    uvs = [((sx + 1) / 2, (sy + 1) / 2 * 3) for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)]
    make_mesh(f"wick_{'l' if x < 0 else 'r'}", V, F, uvs=uvs, mat=M["wick"], smooth=False, parent=P["wick"])

# Trennplatte: gelochte Fläche + voller Rand
pw, pd = INS_W + 0.02, INS["halfD"] * 2 + 0.02
V, F, uv = slab(pw, pd, 0.22, PLATE_Y - 0.006, 0.012)
uv = [(u * 16, v * 5) for u, v in uv]
make_mesh("plate", [(x + INS_CX, y, z) for x, y, z in V], F, uvs=uv, mat=M["plate"], smooth=False, parent=P["plate"])
outer = rounded_rect_ring(pw, pd, 0.22, 0)
inner = rounded_rect_ring(pw - 0.06, pd - 0.06, 0.19, 0)
V, F = [], []
for yy in (PLATE_Y - 0.008, PLATE_Y + 0.008):
    V += [(x + INS_CX, yy, z) for x, _, z in outer] + [(x + INS_CX, yy, z) for x, _, z in inner]
for k in range(RING):
    k2 = (k + 1) % RING
    o0, i0, o1, i1 = k, RING + k, 2 * RING + k, 3 * RING + k
    o0b, i0b, o1b, i1b = k2, RING + k2, 2 * RING + k2, 3 * RING + k2
    F += [(o1, i1, i1b, o1b), (o0, o0b, i0b, i0), (o0, o1, o1b, o0b), (i0, i0b, i1b, i1)]
make_mesh("plate_rim", V, F, mat=M["plate_rim"], smooth=False, parent=P["plate"])

# Einfüllschacht
ln = SHAFT["top"] - SHAFT["bottom"]
cylinder("shaft", SHAFT["r"], ln, 28, center=(SHAFT["x"], SHAFT["bottom"] + ln / 2, SHAFT["z"]), mat=M["satin"], parent=P["service"], caps=False)
cylinder("shaft_collar", SHAFT["r"] + 0.018, 0.02, 32, center=(SHAFT["x"], SHAFT["top"] + 0.01, SHAFT["z"]), mat=M["satin"], parent=P["service"])
cylinder("shaft_hole", SHAFT["r"] * 0.6, 0.004, 24, center=(SHAFT["x"], SHAFT["top"] + 0.021, SHAFT["z"]), mat=M["hole"], parent=P["service"])

# Pflanzeinsatz + Erde
sp = dict(A=INS_W / 2, B=INS["halfD"], H=INS["top"] - INS["bottom"], Rx=0.05, Rz=0.05, rc=rc - t - 0.02)
V, F = open_vessel(sp, 0.014)
make_mesh("insert", [(x + INS_CX, y + INS["bottom"], z) for x, y, z in V], F, mat=M["insert"], parent=P["insert"])
soil_h = SOIL_TOP - INS["bottom"] - 0.02
V, F, uv = slab(INS_W - 0.04, INS["halfD"] * 2 - 0.04, 0.22, 0, soil_h)
V = np.array(V)
# leicht unruhige Oberfläche
top = V[:, 1] > soil_h - 1e-6
V[top, 1] += 0.012 * np.sin(V[top, 0] * 9.1) * np.cos(V[top, 2] * 13.7)
uv = [(u * 4, v * 1.2) for u, v in uv]
make_mesh("soil", [(x + INS_CX, y + INS["bottom"] + 0.014, z) for x, y, z in V], F, uvs=uv, mat=M["soil"], parent=P["insert"])

# ── Pflanzen ──────────────────────────────────────────────────────────────
GX, GY = 6, 12  # Unterteilung einer Blattkarte


def leaf_template(L, W, fold, droop, curl):
    """Blattkarte im lokalen Raum: Basis im Ursprung, Spreite entlang +y, Breite x, Normale +z."""
    V, UV = [], []
    for j in range(GY + 1):
        v = j / GY
        for i in range(GX + 1):
            u = i / GX
            x = (u - 0.5) * W
            y = v * L
            ax = abs(u - 0.5) * 2
            z = -fold * W * ax**1.6  # zur Seite abfallend (gewölbt)
            z += -droop * L * v**2  # Spitze hängt
            z += curl * L * (v**3) * (u - 0.5)  # leichte Verdrehung zur Spitze
            V.append((x, y, z))
            UV.append((u, v))
    F = []
    for j in range(GY):
        for i in range(GX):
            a = j * (GX + 1) + i
            F.append((a, a + 1, a + GX + 2, a + GX + 1))
    return np.array(V), np.array(UV), F


def frame(d, nhint):
    d = d / np.linalg.norm(d)
    x = np.cross(d, nhint)
    if np.linalg.norm(x) < 1e-6:
        x = np.cross(d, [0, 0, 1])
    x /= np.linalg.norm(x)
    z = np.cross(x, d)
    return np.stack([x, d, z], 1)  # Spalten: lokale x, y, z


class Batch:
    def __init__(self):
        self.V, self.UV, self.F = [], [], []

    def add(self, V, UV, F):
        o = sum(len(v) for v in self.V)
        self.V.append(V)
        self.UV.append(UV)
        self.F += [tuple(i + o for i in f) for f in F]

    def build(self, name, mat, parent):
        return make_mesh(name, np.concatenate(self.V), self.F, uvs=np.concatenate(self.UV), mat=mat, parent=parent)


leaves, jenny, stems = Batch(), Batch(), Batch()


def add_leaf(p, d, nhint, L, droop=None):
    W = L * 0.7
    V, UV, F = leaf_template(L, W, fold=rng.uniform(0.12, 0.22), droop=droop if droop is not None else rng.uniform(0.04, 0.16), curl=rng.uniform(-0.25, 0.25))
    R = frame(np.asarray(d, float), np.asarray(nhint, float))
    leaves.add(V @ R.T + p, UV, F)


def catmull(pts, n):
    P_ = [pts[0]] + list(pts) + [pts[-1]]
    out = []
    for i in range(1, len(P_) - 2):
        p0, p1, p2, p3 = (np.asarray(P_[j], float) for j in (i - 1, i, i + 1, i + 2))
        for s in np.linspace(0, 1, n, endpoint=False):
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s * s + (-p0 + 3 * p1 - 3 * p2 + p3) * s**3))
    out.append(np.asarray(pts[-1], float))
    return np.array(out)


def add_tube(pts, r0, r1, sides=6):
    pts = np.asarray(pts)
    n = len(pts)
    V, F, UV = [], [], []
    prev = np.array([0, 0, 1.0])
    for k in range(n):
        tng = pts[min(k + 1, n - 1)] - pts[max(k - 1, 0)]
        tng /= np.linalg.norm(tng) + 1e-9
        nx = np.cross(tng, prev)
        if np.linalg.norm(nx) < 1e-6:
            nx = np.cross(tng, [1, 0, 0])
        nx /= np.linalg.norm(nx)
        ny = np.cross(tng, nx)
        r = r0 + (r1 - r0) * k / (n - 1)
        for s in range(sides):
            a = 2 * math.pi * s / sides
            V.append(pts[k] + r * (math.cos(a) * nx + math.sin(a) * ny))
            UV.append((s / sides, k / n))
        prev = ny
    for k in range(n - 1):
        for s in range(sides):
            a, b = k * sides + s, k * sides + (s + 1) % sides
            F.append((a, b, b + sides, a + sides))
    stems.add(np.array(V), np.array(UV), F)


ix = lambda u: INS["x0"] + 0.08 + u * (INS_W - 0.16)  # 0..1 über die Breite des Einsatzes
soil_y = SOIL_TOP

# Efeutute: Krone (linke zwei Drittel) – Blätter auf gebogenen Blattstielen
for k in range(64):
    bx = ix(rng.uniform(0.0, 0.62))
    bz = rng.uniform(-0.2, 0.2)
    base = np.array([bx, soil_y, bz])
    az = rng.uniform(-math.pi, math.pi)
    out = np.array([math.sin(az), 0, math.cos(az)])
    out[2] = abs(out[2]) * 0.8 + 0.25  # eher nach vorne
    out /= np.linalg.norm(out)
    hgt = rng.uniform(0.08, 0.36)
    reach = rng.uniform(0.04, 0.2)
    tip = base + np.array([0, hgt, 0]) + out * reach
    mid = base + np.array([0, hgt * 0.75, 0]) + out * reach * 0.3
    add_tube(catmull([base, mid, tip], 5), 0.007, 0.005)
    elev = rng.uniform(0.15, 0.9)
    d = out * math.cos(elev) + np.array([0, math.sin(elev), 0])
    nhint = np.array([0, 1, 0]) * 0.7 + out * 0.6
    add_leaf(tip, d, nhint, rng.uniform(0.24, 0.36))

# Efeutute: Ranken über die Vorderkante (unterschiedlich lang, leicht pendelnd)
vines = [(0.02, 0.95), (0.14, 0.62), (0.24, 1.1), (0.37, 0.5), (0.47, 0.82)]
for u0, length in vines:
    x0 = ix(u0)
    start = np.array([x0, soil_y + 0.02, rng.uniform(0.0, 0.15)])
    drift = rng.uniform(-0.14, 0.14)
    sway = rng.uniform(-0.08, 0.08)
    ctrl = [
        start,
        np.array([x0 + drift * 0.15, H + 0.08, B - 0.03]),
        np.array([x0 + drift * 0.4, H - 0.05, B + 0.07]),
        np.array([x0 + drift * 0.6 + sway, H - length * 0.45, B + 0.08 + rng.uniform(0, 0.04)]),
        np.array([x0 + drift * 0.8 - sway, H - length * 0.8, B + 0.1]),
        np.array([x0 + drift + sway * 0.5, H - length, B + 0.12 + rng.uniform(0, 0.05)]),
    ]
    path = catmull(ctrl, 10)
    add_tube(path, 0.0065, 0.0038)
    seg = np.linalg.norm(np.diff(path, axis=0), axis=1)
    cum = np.concatenate([[0], np.cumsum(seg)])
    sdist = rng.uniform(0.16, 0.24)
    side = 1 if rng.random() < 0.5 else -1
    while sdist < cum[-1] - 0.03:
        idx = np.searchsorted(cum, sdist)
        p = path[min(idx, len(path) - 1)]
        tng = path[min(idx + 1, len(path) - 1)] - path[max(idx - 1, 0)]
        tng /= np.linalg.norm(tng)
        frac = sdist / cum[-1]
        # Blatt steht seitlich ab, Spitze nach unten/außen, jedes Blatt anders gedreht
        yaw = rng.uniform(-0.6, 0.6)
        sidev = np.array([side * math.cos(yaw), 0, abs(math.sin(yaw)) * 0.8])
        d = tng * rng.uniform(0.3, 0.7) + sidev * rng.uniform(0.5, 0.9) + np.array([0, -rng.uniform(0.0, 0.4), rng.uniform(0.05, 0.35)])
        nhint = np.array([rng.uniform(-0.3, 0.3), rng.uniform(0.1, 0.6), 1.0])
        add_leaf(p + np.array([0, 0, 0.01]), d, nhint, rng.uniform(0.2, 0.3) * (1.05 - 0.3 * frac), droop=rng.uniform(0.02, 0.12))
        side = -side
        sdist += rng.uniform(0.12, 0.18)


# Pfennigkraut (rechts): runde Blättchen paarweise entlang feiner Triebe
def add_jenny(p, normal, r):
    n_ = np.asarray(normal, float)
    n_ /= np.linalg.norm(n_)
    tng = np.cross(n_, [0, 1, 0.2])
    if np.linalg.norm(tng) < 1e-6:
        tng = np.array([1.0, 0, 0])
    tng /= np.linalg.norm(tng)
    bit = np.cross(n_, tng)
    V, UV = [], []
    for j in range(3):
        for i in range(3):
            u, v = i / 2, j / 2
            cup = -0.25 * r * ((u - 0.5) ** 2 + (v - 0.5) ** 2) * 4
            V.append(p + (u - 0.5) * 2 * r * tng + (v - 0.5) * 2 * r * bit + cup * n_)
            UV.append((u, v))
    F = [(0, 1, 4, 3), (1, 2, 5, 4), (3, 4, 7, 6), (4, 5, 8, 7)]
    jenny.add(np.array(V), np.array(UV), F)


for k in range(6):
    x0 = ix(rng.uniform(0.66, 0.97))
    length = rng.uniform(0.35, 0.85)
    start = np.array([x0, soil_y + 0.01, rng.uniform(-0.05, 0.12)])
    ctrl = [start, np.array([x0, H + 0.03, B - 0.03]), np.array([x0 + rng.uniform(-0.05, 0.05), H - 0.08, B + 0.05]), np.array([x0 + rng.uniform(-0.1, 0.1), H - length, B + 0.07])]
    path = catmull(ctrl, 10)
    add_tube(path, 0.0035, 0.0025, 5)
    for idx in range(2, len(path)):
        if rng.random() < 0.35:
            continue
        p = path[idx]
        for sgn in (-1, 1):
            off = np.array([sgn * rng.uniform(0.02, 0.034), rng.uniform(-0.01, 0.01), 0.01])
            add_jenny(p + off, np.array([sgn * 0.5, 0.3, 1.0]) + rng.normal(0, 0.35, 3), rng.uniform(0.018, 0.03))
# Polster oben
for k in range(150):
    x = ix(rng.uniform(0.6, 1.0))
    z = rng.uniform(-0.22, 0.24)
    y = soil_y + rng.uniform(0.01, 0.1) * (1 - abs(z) * 1.5)
    add_jenny(np.array([x, y, z]), np.array([0, 1, 0]) + rng.normal(0, 0.45, 3), rng.uniform(0.022, 0.032))

leaves.build("plant_pothos", M["leaf"], P["insert"])
jenny.build("plant_jenny", M["jenny"], P["insert"])
stems.build("plant_stems", M["stem"], P["insert"])

# ── Klemmsystem ───────────────────────────────────────────────────────────
rod_len = 2 * ROD_HALF - 0.3
V = []
n = 28
ang = np.linspace(0, 2 * math.pi, n, endpoint=False)
for xx in (-rod_len / 2, rod_len / 2):
    for a in ang:
        V.append((xx, ROD["y"] + ROD["r"] * math.cos(a), ROD["z"] + ROD["r"] * math.sin(a)))
F = [(i, n + i, n + (i + 1) % n, (i + 1) % n) for i in range(n)]
make_mesh("rod", V, F, mat=M["powder"], parent=P["mount"])


def x_cyl(name, r, length, cx, mat, n=32, bevel=0.0):
    rows = [(-length / 2, r - bevel), (-length / 2 + bevel, r), (length / 2 - bevel, r), (length / 2, r - bevel)] if bevel else [(-length / 2, r), (length / 2, r)]
    V = []
    for xx, rr in rows:
        for a in np.linspace(0, 2 * math.pi, n, endpoint=False):
            V.append((cx + xx, ROD["y"] + rr * math.cos(a), ROD["z"] + rr * math.sin(a)))
    V += [(cx - length / 2, ROD["y"], ROD["z"]), (cx + length / 2, ROD["y"], ROD["z"])]
    m = len(rows)
    F = []
    for j in range(m - 1):
        for i in range(n):
            F.append((j * n + i, (j + 1) * n + i, (j + 1) * n + (i + 1) % n, j * n + (i + 1) % n))
    c0, c1 = m * n, m * n + 1
    for i in range(n):
        F.append((c0, (i + 1) % n, i))
        F.append((c1, (m - 1) * n + i, (m - 1) * n + (i + 1) % n))
    return make_mesh(name, V, F, mat=mat, parent=P["mount"])


for side, nm in ((-1, "l"), (1, "r")):
    x_cyl(f"sleeve_{nm}", ROD["r"] + 0.007, 0.22, side * (ROD_HALF - 0.11), M["powder"], bevel=0.006)
    x_cyl(f"cap_{nm}", 0.072, 0.05, side * (ROD_HALF + 0.025), M["rubber"], bevel=0.012)


def strap(x):
    R = ROD["r"] + STRAP["th"] / 2 + 0.003
    path = [(ROD["z"] - R, ROD["y"] - 0.075), (ROD["z"] - R, ROD["y"] - 0.02)]
    for i in range(19):
        a = math.pi - i / 18 * math.pi
        path.append((ROD["z"] + R * math.cos(a), ROD["y"] + R * math.sin(a)))
    path += [(ROD["z"] + R, ROD["y"] - 0.06), (ROD["z"] + R, 0.47)]
    # Band: Breite in x, Dicke senkrecht zur Bahn
    V, F = [], []
    m = len(path)
    for k, (z, y) in enumerate(path):
        zp, yp = path[max(0, k - 1)]
        zn, yn = path[min(m - 1, k + 1)]
        tz, ty = zn - zp, yn - yp
        l_ = math.hypot(tz, ty)
        nz, ny = -ty / l_, tz / l_
        for sx in (-1, 1):
            for so in (-1, 1):
                V.append((x + sx * STRAP["w"] / 2, y + so * ny * STRAP["th"] / 2, z + so * nz * STRAP["th"] / 2))
    for k in range(m - 1):
        a, b = 4 * k, 4 * (k + 1)
        # Reihenfolge je Schnitt: (-x,-o) (-x,+o) (+x,-o) (+x,+o)
        F += [(a + 1, a + 3, b + 3, b + 1), (a, b, b + 2, a + 2), (a, a + 1, b + 1, b), (a + 2, b + 2, b + 3, a + 3)]
    F += [(0, 2, 3, 1), (4 * (m - 1), 4 * (m - 1) + 1, 4 * (m - 1) + 3, 4 * (m - 1) + 2)]
    ob = make_mesh(f"strap_{'l' if x < 0 else 'r'}", V, F, mat=M["powder"], parent=P["mount"])
    bv = ob.modifiers.new("Kante", "BEVEL")
    bv.width = 0.003
    bv.segments = 2
    bv.limit_method = "ANGLE"
    return ob


for x in (-HOOK_X, HOOK_X):
    strap(x)

# ── Zustand (nur für Renderings) ──────────────────────────────────────────
if args.state == "exploded":
    for k, dy in EXPLODED.items():
        if k in P:
            P[k].location.z += dy


# ── Export / Rendern ──────────────────────────────────────────────────────
if args.glb:
    for ob in scene.objects:
        ob.select_set(ob.name.startswith(("part_", "stadtgarden")) or ob.type == "MESH")
    bpy.ops.export_scene.gltf(
        filepath=os.path.abspath(args.glb),
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_yup=True,
        export_normals=True,
        export_texcoords=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_cameras=False,
        export_lights=False,
    )
    print("GLB", args.glb)

if args.render:
    root.location.z = 0.42  # gleiche Lage wie im Viewer (MODEL_Y = -0.42 → Boden bei y = 0)
    root.location.z = 0
    # Schattenfänger (wie ContactShadows im Viewer, 0,9 unter dem Kastenboden)
    bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, -0.9 + (EXPLODED["shell"] if args.state == "exploded" else 0)))
    catcher = bpy.context.object
    catcher.is_shadow_catcher = True
    world = bpy.data.worlds.new("Studio")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = hexc("#EEF2E6")
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.4

    def area(name, loc, target, size, energy, color, sy=None):
        lt = bpy.data.lights.new(name, "AREA")
        lt.shape = "RECTANGLE"
        lt.size = size
        lt.size_y = sy or size
        lt.energy = energy
        lt.color = color
        ob = bpy.data.objects.new(name, lt)
        scene.collection.objects.link(ob)
        ob.location = loc
        ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()

    area("Key", (-3.5, -4.0, 5.0), (0, 0, 0.4), 3.0, 900, (1.0, 0.93, 0.84))
    area("Fill", (5.0, -3.0, 1.5), (0, 0, 0.4), 4.0, 260, (0.86, 0.92, 1.0))
    area("Strip", (0.0, -2.5, 4.5), (0, 0, 0.4), 6.0, 300, (1, 1, 1), sy=0.4)
    area("Rim", (2.0, 4.0, 2.5), (0, 0, 0.5), 2.0, 500, (1.0, 0.96, 0.88))

    cam = bpy.data.objects.new("Kamera", bpy.data.cameras.new("Kamera"))
    scene.collection.objects.link(cam)
    scene.camera = cam
    cam.data.sensor_fit = "VERTICAL"
    cam.data.angle_y = math.radians(30)
    # Kamera wie im Viewer (Preset „produkt“ bzw. „explosion“); Ziel relativ zum Modellboden
    if args.state == "assembled":
        pos, tgt = to_bl([2.5, 1.05 + 0.42, 4.9]), to_bl([0, 0.42, 0])
    else:
        pos, tgt = to_bl([3.9, 2.0 + 0.42, 7.8]), to_bl([0, 0.3 + 0.42, 0])
    cam.location = Vector(pos.tolist())
    cam.rotation_euler = (Vector(tgt.tolist()) - Vector(pos.tolist())).to_track_quat("-Z", "Y").to_euler()

    w, h = (int(v) for v in args.res.split("x"))
    r = scene.render
    r.engine = "CYCLES"
    r.resolution_x, r.resolution_y = w, h
    r.film_transparent = True
    r.filepath = os.path.abspath(args.render)
    scene.cycles.samples = args.samples
    scene.cycles.use_denoising = True
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    if args.save:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(args.save))
    bpy.ops.render.render(write_still=True)
    print("GERENDERT", args.render)
