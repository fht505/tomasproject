# Blender headless scene: the front brake corner in real 3D.
# Run: blender --background --python brake_corner.py -- <out_dir> [frames]
# Builds rotor (cross-drilled, brushed steel), hub + lugs, painted caliper,
# pad stack, on a dark reflective studio floor with 3-point lighting.
# Camera does a slow orbit + push-in. Renders EEVEE PNG frames; ffmpeg
# assembles the mp4 afterwards (outside this script).
import bpy, bmesh, math, sys, os

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else os.path.join(os.path.dirname(__file__), 'render')
FRAMES = int(argv[1]) if len(argv) > 1 else 240
os.makedirs(OUT, exist_ok=True)

# ---- clean slate ---------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def mat(name, base, metallic=0.0, rough=0.5, clearcoat=0.0, aniso=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*base, 1)
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    if 'Coat Weight' in b.inputs: b.inputs['Coat Weight'].default_value = clearcoat
    if 'Anisotropic' in b.inputs: b.inputs['Anisotropic'].default_value = aniso
    return m

STEEL   = mat('steel',   (0.35, 0.38, 0.42), metallic=1.0, rough=0.26, aniso=0.9)

def pbr_metal(name):
    # Poly Haven scanned metal: real diffuse/roughness/normal detail is what
    # separates "rendered" from "photographed" — flat values always read CG
    import os as _os
    base = _os.path.dirname(_os.path.abspath(__file__))
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Metallic'].default_value = 1.0
    def tex(fname, colorspace):
        n = nt.nodes.new('ShaderNodeTexImage')
        n.image = bpy.data.images.load(_os.path.join(base, fname))
        n.image.colorspace_settings.name = colorspace
        n.projection = 'BOX'; n.projection_blend = 0.3
        co = nt.nodes.new('ShaderNodeTexCoord')
        mp = nt.nodes.new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = (3.5, 3.5, 3.5)
        nt.links.new(co.outputs['Object'], mp.inputs['Vector'])
        nt.links.new(mp.outputs['Vector'], n.inputs['Vector'])
        return n
    try:
        d = tex('metal032/Metal032_1K-JPG_Color.jpg', 'sRGB')
        nt.links.new(d.outputs['Color'], b.inputs['Base Color'])
        r = tex('metal032/Metal032_1K-JPG_Roughness.jpg', 'Non-Color')
        nt.links.new(r.outputs['Color'], b.inputs['Roughness'])
        nrm = tex('metal032/Metal032_1K-JPG_NormalGL.jpg', 'Non-Color')
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nm.inputs['Strength'].default_value = 0.6
        nt.links.new(nrm.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    except Exception as e:
        print('PBR fallback:', e)
        b.inputs['Base Color'].default_value = (0.35, 0.38, 0.42, 1)
        b.inputs['Roughness'].default_value = 0.26
    return m

STEEL_PBR = pbr_metal('steel_pbr')
DARKST  = mat('darkst',  (0.06, 0.07, 0.09), metallic=1.0, rough=0.4)
ORANGE  = mat('caliper', (0.48, 0.055, 0.015), metallic=0.35, rough=0.32, clearcoat=1.0)
PAD     = mat('pad',     (0.65, 0.50, 0.16), metallic=0.0, rough=0.7)
FLOOR   = mat('floor',   (0.012, 0.015, 0.02), metallic=0.0, rough=0.6)

def smooth(o):
    # auto-smooth keeps machined flat faces flat while rounding bevels —
    # plain shade_smooth over boolean-cut caps produces pinwheel artifacts
    bpy.context.view_layer.objects.active = o
    try: bpy.ops.object.shade_auto_smooth(angle=math.radians(30))
    except Exception: bpy.ops.object.shade_smooth()

def add_cyl(name, r, d, loc=(0, 0, 0), rot=(0, 0, 0), verts=96, material=None):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d, vertices=verts, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    if material: o.data.materials.append(material)
    smooth(o)
    return o

# ---- rotor: disc + hat, cross-drilled ------------------------------------
rotor = add_cyl('rotor', 1.0, 0.055, material=STEEL_PBR)
bev = rotor.modifiers.new('bev', 'BEVEL'); bev.width = 0.008; bev.segments = 3
hat = add_cyl('hat', 0.42, 0.16, loc=(0, 0, 0.055), material=STEEL_PBR)
bev2 = hat.modifiers.new('bev', 'BEVEL'); bev2.width = 0.006; bev2.segments = 3

# drill two rings of holes via boolean
drills = []
for ring_r, n, phase in ((0.62, 14, 0.0), (0.82, 14, 0.5)):
    for i in range(n):
        a = (i + phase) * 2 * math.pi / n
        drills.append(add_cyl(f'drill', 0.028, 0.3, loc=(math.cos(a) * ring_r, math.sin(a) * ring_r, 0)))
bpy.ops.object.select_all(action='DESELECT')
for d in drills: d.select_set(True)
bpy.context.view_layer.objects.active = drills[0]
bpy.ops.object.join()
drill_obj = bpy.context.object
boo = rotor.modifiers.new('drill', 'BOOLEAN'); boo.operation = 'DIFFERENCE'; boo.object = drill_obj
bpy.context.view_layer.objects.active = rotor
bpy.ops.object.shade_flat()
drill_obj.hide_render = True

# ---- hub + lugs ----------------------------------------------------------
hub = add_cyl('hub', 0.30, 0.10, loc=(0, 0, 0.135), material=STEEL_PBR)
for i in range(5):
    a = i * 2 * math.pi / 5
    add_cyl('lug', 0.045, 0.06, loc=(math.cos(a) * 0.19, math.sin(a) * 0.19, 0.20), verts=6, material=DARKST)
add_cyl('center', 0.09, 0.12, loc=(0, 0, 0.14), material=DARKST)

# ---- caliper: torus arc straddling the rotor at 12 o'clock ---------------
# Deterministic arc: build a full torus, then delete every vertex whose
# angle from +Y exceeds the half-arc. No cutter objects, no boolean drift.
def torus_arc(name, major, minor, half_deg, z, zscale, material):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor,
                                     major_segments=128, minor_segments=24, location=(0, 0, z))
    o = bpy.context.object; o.name = name
    o.data.materials.append(material)
    bm = bmesh.new(); bm.from_mesh(o.data)
    for v in list(bm.verts):
        ang = abs(math.degrees(math.atan2(v.co.x, v.co.y)))  # 0 at +Y
        if ang > half_deg:
            bm.verts.remove(v)
    bm.to_mesh(o.data); bm.free()
    o.scale = (1.0, 1.0, zscale)
    smooth(o)
    return o

