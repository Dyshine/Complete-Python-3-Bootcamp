# Models the furniture kit the game drops into the kit houses, in Blender, and exports it as one glTF.
#   python tools/blender/interiors.py -- out.glb   (then tools/blender/glb2json.cjs -> models/interiors/furniture.gltf.json)
# Every piece is its own node, built from bevelled boxes and cylinders with the colour baked into the vertices (one
# material for the lot, so a house's furniture merges into a single draw). Pieces sit on y=0 facing +z (a sofa's seat
# faces +z, its back to -z), in metres. The world ended a while ago: cushions are faded, a chair lies on its side, there
# are papers and boards on the floor.
import bpy, bmesh, sys, math, random
from mathutils import Vector, Matrix

DST = sys.argv[sys.argv.index('--') + 1:][0]
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)

def hexc(h, k=1.0):
    return ((h >> 16 & 255) / 255 * k, (h >> 8 & 255) / 255 * k, (h & 255) / 255 * k, 1.0)

class Piece:
    def __init__(self, name):
        self.name = name; self.bm = bmesh.new(); self.col = self.bm.loops.layers.color.new('Col')
    def _paint(self, faces, c):
        for f in faces:
            for l in f.loops: l[self.col] = c
    # new geometry is found by identity, not by index: bevel frees the cube's corners and the next primitive reuses those slots
    def _mark(self): return set(self.bm.verts)
    def _since(self, before): return [v for v in self.bm.verts if v not in before]
    def _place(self, n0, x, y, z, rx, ry, rz, c, shade):
        new = self._since(n0)
        M = Matrix.Translation((x, -z, y)) @ Matrix.Rotation(ry, 4, 'Z') @ Matrix.Rotation(rx, 4, 'X') @ Matrix.Rotation(rz, 4, 'Y')
        bmesh.ops.transform(self.bm, matrix=M, verts=new)
        self._paint({f for v in new for f in v.link_faces}, hexc(c, shade))
    def box(self, w, h, d, x=0, y=0, z=0, c=0x888888, bevel=.015, rx=0, ry=0, rz=0, shade=1.0):
        """w across, h up, d deep; sits on y with its base centred on (x, z)."""
        n0 = self._mark()
        vs = bmesh.ops.create_cube(self.bm, size=1)['verts']
        bmesh.ops.scale(self.bm, vec=(w, d, h), verts=vs)          # Blender z is up, -y is the piece's front
        bmesh.ops.translate(self.bm, vec=(0, 0, h / 2), verts=vs)
        if bevel > 0:
            edges = list({e for v in vs for e in v.link_edges})
            bmesh.ops.bevel(self.bm, geom=vs + edges, offset=min(bevel, w / 3, h / 3, d / 3), segments=1, affect='EDGES')
        self._place(n0, x, y, z, rx, ry, rz, c, shade)
    def cyl(self, r, h, x=0, y=0, z=0, c=0x888888, seg=10):
        n0 = self._mark()
        vs = bmesh.ops.create_cone(self.bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=h)['verts']
        bmesh.ops.translate(self.bm, vec=(0, 0, h / 2), verts=vs)
        self._place(n0, x, y, z, 0, 0, 0, c, 1.0)
    def done(self):
        me = bpy.data.meshes.new(self.name); self.bm.to_mesh(me); self.bm.free()
        for ca in [c for c in me.color_attributes if c.name != 'Col']: me.color_attributes.remove(ca)
        me.color_attributes.active_color = me.color_attributes['Col']; me.color_attributes.render_color_index = 0
        ob = bpy.data.objects.new(self.name, me); bpy.context.scene.collection.objects.link(ob)
        me.materials.append(MAT)
        return ob

MAT = bpy.data.materials.new('furniture'); MAT.use_nodes = True

# fabric and wood palettes (faded)
FAB = [0x6a5a4a, 0x5a6470, 0x7a5a48, 0x6e6a52, 0x5a4a52]
WOOD, DARKW, PALEW = 0x6a4a30, 0x4a3424, 0x9a7a58

def sofa(name, fab, seats=3):
    p = Piece(name); w = .62 * seats + .3
    p.box(w, .42, .9, 0, 0, 0, fab, .04, shade=.85)                     # base
    p.box(w, .5, .2, 0, .42, -.35, fab, .05)                             # back
    for s in (-1, 1): p.box(.16, .24, .9, s * (w / 2 - .08), .42, 0, fab, .05)  # arms
    for i in range(seats):
        p.box(.6, .1, .62, -w / 2 + .15 + .31 + i * .62, .42, .08, fab, .04, shade=1.08 - .05 * i)
    p.box(.5, .12, .16, -w / 2 + .5, .52, -.2, fab, .04, rx=.25, shade=.95)  # a fallen cushion leaning
    for x in (-w / 2 + .1, w / 2 - .1):
        for zz in (-.35, .35): p.box(.05, .06, .05, x, -.06, zz, DARKW, 0)
    return p.done()

