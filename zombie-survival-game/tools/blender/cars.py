# Reworks Kenney's Car Kit (CC0) for the game, in Blender:
#   python tools/blender/cars.py -- models/cars/cars.gltf.json out.glb   (then glb2json.cjs -> models/cars/cars.gltf.json)
# Per car:
#  - glass: the window faces (the palette's glass swatch) are cut out of the body into their own mesh, so the game can
#    draw them as real see-through glass, or leave them out when they're smashed
#  - interior: a dark cabin behind the glass, seat rows and a dashboard sized from where the windows are
#  - wheels: each wheel's origin moved to its hub, so the game can keep them round on its stretched cars
#  - body-wreck: a smashed copy of the body: front end crumpled, roof caved in, panels dented
# Node names stay as the game expects them: <type>/body, <type>/wheel-*, plus <type>/glass, /interior, /body-wreck.
import bpy, bmesh, sys, math, random
from mathutils import Vector, noise

SRC, DST = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
random.seed(5)

def is_glass(uv):  # the ice-white swatch, bottom-left of the palette in glTF UVs (v flips on import)
    return uv.x <= .125 and (1 - uv.y) >= .75

def mat(name, rgb):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True; m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*rgb, 1)
    return m
GLASS_M, INT_M = mat('glass', (.1, .12, .13)), mat('interior', (.08, .07, .065))

def world_bbox(obs):
    pts = [o.matrix_world @ Vector(c) for o in obs for c in o.bound_box]
    return Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])

root = bpy.data.objects['cars']
report = []
for t in list(root.children):
    if t.name.startswith('debris'): continue
    bodies = [o for o in t.children_recursive if o.type == 'MESH' and o.name.split('.')[0] in ('body', 'spoiler')]
    body = next(o for o in bodies if o.name.split('.')[0] == 'body')
    # --- cut the glass out ---
    bm = bmesh.new(); bm.from_mesh(body.data); uvl = bm.loops.layers.uv.active
    gl = [f for f in bm.faces if all(is_glass(l[uvl].uv) for l in f.loops)]
    gb = bmesh.new()
    if gl:
        # copy glass faces into their own mesh, remove them from the body
        vmap = {}
        guv = gb.loops.layers.uv.new('UVMap')
        for f in gl:
            vs = []
            for v in f.verts:
                if v not in vmap: vmap[v] = gb.verts.new(v.co)
                vs.append(vmap[v])
            nf = gb.faces.new(vs)
            for l, ol in zip(nf.loops, f.loops): l[guv].uv = ol[uvl].uv
        bmesh.ops.delete(bm, geom=gl, context='FACES_ONLY')
    bm.to_mesh(body.data); bm.free()
    gme = bpy.data.meshes.new(t.name + '-glass'); gb.to_mesh(gme); gb.free(); gme.materials.append(GLASS_M)
    g = bpy.data.objects.new('glass', gme); bpy.context.scene.collection.objects.link(g)
    g.parent = body.parent; g.matrix_world = body.matrix_world.copy()
    # --- a cabin behind the glass (in the car's own space: Blender x across, -y forward, z up) ---
    bmin, bmax = world_bbox([body]); gmin, gmax = world_bbox([g]) if gl else (bmin, bmax)
    cab = bmesh.new()
    def box(cx, cy, cz, sx, sy, sz):
        r = bmesh.ops.create_cube(cab, size=1)
        bmesh.ops.scale(cab, vec=(sx, sy, sz), verts=r['verts']); bmesh.ops.translate(cab, vec=(cx, cy, cz), verts=r['verts'])
    w = (gmax.x - gmin.x) * .86; base = gmin.z - (gmax.z - gmin.z) * .55; seat_h = (gmin.z - base) * .9
    L = gmax.y - gmin.y; c = (gmax + gmin) / 2
    box(c.x, c.y, base + .01, w, L * .92, .02)                                     # floor
    for k in (.18, .55):                                                           # seat rows, backs toward the rear
        box(c.x, gmin.y + L * k, base + seat_h * .35, w * .9, L * .16, seat_h * .7)
        box(c.x, gmin.y + L * k + L * .1, base + seat_h * .9, w * .9, L * .05, seat_h * .95)
    box(c.x, gmin.y + L * .02, base + seat_h * .95, w, L * .1, seat_h * .35)      # dashboard under the windscreen
    cme = bpy.data.meshes.new(t.name + '-int'); cab.to_mesh(cme); cab.free(); cme.materials.append(INT_M)
    ci = bpy.data.objects.new('interior', cme); bpy.context.scene.collection.objects.link(ci)
    ci.parent = body.parent; ci.matrix_parent_inverse = body.parent.matrix_world.inverted()
    # --- wheels pivot on their hubs ---
    for wobj in [o for o in t.children_recursive if o.type == 'MESH' and o.name.startswith('wheel')]:
        bpy.context.view_layer.objects.active = wobj
        for o in bpy.context.selected_objects: o.select_set(False)
        wobj.select_set(True); bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    # --- the wreck: a copy of the body, front crumpled, roof caved in, panels dented ---
    wk = body.copy(); wk.data = body.data.copy(); wk.name = 'body-wreck'; bpy.context.scene.collection.objects.link(wk)
    wk.parent = body.parent; wk.matrix_world = body.matrix_world.copy()
    bm = bmesh.new(); bm.from_mesh(wk.data)
    lo, hi = wk.matrix_world.inverted() @ bmin, wk.matrix_world.inverted() @ bmax
    mn = Vector([min(lo[i], hi[i]) for i in range(3)]); mx = Vector([max(lo[i], hi[i]) for i in range(3)]); sz = mx - mn
    seed = Vector((random.random() * 50, random.random() * 50, 0))
    for v in bm.verts:
        p = v.co; fy = (mn.y + sz.y * .2 - p.y) / (sz.y * .2)                     # the front fifth (-y is forward)
        if fy > 0: p.y += sz.y * .09 * min(1, fy) ; p.z -= sz.z * .06 * min(1, fy) * (1 if p.z > mn.z + sz.z * .4 else 0)
        rz = (p.z - (mn.z + sz.z * .75)) / (sz.z * .25)                            # the roof
        if rz > 0: p.z -= sz.z * .1 * min(1, rz) * (1 - abs(p.x - (mn.x + sz.x / 2)) / (sz.x * .7))
        d = noise.noise(p * (6 / max(sz)) + seed)                                 # dents
        if p.z > mn.z + sz.z * .25: p += v.normal * d * max(sz) * .02
    bm.to_mesh(wk.data); bm.free()
    report.append((t.name, len(gl), len(wk.data.vertices)))

bpy.ops.export_scene.gltf(filepath=DST, export_format='GLB', export_tangents=False)
print('CARS', report)
