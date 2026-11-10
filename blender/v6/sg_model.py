"""
Stadtgarden v6 – Blender-Mastermodell (Produkt ohne Pflanzen).

Echte Maße in Metern, Blender-Koordinaten: x = Länge, y = Tiefe (Vorderseite −y, Fenster +y), z = oben.
Alle Bauteile sind eigene, benannte Objekte und hängen an Gruppen-Empties, die für Explosion und
Animation bewegt werden. Maßverhältnisse aus v5 (components/explorer/geometry.ts) übernommen;
1 Viewer-Einheit = 1/3 m.

Nutzung in Blender:
    import importlib.util, sys
    spec = importlib.util.spec_from_file_location("sg_model", r".../blender/v6/sg_model.py")
    sg = importlib.util.module_from_spec(spec); spec.loader.exec_module(sg)
    sg.build()
"""
import math

import bmesh
import bpy
from mathutils import Vector

# ── Maße (m) ──────────────────────────────────────────────────────────────
U = 1 / 3  # Viewer-Einheit
A, B, H = 1.2 * U, 0.36 * U, 0.82 * U  # halbe Länge 0,40 · halbe Tiefe 0,12 · Höhe 0,273
RX, RZ, RC = 0.4 * U, 0.3 * U, 0.28 * U  # Bodenrundung vorne, seitlich, Eckradius von oben
T = 0.005  # Wandstärke Schale
GAP = 0.004

GAUGE = dict(x=-0.06, z=0.150, half=0.034, r=0.0105, depth=0.0025)

RES = dict(top=0.093, t=0.0025, water=0.066)  # Reservoir
PLATE = dict(z=0.097, th=0.004, hole_r=0.0026, pitch=0.0115, border=0.012)
INS = dict(bottom=0.113, top=H - 0.006, t=0.0032)
WICK = dict(x=0.205, y=0.0, w=0.05, th=0.003, bottom=0.012, top=0.150)
ROD = dict(r=0.0125, r_in=0.0105, half=0.50, z=H + 0.055)
STRAP = dict(x=0.26, w=0.06, th=0.004, z0=0.165)
CAP = dict(r=0.030, len=0.022)

# Explosionsweg je Gruppe (m, nach oben positiv) – gleiche Reihenfolge wie im Viewer
EXPLODE = dict(mount=0.52, insert=0.27, plate=0.12, wick=0.05, reservoir=-0.05, shell=-0.30)

RING_N = dict(side=14, long=80, corner=22)
# Detailstufe: im Web-Export herabgesetzt (sg_export.py)
LOD = dict(nb=44, nt=16, lip=10, hole_seg=16)


# ── Hilfen ────────────────────────────────────────────────────────────────
def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (1.0,)


def coll(name, parent=None):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    p = parent or bpy.context.scene.collection
    if c.name not in [x.name for x in p.children]:
        p.children.link(c)
    return c


