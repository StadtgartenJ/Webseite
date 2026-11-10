"""
Stadtgarden v7 – eigenständige Masterdatei `blender/v7/stadtgarden_v7.blend`.

Die Datei braucht zum Öffnen und Rendern keine Skripte und keine externen Assets:
alle Texturen und das HDRI sind eingebettet (auf höchstens 2048 px verkleinert).

Szenen (oben im Szenen-Menü umschalten, dann F12):
    Studio     Produkt auf hellem Salbeigrund          Kamera_studio
    Schnitt    Konzeptschnitt mit Wasser und Dochten   Kamera_schnitt
    Explosion  Explosionsansicht, Bild 168 (Animation 0–240)  Kamera_explosion
    Fenster    Kasten auf dem Außensims, Fassade, Sonne  Kamera_hero (weitere: hero_mobil, seite, montage, anzeige, nah)
    Fassade    drei Fenster, Straßenansicht             Kamera_stadt

Alle Szenen teilen sich dasselbe Produkt (Collection „Stadtgarden“). Schnitt, Explosion und
Hintergrundfarbe werden über Szenen-Eigenschaften gesteuert (Treiber mit „Context Property“):
    sg_schnitt   1 = Boolean „Schnitt“ an Schale, Reservoir, Wasser, Einsatz, Erde; Ranken aus; Wasser hell
    sg_explosion 1 = Studioboden abgesenkt (Explosion braucht Platz nach unten)
                 (Szene Explosion steht auf Bild 168; falls der Kasten noch geschlossen ist,
                  einmal im Zeitstrahl auf Bild 168 klicken – die Teile teilen sich die Animation)
    sg_hell      1 = heller Studiohintergrund (#E3E9D7) statt Salbei

Neu bauen (in Blender, Skript-Editor):
    import sys; sys.path.insert(0, r"<Repo>/blender/v6")
    import sg_master7; sg_master7.build()
"""
import importlib
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import sg_model  # noqa: E402
import sg_plants  # noqa: E402
import sg_studio  # noqa: E402
import sg_scene  # noqa: E402
import sg_shots  # noqa: E402
import sg_run  # noqa: E402

for _m in (sg_model, sg_plants, sg_studio, sg_scene, sg_shots, sg_run):
    importlib.reload(_m)

OUT = os.path.normpath(os.path.join(HERE, "..", "v7", "stadtgarden_v7.blend"))
PROPS = ("sg_schnitt", "sg_explosion", "sg_hell")
MAX_TEX = 2048

LIESMICH = __doc__


# ── Hilfen ────────────────────────────────────────────────────────────────
def _drive(id_block, path, prop, expr="v", index=-1):
    """Treiber auf id_block.path, gesteuert von einer Eigenschaft der gerade gerenderten Szene."""
    try:
        id_block.driver_remove(path, index)
    except Exception:
        pass
    fc = id_block.driver_add(path, index) if index >= 0 else id_block.driver_add(path)
    d = fc.driver
    d.type = "SCRIPTED"
    d.expression = expr
    for v in list(d.variables):
        d.variables.remove(v)
    v = d.variables.new()
    v.name = "v"
    v.type = "CONTEXT_PROP"
    t = v.targets[0]
    t.context_property = "ACTIVE_SCENE"
    t.data_path = f'["{prop}"]'
    return fc


def _move(ob, col):
    for c in list(ob.users_collection):
        c.objects.unlink(ob)
    col.objects.link(ob)


def _coll(name):
    return bpy.data.collections.get(name) or bpy.data.collections.new(name)


def _render_settings(sc, res, samples, exposure):
    sc.render.engine = "CYCLES"
    sc.cycles.device = "GPU"
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.015
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 16
    sc.cycles.transmission_bounces = 16
    sc.cycles.transparent_max_bounces = 16
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.cycles.blur_glossy = 0.5
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = False
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
    sc.view_settings.exposure = exposure
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_depth = "8"
    sc.unit_settings.system = "METRIC"
    sc.unit_settings.length_unit = "CENTIMETERS"


def _shot_settings(sc, shot):
    v = sg_shots.SHOTS[shot]
    exp = v.get("exposure", 0.15 if v["scene"] != "studio" else -0.8)
    _render_settings(sc, v["res"], v["samples"], exp)
    sc.camera = bpy.data.objects[f"Kamera_{shot}"]
    sc.frame_current = v.get("frame", 0)