# caliper body hugging the rim, squashed radially so it reads as a housing
cal = torus_arc('caliper', 1.02, 0.20, 38, 0.0, 0.9, ORANGE)
cal.scale = (0.92, 0.92, 0.9)
# end caps close the housing so it doesn't read as a cut tube
for sgn in (1, -1):
    a = math.radians(38) * sgn
    bpy.ops.mesh.primitive_cube_add(size=1, location=(math.sin(a) * 0.94, math.cos(a) * 0.94, 0))
    cap = bpy.context.object; cap.name = f'calcap{sgn}'
    cap.scale = (0.12, 0.08, 0.26)
    cap.rotation_euler = (0, 0, -a)
    cap.data.materials.append(ORANGE)
    b = cap.modifiers.new('bev', 'BEVEL'); b.width = 0.02; b.segments = 3
    smooth(cap)
# pads: dark friction arcs sandwiching the disc faces
for sgn in (1, -1):
    p = torus_arc(f'pad{sgn}', 0.88, 0.05, 30, sgn * 0.065, 2.2, PAD)
    p.scale = (1.0, 1.0, 0.6)

# ---- stand the whole assembly upright, as mounted on a car ---------------
assembly = bpy.data.objects.new('assembly', None)
bpy.context.collection.objects.link(assembly)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.name != 'floor':
        if o.parent is None:
            o.parent = assembly
assembly.rotation_euler = (math.radians(90), 0, math.radians(-16))

# ---- floor ---------------------------------------------------------------
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -1.03))
floor = bpy.context.object; floor.name = 'floor'; floor.data.materials.append(FLOOR)

