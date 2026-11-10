"""
Stadtgarden v6 – Einbauszene: Altbaufassade mit Fensteröffnung, äußerem Steinsims, Fenster, Laibung.
Der Kasten steht auf dem Sims (z = 0), die Spannstange spannt zwischen den Laibungsseiten (x = ±0,50 m).

Koordinaten wie sg_model: Vorderseite −y (Kamera draußen), Fenster liegt bei +y.
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

from sg_model import coll, obj_from_bm, srgb, boolean

OPEN_W = 1.00  # lichte Breite der Laibung (= Spannweite der Stange)
OPEN_H = 1.55
REVEAL = 0.30  # Tiefe der Laibung (Fassade → Fensterrahmen)
FRAME_Y = 0.17  # Außenkante Fensterrahmen
FACADE_Y = FRAME_Y - REVEAL  # Außenfläche der Fassade
SILL = dict(front=FACADE_Y - 0.055, th=0.05, ext=0.07)


def _mat(name, color, rough=0.5, **kw):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = srgb(color) if isinstance(color, str) else color
    b.inputs["Roughness"].default_value = rough
    for k, v in kw.items():
        b.inputs[k].default_value = v
    return m, nt, b


def _noise_bump(nt, b, scale, strength, dist=0.002, detail=6.0, voronoi=None):
    tc = nt.nodes.new("ShaderNodeTexCoord")
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = scale
    nz.inputs["Detail"].default_value = detail
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    h = nz.outputs["Fac"]
    if voronoi:
        vo = nt.nodes.new("ShaderNodeTexVoronoi")
        vo.inputs["Scale"].default_value = voronoi
        nt.links.new(tc.outputs["Object"], vo.inputs["Vector"])
        mx = nt.nodes.new("ShaderNodeMath")
        mx.operation = "ADD"
        nt.links.new(nz.outputs["Fac"], mx.inputs[0])
        nt.links.new(vo.outputs["Distance"], mx.inputs[1])
        h = mx.outputs[0]
    bp = nt.nodes.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = strength
    bp.inputs["Distance"].default_value = dist
    nt.links.new(h, bp.inputs["Height"])
    nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return nz


def _color_var(nt, b, c0, c1, scale):
    tc = nt.nodes.new("ShaderNodeTexCoord")
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = scale
    nz.inputs["Detail"].default_value = 4
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    cr = nt.nodes.new("ShaderNodeValToRGB")
    cr.color_ramp.elements[0].color = srgb(c0)
    cr.color_ramp.elements[1].color = srgb(c1)
    nt.links.new(nz.outputs["Fac"], cr.inputs["Fac"])
    nt.links.new(cr.outputs["Color"], b.inputs["Base Color"])


def materials():
    M = {}
    m, nt, b = _mat("Szene_Putz", "#E8DAC4", 0.92)
    _color_var(nt, b, "#E0CFB6", "#EFE3CF", 3.0)
    _noise_bump(nt, b, 60, 0.35, 0.003, 8, voronoi=220)
    M["putz"] = m
    m, nt, b = _mat("Szene_Stein", "#CFCAC0", 0.62)
    _color_var(nt, b, "#C2BCB1", "#DAD5CB", 18)
    _noise_bump(nt, b, 140, 0.25, 0.0015, 8)
    M["stein"] = m
    m, nt, b = _mat("Szene_Rahmen", "#F3F2EE", 0.38, **{"Specular IOR Level": 0.5})
    M["rahmen"] = m
    m, nt, b = _mat("Szene_Glas", "#FFFFFF", 0.0, **{"Transmission Weight": 1.0, "IOR": 1.45})
    M["glas"] = m
    m, nt, b = _mat("Szene_Innen", "#4A423A", 0.85)
    M["innen"] = m
    m, nt, b = _mat("Szene_Vorhang", "#F4EFE6", 0.9, **{"Transmission Weight": 0.0})
    tr = nt.nodes.new("ShaderNodeBsdfTranslucent")
    tr.inputs["Color"].default_value = srgb("#F7EEDD")
    mix = nt.nodes.new("ShaderNodeMixShader")
    mix.inputs[0].default_value = 0.55
    out = nt.nodes["Material Output"]
    nt.links.new(b.outputs["BSDF"], mix.inputs[1])
    nt.links.new(tr.outputs["BSDF"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    M["vorhang"] = m
    m, nt, b = _mat("Szene_Lampe", "#FFFFFF", 0.5)
    b.inputs["Emission Color"].default_value = srgb("#FFD9A8")
    b.inputs["Emission Strength"].default_value = 6.0
    M["lampe"] = m
    return M


def box(name, x0, x1, y0, y1, z0, z1, col, mat):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector(((x0 + x1) / 2 + v.co.x * (x1 - x0), (y0 + y1) / 2 + v.co.y * (y1 - y0), (z0 + z1) / 2 + v.co.z * (z1 - z0)))
    ob = obj_from_bm(name, bm, col, mat, smooth=False)
    return ob


def bevel(ob, w=0.004, seg=2):
    m = ob.modifiers.new("Kante", "BEVEL")
    m.width = w
    m.segments = seg
    m.limit_method = "ANGLE"
    return m


def window(col, M, x_off=0.0, name="Fenster", with_interior=True):
    """Fensteröffnung mit Laibung, Steinsims, zweiflügeligem Fenster und dunklem Innenraum."""
    W, Hh = OPEN_W, OPEN_H
    x0, x1 = x_off - W / 2, x_off + W / 2
    objs = []
    # Steinsims (leichtes Gefälle nach außen wäre real; hier eben, damit der Kasten sauber aufliegt)
    s = box(f"{name}_Sims", x0 - SILL["ext"], x1 + SILL["ext"], SILL["front"], FRAME_Y + 0.02, -SILL["th"], 0.0, col, M["stein"])
    bevel(s, 0.006, 3)
    objs.append(s)
    # Fensterrahmen (Blendrahmen + Flügel + Mittelpfosten + Kämpfer)
    fw, fd = 0.065, 0.075
    y0, y1 = FRAME_Y, FRAME_Y + fd
    parts = [
        (x0, x1, 0.0, fw),  # unten
        (x0, x1, Hh - fw, Hh),  # oben
        (x0, x0 + fw, fw, Hh - fw),  # links (ohne Überlappung, sonst Z-Fighting)
        (x1 - fw, x1, fw, Hh - fw),  # rechts
        (x_off - 0.035, x_off + 0.035, fw, Hh * 0.78 - 0.03),  # Mittelpfosten
        (x0 + fw, x1 - fw, Hh * 0.78 - 0.03, Hh * 0.78 + 0.03),  # Kämpfer
    ]
    for i, (a, b_, c, d) in enumerate(parts):
        ob = box(f"{name}_Rahmen_{i}", a, b_, y0, y1, c, d, col, M["rahmen"])
        bevel(ob, 0.004, 2)
        objs.append(ob)
    # Flügelrahmen (etwas zurückgesetzt) und Glas
    for gx0, gx1, gz0, gz1 in ((x0 + fw, x_off - 0.035, fw, Hh * 0.78 - 0.03), (x_off + 0.035, x1 - fw, fw, Hh * 0.78 - 0.03), (x0 + fw, x1 - fw, Hh * 0.78 + 0.03, Hh - fw)):
        sw = 0.045
        for i, (a, b_, c, d) in enumerate(((gx0, gx1, gz0, gz0 + sw), (gx0, gx1, gz1 - sw, gz1), (gx0, gx0 + sw, gz0 + sw, gz1 - sw), (gx1 - sw, gx1, gz0 + sw, gz1 - sw))):
            ob = box(f"{name}_Fluegel_{gx0:.2f}_{i}", a, b_, y0 + 0.012, y1 - 0.008, c, d, col, M["rahmen"])
            bevel(ob, 0.003, 2)
            objs.append(ob)
        g = box(f"{name}_Glas_{gx0:.2f}", gx0 + sw, gx1 - sw, y0 + 0.03, y0 + 0.034, gz0 + sw, gz1 - sw, col, M["glas"])
        objs.append(g)
    if with_interior:
        # dunkler, warm beleuchteter Innenraum mit Vorhang
        objs.append(box(f"{name}_Raum_Rueck", x0 - 1.5, x1 + 1.5, 3.5, 3.6, -0.9, 2.6, col, M["innen"]))
        objs.append(box(f"{name}_Raum_Boden", x0 - 1.5, x1 + 1.5, y1 + 0.3, 3.5, -0.95, -0.9, col, M["innen"]))
        objs.append(box(f"{name}_Raum_Decke", x0 - 1.5, x1 + 1.5, y1 + 0.3, 3.5, 2.6, 2.65, col, M["innen"]))
        for sx in (-1, 1):
            objs.append(box(f"{name}_Raum_Seite{sx}", x_off + sx * (W / 2 + 1.5) - 0.05, x_off + sx * (W / 2 + 1.5) + 0.05, y1 + 0.3, 3.5, -0.9, 2.6, col, M["innen"]))
        # Vorhang (halb zugezogen, links)
        bm = bmesh.new()
        nx, nz = 40, 20
        rows = []
        for j in range(nz + 1):
            z = -0.2 + (Hh + 0.6) * j / nz
            rows.append([bm.verts.new((x0 - 0.1 + 0.55 * i / nx, y1 + 0.35 + 0.025 * math.sin(i / nx * 2 * math.pi * 6), z)) for i in range(nx + 1)])
        for j in range(nz):
            for i in range(nx):
                bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
        objs.append(obj_from_bm(f"{name}_Vorhang", bm, col, M["vorhang"]))
        # warmes Raumlicht (ohne sichtbare Lampe)
        lt = bpy.data.lights.new(f"{name}_Raumlicht", "POINT")
        lt.energy = 60
        lt.color = (1.0, 0.78, 0.55)
        lt.shadow_soft_size = 0.4
        lo = bpy.data.objects.new(f"{name}_Raumlicht", lt)
        col.objects.link(lo)
        lo.location = (x_off + 0.4, 2.0, 0.9)
        lo.visible_camera = False  # Punktlichter sind sonst als helle Kugel sichtbar
        lo.visible_transmission = False
        lo.visible_glossy = False
    return objs


def facade(col, M, windows=(0.0,), width=4.0, z_bottom=-1.2, z_top=2.6):
    """Fassadenwand mit Öffnungen (Boolean) und schlichtem Gesims."""
    wall = box("Fassade", -width / 2, width / 2, FACADE_Y, FRAME_Y + 0.25, z_bottom, z_top, col, M["putz"])
    cut_bm = bmesh.new()
    me = bpy.data.meshes.new("tmp")
    for xo in windows:
        b = bmesh.new()
        bmesh.ops.create_cube(b, size=1.0)
        for v in b.verts:
            v.co = Vector((xo + v.co.x * OPEN_W, FRAME_Y - 0.1 + v.co.y * 0.8, (OPEN_H - SILL["th"]) / 2 + v.co.z * (OPEN_H + SILL["th"])))
        b.to_mesh(me)
        b.free()
        cut_bm.from_mesh(me)
    bpy.data.meshes.remove(me)
    cut = obj_from_bm("_cut_fassade", cut_bm, col)
    boolean(wall, cut)
    bpy.data.objects.remove(cut)
    # Faschen (leicht vorstehende Rahmung) und Gesimsband
    objs = [wall]
    for xo in windows:
        for i, (a, b_, c, d) in enumerate(((xo - OPEN_W / 2 - 0.14, xo - OPEN_W / 2, -SILL["th"], OPEN_H + 0.14), (xo + OPEN_W / 2, xo + OPEN_W / 2 + 0.14, -SILL["th"], OPEN_H + 0.14), (xo - OPEN_W / 2, xo + OPEN_W / 2, OPEN_H, OPEN_H + 0.14))):
            f = box(f"Fasche_{xo:.1f}_{i}", a, b_, FACADE_Y - 0.025, FACADE_Y + 0.01, c, d, col, M["putz"])
            bevel(f, 0.008, 3)
            objs.append(f)
    g = box("Gesims", -width / 2, width / 2, FACADE_Y - 0.06, FACADE_Y + 0.01, OPEN_H + 0.42, OPEN_H + 0.56, col, M["putz"])
    bevel(g, 0.012, 3)
    objs.append(g)
    return objs


def sun(elev=22, azim=-35, strength=6.0, color=(1.0, 0.87, 0.73), angle=1.5):
    """Sonne von vorne links, flach (später Nachmittag)."""
    lt = bpy.data.lights.get("Sonne") or bpy.data.lights.new("Sonne", "SUN")
    lt.energy = strength
    lt.color = color
    lt.angle = math.radians(angle)
    ob = bpy.data.objects.get("Sonne") or bpy.data.objects.new("Sonne", lt)
    if not ob.users_collection:
        coll("Szene").objects.link(ob)
    e, a = math.radians(elev), math.radians(azim)
    d = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))  # Richtung zur Sonne
    ob.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    return ob, d


def sky(strength=0.35, elev=22, azim=-35, color="#D9D2C6"):
    """Warmes Umgebungslicht (Gegenlicht der Straße), kein blauer Himmel – wirkt wie später Nachmittag."""
    w = bpy.data.worlds.get("Himmel") or bpy.data.worlds.new("Himmel")
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    bg = nt.nodes.get("Background") or nt.nodes.new("ShaderNodeBackground")
    out = next(n for n in nt.nodes if n.bl_idname == "ShaderNodeOutputWorld")
    for n in list(nt.nodes):
        if n not in (bg, out):
            nt.nodes.remove(n)
    bg.inputs["Color"].default_value = srgb(color)
    bg.inputs["Strength"].default_value = strength
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])
    return w


def leaf_gobo(col, d, center=(-0.9, 0, 0.9), dist=2.2, spread=1.3, n=38, seed=5):
    """Blätter zwischen Sonne und Fassade (außerhalb des Bildes) für weiche Lichtflecken."""
    import random

    rnd = random.Random(seed)
    src = [o for o in bpy.data.objects if o.name.startswith("SG_Pflanze_Krone")]
    if not src:
        return []
    out = []
    base = Vector(center) + d.normalized() * dist
    for i in range(n):
        o = rnd.choice(src).copy()
        o.parent = None
        o.matrix_world = Matrix.Identity(4)
        col.objects.link(o)
        o.location = base + Vector((rnd.uniform(-spread, spread), rnd.uniform(-0.3, 0.3), rnd.uniform(-spread * 0.6, spread * 0.6)))
        o.rotation_euler = (rnd.uniform(0, 6.3), rnd.uniform(0, 6.3), rnd.uniform(0, 6.3))
        s = rnd.uniform(0.6, 1.1)
        o.scale = (s, s, s)
        o.visible_camera = False
        o.visible_glossy = False
        o.visible_diffuse = False
        o.name = f"Gobo_Blatt_{i}"
        out.append(o)
    return out


def foreground_leaves(col, cam_pos, target, n=7, seed=3):
    """Unscharfe Blätter dicht vor der Kamera (Tiefe, wie Zweige eines Straßenbaums)."""
    import random

    rnd = random.Random(seed)
    src = [o for o in bpy.data.objects if o.name.startswith("SG_Pflanze_Krone")]
    cp, tg = Vector(cam_pos), Vector(target)
    fwd = (tg - cp).normalized()
    right = fwd.cross(Vector((0, 0, 1))).normalized()
    up = right.cross(fwd).normalized()
    out = []
    for i in range(n):
        o = rnd.choice(src).copy()
        o.parent = None
        o.matrix_world = Matrix.Identity(4)
        col.objects.link(o)
        o.location = cp + fwd * rnd.uniform(0.45, 0.8) - right * rnd.uniform(0.15, 0.45) + up * rnd.uniform(0.12, 0.38)
        o.rotation_euler = (rnd.uniform(0, 6.3), rnd.uniform(0, 6.3), rnd.uniform(0, 6.3))
        s = rnd.uniform(0.35, 0.6)
        o.scale = (s, s, s)
        o.name = f"Vordergrund_Blatt_{i}"
        out.append(o)
    return out


def build(windows=(0.0,), width=4.0, gobo=True, sun_elev=22, sun_azim=-35, height=(-1.2, 2.6)):
    col = coll("Szene")
    M = materials()
    facade(col, M, windows, width, height[0], height[1])
    for i, xo in enumerate(windows):
        window(col, M, xo, name=f"Fenster{i}", with_interior=True)
    s, d = sun(sun_elev, sun_azim)
    # Sonne spiegelt sich nicht im Fensterglas (sonst unscharfer Lichtfleck im Bild): Light Linking
    try:
        excl = bpy.data.collections.get("Sonne_ohne_Glas") or bpy.data.collections.new("Sonne_ohne_Glas")
        for ob in bpy.data.objects:
            if "_Glas_" in ob.name and ob.name not in excl.objects:
                excl.objects.link(ob)
        s.light_linking.receiver_collection = excl
        for co in excl.collection_objects:
            co.light_linking.link_state = "EXCLUDE"
    except Exception as e:  # ältere Blender-Versionen
        print("Light Linking nicht verfügbar:", e)
    sky(0.6, sun_elev, sun_azim)
    if gobo:
        leaf_gobo(col, d)
    # Studio-Objekte ausblenden, falls vorhanden
    for ob in bpy.data.objects:
        if ob.name.startswith(("Studio_", "Licht_")):
            ob.hide_render = True
            ob.hide_viewport = True
    return col