def armchair(name, fab):
    p = Piece(name)
    p.box(.85, .4, .85, 0, 0, 0, fab, .04, shade=.85); p.box(.85, .55, .18, 0, .4, -.34, fab, .05)
    for s in (-1, 1): p.box(.15, .26, .85, s * .35, .4, 0, fab, .05)
    p.box(.56, .1, .6, 0, .4, .07, fab, .04, shade=1.05)
    return p.done()

def coffee_table(name):
    p = Piece(name)
    p.box(1.1, .05, .6, 0, .4, 0, WOOD, .01)
    for x in (-.5, .5):
        for z in (-.25, .25): p.box(.05, .4, .05, x, 0, z, DARKW, 0)
    p.box(.25, .02, .32, .2, .45, .05, 0xd8d0b8, 0, ry=.4)                  # a magazine
    p.cyl(.04, .1, -.3, .45, -.1, 0xb8b0a0)                               # a mug
    return p.done()

def dining(name):
    p = Piece(name)
    p.box(1.4, .05, .85, 0, .74, 0, PALEW, .012)
    for x in (-.62, .62):
        for z in (-.36, .36): p.box(.06, .74, .06, x, 0, z, WOOD, 0)
    for x, z, ry in ((-.4, .65, math.pi), (.35, .72, math.pi + .3), (0, -.68, 0)):  # chairs pulled out, one askew
        bx, bz = x - .2 * math.sin(ry), z - .2 * math.cos(ry)
        p.box(.42, .04, .42, x, .45, z, WOOD, .01, ry=ry); p.box(.42, .5, .04, bx, .47, bz, WOOD, .01, ry=ry)
        for dx in (-.18, .18):
            for dz in (-.18, .18): p.box(.035, .45, .035, x + dx, 0, z + dz, DARKW, 0)
    return p.done()

def chair_down(name):
    p = Piece(name)  # a chair knocked over onto its back
    p.box(.42, .04, .42, 0, .2, 0, WOOD, .01, rx=math.pi / 2)
    p.box(.42, .04, .48, 0, .02, -.3, WOOD, .01)
    for dx in (-.18, .18):
        for dy in (.02, .38): p.box(.035, .035, .45, dx, dy, .25, DARKW, 0)
    return p.done()

def bed(name, blanket):
    p = Piece(name)
    p.box(1.5, .3, 2.05, 0, .1, 0, WOOD, .02)                              # frame
    p.box(1.4, .22, 1.95, 0, .4, 0, 0xd8d2c4, .05)                         # mattress
    p.box(1.46, .1, 1.3, 0, .58, .3, blanket, .05, rx=.03)                 # blanket, pulled half off
    p.box(1.0, .42, .05, .1, .14, 1.04, blanket, .02, rx=-.12, shade=.9)       # its end hanging over the foot of the bed
    p.box(.55, .14, .35, -.35, .6, -.75, 0xe8e2d4, .06); p.box(.55, .14, .35, .35, .6, -.75, 0xe0dacc, .06)
    p.box(1.5, 1.0, .08, 0, 0, -1.02, DARKW, .02)                          # headboard
    return p.done()

def dresser(name):
    p = Piece(name)
    p.box(1.1, .95, .5, 0, 0, 0, WOOD, .015)
    for i in range(3):
        y = .12 + i * .28
        p.box(1.0, .24, .04, 0, y, .25, PALEW if i != 1 else DARKW, .01, shade=.95)  # one drawer missing (dark)
        p.box(.12, .03, .03, 0, y + .1, .28, 0x2a2622, 0)
    p.box(.3, .4, .03, .25, .95, -.2, 0x8a9aa0, 0)                          # a mirror leaning
    return p.done()

def bookshelf(name):
    p = Piece(name)
    p.box(.9, 1.85, .32, 0, 0, 0, DARKW, .015)
    for i in range(5): p.box(.84, .03, .3, 0, .08 + i * .42, .01, WOOD, 0)
    rnd = random.Random(3)
    for i in range(4):
        x = -.38
        while x < .36:
            w = rnd.uniform(.04, .08); h = rnd.uniform(.22, .32)
            if rnd.random() < .82: p.box(w, h, .2, x + w / 2, .11 + i * .42, .03, rnd.choice([0x7a2e22, 0x2e4a6a, 0x5a6a3a, 0xb89a5a, 0x3a3030, 0x8a6a4a]), 0)
            x += w + .006
    return p.done()