def obj_from_bm(name, bm, col, mat=None, smooth=True, parent=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = smooth
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    if mat:
        me.materials.append(mat)
    if parent:
        ob.parent = parent
    return ob


def empty(name, col, parent=None, loc=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    e.empty_display_type = "PLAIN_AXES"
    e.empty_display_size = 0.05
    e.location = loc
    col.objects.link(e)
    if parent:
        e.parent = parent
    return e


def smooth_by_angle(ob, deg=40):
    m = ob.modifiers.new("Glätten", "NODES") if False else None  # Platzhalter (nicht nötig)
    me = ob.data
    for p in me.polygons:
        p.use_smooth = True
    try:
        me.set_sharp_from_angle(angle=math.radians(deg))
    except Exception:
        pass
    return m


# ── Kapsel-Querschnitt ───────────────────────────────────────────────────
def rounded_ring(a, b, r, z):
    """Abgerundetes Rechteck (halbe Länge a, halbe Tiefe b, Radius r) mit fester Punktezahl je Abschnitt."""
    r = max(1e-5, min(r, a - 1e-6, b - 1e-6))
    ax, by = max(0.0, a - r), max(0.0, b - r)
    ns, nl, nc = RING_N["side"], RING_N["long"], RING_N["corner"]
    pts = []

    def line(x0, y0, x1, y1, n):
        for i in range(n):
            s = i / n
            pts.append((x0 + (x1 - x0) * s, y0 + (y1 - y0) * s, z))

    def arc(cx, cy, p0):
        for i in range(nc):
            p = p0 + i / nc * (math.pi / 2)
            pts.append((cx + r * math.cos(p), cy + r * math.sin(p), z))

    line(a, -by, a, by, ns)
    arc(ax, by, 0)
    line(ax, b, -ax, b, nl)
    arc(-ax, by, math.pi / 2)
    line(-a, by, -a, -by, ns)
    arc(-ax, -by, math.pi)
    line(-ax, -b, ax, -b, nl)
    arc(ax, -by, 1.5 * math.pi)
    return pts


def section(s, z):
    """Querschnitt einer Kapselwanne in Höhe z (über dem Boden)."""

    def inset(R):
        if z >= R:
            return 0.0
        return R - math.sqrt(max(0.0, R * R - (R - z) ** 2))

    a = s["A"] - inset(s["RX"])
    b = s["B"] - inset(s["RZ"])
    return a, b, min(s["RC"], a, b)


def z_levels(s, top, nb=None, nt=None):
    nb = nb or LOD["nb"]
    nt = nt or LOD["nt"]
    R = max(s["RX"], s["RZ"])
    zs = [R * (1 - math.cos(i / nb * math.pi / 2)) for i in range(nb + 1)]
    zs = [z for z in zs if z < top]
    zs += [R + (top - R) * i / nt for i in range(1, nt + 1)] if top > R else [top]
    out = []
    for z in zs:
        if not out or z > out[-1] + 1e-6:
            out.append(z)
    return out


def vessel_bm(s, t, top, lip=True, bottom_fill=True):
    """Offene Wanne mit Wandstärke t und gerolltem Rand. Rückgabe: bmesh."""
    si = dict(A=s["A"] - t, B=s["B"] - t, RX=max(0.002, s["RX"] - t), RZ=max(0.002, s["RZ"] - t), RC=max(0.002, s["RC"] - t))
    zt = top - t / 2 if lip else top
    bm = bmesh.new()

    def loft(sec, zs, zoff, outward):
        rows = []
        for z in zs:
            a, b, r = section(sec, z)
            rows.append([bm.verts.new((x, y, zz + zoff)) for x, y, zz in rounded_ring(a, b, r, z)])
        n = len(rows[0])
        for j in range(len(rows) - 1):
            for i in range(n):
                i2 = (i + 1) % n
                q = (rows[j][i], rows[j][i2], rows[j + 1][i2], rows[j + 1][i])
                bm.faces.new(q if outward else q[::-1])
        return rows

    zs_o = z_levels(s, zt)
    rows_o = loft(s, zs_o, 0.0, True)
    zs_i = [z for z in z_levels(si, zt - t)]
    rows_i = loft(si, zs_i, t, False)
    n = len(rows_o[0])
    if lip:
        # Halbrund zwischen Außen- und Innenkante
        o, i_ = rows_o[-1], rows_i[-1]
        arcs = [o]
        steps = LOD["lip"]
        for k in range(1, steps):
            th = math.pi * k / steps
            ring = []
            for vo, vi in zip(o, i_):
                c = (vo.co + vi.co) / 2
                d = vo.co - c
                ring.append(bm.verts.new(c + d * math.cos(th) + Vector((0, 0, t / 2 * math.sin(th)))))
            arcs.append(ring)
        arcs.append(i_)
        for j in range(len(arcs) - 1):
            for k in range(n):
                k2 = (k + 1) % n
                bm.faces.new((arcs[j][k], arcs[j][k2], arcs[j + 1][k2], arcs[j + 1][k]))
    if bottom_fill:
        for rows, flip in ((rows_o, True), (rows_i, False)):
            edges = []
            r0 = rows[0]
            for k in range(n):
                e = bm.edges.get((r0[k], r0[(k + 1) % n])) or bm.edges.new((r0[k], r0[(k + 1) % n]))
                edges.append(e)
            res = bmesh.ops.triangle_fill(bm, use_beauty=True, use_dissolve=False, edges=edges)
            for f in res["geom"]:
                if isinstance(f, bmesh.types.BMFace):
                    f.normal_update()
                    want = -1 if flip else 1
                    if f.normal.z * want < 0:
                        f.normal_flip()
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7)
    bm.normal_update()
    return bm


def closed_vessel_bm(s, top):
    """Geschlossener Körper (z. B. Wasser): Wanne ohne Wandstärke mit Deckel."""
    bm = bmesh.new()
    zs = z_levels(s, top)
    rows = []
    for z in zs:
        a, b, r = section(s, z)
        rows.append([bm.verts.new(p) for p in rounded_ring(a, b, r, z)])
    n = len(rows[0])
    for j in range(len(rows) - 1):
        for i in range(n):
            i2 = (i + 1) % n
            bm.faces.new((rows[j][i], rows[j][i2], rows[j + 1][i2], rows[j + 1][i]))
    for row, up in ((rows[0], False), (rows[-1], True)):
        f = bm.faces.new(row if up else row[::-1])
        f.normal_update()
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    bm.normal_update()
    return bm


def rounded_slab_bm(a, b, r, z0, h, n_scale=1.0):
    """Gerundete Platte: halbe Länge a, halbe Tiefe b, Eckradius r, Unterseite z0, Dicke h."""
    bm = bmesh.new()
    lo = [bm.verts.new(p) for p in rounded_ring(a, b, r, z0)]
    hi = [bm.verts.new(p) for p in rounded_ring(a, b, r, z0 + h)]
    n = len(lo)
    for i in range(n):
        i2 = (i + 1) % n
        bm.faces.new((lo[i], lo[i2], hi[i2], hi[i]))
    bm.faces.new(hi)
    bm.faces.new(lo[::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()
    return bm


def capsule_prism_bm(cx, cz, half, r, y0, y1, n=24):
    """Senkrechte Kapsel (Langloch) als Prisma zwischen y0 und y1 – Schneidkörper."""
    pts = []
    for i in range(n + 1):
        a = math.pi * i / n
        pts.append((cx + r * math.cos(a), cz + half + r * math.sin(a)))
    for i in range(n + 1):
        a = math.pi + math.pi * i / n
        pts.append((cx + r * math.cos(a), cz - half + r * math.sin(a)))
    bm = bmesh.new()
    f0 = [bm.verts.new((x, y0, z)) for x, z in pts]
    f1 = [bm.verts.new((x, y1, z)) for x, z in pts]
    m = len(pts)
    for i in range(m):
        i2 = (i + 1) % m
        bm.faces.new((f0[i], f0[i2], f1[i2], f1[i]))
    bm.faces.new(f0[::-1])
    bm.faces.new(f1)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()
    return bm


def boolean(ob, cutter, op="DIFFERENCE", solver="EXACT"):
    m = ob.modifiers.new("Bool", "BOOLEAN")
    m.object = cutter
    m.operation = op
    m.solver = solver
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    ev = ob.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev)
    old = ob.data
    ob.modifiers.remove(m)
    ob.data = me
    bpy.data.meshes.remove(old)
    me.name = ob.name


def tube_bm(path, radius, n=32, close_ends=True):
    """Rohr entlang einer Punktliste (Vectors)."""
    bm = bmesh.new()
    rings = []
    for k, p in enumerate(path):
        tan = (path[min(k + 1, len(path) - 1)] - path[max(k - 1, 0)]).normalized()
        ref = Vector((0, 0, 1)) if abs(tan.z) < 0.9 else Vector((1, 0, 0))
        u = tan.cross(ref).normalized()
        v = tan.cross(u).normalized()
        rings.append([bm.verts.new(p + radius * (math.cos(a) * u + math.sin(a) * v)) for a in [2 * math.pi * i / n for i in range(n)]])
    for j in range(len(rings) - 1):
        for i in range(n):
            i2 = (i + 1) % n
            bm.faces.new((rings[j][i], rings[j][i2], rings[j + 1][i2], rings[j + 1][i]))
    if close_ends:
        bm.faces.new(rings[0][::-1])
        bm.faces.new(rings[-1])
    bm.normal_update()
    return bm


def cylinder_x_bm(r, x0, x1, y, z, n=64, bevel=0.0):
    """Zylinder entlang x mit optional gerundeten Kanten (bevel = Radius der Kante)."""
    prof = []  # (x, radius)
    if bevel > 0:
        steps = 8
        for k in range(steps + 1):
            a = math.pi / 2 * k / steps
            prof.append((x0 + bevel - bevel * math.cos(a), r - bevel + bevel * math.sin(a)))
        for k in range(steps + 1):
            a = math.pi / 2 * k / steps
            prof.append((x1 - bevel + bevel * math.sin(a), r - bevel + bevel * math.cos(a)))
    else:
        prof = [(x0, r), (x1, r)]
    bm = bmesh.new()
    rings = []
    for x, rr in prof:
        rings.append([bm.verts.new((x, y + rr * math.cos(2 * math.pi * i / n), z + rr * math.sin(2 * math.pi * i / n))) for i in range(n)])
    for j in range(len(rings) - 1):
        for i in range(n):
            i2 = (i + 1) % n
            bm.faces.new((rings[j][i], rings[j][i2], rings[j + 1][i2], rings[j + 1][i]))
    c0 = bm.verts.new((prof[0][0], y, z))
    c1 = bm.verts.new((prof[-1][0], y, z))
    for i in range(n):
        i2 = (i + 1) % n
        bm.faces.new((c0, rings[0][i2], rings[0][i]))
        bm.faces.new((c1, rings[-1][i], rings[-1][i2]))
    bm.normal_update()
    return bm


# ── Materialien ───────────────────────────────────────────────────────────
def _bsdf(m):
    m.use_nodes = True
    return m.node_tree, m.node_tree.nodes["Principled BSDF"]


def _set(b, **kw):
    names = dict(
        color="Base Color", rough="Roughness", metal="Metallic", coat="Coat Weight", coat_rough="Coat Roughness",
        sss="Subsurface Weight", sss_scale="Subsurface Scale", trans="Transmission Weight", ior="IOR",
        spec="Specular IOR Level", sheen="Sheen Weight", sheen_rough="Sheen Roughness", alpha="Alpha",
    )
    for k, v in kw.items():
        if k == "color" and isinstance(v, str):
            v = srgb(v)
        b.inputs[names[k]].default_value = v


def _bump(nt, b, scale, strength, detail=4.0, distance=0.001, kind="noise"):
    tc = nt.nodes.new("ShaderNodeTexCoord")
    if kind == "noise":
        tx = nt.nodes.new("ShaderNodeTexNoise")
        tx.inputs["Scale"].default_value = scale
        tx.inputs["Detail"].default_value = detail
        nt.links.new(tc.outputs["Object"], tx.inputs["Vector"])
        out = tx.outputs["Fac"]
    else:
        tx = nt.nodes.new("ShaderNodeTexVoronoi")
        tx.inputs["Scale"].default_value = scale
        nt.links.new(tc.outputs["Object"], tx.inputs["Vector"])
        out = tx.outputs["Distance"]
    bp = nt.nodes.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = strength
    bp.inputs["Distance"].default_value = distance
    nt.links.new(out, bp.inputs["Height"])
    nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    if "Coat Normal" in b.inputs:
        pass
    return bp


def materials():
    M = {}

    def mat(name, **kw):
        m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
        nt, b = _bsdf(m)
        _set(b, **kw)
        M[name] = m
        return m, nt, b

    # Seidenmatter Kunststoff (PP/ASA), leicht durchscheinend, feine Mikrostruktur
    m, nt, b = mat("SG_Kunststoff_Weiss", color="#F1EDE4", rough=0.36, spec=0.5, sss=0.06, sss_scale=0.004, coat=0.08, coat_rough=0.25)
    b.inputs["Subsurface Radius"].default_value = (1.0, 0.85, 0.7)
    _bump(nt, b, 2600, 0.025, detail=2.0, distance=0.0002)

    # Pulverbeschichtung (Halterungen, Stange): Orangenhaut-Struktur
    m, nt, b = mat("SG_Pulverlack_Weiss", color="#F1EFEA", rough=0.48, spec=0.5, coat=0.18, coat_rough=0.35)
    _bump(nt, b, 900, 0.06, detail=3.0, distance=0.0003)

    mat("SG_Gummi_Grau", color="#8E908B", rough=0.82, spec=0.35)
    m, nt, b = mat("SG_Kunststoff_Endkappe", color="#EDEBE5", rough=0.42, spec=0.5)
    _bump(nt, b, 2600, 0.02, detail=2.0, distance=0.0002)

    # Schwarzer Einsatz (PP, leicht genarbt)
    m, nt, b = mat("SG_Kunststoff_Schwarz", color="#1D1F1C", rough=0.5, spec=0.55)
    _bump(nt, b, 1400, 0.08, detail=3.0, distance=0.0003)

    m, nt, b = mat("SG_Kunststoff_Platte", color="#E6E3DB", rough=0.45, spec=0.5, sss=0.04, sss_scale=0.003)
    _bump(nt, b, 2600, 0.02, detail=2.0, distance=0.0002)

    # Klarer Kunststoff (Reservoir, Sichtfenster)
    m, nt, b = mat("SG_Kunststoff_Klar", color="#F4F8F8", rough=0.04, trans=1.0, ior=1.49, spec=0.5)
    # dünnes Sichtfenster: als hauchdünne Scheibe (Alpha), damit Licht direkt hindurchgeht
    mat("SG_Fenster", color="#FFFFFF", rough=0.06, spec=0.6, alpha=0.06, coat=0.0)
    # Wasser mit leichter Absorption
    m, nt, b = mat("SG_Wasser", color="#FFFFFF", rough=0.02, trans=1.0, ior=1.333, spec=0.5)
    out = nt.nodes["Material Output"]
    vol = nt.nodes.new("ShaderNodeVolumeAbsorption")
    vol.inputs["Color"].default_value = srgb("#7CC7D6")
    vol.inputs["Density"].default_value = 6.0
    nt.links.new(vol.outputs["Volume"], out.inputs["Volume"])

    # Anzeige: gefärbte Flüssigkeit im Sichtfenster (Konzept: Wasserstand gut lesbar)
    m, nt, b = mat("SG_Anzeige_Fluessigkeit", color="#1A78B8", rough=0.12, coat=0.6, coat_rough=0.05, sss=0.0, sss_scale=0.004)
    b.inputs["Subsurface Radius"].default_value = (0.4, 0.8, 1.0)

    # Kapillardocht: Vlies/Gewebe, unten nass (dunkler)
    m, nt, b = mat("SG_Docht", color="#ECE7DA", rough=0.92, sheen=0.6, sheen_rough=0.4, spec=0.3)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeMapRange")
    ramp.inputs["From Min"].default_value = RES["water"] + 0.012
    ramp.inputs["From Max"].default_value = RES["water"] - 0.004
    nt.links.new(sep.outputs["Z"], ramp.inputs["Value"])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs[6].default_value = srgb("#ECE7DA")
    mix.inputs[7].default_value = srgb("#B9C2BE")
    nt.links.new(ramp.outputs["Result"], mix.inputs[0])
    nt.links.new(mix.outputs[2], b.inputs["Base Color"])
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.inputs["Scale"].default_value = 500
    wave.inputs["Distortion"].default_value = 2
    wave.wave_type = "BANDS"
    nt.links.new(tc.outputs["Object"], wave.inputs["Vector"])
    bp = nt.nodes.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.25
    bp.inputs["Distance"].default_value = 0.0004
    nt.links.new(wave.outputs["Fac"], bp.inputs["Height"])
    nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])

    # Substrat (Erde) – Grundfarbe mit Variation
    m, nt, b = mat("SG_Erde", color="#2E2219", rough=0.95, spec=0.25)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 60
    nz.inputs["Detail"].default_value = 8
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    cr = nt.nodes.new("ShaderNodeValToRGB")
    cr.color_ramp.elements[0].color = srgb("#1E160F")
    cr.color_ramp.elements[1].color = srgb("#4A3624")
    nt.links.new(nz.outputs["Fac"], cr.inputs["Fac"])
    nt.links.new(cr.outputs["Color"], b.inputs["Base Color"])
    vo = nt.nodes.new("ShaderNodeTexVoronoi")
    vo.inputs["Scale"].default_value = 420
    nt.links.new(tc.outputs["Object"], vo.inputs["Vector"])
    bp = nt.nodes.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.6
    bp.inputs["Distance"].default_value = 0.002
    nt.links.new(vo.outputs["Distance"], bp.inputs["Height"])
    nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])

    mat("SG_Perlit", color="#E9E6DF", rough=0.85, spec=0.3)
    m, nt, b = mat("SG_Rinde", color="#5B3C25", rough=0.8, spec=0.3)
    _bump(nt, b, 300, 0.4, detail=6.0, distance=0.001)
    return M


