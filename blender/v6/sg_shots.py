"""
Stadtgarden v6 – Bildserie für die Website, alles aus derselben Geometrie.

    import sg_shots; sg_shots.prepare("szene"); sg_shots.render("hero", out_dir, scale=1.0)

Ansichten (Name → Szene, Kamera, Auflösung):
  hero          Einbauszene, Kasten rechts im Bild, Platz für Text links (Desktop)
  hero_mobil    Einbauszene, Kasten mittig (Handy)
  montage       Makro: Stange hinter dem Kasten, Bügel, Endkappe an der Laibung
  anzeige       Makro: mittige, eingelassene Wasserstandsanzeige
  schnitt       Technischer Schnitt (Konzept) auf dem Sims
  stadt         breiter Fassadenausschnitt mit mehreren Fenstern
  studio        Studio (Salbei), Kasten steht auf dem Boden
  explosion     Studio, Explosionsansicht
"""
import os

import bmesh
import bpy
from mathutils import Vector

import sg_model
import sg_scene
import sg_studio

SHOTS = {
    "hero": dict(scene="szene", res=(2560, 1440), cam=((-0.28, -1.65, 0.35), (-0.40, 0.0, 0.37)), lens=34, fstop=5.6, focus=(0.0, -0.1, 0.18), samples=192),
    "hero_mobil": dict(scene="szene", res=(1600, 1200), cam=((-0.42, -1.4, 0.44), (0.0, 0.0, 0.2)), lens=40, fstop=5.6, focus=(0.0, -0.1, 0.18), samples=192),
    "montage": dict(scene="szene", res=(2000, 1400), cam=((0.44, -0.30, 0.56), (0.27, 0.13, 0.28)), lens=40, fstop=4, focus=(0.26, 0.13, 0.30), samples=192),
    "anzeige": dict(scene="szene", res=(1800, 1800), cam=((0.2, -0.62, 0.3), (0.0, -0.12, 0.19)), lens=70, fstop=3.2, focus=(0.0, -0.12, 0.15), samples=192),
    "schnitt": dict(scene="studio", res=(2400, 1500), cam=((-0.42, -1.85, 0.34), (0.0, 0.0, 0.17)), lens=50, fstop=11, focus=(0.0, -0.1, 0.15), samples=192, cut=True, hide=("SG_Pflanze_Ranken",)),
    "stadt": dict(scene="stadt", res=(2400, 1600), cam=((-1.7, -3.4, -0.2), (-0.15, 0.0, 0.8)), lens=32, fstop=4, focus=(0.0, -0.1, 0.2), samples=160),
    "seite": dict(scene="szene", res=(1800, 1900), cam=((1.15, -0.85, 0.32), (0.0, 0.0, 0.18)), lens=38, fstop=5.6, focus=(0.2, -0.12, 0.18), samples=192),
    "nah": dict(scene="szene", res=(2000, 1500), cam=((0.75, -1.1, 0.55), (0.05, 0.0, 0.22)), lens=45, fstop=4, focus=(0.1, -0.1, 0.2), samples=192),
    "studio": dict(scene="studio", res=(1800, 1800), cam=((-0.74, -1.74, 0.46), (0.0, 0.02, 0.17)), lens=55, fstop=8, focus=(0.0, -0.1, 0.15), samples=192, bg="#E3E9D7", exposure=-0.35),
    "explosion": dict(scene="studio", res=(2400, 1500), cam=((-1.35, -2.95, 1.05), (0.0, 0.0, 0.25)), lens=50, fstop=11, focus=None, samples=192, frame=168),
}


def _cutter():
    """Zwei Fenster links und rechts der Anzeige (die Mitte mit der Anzeige bleibt stehen)."""
    name = "_Schnitt_Werkzeug"
    ob = bpy.data.objects.get(name)
    if ob:
        return ob
    bm = bmesh.new()
    for x0, x1 in ((-0.36, -0.035), (0.035, 0.36)):
        b = bmesh.ops.create_cube(bm, size=1.0)
        vs = b["verts"]
        for v in vs:
            v.co = Vector(((x0 + x1) / 2 + v.co.x * (x1 - x0), -0.108 + v.co.y * 0.224, 0.135 + v.co.z * 0.23))  # bis knapp hinter die Dochte (y=0)
    ob = sg_model.obj_from_bm(name, bm, sg_model.coll("Stadtgarden"))
    ob.hide_render = True
    ob.display_type = "WIRE"
    return ob


CUT_OBJECTS = ["SG_Schale", "SG_Anzeige_Rueckwand", "SG_Reservoir", "SG_Wasser", "SG_Pflanzeinsatz", "SG_Erde"]


def set_cut(on):
    c = _cutter() if on else bpy.data.objects.get("_Schnitt_Werkzeug")
    for n in CUT_OBJECTS:
        ob = bpy.data.objects.get(n)
        if not ob:
            continue
        m = ob.modifiers.get("Schnitt")
        if on and not m:
            m = ob.modifiers.new("Schnitt", "BOOLEAN")
            m.object = c
            m.solver = "EXACT"
            # vor Glättung/Kanten einsortieren
            while ob.modifiers.find("Schnitt") > 0 and ob.modifiers[ob.modifiers.find("Schnitt") - 1].type in ("BEVEL",):
                bpy.ops.object.modifier_move_up({"object": ob}, modifier="Schnitt") if False else None
                break
        if m:
            if on:
                m.object = c  # Werkzeug kann neu erzeugt worden sein
            m.show_render = on
            m.show_viewport = on