# ---- lighting: key / rim / fill + dark world -----------------------------
world = bpy.data.worlds.new('w'); scene.world = world
world.use_nodes = True
_nt = world.node_tree
_bg = _nt.nodes['Background']
_hdri_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'studio.hdr')
if os.path.exists(_hdri_path):
    _env = _nt.nodes.new('ShaderNodeTexEnvironment')
    _env.image = bpy.data.images.load(_hdri_path)
    # rotate the HDRI's bright side toward the disc face
    _map = _nt.nodes.new('ShaderNodeMapping'); _tex = _nt.nodes.new('ShaderNodeTexCoord')
    _map.inputs['Rotation'].default_value[2] = math.radians(115)
    _nt.links.new(_tex.outputs['Generated'], _map.inputs['Vector'])
    _nt.links.new(_map.outputs['Vector'], _env.inputs['Vector'])
    # camera sees a dark studio backdrop; materials see the HDRI
    _lp = _nt.nodes.new('ShaderNodeLightPath')
    _mix = _nt.nodes.new('ShaderNodeMix'); _mix.data_type = 'RGBA'
    _dark = (0.008, 0.011, 0.016, 1)
    _mix.inputs[7].default_value = _dark  # B (RGBA)
    _nt.links.new(_lp.outputs['Is Camera Ray'], _mix.inputs[0])
    _nt.links.new(_env.outputs['Color'], _mix.inputs[6])  # A (RGBA)
    _nt.links.new(_mix.outputs[2], _bg.inputs['Color'])  # Result (RGBA)
    _bg.inputs['Strength'].default_value = 0.55
else:
    _bg.inputs['Color'].default_value = (0.012, 0.016, 0.022, 1)

def light(name, kind, loc, energy, size=3.0, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, kind)
    l.energy = energy
    if kind == 'AREA': l.size = size
    l.color = color
    o = bpy.data.objects.new(name, l)
    o.location = loc
    bpy.context.collection.objects.link(o)
    o.rotation_euler = (math.atan2((loc[0]**2 + loc[1]**2) ** 0.5, loc[2]) if False else 0, 0, 0)
    # aim at origin
    c = o.constraints.new('TRACK_TO'); c.target = None
    return o

key = light('key', 'AREA', (4.2, -1.2, 2.6), 1200, size=2.5)
bounce = light('bounce', 'AREA', (0, -2.0, -0.7), 300, size=6)
rim = light('rim', 'AREA', (-3.6, 3.2, 2.4), 900, size=2, color=(0.7, 0.82, 1.0))
fill = light('fill', 'AREA', (0.5, -4.0, 0.6), 180, size=5)
# aim lights at the rotor
target = bpy.data.objects.new('aim', None); target.location = (0, 0, 0)
bpy.context.collection.objects.link(target)
for o in (key, rim, fill, bounce):
    o.constraints[0].target = target

# ---- camera: orbit + push-in --------------------------------------------
pivot = bpy.data.objects.new('pivot', None)
bpy.context.collection.objects.link(pivot)
cam_data = bpy.data.cameras.new('cam'); cam_data.lens = 65
cam = bpy.data.objects.new('cam', cam_data)
bpy.context.collection.objects.link(cam)
cam.parent = pivot
cam.location = (0, -4.4, 1.7)
c = cam.constraints.new('TRACK_TO'); c.target = target
scene.camera = cam

# Blender 5.x removed Action.fcurves (layered actions); set interpolation
# defaults BEFORE inserting keys instead of editing curves afterwards.
scene.frame_start = 1; scene.frame_end = FRAMES
prefs = bpy.context.preferences.edit
prefs.keyframe_new_interpolation_type = 'BEZIER'
for fr, deg in ((1, -34), (int(FRAMES*0.42), -26), (int(FRAMES*0.62), -8), (FRAMES, 0)):
    pivot.rotation_euler = (0, 0, math.radians(deg))
    pivot.keyframe_insert('rotation_euler', frame=fr)
cam.location = (3.1, -5.3, 0.85); cam.keyframe_insert('location', frame=1)
cam.location = (2.4, -4.2, 0.6); cam.keyframe_insert('location', frame=FRAMES)

# rotor spins at constant speed
prefs.keyframe_new_interpolation_type = 'LINEAR'
for obj_name in ('rotor', 'hat'):
    o = bpy.data.objects[obj_name]
    o.rotation_euler = (0, 0, 0); o.keyframe_insert('rotation_euler', frame=1)
    o.rotation_euler = (0, 0, math.radians(160)); o.keyframe_insert('rotation_euler', frame=FRAMES)

# ---- render settings -----------------------------------------------------
try:
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
except Exception:
    scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.fps = 30
scene.render.filepath = os.path.join(OUT, 'frame_')
scene.render.image_settings.file_format = 'PNG'
for attr, val in (('taa_render_samples', 32), ('use_raytracing', True)):
    try: setattr(scene.eevee, attr, val)
    except Exception: pass
try:
    scene.view_settings.look = 'AgX - Base Contrast'
except Exception:
    pass

print(f'RENDERING {FRAMES} frames -> {OUT}')
bpy.ops.render.render(animation=True)
print('DONE')
