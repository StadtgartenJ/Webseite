"""
Stadtgarden – Blender-Mastermodell (Konzept), reproduzierbar per Skript.

Aufruf (Blender 4.2+ oder pip-Paket bpy 5.x):
    blender -b -P blender/stadtgarden_master.py -- --state assembled --out renders/render1.png
    blender -b -P blender/stadtgarden_master.py -- --state exploded  --out renders/render2.png
    python3 blender/stadtgarden_master.py --state exploded --out renders/render2.png   # mit pip-bpy

Optionen: --samples 96  --res 1600x900  --plants procedural|none|/pfad/zu/pflanze.blend
          --save szene.blend  (speichert die Szene zum Weiterarbeiten in Blender)

Alle Maße in Metern und als Annahmen aus den Konzeptbildern abgeleitet (Kasten ca. 80 cm).
Bauteile sind getrennte Objekte mit sprechenden Namen; jeder Zustand verschiebt nur entlang z,
die Geometrie ändert sich nie. Für eine Animation werden genau diese Versätze gekeyframed.
"""
import argparse
import math
import random
import sys

import bpy
import bmesh
from mathutils import Vector

# ── Argumente ──────────────────────────────────────────────────────────────
argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
ap = argparse.ArgumentParser()
ap.add_argument("--state", default="assembled", choices=["assembled", "exploded"])
ap.add_argument("--out", default="render.png")
ap.add_argument("--samples", type=int, default=96)
ap.add_argument("--res", default="1600x900")
ap.add_argument("--plants", default="procedural")
ap.add_argument("--save", default="")
args = ap.parse_args(argv)

# ── Maße ──────────────────────────────────────────────────────────────────
L, D, H = 0.80, 0.24, 0.27      # Außenschale: Länge, Tiefe, Höhe
WALL = 0.006
R_BOTTOM, R_CORNER = 0.118, 0.085
ROD_Z, ROD_Y, ROD_R = H + 0.07, -0.03, 0.012
BRACKET_X, BRACKET_W = 0.25, 0.06

# Versatz je Bauteil in der Explosionsansicht (z, Meter) – gleiche Reihenfolge wie im Scroll-Film
EXPLODE = {
    "mount": 0.42,
    "insert": 0.27,
    "plate": 0.10,
    "wick": 0.035,
    "reservoir": -0.05,
    "shell": -0.34,
}

random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


