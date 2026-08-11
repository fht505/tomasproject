# Engine block cutaway — the season's highest-reuse 3D asset (eps 4-8).
# Half-sectioned inline-4: two exposed cylinder bores with pistons, translucent
# coolant jackets wrapping the bores, the head gasket as a bright sealing
# plane, head mass above with valve hints. Same rig grammar as brake_corner:
# scanned/graded materials, 4-point lighting + HDRI reflections with dark
# camera backdrop, slow ramped orbit.
# Run: blender --background --python engine_cutaway.py -- <out_dir> [frames]
import bpy, math, sys, os

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else os.path.join(os.path.dirname(__file__), 'render_engine')
FRAMES = int(argv[1]) if len(argv) > 1 else 240
os.makedirs(OUT, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__))

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def mat(name, base, metallic=0.0, rough=0.5, clearcoat=0.0, alpha=1.0, emit=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*base, 1)
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    if 'Coat Weight' in b.inputs: b.inputs['Coat Weight'].default_value = clearcoat
    if alpha < 1.0:
        b.inputs['Alpha'].default_value = alpha
        m.blend_method = 'BLEND'
    if emit > 0:
        b.inputs['Emission Color'].default_value = (*base, 1)
        b.inputs['Emission Strength'].default_value = emit
    return m

CAST    = mat('cast_alu',  (0.58, 0.60, 0.63), metallic=1.0, rough=0.4)    # aluminum head
IRON    = mat('cast_iron', (0.13, 0.14, 0.16), metallic=1.0, rough=0.55)   # dark iron block
BORE    = mat('bore',      (0.75, 0.78, 0.80), metallic=1.0, rough=0.15)   # honed cylinder walls
PISTON  = mat('piston',    (0.62, 0.64, 0.66), metallic=1.0, rough=0.3)
COOLANT = mat('coolant',   (0.10, 0.55, 1.0), metallic=0.0, rough=0.1, alpha=0.75, emit=0.9)
GASKET  = mat('gasket',    (1.0, 0.42, 0.05), metallic=0.0, rough=0.5, emit=3.2)  # the star of eps 4-8
DARK    = mat('dark',      (0.06, 0.07, 0.09), metallic=1.0, rough=0.4)
FLOOR   = mat('floor',     (0.006, 0.008, 0.012), metallic=0.0, rough=0.65)

def smooth(o):
    bpy.context.view_layer.objects.active = o
    try: bpy.ops.object.shade_auto_smooth(angle=math.radians(30))
    except Exception: bpy.ops.object.shade_smooth()

BORE_R, BORE_SPACING, BORE_DEPTH = 0.40, 0.88, 1.0
N_SHOWN = 2  # bores fully exposed by the section cut

# ---- block: rounded box, front half sectioned away ------------------------
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.45, -0.1))
block = bpy.context.object; block.name = 'block'
block.scale = (3.7, 1.5, 1.05)
bev = block.modifiers.new('bev', 'BEVEL'); bev.width = 0.06; bev.segments = 4
block.data.materials.append(IRON)

# section cut: remove the front half (−Y side) of the block
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.53, -0.1))
cutter = bpy.context.object; cutter.name = 'cutter'
cutter.scale = (4.2, 1.9, 1.8)
boo = block.modifiers.new('cut', 'BOOLEAN'); boo.operation = 'DIFFERENCE'; boo.object = cutter
cutter.hide_render = True

# bores drilled down through the deck
drills = []
for i in range(4):
    x = (i - 1.5) * BORE_SPACING
    bpy.ops.mesh.primitive_cylinder_add(radius=BORE_R, depth=2.2, location=(x, 0.45, 0.1), vertices=64)
    drills.append(bpy.context.object)
bpy.ops.object.select_all(action='DESELECT')
for d in drills: d.select_set(True)
bpy.context.view_layer.objects.active = drills[0]
bpy.ops.object.join()
drill_obj = bpy.context.object
boo2 = block.modifiers.new('bores', 'BOOLEAN'); boo2.operation = 'DIFFERENCE'; boo2.object = drill_obj
drill_obj.hide_render = True
smooth(block)

