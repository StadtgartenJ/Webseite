"""
Stadtgarden v6 – Web-Export (GLB für React Three Fiber).

    python3 blender/v6/sg_export.py public/models/stadtgarden-v6-raw.glb      (pip-Paket bpy)
    npx @gltf-transform/cli optimize … (siehe scripts/build-model-v6.sh)

Vereinfachungen gegenüber dem Mastermodell (gleiche Geometrie und Proportionen):
- keine Perlit-/Rinden-Partikel, kein Relief-Displacement der Erde
- Blätter und Stängel der Ranken reduziert (Decimate)
- Materialien als glTF-PBR (Farbe, Rauheit, Normalen, Alpha); Mikrostrukturen aus Prozedur-Knoten entfallen
- Blatt-Atlanten: Farbkorrektur wie im Master fest eingerechnet, Deckkraft im Alpha-Kanal
Knotennamen: GRP_<Gruppe> (für die Explosion) und SG_<Bauteil>.
"""
import colorsys
import os
import sys

import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import sg_model  # noqa: E402
import sg_plants  # noqa: E402

TEX_OUT = os.path.join(HERE, "web_tex")


def _img_array(path):
    img = bpy.data.images.load(path, check_existing=True)
    img.colorspace_settings.name = "Non-Color"
    w, h = img.size
    a = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(a)
    return a.reshape(h, w, 4)[::-1]  # oben zuerst


def _save_png(arr, path, size=1024):
    from PIL import Image

    arr = np.clip(arr, 0, 1)
    mode = "RGBA" if arr.shape[2] == 4 else "RGB"
    im = Image.fromarray((arr * 255 + 0.5).astype(np.uint8), mode)
    if size:
        im = im.resize((size, size), Image.LANCZOS)
    im.save(path)
    return path


def _tint(rgb, hue=0.03, sat=1.25, val=0.6):
    """wie Blenders Hue/Saturation-Knoten (Hue 0,5 + hue)"""
    import matplotlib.colors as mc  # noqa

    hsv = mc.rgb_to_hsv(np.clip(rgb, 0, 1))
    hsv[..., 0] = (hsv[..., 0] + hue) % 1.0
    hsv[..., 1] = np.clip(hsv[..., 1] * sat, 0, 1)
    hsv[..., 2] = hsv[..., 2] * val
    return mc.hsv_to_rgb(hsv)


def prepare_textures(size=1024):
    os.makedirs(TEX_OUT, exist_ok=True)
    A = sg_plants.ASSETS
    pt = os.path.join(A, "periwinkle_plant_4k.blend", "textures")
    at = os.path.join(A, "anthurium_botany_01_4k.blend", "textures")
    from PIL import Image

    def rgb(path):
        return np.asarray(Image.open(path).convert("RGB")).astype(np.float32) / 255

    def grey(path):
        return np.asarray(Image.open(path).convert("L")).astype(np.float32) / 255

    out = {}
    d = rgb(os.path.join(pt, "periwinkle_plant_diff_4k.jpg"))
    d = _tint(d, hue=0.02, sat=1.12, val=0.82)
    a = grey(os.path.join(pt, "periwinkle_plant_opacity_4k.png"))
    out["leaf_col"] = _save_png(np.dstack([d, a]), os.path.join(TEX_OUT, "blatt_farbe.png"), size)
    out["leaf_nor"] = _save_png(_img_array(os.path.join(pt, "periwinkle_plant_nor_gl_4k.exr"))[..., :3], os.path.join(TEX_OUT, "blatt_normal.png"), size)
    r = _img_array(os.path.join(pt, "periwinkle_plant_rough_4k.exr"))[..., 0]
    out["leaf_rgh"] = _save_png(np.dstack([r, r, r]), os.path.join(TEX_OUT, "blatt_rauheit.png"), size)
    d = rgb(os.path.join(at, "anthurium_botany_01_diff_4k.jpg"))
    a = grey(os.path.join(at, "anthurium_botany_01_alpha_4k.png"))
    out["anth_col"] = _save_png(np.dstack([d, a]), os.path.join(TEX_OUT, "anthurium_farbe.png"), size)
    out["anth_nor"] = _save_png(_img_array(os.path.join(at, "anthurium_botany_01_nor_gl_4k.exr"))[..., :3], os.path.join(TEX_OUT, "anthurium_normal.png"), size)
    r = _img_array(os.path.join(at, "anthurium_botany_01_rough_4k.exr"))[..., 0]
    out["anth_rgh"] = _save_png(np.dstack([r, r, r]), os.path.join(TEX_OUT, "anthurium_rauheit.png"), size)
    return out


