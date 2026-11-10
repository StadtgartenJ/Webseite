"""
Stadtgarden v6 – Bepflanzung aus Scan-Assets (Poly Haven, CC0).

- Krone: Anthurium Botany 01 (eingescannte Blätter mit eigener Geometrie), verkleinert.
- Ranken: eigene Ranken-Geometrie (Stängel als Rohr, Blätter als gewölbte Flächen), texturiert mit den
  eingescannten Blättern und Stängeln aus dem Periwinkle-Atlas (Farbe, Normal, Rauheit, Transluzenz, Deckkraft).
  Die Ranken hängen über Vorderkante und Seiten wie bei Efeutute / Pfennigkraut.

Lizenz der Assets: CC0 (polyhaven.com/license) – kommerziell frei, keine Namensnennung nötig.
"""
import math
import os
import random

import bmesh
import bpy
from mathutils import Matrix, Vector

import sg_model as sg

ASSETS = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets"))
ANTH = os.path.join(ASSETS, "anthurium_botany_01_4k.blend", "anthurium_botany_01_4k.blend")
PERI = os.path.join(ASSETS, "periwinkle_plant_4k.blend", "periwinkle_plant_4k.blend")

# Grüne Blätter im Periwinkle-Atlas (Pixel im 1024er-Raster): Stielansatz, Spitze, Breite
LEAVES = [
    ((599, 91), (768, 119), 76),
    ((211, 144), (377, 174), 80),
    ((157, 420), (230, 232), 99),
    ((774, 300), (585, 333), 96),
    ((564, 738), (762, 712), 97),
    ((618, 989), (891, 845), 150),
    ((323, 978), (621, 850), 154),
    ((151, 101), (211, 41), 50),
]
STEM_UV = ((971, 396), (146, 965), 26)  # heller Stängel


def uv(p):
    return Vector((p[0] / 1024.0, 1.0 - p[1] / 1024.0))


def append(path, names=None, materials=False):
    with bpy.data.libraries.load(path, link=False) as (src, dst):
        if materials:
            dst.materials = list(src.materials)
        else:
            dst.objects = [o for o in src.objects if names is None or o in names]
    return dst.materials if materials else dst.objects


def leaf_material():
    m = bpy.data.materials.get("periwinkle_plant")
    if not m:
        append(PERI, materials=True)
        m = bpy.data.materials["periwinkle_plant"]
    m.name = "SG_Blatt_Scan"
    nt = m.node_tree
    grp = next(n for n in nt.nodes if n.bl_idname == "ShaderNodeGroup")
    out = next(n for n in nt.nodes if n.bl_idname == "ShaderNodeOutputMaterial")
    for l in list(out.inputs["Displacement"].links):
        nt.links.remove(l)
    diff = grp.inputs["Diffuse"].links[0].from_socket if grp.inputs["Diffuse"].links else None
    if diff and diff.node.bl_idname != "ShaderNodeHueSaturation":
        hs = nt.nodes.new("ShaderNodeHueSaturation")
        hs.inputs["Hue"].default_value = 0.53
        hs.inputs["Saturation"].default_value = 1.25
        hs.inputs["Value"].default_value = 0.6
        nt.links.new(diff, hs.inputs["Color"])
        nt.links.new(hs.outputs["Color"], grp.inputs["Diffuse"])
    return m


def leaf_card(bm, frame, origin, L, rec, fold, droop, curl, twist, gx=6, gy=10):
    """Gewölbtes Blatt: frame = (X quer, Y Länge, Z Normale), Ursprung am Stielansatz."""
    X, Y, Z = frame
    p0, p1, w = rec
    a, b = uv(p0), uv(p1)
    axis = b - a
    perp = Vector((-axis.y, axis.x)).normalized() * (w / 1024.0)
    plen = axis.length * 1024
    W = L * (w / plen)  # Blattbreite im Verhältnis zum Atlas
    verts = []
    uvs = []
    for j in range(gy + 1):
        t = j / gy
        row = []
        for i in range(gx + 1):
            s = i / gx - 0.5
            x = s * W * 1.08
            y = t * L
            z = fold * abs(s) * W - droop * L * t * t + curl * L * math.sin(math.pi * t) * 0.15
            ang = twist * t
            xr = x * math.cos(ang) - z * math.sin(ang)
            zr = x * math.sin(ang) + z * math.cos(ang)
            co = origin + X * xr + Y * y + Z * zr
            row.append(bm.verts.new(co))
            uvs.append(a + axis * (t * 1.04 - 0.02) + perp * (s * 1.08))
        verts.append(row)
    faces = []
    for j in range(gy):
        for i in range(gx):
            faces.append(bm.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i])))
    return verts, uvs, faces


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


def vine_path(rnd, base, edge, out, hang, sway):
    """Ranke vom Substrat über die Kante nach unten. out = horizontale Richtung nach außen."""
    up = Vector((0, 0, 1))
    side = out.cross(up).normalized()
    pts = [base, base.lerp(edge, 0.5) + up * (0.012 + rnd.uniform(0, 0.02)), edge + up * 0.012 + out * 0.004]
    n = 6
    for k in range(1, n + 1):
        s = k / n
        bulge = 0.012 + 0.03 * math.sin(min(1.0, s * 1.4) * math.pi / 2) + 0.01 * s
        p = edge + out * bulge - up * (hang * s) + side * (sway * math.sin(s * 2.6 + rnd.uniform(0, 3)) * s)
        pts.append(p)
    return catmull(pts, 10)