# bore liners (visible honed walls) for the two exposed cylinders
for i in range(N_SHOWN):
    x = (i - 1.5) * BORE_SPACING
    bpy.ops.mesh.primitive_cylinder_add(radius=BORE_R - 0.012, depth=BORE_DEPTH, location=(x, 0.45, -0.1), vertices=64)
    liner = bpy.context.object; liner.name = f'liner{i}'
    liner.data.materials.append(BORE)
    lc = liner.modifiers.new('cut', 'BOOLEAN'); lc.operation = 'DIFFERENCE'; lc.object = cutter
    smooth(liner)

# pistons at different stroke positions in the exposed bores
for i, z in ((0, 0.12), (1, -0.42)):
    x = (i - 1.5) * BORE_SPACING
    bpy.ops.mesh.primitive_cylinder_add(radius=BORE_R - 0.03, depth=0.5, location=(x, 0.45, z), vertices=64)
    p = bpy.context.object; p.name = f'piston{i}'
    p.data.materials.append(PISTON)
    pc = p.modifiers.new('cut', 'BOOLEAN'); pc.operation = 'DIFFERENCE'; pc.object = cutter
    smooth(p)
    # ring grooves hint
    for rz in (0.16, 0.10):
        bpy.ops.mesh.primitive_torus_add(major_radius=BORE_R - 0.03, minor_radius=0.012,
                                         location=(x, 0.45, z + rz), major_segments=64, minor_segments=8)
        r = bpy.context.object; r.data.materials.append(DARK); smooth(r)
    # connecting rod stub
    bpy.ops.mesh.primitive_cylinder_add(radius=0.07, depth=0.4, location=(x, 0.45, z - 0.38), vertices=24)
    rod = bpy.context.object; rod.data.materials.append(PISTON); smooth(rod)

# ---- coolant jackets: translucent shells around the exposed bores ---------
for i in range(N_SHOWN):
    x = (i - 1.5) * BORE_SPACING
    bpy.ops.mesh.primitive_cylinder_add(radius=BORE_R + 0.18, depth=0.95, location=(x, 0.45, -0.11), vertices=64)
    jacket = bpy.context.object; jacket.name = f'jacket{i}'
    # hollow it: inner cylinder boolean
    bpy.ops.mesh.primitive_cylinder_add(radius=BORE_R + 0.035, depth=2.0, location=(x, 0.45, -0.1), vertices=64)
    inner = bpy.context.object
    b3 = jacket.modifiers.new('hollow', 'BOOLEAN'); b3.operation = 'DIFFERENCE'; b3.object = inner
    inner.hide_render = True
    # section the jacket like the block so the cut face shows the water gap
    b4 = jacket.modifiers.new('cut', 'BOOLEAN'); b4.operation = 'DIFFERENCE'; b4.object = cutter
    jacket.data.materials.append(COOLANT)
    smooth(jacket)

# ---- head gasket: thin bright plane on the deck ---------------------------
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.45, 0.445))
gasket = bpy.context.object; gasket.name = 'gasket'
gasket.scale = (3.65, 1.45, 0.02)
bg = gasket.modifiers.new('cut', 'BOOLEAN'); bg.operation = 'DIFFERENCE'; bg.object = cutter
# gasket fire rings around bores
bgd = gasket.modifiers.new('bores', 'BOOLEAN'); bgd.operation = 'DIFFERENCE'; bgd.object = drill_obj
gasket.data.materials.append(GASKET)

# ---- head: mass above the gasket, valve hints -----------------------------
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.45, 0.845))
head = bpy.context.object; head.name = 'head'
head.scale = (3.7, 1.5, 0.76)
bh = head.modifiers.new('bev', 'BEVEL'); bh.width = 0.05; bh.segments = 3
bhc = head.modifiers.new('cut', 'BOOLEAN'); bhc.operation = 'DIFFERENCE'; bhc.object = cutter
head.data.materials.append(CAST)
smooth(head)
for i in range(N_SHOWN):
    x = (i - 1.5) * BORE_SPACING
    for dx in (-0.16, 0.16):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=0.7, location=(x + dx, 0.45, 0.75),
                                            rotation=(0, math.radians(12) * (1 if dx > 0 else -1), 0), vertices=16)
        v = bpy.context.object; v.data.materials.append(DARK); smooth(v)