def _prefix(col, p):
    for ob in col.objects:
        if not ob.name.startswith(p):
            ob.name = p + ob.name


# ── Treiber: Schnitt, Explosion, Hintergrund ──────────────────────────────
def _cut_material(mat, color, transmission, rough, density_path=None):
    """Mischt in mat eine helle, leicht trübe Variante ein (nur in der Szene Schnitt)."""
    nt = mat.node_tree
    out = next(n for n in nt.nodes if n.bl_idname == "ShaderNodeOutputMaterial")
    if "Schnitt_BSDF" not in nt.nodes:
        src = out.inputs["Surface"].links[0].from_socket
        alt = nt.nodes.new("ShaderNodeBsdfPrincipled")
        alt.name = "Schnitt_BSDF"
        alt.location = (out.location.x - 300, out.location.y - 350)
        mix = nt.nodes.new("ShaderNodeMixShader")
        mix.name = "Schnitt_Mix"
        mix.location = (out.location.x - 150, out.location.y)
        nt.links.new(src, mix.inputs[1])
        nt.links.new(alt.outputs["BSDF"], mix.inputs[2])
        nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    alt = nt.nodes["Schnitt_BSDF"]
    alt.inputs["Base Color"].default_value = sg_model.srgb(color)
    alt.inputs["Transmission Weight"].default_value = transmission
    alt.inputs["Roughness"].default_value = rough
    alt.inputs["IOR"].default_value = 1.33
    _drive(nt, 'nodes["Schnitt_Mix"].inputs[0].default_value', "sg_schnitt")
    if density_path:
        _drive(nt, density_path, "sg_schnitt", "1.2 - 1.2 * v")


def setup_drivers():
    for sc in bpy.data.scenes:
        for p in PROPS:
            if p not in sc:
                sc[p] = 0
    # Schnitt
    sg_shots.set_cut(True)
    for n in sg_shots.CUT_OBJECTS:
        ob = bpy.data.objects.get(n)
        if ob and ob.modifiers.get("Schnitt"):
            _drive(ob, 'modifiers["Schnitt"].show_render', "sg_schnitt")
            _drive(ob, 'modifiers["Schnitt"].show_viewport', "sg_schnitt")
    for ob in bpy.data.objects:
        if ob.name.startswith("SG_Pflanze_Ranken"):
            _drive(ob, "hide_render", "sg_schnitt")
            _drive(ob, "hide_viewport", "sg_schnitt")
    water = bpy.data.materials["SG_Wasser"]
    vol = next((n for n in water.node_tree.nodes if n.bl_idname == "ShaderNodeVolumeAbsorption"), None)
    _cut_material(water, "#CFE6E1", 0.35, 0.3, f'nodes["{vol.name}"].inputs["Density"].default_value' if vol else None)
    res_ob = bpy.data.objects.get("SG_Reservoir")
    if res_ob and res_ob.active_material:
        _cut_material(res_ob.active_material, "#F3F3EF", 0.55, 0.38)
    # Studioboden: abgesenkt für die Explosion, hell im Studiobild
    bd = bpy.data.objects.get("Studio_Hohlkehle")
    if bd:
        _drive(bd, "location", "sg_explosion", "0.4 - 0.4 * v", index=2)
        b = bd.active_material.node_tree.nodes["Principled BSDF"]
        a, c = sg_model.srgb(sg_studio.BACKDROPS["sage"]), sg_model.srgb("#E3E9D7")
        nt = bd.active_material.node_tree
        for i in range(3):
            _drive(nt, 'nodes["Principled BSDF"].inputs["Base Color"].default_value', "sg_hell", f"{a[i]:.5f} + {c[i] - a[i]:.5f} * v", index=i)
        b.inputs["Base Color"].default_value = a