def kitchen(name):
    p = Piece(name)
    p.box(2.4, .86, .6, 0, 0, 0, 0xc8c0b0, .012)                           # cabinets
    p.box(2.44, .04, .64, 0, .86, 0, 0x4a4844, .006)                       # worktop
    for i in range(4): p.box(.56, .7, .02, -.9 + i * .6, .08, .3, 0xd8d0c0, .006, shade=.95)
    p.box(.5, .02, .38, .55, .9, .02, 0x9aa0a4, 0)                          # sink
    p.box(1.4, .6, .34, -.4, 1.45, -.13, 0xc8c0b0, .012)                   # wall cupboards
    p.cyl(.12, .2, -.6, .9, 0, 0x8a8a84)                                    # a pot
    return p.done()

def fridge(name):
    p = Piece(name)
    p.box(.72, 1.8, .7, 0, 0, 0, 0xd8d6cc, .03)
    p.box(.7, .02, .02, 0, 1.15, .36, 0x5a5a56, 0); p.box(.03, .5, .04, .3, 1.3, .37, 0x9a9a96, 0)
    p.box(.03, .4, .04, .3, .5, .37, 0x9a9a96, 0)
    return p.done()

def tv(name):
    p = Piece(name)
    p.box(1.2, .5, .42, 0, 0, 0, DARKW, .015)
    p.box(.9, .56, .06, 0, .5, -.06, 0x1a1a1c, .01); p.box(.24, .04, .2, 0, .5, -.05, 0x2a2a2c, 0)
    return p.done()

def rug(name, c):
    p = Piece(name); p.box(2.2, .015, 1.5, 0, 0, 0, c, 0); p.box(1.9, .017, 1.2, 0, 0, 0, c, 0, shade=1.25)
    return p.done()

def lamp(name):
    p = Piece(name); p.cyl(.16, .03, 0, 0, 0, 0x2a2a2a); p.cyl(.015, 1.5, 0, .03, 0, 0x3a3a3a)
    p.cyl(.2, .25, 0, 1.45, 0, 0xd8c8a0, 12)
    return p.done()

def debris(name):
    p = Piece(name); rnd = random.Random(11)
    for i in range(6): p.box(rnd.uniform(.18, .3), .005, rnd.uniform(.22, .3), rnd.uniform(-.8, .8), 0, rnd.uniform(-.6, .6), 0xe6e0d0, 0, ry=rnd.uniform(0, 3))
    for i in range(3): p.box(1.4, .025, .14, rnd.uniform(-.5, .5), .02 + i * .03, rnd.uniform(-.4, .4), PALEW, .005, ry=rnd.uniform(0, 3))
    p.box(.4, .3, .3, .7, 0, -.5, 0xa88a5a, .01, ry=.5)                    # a cardboard box
    return p.done()

def wall(name):
    p = Piece(name); p.box(1.0, 2.4, .12, 0, 0, 0, 0xc8bca8, .005)       # a 1 m interior wall panel, stretched in the game
    p.box(1.0, .1, .14, 0, 0, 0, 0x5a4a3a, 0)                              # skirting
    return p.done()

obs = [sofa('sofa_a', FAB[0]), sofa('sofa_b', FAB[1], 2), armchair('armchair_a', FAB[2]), armchair('armchair_b', FAB[3]),
       coffee_table('coffee_table'), dining('dining'), chair_down('chair_down'), bed('bed_a', 0x7a3a34), bed('bed_b', 0x3a5a6a),
       dresser('dresser'), bookshelf('bookshelf'), kitchen('kitchen'), fridge('fridge'), tv('tv'), rug('rug_a', 0x7a4a3a),
       rug('rug_b', 0x4a5a6a), lamp('lamp'), debris('debris'), wall('wall')]
for i, o in enumerate(obs): o.location.x = (i % 5) * 3.5; o.location.y = (i // 5) * 3.5   # spread out for previews; the game zeroes them
bpy.ops.export_scene.gltf(filepath=DST, export_format='GLB', export_attributes=True, export_vertex_color='ACTIVE', export_all_vertex_colors=True)
print('PIECES', [o.name for o in obs], sum(len(o.data.vertices) for o in obs))