# ── Hilfen ────────────────────────────────────────────────────────────────
def mat(name, color, rough=0.5, metal=0.0, coat=0.0, trans=0.0, ior=1.45, alpha=1.0, sss=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Transmission Weight"].default_value = trans
    b.inputs["IOR"].default_value = ior
    b.inputs["Alpha"].default_value = alpha
    b.inputs["Subsurface Weight"].default_value = sss
    return m


def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def link(obj, coll):
    for c in obj.users_collection:
        c.objects.unlink(obj)
    coll.objects.link(obj)


def rounded_tub(name, l, d, h, r_bot, r_cor, wall, open_top=True):
    """Wanne: Quader mit stark gerundetem Boden und gerundeten Ecken, oben offen, mit Wandstärke."""
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.object
    o.name = name
    o.scale = (l, d, h)
    bpy.ops.object.transform_apply(scale=True)
    o.location.z = h / 2
    bm = bmesh.new()
    bm.from_mesh(o.data)
    if open_top:
        top = [f for f in bm.faces if f.normal.z > 0.9]
        bmesh.ops.delete(bm, geom=top, context="FACES")
    bw = bm.edges.layers.float.new("bevel_weight_edge")
    for e in bm.edges:
        v0, v1 = e.verts
        vertical = abs(v0.co.z - v1.co.z) > 1e-4
        bottom = v0.co.z < -h / 2 + 1e-4 and v1.co.z < -h / 2 + 1e-4
        e[bw] = 0.62 if vertical else (1.0 if bottom else 0.0)
    bm.to_mesh(o.data)
    bm.free()
    bv = o.modifiers.new("Bevel", "BEVEL")
    bv.limit_method = "WEIGHT"
    bv.width = r_bot
    bv.segments = 10
    bv.profile = 0.5
    so = o.modifiers.new("Wand", "SOLIDIFY")
    so.thickness = wall
    so.offset = -1
    sd = o.modifiers.new("Glatt", "SUBSURF")
    sd.levels = 2
    sd.render_levels = 2
    bpy.ops.object.shade_smooth()
    return o


def box(name, size, loc, bevel=0.004):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    m = o.modifiers.new("Bevel", "BEVEL")
    m.width = bevel
    m.segments = 3
    bpy.ops.object.shade_smooth()
    return o


def group(name):
    e = bpy.data.objects.new(name, None)
    scene.collection.objects.link(e)
    return e


def parent(child, par):
    child.parent = par
    child.matrix_parent_inverse = par.matrix_world.inverted()


# ── Materialien ───────────────────────────────────────────────────────────
M_SATIN = mat("Satin-Weiß", srgb("#ECE9E1"), rough=0.38, coat=0.25, sss=0.04)
M_INSERT = mat("Einsatz", srgb("#232523"), rough=0.6)
M_SOIL = mat("Substrat", srgb("#2E241C"), rough=1.0)
M_PLATE = mat("Trennplatte", srgb("#E6E3DB"), rough=0.5)
M_WICK = mat("Kapillarelement", srgb("#F3F0E8"), rough=1.0, sss=0.1)
M_RES = mat("Reservoir", srgb("#E8F2F4"), rough=0.04, trans=1.0, ior=1.49)
M_WATER = mat("Wasser", srgb("#8FC6DA"), rough=0.02, trans=1.0, ior=1.333)
M_GAUGE = mat("Sichtfenster", srgb("#3E9CC4"), rough=0.15, coat=0.6)
M_GAUGE_BG = mat("Sichtfenster-Rahmen", srgb("#D7D3CA"), rough=0.3)
M_BACK = mat("Hintergrund", srgb("#183A30"), rough=0.9)

# Lochmuster der Trennplatte als prozedurale Maske (Kreise im Raster)
nt = M_PLATE.node_tree
tc = nt.nodes.new("ShaderNodeTexCoord")
mp = nt.nodes.new("ShaderNodeMapping")
mp.inputs["Scale"].default_value = (70, 70, 1)
vor = nt.nodes.new("ShaderNodeTexVoronoi")
vor.feature = "F1"
vor.inputs["Randomness"].default_value = 0.0
ramp = nt.nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].position = 0.27
ramp.color_ramp.elements[0].color = (0, 0, 0, 1)
ramp.color_ramp.elements[1].position = 0.29
ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
nt.links.new(mp.outputs["Vector"], vor.inputs["Vector"])
nt.links.new(vor.outputs["Distance"], ramp.inputs["Fac"])
nt.links.new(ramp.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Alpha"])

# ── Bauteile ──────────────────────────────────────────────────────────────
G = {k: group(k) for k in ["shell", "reservoir", "wick", "plate", "insert", "mount"]}

# Außenschale + Sichtfenster
shell = rounded_tub("Außenschale", L, D, H, R_BOTTOM, R_CORNER, WALL)
shell.data.materials.append(M_SATIN)
parent(shell, G["shell"])
bpy.ops.mesh.primitive_cylinder_add(radius=0.011, depth=0.006, location=(0, D / 2 + 0.0005, 0.135), rotation=(math.pi / 2, 0, 0))
g_bg = bpy.context.object
g_bg.name = "Sichtfenster-Rahmen"
g_bg.scale = (1, 5.0, 1)  # schmale senkrechte Kapsel
bpy.ops.object.transform_apply(scale=True)
g_bg.data.materials.append(M_GAUGE_BG)
bpy.ops.object.shade_smooth()
parent(g_bg, G["shell"])
bpy.ops.mesh.primitive_cylinder_add(radius=0.008, depth=0.007, location=(0, D / 2 + 0.0008, 0.115), rotation=(math.pi / 2, 0, 0))
g_w = bpy.context.object
g_w.name = "Sichtfenster-Wasser"
g_w.scale = (1, 3.2, 1)
bpy.ops.object.transform_apply(scale=True)
g_w.data.materials.append(M_GAUGE)
bpy.ops.object.shade_smooth()
parent(g_w, G["shell"])

# Reservoir mit Wasser
res = rounded_tub("Wasserreservoir", L - 0.03, D - 0.03, 0.105, 0.1, 0.07, 0.003)
res.location.z = 0.012
res.data.materials.append(M_RES)
parent(res, G["reservoir"])
wat = rounded_tub("Wasser", L - 0.04, D - 0.04, 0.075, 0.074, 0.06, 0.0, open_top=False)
wat.modifiers.remove(wat.modifiers["Wand"])
wat.location.z = 0.016
wat.data.materials.append(M_WATER)
parent(wat, G["reservoir"])

# Trennplatte (gelocht, voller Rand)
plate = box("Trennplatte", (L - 0.05, D - 0.05, 0.004), (0, 0, 0.125), bevel=0.0015)
plate.data.materials.append(M_PLATE)
parent(plate, G["plate"])

# Zwei Kapillarelemente (Filzstreifen)
for i, x in enumerate((-0.2, 0.2)):
    w = box(f"Kapillarelement-{i + 1}", (0.045, 0.006, 0.13), (x, -0.02, 0.07), bevel=0.0015)
    w.data.materials.append(M_WICK)
    parent(w, G["wick"])

# Pflanzeinsatz mit Substrat
ins = rounded_tub("Pflanzeinsatz", L - 0.07, D - 0.06, 0.14, 0.03, 0.04, 0.004)
ins.location.z = 0.132
ins.data.materials.append(M_INSERT)
parent(ins, G["insert"])
soil = box("Substrat", (L - 0.085, D - 0.075, 0.115), (0, 0, 0.132 + 0.06), bevel=0.01)
soil.data.materials.append(M_SOIL)
parent(soil, G["insert"])

# Klemmsystem: Spannstange, Endkappen, zwei breite Halterungen
bpy.ops.mesh.primitive_cylinder_add(radius=ROD_R, depth=0.98, location=(0, ROD_Y, ROD_Z), rotation=(0, math.pi / 2, 0))
rod = bpy.context.object
rod.name = "Spannstange"
rod.data.materials.append(M_SATIN)
bpy.ops.object.shade_smooth()
parent(rod, G["mount"])
for s in (-1, 1):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=0.022, location=(s * 0.5, ROD_Y, ROD_Z), rotation=(0, math.pi / 2, 0))
    cap = bpy.context.object
    cap.name = f"Endkappe-{'links' if s < 0 else 'rechts'}"
    bv = cap.modifiers.new("Bevel", "BEVEL")
    bv.width = 0.006
    bv.segments = 4
    cap.data.materials.append(M_SATIN)
    bpy.ops.object.shade_smooth()
    parent(cap, G["mount"])


