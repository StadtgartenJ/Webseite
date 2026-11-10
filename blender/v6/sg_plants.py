"""
Stadtgarden v7 – Bepflanzung: Goldene Efeutute (Epipremnum aureum) und Gold-Pfennigkraut (Lysimachia nummularia 'Aurea').

Wie auf den Konzeptbildern: links und in der Mitte Efeutute (aufrechte Triebe und lange Ranken über
Vorderkante und linke Seite), rechts ein Polster Pfennigkraut mit feinen Ranken über Kante und rechte Seite.

Geometrie und Texturen sind vollständig eigen (keine fremden Assets):
- Blattumriss als Geometrie (herzförmig bzw. rund), gewölbt, gefaltet, leicht verdreht
- ein gemeinsamer Atlas aus sg_leaftex.py (tex_v7/blatt_atlas_*.png): Farbe mit Panaschierung, Nerven als Normalen, Rauheit
- Stängel und Blattstiele als Röhren, eingefärbt über den Stängelbereich des Atlas
"""
import math
import os
import random

import bmesh
import bpy
from mathutils import Vector

import sg_model as sg

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, "tex_v7")

# Atlasbereiche (Blender-UV, v = 0 unten)
POTHOS_TILES = [(i / 4, 0.5, (i + 1) / 4, 1.0) for i in range(4)]
JENNY_TILES = [(i / 4, 0.25, (i + 1) / 4, 0.5) for i in range(4)]
STEM_U = dict(pothos=0.22, jenny=0.57, petiole=0.85)
STEM_V = (0.03, 0.22)

SPECIES = dict(
    pothos=dict(r=0.0027, spacing=(0.045, 0.07), leaf=(0.055, 0.088), pairs=False, pet=(0.32, 0.5), shrink=0.45, tiles=POTHOS_TILES),
    jenny=dict(r=0.0011, spacing=(0.015, 0.024), leaf=(0.016, 0.024), pairs=True, pet=(0.06, 0.12), shrink=0.3, tiles=JENNY_TILES),
)


# ── Material ──────────────────────────────────────────────────────────────
def _img(name, colorspace):
    path = os.path.join(TEX, name)
    img = bpy.data.images.load(path, check_existing=True)
    img.colorspace_settings.name = colorspace
    return img


