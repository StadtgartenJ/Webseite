"""
Stadtgarden v6 – Teardown-Animation (24 fps, 240 Bilder = 10 s).

Ablauf:
   0– 24  montiertes Produkt, Kamera fährt langsam an
  24– 66  Pflanzeinsatz hebt sich
  54– 90  Trennplatte wird sichtbar (hebt sich)
  80–108  Kapillardochte werden freigelegt
  96–136  Wasserreservoir und Schale fahren auseinander
 120–150  Halterungssystem hebt ab → technischer Aufbau sichtbar
 150–186  Halten, Kamera kreist weiter
 186–240  alles setzt sich in umgekehrter Reihenfolge wieder zusammen

Alle Bewegungen: reine Verschiebung entlang der Montageachse (z), Bezier mit weichem Ein- und Auslauf,
kein Überschwingen. Die Kamera hängt an einem Drehgestell und zoomt beim Auseinanderziehen zurück.
"""
import math

import bpy
from mathutils import Vector

import sg_model as sg
from sg_studio import coll

FPS = 24
END = 240

# Gruppe: (Start auseinander, Ende auseinander, Start zusammen, Ende zusammen)
TIMING = dict(
    Pflanzeinsatz=(24, 66, 204, 236),
    Trennplatte=(54, 90, 198, 228),
    Dochte=(80, 108, 194, 222),
    Reservoir=(96, 132, 190, 218),
    Schale=(100, 136, 190, 220),
    Halterungssystem=(120, 150, 186, 214),
)


def _key(ob, path, frame, value, index=-1):
    if index >= 0:
        getattr(ob, path)[index] = value
        ob.keyframe_insert(path, index=index, frame=frame)
    else:
        setattr(ob, path, value)
        ob.keyframe_insert(path, frame=frame)


def _ease(ob):
    ad = ob.animation_data
    if not ad or not ad.action:
        return
    try:
        curves = ad.action.fcurves
    except AttributeError:  # Blender 5: geschichtete Aktionen
        curves = [fc for layer in ad.action.layers for strip in layer.strips for bag in strip.channelbags for fc in bag.fcurves]
    for fc in curves:
        for kp in fc.keyframe_points:
            kp.interpolation = "BEZIER"
            kp.handle_left_type = "AUTO_CLAMPED"
            kp.handle_right_type = "AUTO_CLAMPED"
            kp.easing = "AUTO"


def setup_parts():
    for g, (a0, a1, b0, b1) in TIMING.items():
        e = bpy.data.objects[f"GRP_{g}"]
        e.animation_data_clear()
        dz = sg.EXPLODE[sg.GROUP_KEY[g]]
        for f, v in ((0, 0.0), (a0, 0.0), (a1, dz), (b0, dz), (b1, 0.0), (END, 0.0)):
            _key(e, "location", f, v, index=2)
        _ease(e)


def setup_camera():
    col = coll("Studio")
    rig = bpy.data.objects.get("Kamera_Rig") or bpy.data.objects.new("Kamera_Rig", None)
    if rig.name not in col.objects:
        col.objects.link(rig)
    tgt = bpy.data.objects.get("Kamera_Ziel") or bpy.data.objects.new("Kamera_Ziel", None)
    if tgt.name not in col.objects:
        col.objects.link(tgt)
    cd = bpy.data.cameras.get("Kamera_Film") or bpy.data.cameras.new("Kamera_Film")
    cd.lens = 50
    cd.sensor_fit = "HORIZONTAL"  # Film quadratisch (1:1) gerendert
    cd.sensor_width = 36
    cd.dof.use_dof = True
    cd.dof.aperture_fstop = 11
    cam = bpy.data.objects.get("Kamera_Film") or bpy.data.objects.new("Kamera_Film", cd)
    if cam.name not in col.objects:
        col.objects.link(cam)
    cam.parent = rig
    cd.dof.focus_object = tgt
    for c in list(cam.constraints):
        cam.constraints.remove(c)
    tr = cam.constraints.new("TRACK_TO")
    tr.target = tgt
    tr.track_axis = "TRACK_NEGATIVE_Z"
    tr.up_axis = "UP_Y"
    for ob in (rig, tgt, cam):
        ob.animation_data_clear()
    # Drehung um die Hochachse (Grad, Blick von vorne links nach vorne)
    for f, deg in ((0, -32), (120, -20), (186, -12), (END, -26)):
        _key(rig, "rotation_euler", f, math.radians(deg), index=2)
    # Abstand und Höhe der Kamera (lokal im Rig: −y = vor dem Produkt)
    for f, (d, h) in ((0, (2.0, 0.5)), (24, (2.0, 0.5)), (150, (2.5, 0.8)), (186, (2.5, 0.8)), (236, (2.05, 0.52)), (END, (2.05, 0.52))):
        _key(cam, "location", f, -d, index=1)
        _key(cam, "location", f, h, index=2)
    for f, z in ((0, 0.11), (24, 0.11), (150, 0.27), (186, 0.27), (236, 0.11), (END, 0.11)):
        _key(tgt, "location", f, z, index=2)
    for ob in (rig, tgt, cam):
        _ease(ob)
    return cam


def setup(scene=None):
    sc = scene or bpy.context.scene
    sc.render.fps = FPS
    sc.frame_start = 0
    sc.frame_end = END
    setup_parts()
    cam = setup_camera()
    sc.camera = cam
    return cam