def bracket(x):
    """Breites Band: hinten über die Stange, vorne innen an der Rückwand des Kastens hinab."""
    R = ROD_R + 0.003
    pts = [(ROD_Y - R, ROD_Z - 0.035)]
    for i in range(17):
        a = math.pi - i / 16 * math.pi
        pts.append((ROD_Y + R * math.cos(a), ROD_Z + R * math.sin(a)))
    pts += [(ROD_Y + R, ROD_Z - 0.02), (-D / 2 + 0.014, H - 0.004), (-D / 2 + 0.014, H - 0.1)]
    bm = bmesh.new()
    rows = [[bm.verts.new((sx * BRACKET_W / 2, y, z)) for sx in (-1, 1)] for y, z in pts]
    for a, b in zip(rows, rows[1:]):
        bm.faces.new((a[0], a[1], b[1], b[0]))
    me = bpy.data.meshes.new("Halterung")
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(f"Halterung-{'links' if x < 0 else 'rechts'}", me)
    scene.collection.objects.link(o)
    o.location.x = x
    so = o.modifiers.new("Dicke", "SOLIDIFY")
    so.thickness = 0.004
    so.offset = 0
    bv = o.modifiers.new("Bevel", "BEVEL")
    bv.width = 0.0015
    bv.segments = 2
    o.data.materials.append(M_SATIN)
    for f in o.data.polygons:
        f.use_smooth = True
    parent(o, G["mount"])


for x in (-BRACKET_X, BRACKET_X):
    bracket(x)