# ── Bauteile ──────────────────────────────────────────────────────────────
SHELL = dict(A=A, B=B, RX=RX, RZ=RZ, RC=RC)


def build_shell(col, M, parent):
    bm = vessel_bm(SHELL, T, H)
    shell = obj_from_bm("SG_Schale", bm, col, M["SG_Kunststoff_Weiss"], parent=parent)
    # Vertiefung für die Wasserstandsanzeige (Tasche, nicht durchgehend)
    g = GAUGE
    cut = obj_from_bm("_cut_gauge", capsule_prism_bm(g["x"], g["z"], g["half"], g["r"], -B - 0.01, -B + T + 0.002), col)
    boolean(shell, cut)
    bpy.data.objects.remove(cut)
    smooth_by_angle(shell, 35)
    bv = shell.modifiers.new("Kanten", "BEVEL")
    bv.width = 0.0008
    bv.segments = 3
    bv.limit_method = "ANGLE"
    bv.angle_limit = math.radians(40)
    # Anzeige: klares Fenster (1,2 mm zurückgesetzt), Flüssigkeitssäule, helle Rückwand innen
    yf = -B
    obj_from_bm("SG_Anzeige_Fenster", capsule_prism_bm(g["x"], g["z"], g["half"], g["r"] - 0.0002, yf + 0.0005, yf + 0.0015), col, M["SG_Fenster"], parent=parent)
    bottom = g["z"] - g["half"] - g["r"]
    lvl = g["z"] - 0.1 * g["half"]
    rl = g["r"] - 0.0012
    obj_from_bm("SG_Anzeige_Wasser", capsule_prism_bm(g["x"], (bottom + rl + lvl) / 2, max(0.001, (lvl - bottom - rl) / 2), rl, yf + 0.0017, yf + 0.0036), col, M["SG_Anzeige_Fluessigkeit"], parent=parent)
    obj_from_bm("SG_Anzeige_Rueckwand", capsule_prism_bm(g["x"], g["z"], g["half"], g["r"] - 0.0001, yf + 0.0037, yf + T + 0.0016), col, M["SG_Kunststoff_Weiss"], parent=parent)
    return shell


