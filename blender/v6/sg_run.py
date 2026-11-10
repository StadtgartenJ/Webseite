"""
Stadtgarden v6 – Einstieg: Masterdatei bauen, Testbilder rendern.

In Blender (Skript-Editor oder per MCP):
    import sys; sys.path.insert(0, r"<Repo>/blender/v6")
    import sg_run; sg_run.build_master()                      # baut und speichert blender/v6/stadtgarden_v6.blend
    sg_run.render("produkt", r"<Pfad>.png", (3840, 2160), 256)
Kommandozeile:
    blender -b -P blender/v6/sg_run.py -- build
    blender -b blender/v6/stadtgarden_v6.blend -P blender/v6/sg_run.py -- render produkt out.png 3840 2160 256
"""
import importlib
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import sg_model  # noqa: E402
import sg_plants  # noqa: E402
import sg_studio  # noqa: E402
import sg_anim  # noqa: E402

for _m in (sg_model, sg_plants, sg_studio, sg_anim):
    importlib.reload(_m)

MASTER = os.path.join(HERE, "stadtgarden_v6.blend")
HDRI = os.path.normpath(os.path.join(HERE, "..", "assets", "studio_small_09_4k.exr"))

VIEWS = dict(
    produkt=dict(camera="Kamera_Produkt", frame=0, backdrop="sage"),
    explosion=dict(camera="Kamera_Explosion", frame=168, backdrop="sage"),
)


def build_master(save=True, bg="sage"):
    sg_model.build(plants=sg_plants.build_plants)
    sg_studio.setup(bg)
    if os.path.exists(HDRI):
        sg_studio.hdri(HDRI, strength=0.08)
    sg_anim.setup()
    if save:
        bpy.ops.wm.save_as_mainfile(filepath=MASTER, relative_remap=True)
    return MASTER


def render(view, path, res=(1920, 1080), samples=256, device="GPU", pct=100):
    v = VIEWS[view]
    sc = bpy.context.scene
    if device == "GPU":
        dev = sg_studio.use_gpu()
        device = "GPU" if dev != "CPU" else "CPU"
    sg_studio.cycles(samples=samples, res=res, device=device, pct=pct)
    sc.frame_set(v["frame"])
    sc.camera = bpy.data.objects[v["camera"]]
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path


def render_sequence(folder, res=(1280, 720), samples=128, start=0, end=None, step=1, device="GPU", skip_existing=True):
    """Bildsequenz der Teardown-Animation (Kamera_Film). Vorhandene Bilder werden übersprungen."""
    sc = bpy.context.scene
    if device == "GPU":
        device = "GPU" if sg_studio.use_gpu() != "CPU" else "CPU"
    sg_studio.cycles(samples=samples, res=res, device=device)
    sc.camera = bpy.data.objects["Kamera_Film"]
    os.makedirs(folder, exist_ok=True)
    end = sg_anim.END if end is None else end
    done = []
    for f in range(start, end + 1, step):
        out = os.path.join(folder, f"teardown_{f:04d}.png")
        if skip_existing and os.path.exists(out):
            continue
        sc.frame_set(f)
        sc.render.filepath = out
        bpy.ops.render.render(write_still=True)
        done.append(out)
    return done


if __name__ == "__main__" and "--" in sys.argv:
    args = sys.argv[sys.argv.index("--") + 1 :]
    if args[0] == "build":
        build_master()
    elif args[0] == "render":
        render(args[1], args[2], (int(args[3]), int(args[4])), int(args[5]))