def leaf_material():
    m = bpy.data.materials.get("SG_Blatt") or bpy.data.materials.new("SG_Blatt")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    tc = nt.nodes.new("ShaderNodeTexImage")
    tc.image = _img("blatt_atlas_farbe.png", "sRGB")
    tn = nt.nodes.new("ShaderNodeTexImage")
    tn.image = _img("blatt_atlas_normal.png", "Non-Color")
    tr = nt.nodes.new("ShaderNodeTexImage")
    tr.image = _img("blatt_atlas_rauheit.png", "Non-Color")
    nm = nt.nodes.new("ShaderNodeNormalMap")
    nm.inputs["Strength"].default_value = 0.8
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(tc.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(tn.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    nt.links.new(tr.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Red"], b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.5
    b.inputs["Coat Weight"].default_value = 0.12  # wachsige Blattoberfläche
    b.inputs["Coat Roughness"].default_value = 0.25
    # Durchscheinen der dünnen Blätter (Gegenlicht)
    tl = nt.nodes.new("ShaderNodeBsdfTranslucent")
    hs = nt.nodes.new("ShaderNodeHueSaturation")
    hs.inputs["Saturation"].default_value = 1.25
    hs.inputs["Value"].default_value = 0.85
    nt.links.new(tc.outputs["Color"], hs.inputs["Color"])
    nt.links.new(hs.outputs["Color"], tl.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], tl.inputs["Normal"])
    mix = nt.nodes.new("ShaderNodeMixShader")
    mix.inputs["Fac"].default_value = 0.2
    nt.links.new(b.outputs["BSDF"], mix.inputs[1])
    nt.links.new(tl.outputs["BSDF"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    return m


# ── Geometrie ─────────────────────────────────────────────────────────────
def frame_from(D, N):
    D = D.normalized()
    X = D.cross(N).normalized()
    Z = X.cross(D).normalized()
    return X, D, Z


def catmull(pts, n):
    P = [pts[0]] + pts + [pts[-1]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n):
            t = k / n
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(pts[-1])
    return out


def _pothos_w(t):
    """halbe Breite (relativ) der herzförmigen Efeutute: breite Lappen am Grund, lange Spitze"""
    if t < 0.3:
        return 0.62 + 0.38 * math.sin(math.pi * t / 0.3 / 2)
    return max(0.0, math.cos((t - 0.3) / 0.7 * math.pi / 2)) ** 0.85


def _jenny_w(t):
    return max(0.05, math.sin(math.pi * t) ** 0.55)


def leaf(bm, uvmap, frame, origin, L, kind, tile, fold, droop, curl, twist, gx=8, gy=12):
    """Blatt mit echtem Umriss. frame = (X quer, Y Länge, Z Oberseite); origin = Stielansatz."""
    X, Y, Z = frame
    u0, v0, u1, v1 = tile
    if kind == "pothos":
        W, notch, f = L * 0.74, 0.1, _pothos_w
    else:
        W, notch, f = L * 0.9, 0.0, _jenny_w
        gx, gy = 6, 8
    attach = notch if notch else 0.03
    rows = []
    for j in range(gy + 1):
        t = j / gy
        row = []
        for i in range(gx + 1):
            s = i / gx - 0.5
            x = s * W * f(t)
            y = t
            if notch and t < 0.25:  # Einbuchtung am Blattgrund (Herzform)
                y += notch * (1 - (2 * abs(s)) ** 1.5) * (1 - t / 0.25)
            yy = y * L
            z = fold * abs(x) - droop * L * t * t + curl * L * math.sin(math.pi * t) * 0.15
            ang = twist * t
            xr = x * math.cos(ang) - z * math.sin(ang)
            zr = x * math.sin(ang) + z * math.cos(ang)
            vt = bm.verts.new(origin + X * xr + Y * (yy - attach * L) + Z * zr)
            uvmap[vt] = Vector((u0 + (0.5 + x / W) * (u1 - u0), v0 + min(1.0, y) * (v1 - v0)))
            row.append(vt)
        rows.append(row)
    for j in range(gy):
        for i in range(gx):
            bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))


def tube(bm, uvmap, path, r0, r1, kind, n=8):
    """Stängel als Röhre entlang path, Radius von r0 nach r1."""
    if len(path) < 2:
        return
    u = STEM_U[kind]
    length = sum((path[i + 1] - path[i]).length for i in range(len(path) - 1)) or 1e-6
    acc = 0.0
    prev = None
    for k, p in enumerate(path):
        if k:
            acc += (path[k] - path[k - 1]).length
        tan = (path[min(k + 1, len(path) - 1)] - path[max(k - 1, 0)]).normalized()
        ref = Vector((0, 0, 1)) if abs(tan.z) < 0.95 else Vector((1, 0, 0))
        a_ = tan.cross(ref).normalized()
        b_ = tan.cross(a_).normalized()
        rr = r0 + (r1 - r0) * acc / length
        ring = []
        for i in range(n + 1):
            ang = 2 * math.pi * i / n
            vt = bm.verts.new(p + rr * (math.cos(ang) * a_ + math.sin(ang) * b_))
            uvmap[vt] = Vector((u + (i / n - 0.5) * 0.06, STEM_V[0] + (STEM_V[1] - STEM_V[0]) * acc / length))
            ring.append(vt)
        if prev:
            for i in range(n):
                bm.faces.new((prev[i], prev[i + 1], ring[i + 1], ring[i]))
        prev = ring


def petiole_leaf(bm_s, bm_l, uv_s, uv_l, rnd, p, D, N, L, kind, pet_len, r):
    """Blattstiel (leicht gebogen) und Blatt am Ende."""
    sp = SPECIES[kind]
    fr = frame_from(D, N)
    tip = p + D * pet_len
    mid = p.lerp(tip, 0.5) + fr[2] * pet_len * 0.18
    tube(bm_s, uv_s, catmull([p, mid, tip], 3), r * 0.55, r * 0.45, "petiole" if kind == "pothos" else "jenny", n=5)
    leaf(
        bm_l, uv_l, fr, tip, L, kind, rnd.choice(sp["tiles"]),
        fold=rnd.uniform(0.1, 0.28), droop=rnd.uniform(0.04, 0.2), curl=rnd.uniform(-0.15, 0.35), twist=rnd.uniform(-0.3, 0.3),
    )


def vine_path(rnd, base, edge, out, hang, sway):
    """Ranke vom Substrat über die Kante nach unten. out = horizontale Richtung nach außen."""
    up = Vector((0, 0, 1))
    side = out.cross(up).normalized()
    pts = [base, base.lerp(edge, 0.5) + up * (0.012 + rnd.uniform(0, 0.02)), edge + up * 0.012 + out * 0.004]
    n = 6
    for k in range(1, n + 1):
        s = k / n
        bulge = 0.012 + 0.03 * math.sin(min(1.0, s * 1.4) * math.pi / 2) + 0.01 * s
        pts.append(edge + out * bulge - up * (hang * s) + side * (sway * math.sin(s * 2.6 + rnd.uniform(0, 3)) * s))
    return catmull(pts, 10)


def vine(bm_s, bm_l, uv_s, uv_l, rnd, path, out, kind):
    sp = SPECIES[kind]
    tube(bm_s, uv_s, path, sp["r"], sp["r"] * 0.55, kind)
    length = sum((path[i + 1] - path[i]).length for i in range(len(path) - 1))
    up = Vector((0, 0, 1))
    acc, nxt, node = 0.0, rnd.uniform(*sp["spacing"]) * 0.5, 0
    for k in range(1, len(path)):
        acc += (path[k] - path[k - 1]).length
        if acc < nxt:
            continue
        nxt += rnd.uniform(*sp["spacing"])
        frac = acc / length
        p = path[k]
        tan = (path[min(k + 1, len(path) - 1)] - path[k - 1]).normalized()
        side = tan.cross(out).normalized()
        if side.length < 0.1:
            side = out.cross(up).normalized()
        hanging = tan.z < -0.4
        sides = (1, -1) if sp["pairs"] else ((1,) if node % 2 == 0 else (-1,))
        for sgn in sides:
            sd = side * sgn
            if hanging:
                if kind == "pothos":  # Efeutute-Blätter hängen mit der Spitze nach unten, Oberseite nach außen
                    D = (sd * 0.55 + out * 0.35 - up * 0.75).normalized()
                    N = (out * 0.9 + up * 0.25 + sd * rnd.uniform(-0.25, 0.25)).normalized()
                else:
                    D = (sd * 0.8 + out * 0.45 - up * 0.2).normalized()
                    N = (out * 0.8 + up * 0.5).normalized()
            else:
                D = (sd * 0.8 + out * 0.3 + up * 0.25).normalized()
                N = (up * 0.85 + out * 0.35).normalized()
            D = (D + Vector((rnd.uniform(-0.25, 0.25), rnd.uniform(-0.25, 0.25), rnd.uniform(-0.2, 0.2)))).normalized()
            L = rnd.uniform(*sp["leaf"]) * (1.0 - sp["shrink"] * frac)
            petiole_leaf(bm_s, bm_l, uv_s, uv_l, rnd, p, D, N, L, kind, L * rnd.uniform(*sp["pet"]), sp["r"])
        node += 1


def finish(bm, uvmap, name, col, mat, parent):
    me = bpy.data.meshes.new(name)
    lay = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        for lp in f.loops:
            t = uvmap.get(lp.vert)
            if t is not None:
                lp[lay].uv = t
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    me.materials.append(mat)
    ob.parent = parent
    return ob


# ── Bepflanzung ───────────────────────────────────────────────────────────
def build_plants(col, parent, seed=11):
    rnd = random.Random(seed)
    soil_z = sg.INS["top"] - 0.018
    mat = leaf_material()
    B, A, H = sg.B, sg.A, sg.H
    up = Vector((0, 0, 1))

    # Krone: Efeutute links und in der Mitte (aufrechte und überhängende Triebe, große Blätter)
    bm, uvm = bmesh.new(), {}
    for k in range(22):
        x = rnd.uniform(-A + 0.06, 0.1)
        y = rnd.uniform(-B + 0.05, B - 0.04)
        base = Vector((x, y, soil_z))
        h = rnd.uniform(0.04, 0.13)
        lean = Vector((rnd.uniform(-0.7, 0.5), rnd.uniform(-1.0, 0.2), 0))
        path = catmull([base, base + up * h * 0.55 + lean * h * 0.15, base + up * h + lean * h * 0.55], 6)
        tube(bm, uvm, path, 0.003, 0.0022, "pothos")
        for j in range(rnd.randint(2, 4)):
            p = path[min(len(path) - 1, len(path) // 3 + j * 3)]
            ang = rnd.uniform(0, 2 * math.pi)
            dirh = Vector((math.cos(ang), math.sin(ang), 0)) * 0.7 + lean * 0.5
            D = (dirh + up * rnd.uniform(0.2, 0.7)).normalized()
            N = (up * 0.9 + dirh * 0.3).normalized()
            L = rnd.uniform(0.075, 0.115)
            petiole_leaf(bm, bm, uvm, uvm, rnd, p, D, N, L, "pothos", L * rnd.uniform(0.35, 0.65), 0.0028)
    for k in range(11):  # Blätter direkt aus dem Substrat
        p = Vector((rnd.uniform(-A + 0.06, 0.08), rnd.uniform(-B + 0.05, B - 0.05), soil_z))
        ang = rnd.uniform(0, 2 * math.pi)
        dirh = Vector((math.cos(ang), math.sin(ang) - 0.4, 0))
        D = (dirh + up * rnd.uniform(0.5, 1.0)).normalized()
        L = rnd.uniform(0.065, 0.095)
        petiole_leaf(bm, bm, uvm, uvm, rnd, p, D, (up + dirh * 0.3).normalized(), L, "pothos", L * rnd.uniform(0.5, 0.8), 0.0028)
    crown = [finish(bm, uvm, "SG_Pflanze_Krone_Efeutute", col, mat, parent)]

    # Polster: Pfennigkraut rechts (gegenständige Blattpaare dicht über dem Substrat)
    bm, uvm = bmesh.new(), {}
    for k in range(70):
        x = rnd.uniform(0.04, A - 0.05)
        y = rnd.uniform(-B + 0.035, B - 0.03)
        base = Vector((x, y, soil_z))
        ang = rnd.uniform(0, 2 * math.pi)
        dirh = Vector((math.cos(ang), math.sin(ang) - (0.6 if y < -B + 0.08 else 0.0), 0)).normalized()
        n = rnd.randint(2, 4)
        pts = [base + up * 0.002]
        for s in range(1, n + 1):
            pts.append(base + dirh * 0.02 * s + up * (0.006 + 0.012 * math.sin(s / n * math.pi * 0.8)))
        path = catmull(pts, 4)
        tube(bm, uvm, path, 0.0011, 0.0008, "jenny", n=5)
        for j, p in enumerate(path[2::4]):
            side = dirh.cross(up).normalized()
            for sgn in (1, -1):
                D = (side * sgn * 0.85 + dirh * 0.3 + up * rnd.uniform(0.0, 0.35)).normalized()
                L = rnd.uniform(0.016, 0.024)
                petiole_leaf(bm, bm, uvm, uvm, rnd, p, D, (up + dirh * 0.1).normalized(), L, "jenny", L * 0.1, 0.0011)
    crown.append(finish(bm, uvm, "SG_Pflanze_Krone_Pfennigkraut", col, mat, parent))

    # Ranken über Vorderkante und Seiten: links Efeutute, rechts Pfennigkraut.
    # Vor dem Sichtfenster (x = 0 ± 0,1 m) hängt keine Ranke – die Wasserstandsanzeige bleibt frei.
    bm_s, bm_l, uv_s, uv_l = bmesh.new(), bmesh.new(), {}, {}
    front = Vector((0, -1, 0))
    specs = []
    for x, hang, kind in ((-0.36, 0.36, "pothos"), (-0.30, 0.48, "pothos"), (-0.24, 0.24, "pothos"), (-0.15, 0.32, "pothos"), (-0.115, 0.18, "pothos"),
                          (0.13, 0.16, "jenny"), (0.18, 0.26, "jenny"), (0.24, 0.20, "jenny"), (0.30, 0.30, "jenny"), (0.35, 0.14, "jenny")):
        base = Vector((x + rnd.uniform(-0.02, 0.02), -B + 0.05 + rnd.uniform(0, 0.04), soil_z))
        edge = Vector((x + rnd.uniform(-0.03, 0.03), -B - 0.002, H))
        specs.append((base, edge, front, hang, kind))
    for sx, kind, hang in ((-1, "pothos", 0.26), (1, "jenny", 0.18)):
        out = Vector((sx, 0, 0))
        base = Vector((sx * (A - 0.07), -0.04, soil_z))
        edge = Vector((sx * (A + 0.002), -0.04 + rnd.uniform(-0.02, 0.02), H - 0.004))
        specs.append((base, edge, out, hang, kind))
    for base, edge, out, hang, kind in specs:
        path = vine_path(rnd, base, edge, out, hang * rnd.uniform(0.85, 1.15), sway=rnd.uniform(0.01, 0.035))
        vine(bm_s, bm_l, uv_s, uv_l, rnd, path, out, kind)
    stems = finish(bm_s, uv_s, "SG_Pflanze_Ranken_Staengel", col, mat, parent)
    leaves = finish(bm_l, uv_l, "SG_Pflanze_Ranken_Blaetter", col, mat, parent)
    return crown + [stems, leaves]