def build_reservoir(col, M, parent):
    ins = T + GAP
    s = dict(A=A - ins, B=B - ins, RX=RX - ins, RZ=RZ - ins, RC=RC - ins)
    bm = vessel_bm(s, RES["t"], RES["top"] - ins, lip=True)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, ins))
    res = obj_from_bm("SG_Reservoir", bm, col, M["SG_Kunststoff_Klar"], parent=parent)
    i2 = ins + RES["t"] + 0.0003
    sw = dict(A=A - i2, B=B - i2, RX=RX - i2, RZ=RZ - i2, RC=RC - i2)
    bm = closed_vessel_bm(sw, RES["water"] - i2)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, i2))
    obj_from_bm("SG_Wasser", bm, col, M["SG_Wasser"], parent=parent)
    return res


def inner_half(z):
    """halbe Innenlänge/-tiefe der Schale in Höhe z (abzüglich Spiel)."""
    a, b, r = section(SHELL, z)
    return a - T - GAP, b - T - GAP, max(0.004, r - T - GAP)


def build_plate(col, M, parent):
    z0 = PLATE["z"]
    a, b, r = inner_half(z0)
    a, b = a - 0.003, b - 0.003  # liegt auf dem Reservoirrand
    plate = obj_from_bm("SG_Trennplatte", rounded_slab_bm(a, b, r, z0, PLATE["th"]), col, M["SG_Kunststoff_Platte"], parent=parent)
    # Lochraster + zwei Schlitze für die Dochte
    bm = bmesh.new()
    p, hr, bd = PLATE["pitch"], PLATE["hole_r"], PLATE["border"]
    nx = int((2 * (a - bd)) / p)
    ny = int((2 * (b - bd)) / p)
    x0 = -(nx - 1) * p / 2
    y0 = -(ny - 1) * p / 2
    for i in range(nx):
        for j in range(ny):
            x, y = x0 + i * p, y0 + j * p
            if any(abs(abs(x) - WICK["x"]) < WICK["w"] / 2 + 0.006 and abs(y - WICK["y"]) < 0.012 for _ in [0]):
                continue
            if (abs(x) > a - r and (abs(x) - (a - r)) ** 2 + max(0, abs(y) - (b - r)) ** 2 > (r - bd) ** 2) and abs(y) > b - r:
                continue
            bmesh.ops.create_circle(bm, cap_ends=True, segments=LOD["hole_seg"], radius=hr, matrix=__import__("mathutils").Matrix.Translation((x, y, z0 - 0.001)))
    # aus Kreisen Zylinder machen
    faces = list(bm.faces)
    res = bmesh.ops.extrude_face_region(bm, geom=faces)
    verts = [v for v in res["geom"] if isinstance(v, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=verts, vec=(0, 0, PLATE["th"] + 0.002))
    bm.normal_update()
    for f in bm.faces:
        f.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for sx in (-1, 1):
        sb = rounded_slab_bm(WICK["w"] / 2 + 0.002, 0.0035, 0.0034, z0 - 0.001, PLATE["th"] + 0.002)
        me = bpy.data.meshes.new("tmp")
        sb.to_mesh(me)
        sb.free()
        for v in me.vertices:
            v.co.x += sx * WICK["x"]
            v.co.y += WICK["y"]
        bm.from_mesh(me)
        bpy.data.meshes.remove(me)
    cut = obj_from_bm("_cut_plate", bm, col)
    boolean(plate, cut, solver="EXACT")
    bpy.data.objects.remove(cut)
    smooth_by_angle(plate, 30)
    return plate


def build_wicks(col, M, parent):
    out = []
    for sx, nm in ((-1, "L"), (1, "R")):
        bm = bmesh.new()
        w, th = WICK["w"], WICK["th"]
        nzs = 40
        rows = []
        for k in range(nzs + 1):
            z = WICK["bottom"] + (WICK["top"] - WICK["bottom"]) * k / nzs
            # leichte Gewebewelle und am Boden umgelegt
            dy = 0.0012 * math.sin(z * 90 + sx)
            row = []
            for ix in range(9):
                x = sx * WICK["x"] + (ix / 8 - 0.5) * w
                row.append((x, WICK["y"] + dy, z))
            rows.append(row)
        # Platte mit Dicke
        vf, vb = [], []
        for row in rows:
            vf.append([bm.verts.new((x, y - th / 2, z)) for x, y, z in row])
            vb.append([bm.verts.new((x, y + th / 2, z)) for x, y, z in row])
        for j in range(nzs):
            for i in range(8):
                bm.faces.new((vf[j][i], vf[j][i + 1], vf[j + 1][i + 1], vf[j + 1][i]))
                bm.faces.new((vb[j][i + 1], vb[j][i], vb[j + 1][i], vb[j + 1][i + 1]))
            bm.faces.new((vf[j][0], vf[j + 1][0], vb[j + 1][0], vb[j][0]))
            bm.faces.new((vf[j][8], vb[j][8], vb[j + 1][8], vf[j + 1][8]))
        for i in range(8):
            bm.faces.new((vf[0][i + 1], vf[0][i], vb[0][i], vb[0][i + 1]))
            bm.faces.new((vf[-1][i], vf[-1][i + 1], vb[-1][i + 1], vb[-1][i]))
        bm.normal_update()
        ob = obj_from_bm(f"SG_Docht_{nm}", bm, col, M["SG_Docht"], parent=parent)
        sub = ob.modifiers.new("Glatt", "SUBSURF")
        sub.levels = 1
        sub.render_levels = 2
        out.append(ob)
    return out


def build_insert(col, M, parent):
    z0, z1, t = INS["bottom"], INS["top"], INS["t"]
    a, b, r = inner_half(z0 + 0.01)
    a, b = a - 0.002, b - 0.002
    s = dict(A=a, B=b, RX=0.018, RZ=0.018, RC=r)
    bm = vessel_bm(s, t, z1 - z0)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, z0))
    ins = obj_from_bm("SG_Pflanzeinsatz", bm, col, M["SG_Kunststoff_Schwarz"], parent=parent)
    # Schlitze unten (Wurzelluft/Ablauf) und Durchlass für die Dochte
    cbm = bmesh.new()
    me = bpy.data.meshes.new("tmp")

    def add(bmx):
        bmx.to_mesh(me)
        bmx.free()
        cbm.from_mesh(me)

    pitch = 0.016
    n = int((2 * (a - 0.03)) / pitch)
    for i in range(n):
        x = -(n - 1) * pitch / 2 + i * pitch
        for y0, y1 in ((-b - 0.01, -b + 0.01), (b - 0.01, b + 0.01)):
            add(capsule_prism_bm(x, z0 + 0.034, 0.012, 0.0022, y0, y1, n=8))
    m2 = int((2 * (b - 0.03)) / pitch)
    for j in range(m2):
        y = -(m2 - 1) * pitch / 2 + j * pitch
        for sx in (-1, 1):
            bmx = capsule_prism_bm(0, z0 + 0.034, 0.012, 0.0022, -0.01, 0.01, n=8)
            for v in bmx.verts:
                v.co = Vector((sx * a + v.co.y, y + v.co.x, v.co.z))
            bmx.normal_update()
            bmesh.ops.reverse_faces(bmx, faces=bmx.faces) if False else None
            add(bmx)
    for sx in (-1, 1):
        sb = rounded_slab_bm(WICK["w"] / 2 + 0.002, 0.0035, 0.0034, z0 - 0.01, 0.03)
        for v in sb.verts:
            v.co.x += sx * WICK["x"]
            v.co.y += WICK["y"]
        add(sb)
    bpy.data.meshes.remove(me)
    bmesh.ops.recalc_face_normals(cbm, faces=cbm.faces)
    cut = obj_from_bm("_cut_insert", cbm, col)
    boolean(ins, cut)
    bpy.data.objects.remove(cut)
    smooth_by_angle(ins, 35)
    return ins