# ── Texturen einbetten ────────────────────────────────────────────────────
def _to_8bit(img, max_px):
    """Float-Bild (16-bit-PNG, EXR) als 8-bit-PNG neu anlegen und einbetten (spart ein Vielfaches an Platz)."""
    import numpy as np

    w, h = img.size
    if max(w, h) > max_px:
        s = max_px / max(w, h)
        w, h = max(1, round(w * s)), max(1, round(h * s))
        img.scale(w, h)
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    cs = img.colorspace_settings.name
    if cs == "sRGB":  # Float-Puffer sind linear, 8-bit-sRGB erwartet kodierte Werte
        rgb = px.reshape(-1, 4)[:, :3]
        c = np.clip(rgb, 0.0, None)
        rgb[:] = np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)
    name = img.name
    new = bpy.data.images.new(name + "_8bit", w, h, alpha=True, float_buffer=False)
    new.colorspace_settings.name = cs
    new.alpha_mode = img.alpha_mode
    new.pixels.foreach_set(np.clip(px, 0.0, 1.0))
    new.file_format = "PNG"
    new.pack()
    img.user_remap(new)
    bpy.data.images.remove(img)
    new.name = name
    return new


SMALL = ("_disp", "_alpha", "_opacity", "_rough")  # Hilfskarten: 1024 px reichen


def pack_images(max_px=MAX_TEX, hdri_px=1024):
    env = {n.image.name for w in bpy.data.worlds if w.node_tree for n in w.node_tree.nodes if n.bl_idname == "ShaderNodeTexEnvironment" and n.image}
    for img in list(bpy.data.images):
        if img.source != "FILE" or img.packed_file or not img.filepath or img.users == 0:
            continue
        try:
            img.reload()
            is_env = img.name in env
            lim = 1024 if any(k in img.name for k in SMALL) else max_px
            if is_env:
                w, h = img.size
                if w > hdri_px:
                    img.scale(hdri_px, max(1, round(h * hdri_px / w)))
                img.pack()
            elif img.is_float:
                _to_8bit(img, lim)
            else:
                w, h = img.size
                if max(w, h) > lim:
                    s = lim / max(w, h)
                    img.scale(max(1, round(w * s)), max(1, round(h * s)))
                    img.file_format = "PNG"
                img.pack()
        except Exception as e:
            print("Packen fehlgeschlagen:", img.name, e)