def build_vine(bm_stem, bm_leaf, uv_stem, uv_leaf, rnd, path, out, leaf_len=(0.032, 0.062), spacing=(0.026, 0.042), r=0.0022):
    # Stängel
    length = sum((path[i + 1] - path[i]).length for i in range(len(path) - 1))
    sa, sb, sw = uv(STEM_UV[0]), uv(STEM_UV[1]), STEM_UV[2] / 1024
    sax = (sb - sa)
    sperp = Vector((-sax.y, sax.x)).normalized() * sw
    n = 8
    rings = []
    acc = 0.0
    for k, p in enumerate(path):
        if k:
            acc += (path[k] - path[k - 1]).length
        tan = (path[min(k + 1, len(path) - 1)] - path[max(k - 1, 0)]).normalized()
        ref = Vector((0, 0, 1)) if abs(tan.z) < 0.95 else Vector((1, 0, 0))
        u_ = tan.cross(ref).normalized()
        v_ = tan.cross(u_).normalized()
        rr = r * (1 - 0.35 * acc / length)
        ring = []
        for i in range(n + 1):
            a = 2 * math.pi * i / n
            ring.append(bm_stem.verts.new(p + rr * (math.cos(a) * u_ + math.sin(a) * v_)))
        rings.append((ring, (acc / 0.25) % 1.0))
    for j in range(len(rings) - 1):
        (r0, t0), (r1, t1) = rings[j], rings[j + 1]
        if t1 < t0:
            t1 += 1.0
        for i in range(n):
            f = bm_stem.faces.new((r0[i], r0[i + 1], r1[i + 1], r1[i]))
            for vv, (tt, ss) in zip(f.verts, ((t0, i / n), (t0, (i + 1) / n), (t1, (i + 1) / n), (t1, i / n))):
                uv_stem[vv] = sa + sax * min(tt, 1.0) * 0.98 + sperp * (ss - 0.5)
    # Blätter an Knoten, gegenständig/abwechselnd
    acc = 0.0
    nxt = rnd.uniform(*spacing) * 0.6
    k_node = 0
    for k in range(1, len(path)):
        seg = (path[k] - path[k - 1]).length
        acc += seg
        if acc < nxt:
            continue
        nxt += rnd.uniform(*spacing)
        frac = acc / length
        p = path[k]
        tan = (path[min(k + 1, len(path) - 1)] - path[k - 1]).normalized()
        up = Vector((0, 0, 1))
        side = tan.cross(out).normalized()
        if side.length < 0.1:
            side = out.cross(up).normalized()
        hanging = tan.z < -0.4
        for sgn in ((1,) if rnd.random() < 0.35 else (1, -1)):
            sd = side * (sgn if k_node % 2 == 0 else -sgn)
            if hanging:
                D = (sd * 0.75 + out * 0.55 - up * 0.35 + tan * 0.15).normalized()
                N = (out * 0.85 + up * 0.35 + sd * rnd.uniform(-0.2, 0.2)).normalized()
            else:
                D = (sd * 0.8 + out * 0.3 + up * 0.25).normalized()
                N = (up * 0.8 + out * 0.4).normalized()
            D = (D + Vector((rnd.uniform(-0.25, 0.25), rnd.uniform(-0.25, 0.25), rnd.uniform(-0.2, 0.2)))).normalized()
            fr = frame_from(D, N)
            L = rnd.uniform(*leaf_len) * (1.0 - 0.45 * frac)
            pet = L * rnd.uniform(0.12, 0.2)
            origin = p + D * pet
            card0 = p + D * pet * 0.55  # Blatt beginnt am Stiel (Atlas-Blattstiel überlappt)
            # kurzer Blattstiel
            seg_pts = [p, p.lerp(origin, 0.5) + fr[2] * pet * 0.15, origin]
            for a_, b_ in zip(seg_pts[:-1], seg_pts[1:]):
                d = (b_ - a_)
                ref = Vector((0, 0, 1)) if abs(d.normalized().z) < 0.95 else Vector((1, 0, 0))
                u_ = d.normalized().cross(ref).normalized() * r * 0.55
                v_ = d.normalized().cross(u_).normalized() * r * 0.55
                q0 = [bm_stem.verts.new(a_ + u_ * math.cos(t) + v_ * math.sin(t)) for t in (0, 2.1, 4.2)]
                q1 = [bm_stem.verts.new(b_ + u_ * math.cos(t) + v_ * math.sin(t)) for t in (0, 2.1, 4.2)]
                for i in range(3):
                    f = bm_stem.faces.new((q0[i], q0[(i + 1) % 3], q1[(i + 1) % 3], q1[i]))
                    for vv in f.verts:
                        uv_stem[vv] = sa + sax * 0.3 + sperp * 0.0
            rec = LEAVES[rnd.randrange(len(LEAVES) - 1)]
            verts, uvs, faces = leaf_card(
                bm_leaf, fr, card0, L, rec,
                fold=rnd.uniform(0.12, 0.3), droop=rnd.uniform(0.05, 0.22), curl=rnd.uniform(-0.2, 0.4), twist=rnd.uniform(-0.35, 0.35),
            )
            flat = [v for row in verts for v in row]
            for v, t in zip(flat, uvs):
                uv_leaf[v] = t
        k_node += 1


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