def build_soil(col, M, parent):
    a, b, r = inner_half(INS["bottom"] + 0.01)
    a, b, r = a - 0.002 - INS["t"] - 0.0005, b - 0.002 - INS["t"] - 0.0005, max(0.004, r - INS["t"])
    top = INS["top"] - 0.018
    bm = rounded_slab_bm(a, b, r, INS["bottom"] + INS["t"], top - INS["bottom"] - INS["t"])
    soil = obj_from_bm("SG_Erde", bm, col, M["SG_Erde"], parent=parent)
    # Oberfläche: unterteilen + Verschiebung (krümelig, nicht glatt)
    rem = soil.modifiers.new("Raster", "REMESH")
    rem.mode = "SHARP" if False else "VOXEL"
    rem.voxel_size = 0.004
    tex = bpy.data.textures.get("SG_Erde_Relief") or bpy.data.textures.new("SG_Erde_Relief", "CLOUDS")
    tex.noise_scale = 0.012
    tex.noise_depth = 3
    vg_mod = soil.modifiers.new("Relief", "DISPLACE")
    vg_mod.texture = tex
    vg_mod.strength = 0.006
    vg_mod.mid_level = 0.5
    vg_mod.texture_coords = "GLOBAL"
    for p in soil.data.polygons:
        p.use_smooth = True
    return soil