# ---- stand assembly up is not needed (already upright); floor -------------
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -1.35))
floor = bpy.context.object; floor.name = 'floor'; floor.data.materials.append(FLOOR)

# ---- world: HDRI for reflections, dark for camera -------------------------
world = bpy.data.worlds.new('w'); scene.world = world
world.use_nodes = True
nt = world.node_tree
bg_node = nt.nodes['Background']
hdri = os.path.join(HERE, 'studio.hdr')
if os.path.exists(hdri):
    env = nt.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(hdri)
    mapn = nt.nodes.new('ShaderNodeMapping'); tex = nt.nodes.new('ShaderNodeTexCoord')
    mapn.inputs['Rotation'].default_value[2] = math.radians(115)
    nt.links.new(tex.outputs['Generated'], mapn.inputs['Vector'])
    nt.links.new(mapn.outputs['Vector'], env.inputs['Vector'])
    lp = nt.nodes.new('ShaderNodeLightPath')
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    mix.inputs[7].default_value = (0.008, 0.011, 0.016, 1)
    nt.links.new(lp.outputs['Is Camera Ray'], mix.inputs[0])
    nt.links.new(env.outputs['Color'], mix.inputs[6])
    nt.links.new(mix.outputs[2], bg_node.inputs['Color'])
    bg_node.inputs['Strength'].default_value = 0.38
else:
    bg_node.inputs['Color'].default_value = (0.01, 0.013, 0.018, 1)

def light(name, loc, energy, size, color=(1, 1, 1)):
    l = bpy.data.lights.new(name, 'AREA'); l.energy = energy; l.size = size; l.color = color
    o = bpy.data.objects.new(name, l); o.location = loc
    bpy.context.collection.objects.link(o)
    c = o.constraints.new('TRACK_TO')
    return o

key = light('key', (4.2, -2.2, 3.0), 1300, 2.5)
rim = light('rim', (-3.6, 3.2, 2.6), 900, 2, (0.7, 0.82, 1.0))
fill = light('fill', (0.5, -4.2, 0.8), 260, 5)
bounce = light('bounce', (0, -2.2, -0.9), 260, 6)
target = bpy.data.objects.new('aim', None); target.location = (0, 0.2, 0.25)
bpy.context.collection.objects.link(target)
for o in (key, rim, fill, bounce): o.constraints[0].target = target

# ---- camera: ramped orbit, gasket-height framing --------------------------
pivot = bpy.data.objects.new('pivot', None); bpy.context.collection.objects.link(pivot)
cam_data = bpy.data.cameras.new('cam'); cam_data.lens = 45
cam = bpy.data.objects.new('cam', cam_data); bpy.context.collection.objects.link(cam)
cam.parent = pivot
c = cam.constraints.new('TRACK_TO'); c.target = target
scene.camera = cam

scene.frame_start = 1; scene.frame_end = FRAMES
prefs = bpy.context.preferences.edit
prefs.keyframe_new_interpolation_type = 'BEZIER'
for fr, deg in ((1, -30), (int(FRAMES*0.42), -22), (int(FRAMES*0.62), -4), (FRAMES, 4)):
    pivot.rotation_euler = (0, 0, math.radians(deg))
    pivot.keyframe_insert('rotation_euler', frame=fr)
cam.location = (3.6, -8.2, 2.6); cam.keyframe_insert('location', frame=1)
cam.location = (2.8, -6.4, 1.9); cam.keyframe_insert('location', frame=FRAMES)

# gasket glow pulse so the sealing plane reads as "the subject"
g = GASKET.node_tree.nodes['Principled BSDF'].inputs['Emission Strength']
prefs.keyframe_new_interpolation_type = 'BEZIER'
for fr, v in ((1, 2.0), (FRAMES // 2, 4.5), (FRAMES, 2.0)):
    g.default_value = v
    g.keyframe_insert('default_value', frame=fr)

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
