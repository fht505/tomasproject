# Cooling loop — asset 3 (eps 5-6). Stylized 3D plumbing diagram:
# engine block (right), radiator with fins + fan (left), thermostat bulge on
# the hot top hose, water pump at the block's cold inlet, heater core stub.
# Coolant FLOW is the teaching element: emissive particles travel the loop —
# red-hot leaving the block, blue returning from the radiator.
# Run: blender --background --python cooling_loop.py -- <out_dir> [frames]
import bpy, math, sys, os

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else os.path.join(os.path.dirname(__file__), 'render_loop')
FRAMES = int(argv[1]) if len(argv) > 1 else 240
os.makedirs(OUT, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__))

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def mat(name, base, metallic=0.0, rough=0.5, alpha=1.0, emit=0.0, emit_color=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*base, 1)
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    if alpha < 1.0:
        b.inputs['Alpha'].default_value = alpha
        m.blend_method = 'BLEND'
    if emit > 0:
        b.inputs['Emission Color'].default_value = (*(emit_color or base), 1)
        b.inputs['Emission Strength'].default_value = emit
    return m

IRON   = mat('block',   (0.16, 0.17, 0.19), metallic=1.0, rough=0.5)
ALU    = mat('alu',     (0.55, 0.58, 0.61), metallic=1.0, rough=0.35)
TUBE   = mat('tube',    (0.55, 0.60, 0.65), metallic=0.0, rough=0.12, alpha=0.38)
HOT    = mat('hot',     (1.0, 0.32, 0.06), emit=6.0)
COLD   = mat('cold',    (0.15, 0.55, 1.0), emit=6.0)
BRASS  = mat('brass',   (0.75, 0.55, 0.2), metallic=1.0, rough=0.3)
DARK   = mat('dark',    (0.06, 0.07, 0.09), metallic=1.0, rough=0.4)
FLOOR  = mat('floor',   (0.006, 0.008, 0.012), rough=0.65)

def smooth(o):
    bpy.context.view_layer.objects.active = o
    try: bpy.ops.object.shade_auto_smooth(angle=math.radians(30))
    except Exception: bpy.ops.object.shade_smooth()

# ---- engine block (right side) -------------------------------------------
bpy.ops.mesh.primitive_cube_add(size=1, location=(2.2, 0, 0.2))
block = bpy.context.object; block.scale = (1.3, 1.0, 1.6)
bev = block.modifiers.new('bev', 'BEVEL'); bev.width = 0.05; bev.segments = 3
block.data.materials.append(IRON); smooth(block)
# subtle head on top
bpy.ops.mesh.primitive_cube_add(size=1, location=(2.2, 0, 1.2))
head = bpy.context.object; head.scale = (1.35, 1.05, 0.4)
bh = head.modifiers.new('bev', 'BEVEL'); bh.width = 0.04; bh.segments = 3
head.data.materials.append(ALU); smooth(head)

# ---- radiator (left side): thin box + fin lines + tanks -------------------
bpy.ops.mesh.primitive_cube_add(size=1, location=(-2.4, 0, 0.35))
rad = bpy.context.object; rad.scale = (0.15, 1.1, 1.9)
rad.data.materials.append(ALU); smooth(rad)
for i in range(13):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(-2.4, 0, -0.5 + i * 0.14))
    fin = bpy.context.object; fin.scale = (0.16, 1.05, 0.012)
    fin.data.materials.append(DARK)
for sz in (1, -1):  # end tanks
    bpy.ops.mesh.primitive_cube_add(size=1, location=(-2.4, 0, 0.35 + sz * 1.02))
    tank = bpy.context.object; tank.scale = (0.17, 1.12, 0.16)
    tank.data.materials.append(DARK); smooth(tank)

# ---- fan behind radiator --------------------------------------------------
bpy.ops.mesh.primitive_cylinder_add(radius=0.62, depth=0.06, location=(-2.9, 0, 0.35), rotation=(0, math.radians(90), 0), vertices=48)
fanhub = bpy.context.object; fanhub.data.materials.append(DARK); smooth(fanhub)
fan = bpy.data.objects.new('fan', None); bpy.context.collection.objects.link(fan)
fan.location = (-2.9, 0, 0.35)
for i in range(5):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    blade = bpy.context.object; blade.scale = (0.02, 0.16, 0.5)
    blade.location = (-2.92, math.sin(i * 2 * math.pi / 5) * 0.35, 0.35 + math.cos(i * 2 * math.pi / 5) * 0.35)
    blade.rotation_euler = (i * 2 * math.pi / 5, 0, 0)
    blade.data.materials.append(TUBE); smooth(blade)
    blade.parent = fan
fan.rotation_euler = (0, 0, 0)
fan.keyframe_insert('rotation_euler', frame=1)
fan.rotation_euler = (math.radians(720), 0, 0)
fan.keyframe_insert('rotation_euler', frame=FRAMES)

# ---- hoses as curves with bevel ------------------------------------------
def hose(name, pts, r=0.09):
    curve = bpy.data.curves.new(name, 'CURVE'); curve.dimensions = '3D'
    sp = curve.splines.new('NURBS')
    sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts):
        sp.points[i].co = (*p, 1)
    sp.use_endpoint_u = True
    curve.bevel_depth = r
    curve.bevel_resolution = 6
    o = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(TUBE)
    return o