def scatter_substrate(col, M, parent, soil, seed=3):
    """Perlit-Körner und Rindenstücke auf der Oberfläche (Partikelsystem, Instanzen)."""
    pcol = coll("SG_Substrat_Instanzen", col)
    pcol.hide_render = False
    perl = []
    for k in range(4):
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=2, radius=0.0022)
        for v in bm.verts:
            v.co *= 0.75 + 0.5 * abs(math.sin(v.co.x * 3000 + k) * math.cos(v.co.y * 2000 - k))
        ob = obj_from_bm(f"_perlit_{k}", bm, pcol, M["SG_Perlit"])
        perl.append(ob)
    bark = []
    for k in range(3):
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1)
        for v in bm.verts:
            v.co = Vector((v.co.x * 0.011 * (1 + 0.3 * k), v.co.y * 0.007, v.co.z * 0.0025))
        ob = obj_from_bm(f"_rinde_{k}", bm, pcol, M["SG_Rinde"])
        bv = ob.modifiers.new("b", "BEVEL")
        bv.width = 0.0009
        bv.segments = 2
        bark.append(ob)
    pcol.hide_viewport = True
    for o in perl + bark:
        o.hide_render = True  # nur als Instanzvorlage
    ps_def = [("Perlit", perl, 900, 0.9), ("Rinde", bark, 140, 1.0)]
    for name, obs, count, size in ps_def:
        g = coll(f"_inst_{name}", pcol)
        for o in obs:
            if o.name not in g.objects:
                g.objects.link(o)
        mod = soil.modifiers.new(name, "PARTICLE_SYSTEM")
        ps = mod.particle_system
        st = ps.settings
        st.type = "HAIR"
        st.use_advanced_hair = True
        st.count = count
        st.hair_length = 0.01
        st.emit_from = "FACE"
        st.use_emit_random = True
        st.render_type = "COLLECTION"
        st.instance_collection = g
        st.use_collection_pick_random = True
        st.particle_size = size
        st.size_random = 0.6
        st.use_rotations = True
        st.rotation_mode = "NOR"
        st.phase_factor_random = 2.0
        st.rotation_factor_random = 1.0
        ps.seed = seed + len(name)
    # nur obere Fläche: Vertex-Gruppe nach z
    vg = soil.vertex_groups.new(name="Oberseite")
    zmax = max(v.co.z for v in soil.data.vertices)
    vg.add([v.index for v in soil.data.vertices if v.co.z > zmax - 0.003], 1.0, "REPLACE")
    for m in soil.modifiers:
        if m.type == "PARTICLE_SYSTEM":
            m.particle_system.vertex_group_density = "Oberseite"