# ── Pflanzen ──────────────────────────────────────────────────────────────
def leaf_mesh(name, size):
    """Herzförmiges Efeututen-Blatt, entlang der Mittelrippe gefaltet, mit Unterteilung."""
    bm = bmesh.new()
    ring = []
    for i in range(40):
        t = i / 40 * 2 * math.pi
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        ring.append(bm.verts.new((x / 17 * size * 0.5, -(y - 5) / 17 * size * 0.6, 0)))
    c = bm.verts.new((0, size * 0.15, 0))
    for i in range(40):
        bm.faces.new((c, ring[i], ring[(i + 1) % 40]))
    for v in bm.verts:
        x, y = v.co.x, v.co.y
        v.co.z = -abs(x) * 0.45 + (y / size) ** 2 * size * 0.25
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    scene.collection.objects.link(o)
    sd = o.modifiers.new("Glatt", "SUBSURF")
    sd.levels = 1
    sd.render_levels = 2
    so = o.modifiers.new("Dicke", "SOLIDIFY")
    so.thickness = 0.0008
    return o


def leaf_material():
    m = mat("Efeutute", srgb("#4E8A2E"), rough=0.35, coat=0.3, sss=0.15)
    nt = m.node_tree
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (90, 14, 90)
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = 1.0
    n.inputs["Detail"].default_value = 4
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], n.inputs["Vector"])
    r = nt.nodes.new("ShaderNodeValToRGB")
    r.color_ramp.elements[0].position = 0.5
    r.color_ramp.elements[0].color = (*srgb("#3D7A27"), 1)
    r.color_ramp.elements[1].position = 0.66
    r.color_ramp.elements[1].color = (*srgb("#C9D65E"), 1)
    nt.links.new(n.outputs["Fac"], r.inputs["Fac"])
    nt.links.new(r.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Base Color"])
    return m


def add_plants():
    proto = leaf_mesh("Blatt-Vorlage", 0.09)
    proto.data.materials.append(leaf_material())
    proto.hide_render = True
    stem_mat = mat("Stängel", srgb("#4A6331"), rough=0.6)
    small = mat("Pfennigkraut", srgb("#7DAB42"), rough=0.4, sss=0.2)
    top = 0.132 + 0.12

    def place(loc, rot, scale):
        o = bpy.data.objects.new("Blatt", proto.data)
        scene.collection.objects.link(o)
        o.location = (-loc[0], loc[1], loc[2])
        o.rotation_euler = rot
        o.scale = (scale,) * 3
        parent(o, G["insert"])

    # Krone der Efeutute (linke zwei Drittel)
    for _ in range(140):
        x = random.uniform(-0.36, 0.12)
        y = random.uniform(-0.08, 0.08)
        z = top + random.uniform(0.02, 0.2) * (1 - abs(x + 0.12) * 0.9)
        place((x, y, z), (random.uniform(-1.1, -0.2), random.uniform(-0.6, 0.6), random.uniform(0, 6.28)), random.uniform(0.8, 1.35))
    # Ranken über die Vorderkante
    for x0, length in [(-0.36, 0.34), (-0.28, 0.24), (-0.18, 0.4), (-0.06, 0.2), (0.05, 0.3)]:
        cu = bpy.data.curves.new("Ranke", "CURVE")
        cu.dimensions = "3D"
        cu.bevel_depth = 0.0018
        sp = cu.splines.new("BEZIER")
        x0 = -x0
        pts = [(x0, 0.0, top + 0.01), (x0 + 0.02, D / 2 + 0.02, H + 0.02), (x0 + 0.03, D / 2 + 0.04, H - length * 0.5), (x0 + 0.02, D / 2 + 0.05, H - length)]
        sp.bezier_points.add(len(pts) - 1)
        for bp, p in zip(sp.bezier_points, pts):
            bp.co = p
            bp.handle_left_type = bp.handle_right_type = "AUTO"
        ob = bpy.data.objects.new("Ranke", cu)
        scene.collection.objects.link(ob)
        ob.data.materials.append(stem_mat)
        parent(ob, G["insert"])
        n = int(length * 40)
        for k in range(n):
            t = 0.2 + 0.8 * k / n
            z = H + 0.02 - (H + 0.02 - (H - length)) * t
            side = 1 if k % 2 else -1
            place((-(x0 + 0.025) + side * 0.018, D / 2 + 0.06, z), (random.uniform(-0.4, 0.2), side * 0.5, math.pi + side * random.uniform(0.2, 0.6)), random.uniform(0.6, 0.95) * (1 - 0.3 * t))
    # Feine Hängepflanze rechts
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.008, segments=10, ring_count=6)
    sm = bpy.context.object
    sm.scale = (1, 1, 0.25)
    bpy.ops.object.transform_apply(scale=True)
    sm.data.materials.append(small)
    sm.hide_render = True
    for _ in range(420):
        x = random.uniform(0.14, 0.36)
        if random.random() < 0.55:
            loc = (x, random.uniform(-0.08, 0.1), top + random.uniform(0.0, 0.08))
        else:
            loc = (x + random.uniform(-0.02, 0.02), D / 2 + random.uniform(0.0, 0.03), H - random.uniform(0.0, 0.28))
        o = bpy.data.objects.new("Pfennigkraut", sm.data)
        scene.collection.objects.link(o)
        o.location = (-loc[0], loc[1], loc[2])
        o.rotation_euler = (random.uniform(0, 3), random.uniform(0, 3), random.uniform(0, 3))
        parent(o, G["insert"])