# ── Aufbau ────────────────────────────────────────────────────────────────
def build(path=OUT, rebuild=True, save=True, pack=True, log=print):
    main = bpy.context.scene
    for s in list(bpy.data.scenes):
        if s != main:
            bpy.data.scenes.remove(s)
    main.name = "Studio"
    if rebuild:
        sg_model.clear_scene()
        for img in list(bpy.data.images):  # auch eingebettete Bilder eines früheren Laufs neu laden
            if img.source == "FILE":
                bpy.data.images.remove(img)
        sg_run.build_master(save=False)
        log("Produkt und Studio gebaut")
    # Kameras für alle Bilder
    for name, v in sg_shots.SHOTS.items():
        pos, tgt = v["cam"]
        cam = sg_studio.camera(f"Kamera_{name}", pos, tgt, lens=v["lens"], fstop=v["fstop"])
        if v.get("focus"):
            cam.data.dof.focus_distance = (Vector(pos) - Vector(v["focus"])).length
    # Schnittwerkzeug und Zusatzlicht nur für die Szene Schnitt
    extra = _coll("Schnitt_Extras")
    cutter = sg_shots._cutter()
    _move(cutter, extra)
    light = bpy.data.objects.get("Schnitt_Licht") or sg_studio.area("Schnitt_Licht", (0.0, -0.75, 0.12), (0.0, 0.05, 0.08), 0.7, 28, (1.0, 0.98, 0.95), size_y=0.2)
    _move(light, extra)
    # Fensterszene
    for c in ("Szene", "Szene_Fenster", "Szene_Fassade"):
        old = bpy.data.collections.get(c)
        if old:
            for ob in list(old.objects):
                bpy.data.objects.remove(ob)
            bpy.data.collections.remove(old)
    sun = bpy.data.objects.get("Sonne")
    if sun:
        bpy.data.objects.remove(sun)
    sg_scene.build(windows=(0.0,), width=4.0)
    fe = bpy.data.collections["Szene"]
    fe.name = "Szene_Fenster"
    _prefix(fe, "Fe_")
    main.collection.children.unlink(fe)
    # Fassade mit drei Fenstern
    sg_scene.build(windows=(-1.7, 0.0, 1.7), width=12.0, height=(-3.0, 5.0))
    v = sg_shots.SHOTS["stadt"]["cam"]
    sg_scene.foreground_leaves(sg_model.coll("Szene"), v[0], v[1])
    fa = bpy.data.collections["Szene"]
    fa.name = "Szene_Fassade"
    _prefix(fa, "Fa_")
    main.collection.children.unlink(fa)
    log("Fassaden gebaut")
    # build() blendet Studio-Objekte aus – wieder einblenden (sie liegen nur in den Studio-Szenen)
    for ob in bpy.data.objects:
        if ob.name.startswith(("Studio_", "Licht_")):
            ob.hide_render = False
            ob.hide_viewport = False
    for n in ("hero", "hero_mobil", "seite", "montage", "anzeige", "nah"):
        _move(bpy.data.objects[f"Kamera_{n}"], fe)
    _move(bpy.data.objects["Kamera_stadt"], fa)
    w_studio, w_sky = bpy.data.worlds["Studio"], bpy.data.worlds["Himmel"]
    main.world = w_studio

    prod, studio = bpy.data.collections["Stadtgarden"], bpy.data.collections["Studio"]

    def scene(name, cols, world, shot, props):
        sc = bpy.data.scenes.get(name) or bpy.data.scenes.new(name)
        for c in cols:
            if c.name not in sc.collection.children:
                sc.collection.children.link(c)
        sc.world = world
        sc.frame_start, sc.frame_end = main.frame_start, main.frame_end
        sc.render.fps = main.render.fps
        for p in PROPS:
            sc[p] = props.get(p, 0)
        _shot_settings(sc, shot)
        return sc

    scene("Studio", [], w_studio, "studio", {"sg_hell": 1})
    scene("Schnitt", [prod, studio, extra], w_studio, "schnitt", {"sg_schnitt": 1})
    scene("Explosion", [prod, studio], w_studio, "explosion", {"sg_explosion": 1})
    scene("Fenster", [prod, fe], w_sky, "hero", {})
    scene("Fassade", [prod, fa], w_sky, "stadt", {})
    setup_drivers()
    # Anleitung in der Datei
    t = bpy.data.texts.get("LIESMICH") or bpy.data.texts.new("LIESMICH")
    t.clear()
    t.write(LIESMICH)
    log("Szenen und Treiber eingerichtet")
    if pack:
        pack_images()
        log("Texturen eingebettet")
    # Pflanzen wurden aus den Poly-Haven-Dateien angehängt (nicht verknüpft); leere Bibliotheksverweise entfernen
    for lib in list(bpy.data.libraries):
        if not any(getattr(idb, "library", None) == lib for coll_ in (bpy.data.objects, bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.node_groups) for idb in coll_):
            bpy.data.libraries.remove(lib)
    if save:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=path, relative_remap=True, compress=True)
        log("gespeichert: " + path)
    return path


# ── Alle Bilder rendern (aus den Szenen dieser Datei) ─────────────────────
SCENE_OF = dict(studio="Studio", schnitt="Schnitt", explosion="Explosion", stadt="Fassade")


def render_shot(name, out_dir, scale=1.0, samples=None):
    """Ein Bild aus sg_shots.SHOTS über die passende Szene rendern (Fenster-Szene für alle übrigen)."""
    sc = bpy.data.scenes[SCENE_OF.get(name, "Fenster")]
    win = bpy.context.window_manager.windows[0]
    prev = win.scene
    win.scene = sc  # aktive Szene: Animation (Explosion) und Treiber werden für diese Szene ausgewertet
    _shot_settings(sc, name)
    if scale != 1.0:
        sc.render.resolution_percentage = int(100 * scale)
    if samples:
        sc.cycles.samples = samples
    sc.frame_set(sc.frame_current)  # Animation (Explosion) in die geteilten Objekte schreiben
    dev = sg_studio.use_gpu()
    sc.cycles.device = "GPU" if dev != "CPU" else "CPU"
    sc.render.filepath = os.path.join(out_dir, f"{name}.png")
    bpy.ops.render.render(write_still=True)
    sc.render.resolution_percentage = 100
    _shot_settings(sc, {"Studio": "studio", "Schnitt": "schnitt", "Explosion": "explosion", "Fenster": "hero", "Fassade": "stadt"}[sc.name])
    win.scene = prev
    prev.frame_set(prev.frame_current)
    return sc.render.filepath