def build_mount(col, M, parent):
    z, r = ROD["z"], ROD["r"]
    yr = B + STRAP["th"] + r  # Stange hinter der Rückwand, Band läuft vorne an ihr hoch
    objs = {}
    # Außenrohr (links) und Innenrohr (rechts, teleskopierbar)
    objs["outer"] = obj_from_bm("SG_Stange_Aussen", cylinder_x_bm(r, -ROD["half"] + CAP["len"], 0.06, yr, z, n=64, bevel=0.0015), col, M["SG_Pulverlack_Weiss"], parent=parent)
    objs["inner"] = obj_from_bm("SG_Stange_Innen", cylinder_x_bm(ROD["r_in"], -0.16, ROD["half"] - CAP["len"], yr, z, n=64, bevel=0.0015), col, M["SG_Pulverlack_Weiss"], parent=parent)
    objs["collar"] = obj_from_bm("SG_Stange_Klemmring", cylinder_x_bm(r + 0.0035, 0.052, 0.078, yr, z, n=64, bevel=0.003), col, M["SG_Kunststoff_Endkappe"], parent=parent)
    for sx, nm in ((-1, "L"), (1, "R")):
        x_out = sx * ROD["half"]
        x_in = sx * (ROD["half"] - CAP["len"])
        x0, x1 = sorted((x_in, x_out - sx * 0.005))
        objs[f"cap{nm}"] = obj_from_bm(f"SG_Endkappe_{nm}", cylinder_x_bm(CAP["r"], x0, x1, yr, z, n=72, bevel=0.006), col, M["SG_Kunststoff_Endkappe"], parent=parent)
        p0, p1 = sorted((x_out - sx * 0.005, x_out))
        objs[f"pad{nm}"] = obj_from_bm(f"SG_Endkappe_{nm}_Gummi", cylinder_x_bm(CAP["r"] - 0.002, p0, p1, yr, z, n=72, bevel=0.0015), col, M["SG_Gummi_Grau"], parent=parent)
    # Haltebügel: breites Band von der Rückwand nach oben, über die Stange gelegt
    for sx, nm in ((-1, "L"), (1, "R")):
        objs[f"strap{nm}"] = build_strap(col, M, parent, sx * STRAP["x"], yr, z, f"SG_Halterung_{nm}")
    return objs