if args.plants == "procedural":
    add_plants()
elif args.plants not in ("none", ""):
    # lizenziertes Pflanzen-Asset anhängen (Collection „Pflanzen“ in der .blend-Datei)
    with bpy.data.libraries.load(args.plants, link=False) as (src, dst):
        dst.collections = [c for c in src.collections if c == "Pflanzen"]
    for c in dst.collections:
        scene.collection.children.link(c)
        for o in c.objects:
            if o.parent is None:
                parent(o, G["insert"])

# ── Zustand ───────────────────────────────────────────────────────────────
if args.state == "exploded":
    for k, dz in EXPLODE.items():
        G[k].location.z += dz

# ── Studio: dunkles Waldgrün, warmes Hauptlicht, kühles Fülllicht, Streifenlichter ──
bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, -0.5))
floor = bpy.context.object
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.mesh.primitive_plane_add(size=12, location=(0, -1.6, 2.5), rotation=(math.pi / 2, 0, 0))
wall = bpy.context.object
for o in (floor, wall):
    o.data.materials.append(M_BACK)

world = bpy.data.worlds.new("Welt")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (*srgb("#0F2620"), 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.35


def area(name, loc, rot, size, energy, color, shape="RECTANGLE", size_y=None):
    l = bpy.data.lights.new(name, "AREA")
    l.shape = shape
    l.size = size
    if size_y:
        l.size_y = size_y
    l.energy = energy
    l.color = color
    o = bpy.data.objects.new(name, l)
    scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    return o


area("Hauptlicht", (-1.4, 1.6, 1.6), (math.radians(55), 0, math.radians(-140)), 1.2, 420, (1.0, 0.9, 0.78))
area("Fülllicht", (1.8, 1.4, 0.6), (math.radians(75), 0, math.radians(130)), 1.6, 90, (0.82, 0.9, 1.0))
area("Streifen", (0.0, 0.9, 1.4), (math.radians(30), 0, 0), 2.4, 140, (1, 1, 1), size_y=0.08)
area("Kante", (0.6, -1.0, 1.0), (math.radians(-60), 0, math.radians(25)), 0.8, 160, (1.0, 0.95, 0.85))

# ── Kamera ────────────────────────────────────────────────────────────────
cam = bpy.data.objects.new("Kamera", bpy.data.cameras.new("Kamera"))
scene.collection.objects.link(cam)
scene.camera = cam
cam.data.lens = 55
if args.state == "assembled":
    target, pos = Vector((0, 0, 0.17)), Vector((0.62, 1.65, 0.48))
else:
    target, pos = Vector((0, 0, 0.2)), Vector((1.0, 2.75, 0.75))
cam.location = pos
d = target - pos
cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
cam.data.dof.use_dof = True
cam.data.dof.focus_distance = d.length
cam.data.dof.aperture_fstop = 5.6

# ── Rendern ───────────────────────────────────────────────────────────────
w, h = (int(v) for v in args.res.split("x"))
r = scene.render
r.engine = "CYCLES"
r.resolution_x, r.resolution_y = w, h
r.filepath = args.out
scene.cycles.samples = args.samples
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 8
scene.cycles.transmission_bounces = 8
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"
if args.save:
    bpy.ops.wm.save_as_mainfile(filepath=args.save)
bpy.ops.render.render(write_still=True)
print("GERENDERT", args.out)