# hot: block top -> radiator top tank | cold: radiator bottom -> pump -> block bottom
hot_pts  = [(1.55, 0, 1.0), (0.6, 0, 1.45), (-0.9, 0, 1.5), (-2.3, 0, 1.37)]
cold_pts = [(-2.3, 0, -0.67), (-0.9, 0, -0.95), (0.7, 0, -0.85), (1.45, 0, -0.5), (1.75, 0, -0.45)]
hot_hose = hose('hot_hose', hot_pts)
cold_hose = hose('cold_hose', cold_pts)

# thermostat bulge on the hot hose
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.17, location=(0.6, 0, 1.33), segments=32, ring_count=16)
stat = bpy.context.object; stat.data.materials.append(BRASS); smooth(stat)
# water pump at the cold inlet
bpy.ops.mesh.primitive_cylinder_add(radius=0.22, depth=0.22, location=(1.45, 0, -0.5), rotation=(0, math.radians(90), 0), vertices=32)
pump = bpy.context.object; pump.data.materials.append(BRASS); smooth(pump)

# ---- flow particles: spheres following each hose curve --------------------
def flow(curve_obj, material, n=7, dur=70):
    for i in range(n):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.075, location=(0, 0, 0), segments=16, ring_count=8)
        p = bpy.context.object; p.data.materials.append(material)
        c = p.constraints.new('FOLLOW_PATH'); c.target = curve_obj; c.use_fixed_location = True
        phase = i / n
        # loop the travel: several passes across the render
        for k in range(0, FRAMES + dur, dur):
            c.offset_factor = 0.0 if (k + int(phase * dur)) == 0 else 0.0
        # keyframe offset_factor cycling with per-particle phase
        f0 = 1 - phase * dur
        while f0 < FRAMES + dur:
            c.offset_factor = 0.0
            c.keyframe_insert('offset_factor', frame=max(int(f0), 1))
            c.offset_factor = 1.0
            c.keyframe_insert('offset_factor', frame=int(f0 + dur))
            f0 += dur
flow(hot_hose, HOT)
flow(cold_hose, COLD)

# ---- floor + world + lights ----------------------------------------------
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -1.6))
floor = bpy.context.object; floor.data.materials.append(FLOOR)

world = bpy.data.worlds.new('w'); scene.world = world
world.use_nodes = True
nt = world.node_tree; bg_node = nt.nodes['Background']
hdri = os.path.join(HERE, 'studio.hdr')
if os.path.exists(hdri):
    env = nt.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(hdri)
    lp = nt.nodes.new('ShaderNodeLightPath')
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    mix.inputs[7].default_value = (0.008, 0.011, 0.016, 1)
    nt.links.new(lp.outputs['Is Camera Ray'], mix.inputs[0])
    nt.links.new(env.outputs['Color'], mix.inputs[6])
    nt.links.new(mix.outputs[2], bg_node.inputs['Color'])
    bg_node.inputs['Strength'].default_value = 0.4
else:
    bg_node.inputs['Color'].default_value = (0.01, 0.013, 0.018, 1)

def light(name, loc, energy, size, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, 'AREA'); l.energy = energy; l.size = size; l.color = color
    o = bpy.data.objects.new(name, l); o.location = loc
    bpy.context.collection.objects.link(o)
    c = o.constraints.new('TRACK_TO')
    return o

target = bpy.data.objects.new('aim', None); target.location = (0, 0, 0.3)
bpy.context.collection.objects.link(target)
key = light('key', (3.5, -3.0, 3.2), 1100, 2.5)
rim = light('rim', (-3.5, 3.0, 2.8), 800, 2, (0.7, 0.82, 1.0))
fill = light('fill', (0, -4.5, 0.8), 240, 5)
for o in (key, rim, fill): o.constraints[0].target = target

# ---- camera: gentle ramped orbit -----------------------------------------
pivot = bpy.data.objects.new('pivot', None); bpy.context.collection.objects.link(pivot)
cam_data = bpy.data.cameras.new('cam'); cam_data.lens = 38
cam = bpy.data.objects.new('cam', cam_data); bpy.context.collection.objects.link(cam)
cam.parent = pivot
c = cam.constraints.new('TRACK_TO'); c.target = target
scene.camera = cam
scene.frame_start = 1; scene.frame_end = FRAMES
prefs = bpy.context.preferences.edit
prefs.keyframe_new_interpolation_type = 'BEZIER'
for fr, deg in ((1, -14), (int(FRAMES*0.5), 0), (FRAMES, 10)):
    pivot.rotation_euler = (0, 0, math.radians(deg))
    pivot.keyframe_insert('rotation_euler', frame=fr)
cam.location = (0.1, -9.2, 2.2); cam.keyframe_insert('location', frame=1)
cam.location = (0.1, -7.9, 1.8); cam.keyframe_insert('location', frame=FRAMES)

# ---- render ---------------------------------------------------------------
try: scene.render.engine = 'BLENDER_EEVEE_NEXT'
except Exception: scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.fps = 30
scene.render.filepath = os.path.join(OUT, 'frame_')
scene.render.image_settings.file_format = 'PNG'
for attr, val in (('taa_render_samples', 32), ('use_raytracing', True)):
    try: setattr(scene.eevee, attr, val)
    except Exception: pass
try: scene.view_settings.look = 'AgX - Base Contrast'
except Exception: pass
print(f'RENDERING {FRAMES} frames -> {OUT}')
bpy.ops.render.render(animation=True)
print('DONE')