def web_material(name, col, nor, rgh, alpha=True):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexImage")
    tc.image = bpy.data.images.load(col)
    nt.links.new(tc.outputs["Color"], b.inputs["Base Color"])
    if alpha:
        nt.links.new(tc.outputs["Alpha"], b.inputs["Alpha"])
    tr = nt.nodes.new("ShaderNodeTexImage")
    tr.image = bpy.data.images.load(rgh)
    tr.image.colorspace_settings.name = "Non-Color"
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(tr.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], b.inputs["Roughness"])
    tn = nt.nodes.new("ShaderNodeTexImage")
    tn.image = bpy.data.images.load(nor)
    tn.image.colorspace_settings.name = "Non-Color"
    nm = nt.nodes.new("ShaderNodeNormalMap")
    nt.links.new(tn.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Specular IOR Level"].default_value = 0.5
    return m


def simplify_for_web(tex):
    # Partikel und Instanzen entfernen
    soil = bpy.data.objects.get("SG_Erde")
    if soil:
        for m in list(soil.modifiers):
            if m.type in ("PARTICLE_SYSTEM", "DISPLACE"):
                soil.modifiers.remove(m)
        for m in soil.modifiers:
            if m.type == "REMESH":
                m.voxel_size = 0.01
    for ob in list(bpy.data.objects):
        if ob.name.startswith(("_perlit", "_rinde")) or ob.type in ("LIGHT", "CAMERA") or ob.name.startswith(("Studio", "Kamera")):
            bpy.data.objects.remove(ob)
    for name, ratio in (("SG_Pflanze_Ranken_Blaetter", 0.45), ("SG_Pflanze_Ranken_Staengel", 0.4), ("SG_Pflanzeinsatz", 0.6), ("SG_Reservoir", 0.6), ("SG_Wasser", 0.5)):
        ob = bpy.data.objects.get(name)
        if ob:
            d = ob.modifiers.new("Web", "DECIMATE")
            d.ratio = ratio
    for ob in bpy.data.objects:
        if ob.type != "MESH":
            continue
        for m in ob.modifiers:
            if m.type == "SUBSURF":
                m.levels = 1 if ob.name.startswith("SG_Pflanze_Krone") else 0
            if m.type == "BEVEL":
                m.segments = 2
    leaf = web_material("SG_Blatt", tex["leaf_col"], tex["leaf_nor"], tex["leaf_rgh"])
    anth = web_material("SG_Anthurium", tex["anth_col"], tex["anth_nor"], tex["anth_rgh"])
    for ob in bpy.data.objects:
        if ob.type != "MESH":
            continue
        if ob.name.startswith("SG_Pflanze_Ranken"):
            ob.data.materials.clear()
            ob.data.materials.append(leaf)
        elif ob.name.startswith("SG_Pflanze_Krone"):
            ob.data.materials.clear()
            ob.data.materials.append(anth)


def bake_to_viewer_units(scale=3.0):
    """Modifikatoren anwenden und Weltmatrix × Maßstab in die Geometrie schreiben (Viewer: 1 Einheit = 1/3 m)."""
    from mathutils import Matrix

    S = Matrix.Scale(scale, 4)
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    for ob in [o for o in bpy.data.objects if o.type == "MESH"]:
        me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
        me.transform(S @ ob.matrix_world)
        for m in list(ob.modifiers):
            ob.modifiers.remove(m)
        ob.data = me
        ob.matrix_world = Matrix.Identity(4)
    for e in [o for o in bpy.data.objects if o.type == "EMPTY"]:
        e.location = (0, 0, 0)
        e.scale = (1, 1, 1)


def export(path):
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_extras=True,
    )
    return path


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
    out = args[0] if args else os.path.join(HERE, "stadtgarden-v6-raw.glb")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # Web-Detailstufe: weniger Ringpunkte und Höhenstufen, Löcher mit 10 Segmenten
    sg_model.RING_N.update(side=8, long=44, corner=12)
    sg_model.LOD.update(nb=22, nt=8, lip=6, hole_seg=10)
    sg_model.build(plants=sg_plants.build_plants)
    tex = prepare_textures()
    simplify_for_web(tex)
    bake_to_viewer_units(3.0)
    # Explosionswege als Extras an den Gruppen (Viewer-Einheiten)
    for g in sg_model.GROUPS:
        e = bpy.data.objects[f"GRP_{g}"]
        e["explode"] = sg_model.EXPLODE[sg_model.GROUP_KEY[g]] * 3.0
    print("GLB", export(out))