def build_strap(col, M, parent, xc, yr, zr, name):
    th, w, r = STRAP["th"], STRAP["w"], ROD["r"]
    R = r + th / 2  # Mittellinie des Bandes um die Stange
    ys = B + th / 2  # an der Rückwand
    path = []
    # unteres Ende: kleine Lasche, die unter den Rand greift (Konzept: eingehängt)
    z_bot = STRAP["z0"]
    nseg = 18
    for k in range(nseg + 1):
        path.append((ys, z_bot + (zr - z_bot) * k / nseg))
    for k in range(1, 40):
        a = math.pi + (math.pi + math.radians(40)) * k / 39 * -1  # von vorne (180°) über oben nach hinten unten
        a = math.pi - (math.pi + math.radians(35)) * k / 39
        path.append((yr + R * math.cos(a), zr + R * math.sin(a)))
    bm = bmesh.new()
    nw = 12
    rows = []
    for k, (py, pz) in enumerate(path):
        # Normale der Bahn in der y-z-Ebene
        k0, k1 = max(0, k - 1), min(len(path) - 1, k + 1)
        ty, tz = path[k1][0] - path[k0][0], path[k1][1] - path[k0][1]
        ln = math.hypot(ty, tz)
        ny, nz = tz / ln, -ty / ln
        row_f, row_b = [], []
        for i in range(nw + 1):
            x = xc + (i / nw - 0.5) * w
            # Kanten leicht gerundet: Ränder minimal dünner
            e = abs(i / nw - 0.5) * 2
            tt = th * (1 - 0.35 * e**6)
            row_f.append(bm.verts.new((x, py - ny * tt / 2, pz - nz * tt / 2)))
            row_b.append(bm.verts.new((x, py + ny * tt / 2, pz + nz * tt / 2)))
        rows.append((row_f, row_b))
    for j in range(len(rows) - 1):
        (f0, b0), (f1, b1) = rows[j], rows[j + 1]
        for i in range(nw):
            bm.faces.new((f0[i], f1[i], f1[i + 1], f0[i + 1]))
            bm.faces.new((b0[i], b0[i + 1], b1[i + 1], b1[i]))
        bm.faces.new((f0[0], b0[0], b1[0], f1[0]))
        bm.faces.new((f0[nw], f1[nw], b1[nw], b0[nw]))
    for (f, b_), flip in ((rows[0], False), (rows[-1], True)):
        for i in range(nw):
            q = (f[i], f[i + 1], b_[i + 1], b_[i])
            bm.faces.new(q[::-1] if flip else q)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = obj_from_bm(name, bm, col, M["SG_Pulverlack_Weiss"], parent=parent)
    bv = ob.modifiers.new("Kanten", "BEVEL")
    bv.width = 0.0012
    bv.segments = 3
    bv.limit_method = "ANGLE"
    bv.angle_limit = math.radians(50)
    sub = ob.modifiers.new("Glatt", "SUBSURF")
    sub.levels = 1
    sub.render_levels = 2
    smooth_by_angle(ob, 60)
    # Aufnahme an der Schale: flache Leiste an der Rückwand, in die das Band eingehängt ist
    bm = rounded_slab_bm(w / 2 + 0.006, 0.004, 0.003, 0, 0.026)
    for v in bm.verts:
        v.co = Vector((xc + v.co.x, B + 0.003 + v.co.y * 1.0, z_bot - 0.012 + v.co.z))
    clip = obj_from_bm(name + "_Aufnahme", bm, col, M["SG_Kunststoff_Weiss"], parent=bpy.data.objects.get("GRP_Schale"))
    bv = clip.modifiers.new("Kanten", "BEVEL")
    bv.width = 0.0015
    bv.segments = 3
    bv.limit_method = "ANGLE"
    return ob


# ── Gesamtaufbau ──────────────────────────────────────────────────────────
GROUPS = ["Halterungssystem", "Pflanzeinsatz", "Trennplatte", "Dochte", "Reservoir", "Schale"]
GROUP_KEY = dict(Halterungssystem="mount", Pflanzeinsatz="insert", Trennplatte="plate", Dochte="wick", Reservoir="reservoir", Schale="shell")


def clear_scene():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for c in list(bpy.data.collections):
        bpy.data.collections.remove(c)
    for blk in (bpy.data.meshes, bpy.data.materials, bpy.data.textures, bpy.data.particles, bpy.data.lights, bpy.data.cameras, bpy.data.worlds):
        for d in list(blk):
            if d.users == 0:
                blk.remove(d)


def build(plants=None):
    clear_scene()
    sc = bpy.context.scene
    sc.unit_settings.system = "METRIC"
    sc.unit_settings.length_unit = "CENTIMETERS"
    M = materials()
    top = coll("Stadtgarden")
    root = empty("Stadtgarden", top)
    G = {}
    for g in GROUPS:
        G[g] = empty(f"GRP_{g}", top, parent=root)
    cols = {g: coll(f"SG_{g}", top) for g in GROUPS}
    build_shell(cols["Schale"], M, G["Schale"])
    build_reservoir(cols["Reservoir"], M, G["Reservoir"])
    build_plate(cols["Trennplatte"], M, G["Trennplatte"])
    build_wicks(cols["Dochte"], M, G["Dochte"])
    build_insert(cols["Pflanzeinsatz"], M, G["Pflanzeinsatz"])
    soil = build_soil(cols["Pflanzeinsatz"], M, G["Pflanzeinsatz"])
    scatter_substrate(cols["Pflanzeinsatz"], M, G["Pflanzeinsatz"], soil)
    build_mount(cols["Halterungssystem"], M, G["Halterungssystem"])
    if plants:
        plants(cols["Pflanzeinsatz"], G["Pflanzeinsatz"])
    return dict(root=root, groups=G, materials=M)


def set_explode(f):
    """f = 0 montiert … 1 Explosion"""
    for g in GROUPS:
        e = bpy.data.objects.get(f"GRP_{g}")
        if e:
            e.location.z = EXPLODE[GROUP_KEY[g]] * f
