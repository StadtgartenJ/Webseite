"""
Stadtgarden v6 – Studio: Hohlkehle, Softboxen, Kameras, Cycles-Einstellungen.
"""
import math

import bmesh
import bpy
from mathutils import Vector

from sg_model import coll, obj_from_bm, srgb, H

BACKDROPS = dict(sage="#C6D3B6", forest="#1F4A3E", cream="#F6F0E2")


def backdrop(color="sage"):
    col = coll("Studio")
    name = "Studio_Hohlkehle"
    if bpy.data.objects.get(name):
        bpy.data.objects.remove(bpy.data.objects[name])
    bm = bmesh.new()
    # Profil in y-z: Boden bis y=0.8, Kehle Radius 0.9, Wand hoch
    prof = []
    for k in range(30):
        prof.append((-4.0 + 4.8 * k / 29, -0.0))
    R = 0.9
    for k in range(1, 25):
        a = -math.pi / 2 + math.pi / 2 * k / 24
        prof.append((0.8 + R * math.cos(a) * 1.0, R + R * math.sin(a)))
    for k in range(1, 10):
        prof.append((0.8 + R, R + 3.0 * k / 9))
    xs = [-4 + 8 * i / 40 for i in range(41)]
    rows = [[bm.verts.new((x, y, z - 0.4)) for x in xs] for y, z in prof]
    for j in range(len(rows) - 1):
        for i in range(len(xs) - 1):
            bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
    bm.normal_update()
    m = bpy.data.materials.get("Studio_Hintergrund") or bpy.data.materials.new("Studio_Hintergrund")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = srgb(BACKDROPS[color])
    b.inputs["Roughness"].default_value = 0.9
    b.inputs["Specular IOR Level"].default_value = 0.2
    ob = obj_from_bm(name, bm, col, m)
    return ob


def area(name, loc, target, size, power, color=(1, 1, 1), size_y=None, spread=180):
    col = coll("Studio")
    lt = bpy.data.lights.get(name) or bpy.data.lights.new(name, "AREA")
    lt.shape = "RECTANGLE"
    lt.size = size
    lt.size_y = size_y or size
    lt.energy = power
    lt.color = color
    lt.spread = math.radians(spread)
    ob = bpy.data.objects.get(name) or bpy.data.objects.new(name, lt)
    if ob.name not in col.objects:
        col.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return ob


def lights(scale=1.0):
    tgt = (0, 0, 0.15)
    area("Licht_Key", (-1.25, -1.35, 1.35), tgt, 1.4, 70 * scale, (1.0, 0.96, 0.9), size_y=1.0, spread=70)
    area("Licht_Fill", (1.6, -1.0, 0.55), tgt, 1.6, 3 * scale, (0.92, 0.96, 1.0), size_y=1.2)
    area("Licht_Top", (0.1, 0.1, 1.6), tgt, 1.8, 6 * scale, (1, 1, 1), size_y=0.5, spread=60)
    area("Licht_Rim", (0.9, 1.4, 0.8), (0, 0, 0.25), 0.8, 35 * scale, (1.0, 0.97, 0.92), size_y=0.3, spread=50)
    area("Licht_Strip", (-0.6, -1.2, 0.2), tgt, 1.2, 8 * scale, (1, 1, 1), size_y=0.15)


def world(strength=0.25, color="#E9EEE3"):
    w = bpy.data.worlds.get("Studio") or bpy.data.worlds.new("Studio")
    bpy.context.scene.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = srgb(color)
    bg.inputs["Strength"].default_value = strength
    return w


def hdri(path, strength=0.6, rot=0.0):
    w = world()
    nt = w.node_tree
    env = nt.nodes.get("HDRI") or nt.nodes.new("ShaderNodeTexEnvironment")
    env.name = "HDRI"
    env.image = bpy.data.images.load(path, check_existing=True)
    mp = nt.nodes.new("ShaderNodeMapping")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp.inputs["Rotation"].default_value[2] = rot
    nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], env.inputs["Vector"])
    bg = nt.nodes["Background"]
    nt.links.new(env.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = strength


def camera(name, loc, target, lens=70, fstop=0.0, focus=None):
    col = coll("Studio")
    cd = bpy.data.cameras.get(name) or bpy.data.cameras.new(name)
    cd.lens = lens
    cd.sensor_width = 36
    cd.clip_start = 0.05
    cd.dof.use_dof = fstop > 0
    if fstop:
        cd.dof.aperture_fstop = fstop
        cd.dof.focus_distance = focus or (Vector(loc) - Vector(target)).length
    ob = bpy.data.objects.get(name) or bpy.data.objects.new(name, cd)
    if ob.name not in col.objects:
        col.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return ob


def cameras():
    c1 = camera("Kamera_Produkt", (-1.15, -2.45, 0.72), (0.0, 0.03, 0.17), lens=70, fstop=8)
    c2 = camera("Kamera_Explosion", (-1.35, -2.95, 1.05), (0.0, 0.0, 0.25), lens=50, fstop=11)
    return c1, c2


def cycles(samples=256, res=(1920, 1080), device="GPU", denoise=True, pct=100):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = device
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.015
    sc.cycles.use_denoising = denoise
    sc.cycles.max_bounces = 16
    sc.cycles.transmission_bounces = 16
    sc.cycles.transparent_max_bounces = 16
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.cycles.blur_glossy = 0.5
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = pct
    sc.render.film_transparent = False
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
    sc.view_settings.exposure = -0.8
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_depth = "8"


def use_gpu():
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for t in ("CUDA", "OPTIX"):
        try:
            prefs.compute_device_type = t
            prefs.get_devices()
            gpus = [d for d in prefs.devices if d.type == t]
            if gpus:
                for d in prefs.devices:
                    d.use = d.type == t
                return t
        except Exception:
            pass
    return "CPU"


def setup(bg="sage"):
    backdrop(bg)
    lights()
    world()
    cameras()