def build_plants(col, parent, seed=11):
    rnd = random.Random(seed)
    soil_z = sg.INS["top"] - 0.018
    leafmat = leaf_material()
    # ── Krone aus Anthurium-Scans ──────────────────────────────────────
    obs = append(ANTH, ["anthurium_botany_01_a", "anthurium_botany_01_b", "anthurium_botany_01_c", "anthurium_botany_04_d", "anthurium_botany_05_e", "anthurium_botany_06_f"])
    place = [
        ("anthurium_botany_01_b", (-0.25, 0.03), 0.46, 0.6),
        ("anthurium_botany_01_c", (-0.08, -0.01), 0.42, 2.4),
        ("anthurium_botany_04_d", (-0.33, -0.04), 0.58, 4.0),
        ("anthurium_botany_05_e", (0.07, 0.04), 0.62, 1.3),
        ("anthurium_botany_01_a", (-0.16, 0.05), 0.30, 3.3),
        ("anthurium_botany_06_f", (0.2, -0.01), 0.6, 5.1),
        ("anthurium_botany_01_c", (0.3, 0.04), 0.34, 0.9),
    ]
    byname = {o.name: o for o in obs}
    crown = []
    used = set()
    for nm, (x, y), s, rz in place:
        o = byname.get(nm)
        if o is not None and nm in used:
            o = o.copy()
        used.add(nm)
        if not o:
            continue
        col.objects.link(o)
        o.parent = parent
        o.scale = (s, s, s)
        o.rotation_euler = (0, 0, rz)
        bb = [Vector(c) for c in o.bound_box]
        zmin = min(c.z for c in bb) * s
        o.location = (x, y, soil_z - zmin - 0.012)
        o.name = "SG_Pflanze_Krone_" + nm[-1]
        crown.append(o)
    for o in obs:
        if o.name not in col.objects:
            bpy.data.objects.remove(o)
    # ── Ranken ─────────────────────────────────────────────────────────
    bm_s, bm_l = bmesh.new(), bmesh.new()
    uv_s, uv_l = {}, {}
    B, A, H = sg.B, sg.A, sg.H
    front = Vector((0, -1, 0))
    specs = []
    for x, hang in ((-0.36, 0.34), (-0.31, 0.46), (-0.26, 0.22), (-0.17, 0.30), (0.17, 0.14), (0.25, 0.30), (0.31, 0.20)):
        base = Vector((x + rnd.uniform(-0.02, 0.02), -B + 0.05 + rnd.uniform(0, 0.04), soil_z))
        edge = Vector((x + rnd.uniform(-0.03, 0.03), -B - 0.002, H))
        specs.append((base, edge, front, hang))
    for sx in (-1, 1):
        out = Vector((sx, 0, 0))
        for y, hang in ((-0.04, 0.24 if sx < 0 else 0.15),):
            base = Vector((sx * (A - 0.07), y, soil_z))
            edge = Vector((sx * (A + 0.002), y + rnd.uniform(-0.02, 0.02), H - 0.004))
            specs.append((base, edge, out, hang))
    for base, edge, out, hang in specs:
        path = vine_path(rnd, base, edge, out, hang * rnd.uniform(0.8, 1.15), sway=rnd.uniform(0.01, 0.035))
        build_vine(bm_s, bm_l, uv_s, uv_l, rnd, path, out)
    # Polster auf der Erde (rechte Hälfte, wie Pfennigkraut)
    for k in range(240):
        x = rnd.uniform(-0.02, A - 0.05)
        y = rnd.uniform(-B + 0.035, B - 0.03)
        h = 0.003 + 0.03 * rnd.random() ** 2
        p = Vector((x, y, soil_z + h))
        D = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1) - (0.5 if y < -B + 0.06 else 0), rnd.uniform(0.1, 0.8))).normalized()
        fr = frame_from(D, Vector((0, 0, 1)))
        verts, uvs, faces = leaf_card(bm_l, fr, p, rnd.uniform(0.022, 0.04), LEAVES[rnd.randrange(len(LEAVES) - 1)], 0.2, rnd.uniform(0.05, 0.25), 0.2, rnd.uniform(-0.3, 0.3))
        for v, t in zip([v for row in verts for v in row], uvs):
            uv_l[v] = t
    stems = finish(bm_s, uv_s, "SG_Pflanze_Ranken_Staengel", col, leafmat, parent)
    leaves = finish(bm_l, uv_l, "SG_Pflanze_Ranken_Blaetter", col, leafmat, parent)
    return crown + [stems, leaves]