def show(group_prefixes, on):
    for ob in bpy.data.objects:
        if ob.name.startswith(group_prefixes):
            ob.hide_render = not on


def prepare(kind):
    """kind: 'szene' (ein Fenster), 'stadt' (drei Fenster), 'studio'"""
    for ob in list(bpy.data.objects):
        if ob.name.startswith(("Fassade", "Fasche", "Gesims", "Fenster", "Gobo_", "Sonne", "Vordergrund_")):
            bpy.data.objects.remove(ob)
    if kind == "studio":
        show(("Studio_", "Licht_"), True)
        sg_studio.world()
        if os.path.exists(getattr(__import__("sg_run"), "HDRI", "")):
            sg_studio.hdri(__import__("sg_run").HDRI, strength=0.08)
        # Kasten steht auf dem Studioboden
        bd = bpy.data.objects.get("Studio_Hohlkehle")
        if bd:
            bd.location.z = 0.4
        return
    show(("Studio_", "Licht_"), False)
    for ob in list(bpy.data.objects):
        if ob.name.startswith("Vordergrund_"):
            bpy.data.objects.remove(ob)
    if kind == "szene":
        sg_scene.build(windows=(0.0,), width=4.0)
    else:
        sg_scene.build(windows=(-1.7, 0.0, 1.7), width=12.0, height=(-3.0, 5.0))
        v = SHOTS["stadt"]["cam"]
        sg_scene.foreground_leaves(sg_model.coll("Szene"), v[0], v[1])


def render(name, out_dir, scale=1.0, samples=None, device="GPU"):
    v = SHOTS[name]
    sc = bpy.context.scene
    if device == "GPU":
        device = "GPU" if sg_studio.use_gpu() != "CPU" else "CPU"
    res = (int(v["res"][0] * scale), int(v["res"][1] * scale))
    sg_studio.cycles(samples=samples or v["samples"], res=res, device=device)
    if v["scene"] != "studio":
        sc.view_settings.exposure = 0.15
    if "exposure" in v:
        sc.view_settings.exposure = v["exposure"]
    bgm = bpy.data.materials.get("Studio_Hintergrund")
    bg_saved = None
    if bgm and v.get("bg"):
        bsdf = bgm.node_tree.nodes["Principled BSDF"]
        bg_saved = tuple(bsdf.inputs["Base Color"].default_value)
        bsdf.inputs["Base Color"].default_value = sg_model.srgb(v["bg"])
    sc.frame_set(v.get("frame", 0))
    bd = bpy.data.objects.get("Studio_Hohlkehle")
    if bd and v["scene"] == "studio":
        bd.location.z = 0.0 if name == "explosion" else 0.4
    set_cut(bool(v.get("cut")))
    # Schnitt: zusätzliches weiches Licht in die Öffnungen, Wasser/Reservoir leicht matt (sonst wirkt das Innere dunkel)
    cut_light = None
    saved = {}
    if v.get("cut"):
        cut_light = sg_studio.area("Schnitt_Licht", (0.0, -0.75, 0.12), (0.0, 0.05, 0.08), 0.7, 28, (1.0, 0.98, 0.95), size_y=0.2)
        # Schnitt: Wasser hell-aqua und leicht trüb, Reservoir mattiert (keine dunklen Spiegelungen)
        for on, mn, col, tr, rough in (("SG_Wasser", "_Schnitt_Wasser", "#CFE6E1", 0.35, 0.3),
                                       ("SG_Reservoir", "_Schnitt_Reservoir", "#F3F3EF", 0.55, 0.38)):
            ob = bpy.data.objects.get(on)
            if not ob or not ob.material_slots:
                continue
            m = bpy.data.materials.get(mn) or bpy.data.materials.new(mn)
            m.use_nodes = True
            b = m.node_tree.nodes["Principled BSDF"]
            b.inputs["Base Color"].default_value = sg_model.srgb(col)
            b.inputs["Transmission Weight"].default_value = tr
            b.inputs["Roughness"].default_value = rough
            b.inputs["IOR"].default_value = 1.33
            saved[on] = [sl.material for sl in ob.material_slots]
            for sl in ob.material_slots:
                sl.material = m
    hidden = [ob for ob in bpy.data.objects if v.get("hide") and ob.name.startswith(v["hide"])]
    for ob in hidden:
        ob.hide_render = True
    pos, tgt = v["cam"]
    cam = sg_studio.camera(f"Kamera_{name}", pos, tgt, lens=v["lens"], fstop=v["fstop"])
    if v.get("focus"):
        cam.data.dof.focus_distance = (Vector(pos) - Vector(v["focus"])).length
    sc.camera = cam
    os.makedirs(out_dir, exist_ok=True)
    sc.render.filepath = os.path.join(out_dir, f"{name}.png")
    bpy.ops.render.render(write_still=True)
    set_cut(False)
    if cut_light:
        bpy.data.objects.remove(cut_light)
    if bg_saved:
        bgm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = bg_saved
    for on, mats in saved.items():
        for sl, m in zip(bpy.data.objects[on].material_slots, mats):
            sl.material = m
    for ob in hidden:
        ob.hide_render = False
    return sc.render.filepath
