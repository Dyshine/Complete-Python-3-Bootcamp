# Keys the infected's extra animation clips in Blender and exports them on the shared zombie skeleton.
#   pip install bpy   (Blender as a Python module, 4.2+)
#   python tools/blender/zombie_anims.py -- models/zombies/office.gltf.json out.glb
# then convert out.glb to models/zombies/anim/extra.gltf.json (tools/blender/glb2json.cjs).
#
# Clips: crawl (arm-over-arm on the belly; the game lays the body prone), shamble (a lurching walk with a dragged leg),
# swipe (a wound-up two-handed claw), fall (buckles at the knees and pitches face down), and the runs by speed: jog
# (a lurching jog), sprint (all out, arms clawing ahead), feral (bounding low, hands to the ground) and charge (a brute's).
# Poses are written in the character's own frame (x its left, y up, z forward): limbs are aimed at a direction, the
# spine and head are turned about an axis. Every key is built from rest, parents first, so clips stay on the skeleton
# the four office/grandma/trucker/hulk models share.
import bpy, sys, math
from mathutils import Vector, Quaternion, Matrix

args = sys.argv[sys.argv.index('--') + 1:]
SRC, DST = args[0], args[1]
FPS = 30
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = FPS
bpy.ops.import_scene.gltf(filepath=SRC, bone_heuristic='BLENDER')
arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
for o in [o for o in bpy.data.objects if o.type != 'ARMATURE']: bpy.data.objects.remove(o)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
if arm.animation_data:
    for t in list(arm.animation_data.nla_tracks): arm.animation_data.nla_tracks.remove(t)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='POSE')
P = arm.pose.bones
for pb in P: pb.rotation_mode = 'QUATERNION'
Minv = arm.matrix_world.inverted().to_3x3()

def cdir(v):  # character-frame direction -> armature space
    return (Minv @ Vector((v[0], -v[2], v[1]))).normalized()

ORDER = []
def walk(b):
    ORDER.append(b.name)
    for c in b.children: walk(c)
for b in arm.data.bones:
    if not b.parent: walk(b)

def lerp(a, b, t): return [x + (y - x) * t for x, y in zip(a, b)]
def norm(v):
    l = math.sqrt(sum(x * x for x in v)) or 1
    return [x / l for x in v]

def pose(spec, drop=0.0):
    """spec: bone -> ('aim', dir) or ('rot', [(axis, angle), ...]) in the character frame; drop lowers the hips (m)."""
    for pb in P: pb.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    for name in ORDER:
        if name not in spec and not (name == 'Hips' and drop): continue
        pb = P[name]; M = pb.matrix.copy(); R = M.to_3x3()
        q = Quaternion()
        s = spec.get(name)
        if s and s[0] == 'aim':
            q = R.col[1].normalized().rotation_difference(cdir(s[1]))
        elif s and s[0] == 'rot':
            for ax, ang in s[1]: q = Quaternion(cdir(ax), ang) @ q
        N = (q.to_matrix() @ R).to_4x4(); N.translation = M.translation
        if name == 'Hips' and drop: N.translation = M.translation + Minv @ Vector((0, 0, -drop))  # Minv already holds the unit scale
        pb.matrix = N
        bpy.context.view_layer.update()

def clip(name, dur, keys, fn, loop=True):
    act = bpy.data.actions.new(name)
    arm.animation_data_create(); arm.animation_data.action = act
    n = keys
    for i in range(n + 1):
        t = i / n
        spec, drop = fn(t % 1.0 if loop else t)
        pose(spec, drop)
        f = 1 + round(t * dur * FPS)
        for nm in set(spec) | ({'Hips'} if drop else set()):
            P[nm].keyframe_insert('rotation_quaternion', frame=f)
            if nm == 'Hips' and drop is not None: P[nm].keyframe_insert('location', frame=f)
    arm.animation_data.action = None
    trk = arm.animation_data.nla_tracks.new(); trk.name = name
    trk.strips.new(name, 1, act)
    return act

X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)

# ---- crawl: one second, two hauls; arms reach (F), haul back under the chest (B), swing up and over (L) ----
CF, CB, CL = (.35, .85, .4), (.3, -.05, .95), (.55, .45, -.25)
def crawl_arm(u, side):
    if u < .55:
        t = u / .55; e = t * t * (3 - 2 * t); up = lerp(CF, CB, e); k = math.sin(math.pi * t) * .7
        fore = [up[0], up[1] + .25 * k, up[2] + k]
    else:
        t = (u - .55) / .45; a = lerp(CB, CL, t); b = lerp(CL, CF, t); up = lerp(a, b, t)
        fore = [up[0], up[1] + .5, up[2] - .2]
    return (up[0] * side, up[1], up[2]), (fore[0] * side, fore[1], fore[2])
def pull(u): return math.sin(math.pi * u / .55) if u < .55 else 0
def crawl(p):
    lu, lf = crawl_arm(p, 1); ru, rf = crawl_arm((p + .5) % 1, -1)
    pl, pr = pull(p), pull((p + .5) % 1)
    kl = max(0, math.sin(2 * math.pi * (p + .25))) * .8; kr = max(0, math.sin(2 * math.pi * (p + .75))) * .8
    return {'Spine01': ('rot', [(Z, .09 * (pl - pr)), (Y, .2 * (pl - pr))]),
            'Hips': ('rot', [(Y, -.1 * (pl - pr))]),
            'LeftArm': ('aim', lu), 'LeftForeArm': ('aim', lf), 'RightArm': ('aim', ru), 'RightForeArm': ('aim', rf),
            'LeftUpLeg': ('aim', (.14, -1, .06)), 'RightUpLeg': ('aim', (-.14, -1, .06)),
            'LeftLeg': ('aim', (.1, -.9, -.35 * kl)), 'RightLeg': ('aim', (-.1, -.9, -.35 * kr)),
            'neck': ('rot', [(X, -.7)]), 'Head': ('rot', [(X, -.25 + .08 * math.sin(2 * math.pi * p))])}, 0

# ---- shamble: 1.6 s; the left leg steps, the right one drags stiff; hunched, lurching, arms half up, head lolling ----
def shamble(p):
    w = 2 * math.pi * p
    sl = math.sin(w); sr = math.sin(w + math.pi)
    lstep = max(0, math.sin(w + .6))  # knee lifts while the left leg swings through
    return {'Hips': ('rot', [(Z, .09 * math.sin(w)), (Y, .12 * math.sin(w))]),
            'Spine02': ('rot', [(X, .22), (Z, -.07 * math.sin(w))]),
            'Spine01': ('rot', [(X, .14 + .05 * math.sin(2 * w))]),
            'Spine': ('rot', [(Z, .1 * math.sin(w + .8))]),
            'neck': ('rot', [(Z, .3 + .1 * math.sin(w)), (X, .15)]),
            'Head': ('rot', [(X, .1 * math.sin(2 * w + 1))]),
            'LeftUpLeg': ('aim', (.08, -1, .48 * sl)), 'LeftLeg': ('aim', (.08, -1, .48 * sl - .75 * lstep)),
            'RightUpLeg': ('aim', (-.12, -1, .22 * sr - .05)), 'RightLeg': ('aim', (-.14, -1, .22 * sr - .02)),
            'RightFoot': ('aim', (-.1, -.85, .45)),
            'LeftArm': ('aim', (.35, -.45 + .08 * math.sin(w), .85)), 'LeftForeArm': ('aim', (.2, -.55, .8)),
            'RightArm': ('aim', (-.4, -.75 + .06 * math.sin(w + 1), .55)), 'RightForeArm': ('aim', (-.25, -.85, .45)),
            'LeftHand': ('aim', (.1, -.9, .4)), 'RightHand': ('aim', (-.1, -.95, .3))}, 0

# ---- swipe: 0.9 s; wind up (right arm high and back, chest turned away), rake down across, follow through ----
def ease(t): return t * t * (3 - 2 * t)
def swipe(t):
    a = ease(min(1, t / .38)); b = ease(min(1, max(0, (t - .38) / .17))); c = ease(min(1, max(0, (t - .62) / .38)))
    up = lerp(lerp(lerp((-.3, -.9, .1), (-.55, .75, -.35), a), (.45, -.35, .8), b), (-.3, -.9, .1), c)
    tw = (.5 * a - 1.05 * b) * (1 - c); lean = (-.12 * a + .5 * b) * (1 - c)
    lup = lerp(lerp((.3, -.9, .1), (.3, -.1, .95), a), (.3, -.9, .1), c)
    return {'Spine02': ('rot', [(Y, tw * .4), (X, lean * .5)]), 'Spine01': ('rot', [(Y, tw * .6), (X, lean * .5)]),
            'neck': ('rot', [(X, -.25 * a * (1 - c) + .2 * b * (1 - c))]),
            'RightArm': ('aim', up), 'RightForeArm': ('aim', lerp(up, (0, -.3, 1), .35)),
            'LeftArm': ('aim', lup), 'LeftForeArm': ('aim', lerp(lup, (0, -.2, 1), .4)),
            'LeftUpLeg': ('aim', (.1, -1, .25 * b)), 'RightUpLeg': ('aim', (-.1, -1, -.2 * b))}, 0

# ---- fall: 1.7 s; jolt back, knees buckle, pitch forward onto the face, arms flopping ahead ----
def fall(t):
    j = ease(min(1, t / .15)) * (1 - ease(min(1, max(0, (t - .15) / .2))))
    k = ease(min(1, max(0, (t - .12) / .4)))          # knees go
    f = ease(min(1, max(0, (t - .42) / .4)))          # pitch forward
    d = .55 * k + .5 * f                               # hips drop
    return {'Hips': ('rot', [(X, 1.35 * f - .15 * j)]),
            'Spine01': ('rot', [(X, -.35 * j + .25 * k)]), 'neck': ('rot', [(X, -.4 * j + .3 * f)]),
            'LeftUpLeg': ('aim', lerp((.1, -1, 0), (.15, -.55, .85), k)), 'RightUpLeg': ('aim', lerp((-.1, -1, 0), (-.18, -.6, .8), k)),
            'LeftLeg': ('aim', lerp((.1, -1, 0), (.1, -.7, -.7), k)), 'RightLeg': ('aim', lerp((-.1, -1, 0), (-.1, -.75, -.65), k)),
            'LeftArm': ('aim', lerp(lerp((.4, -.9, 0), (.5, .2, -.3), j), (.5, .3, .8), f)),
            'RightArm': ('aim', lerp(lerp((-.4, -.9, 0), (-.5, .2, -.3), j), (-.4, .1, .9), f)),
            'LeftForeArm': ('aim', lerp((.3, -.9, .2), (.3, .2, .9), f)), 'RightForeArm': ('aim', lerp((-.3, -.9, .2), (-.2, 0, 1), f))}, d

# ---- running, by speed: each a loop of one full stride (left and right), legs driven by a shared helper ----
def run_legs(w, amp, kick, spread=.09, lag=math.pi):
    """thigh swing amplitude, how high the heel kicks up on the recovery, phase between the legs"""
    out = {}
    for side, ph, nm in ((1, 0, 'Left'), (-1, lag, 'Right')):
        sw = math.sin(w + ph); rec = max(0, -math.cos(w + ph))        # recovery: the leg swinging back to front
        out[nm + 'UpLeg'] = ('aim', (spread * side, -1, amp * sw))
        out[nm + 'Leg'] = ('aim', (spread * side * .9, -1, amp * sw - kick * rec))
        out[nm + 'Foot'] = ('aim', (spread * side, -.6, .8 - .5 * rec))
    return out

def jog(p):  # a lurching jog: leaning in, head lolling, loose arms out of time with the legs
    w = 2 * math.pi * p
    s = {'Hips': ('rot', [(Z, .07 * math.sin(w)), (Y, .12 * math.sin(w))]),
         'Spine02': ('rot', [(X, .25), (Z, -.06 * math.sin(w))]), 'Spine01': ('rot', [(X, .12 + .05 * math.sin(2 * w))]),
         'neck': ('rot', [(X, -.12), (Z, .18 * math.sin(w + 1))]), 'Head': ('rot', [(Z, .12 * math.sin(w + 2))]),
         'LeftArm': ('aim', (.35, -.6 + .25 * math.sin(w + math.pi + .5), .55 + .3 * math.sin(w + math.pi))),
         'RightArm': ('aim', (-.35, -.65 + .25 * math.sin(w + .3), .5 + .3 * math.sin(w))),
         'LeftForeArm': ('aim', (.25, -.75, .6)), 'RightForeArm': ('aim', (-.25, -.8, .55))}
    s.update(run_legs(w, .62, .9))
    return s, .03 + .03 * math.cos(2 * w)

def sprint(p):  # all-out sprint: pitched forward, high knees, both arms clawing ahead in turn
    w = 2 * math.pi * p
    s = {'Hips': ('rot', [(X, .12), (Y, .16 * math.sin(w))]),
         'Spine02': ('rot', [(X, .35)]), 'Spine01': ('rot', [(X, .2 + .06 * math.sin(2 * w)), (Y, -.12 * math.sin(w))]),
         'neck': ('rot', [(X, -.45)]), 'Head': ('rot', [(X, -.1), (Z, .08 * math.sin(w))]),
         'LeftArm': ('aim', (.3, -.15 + .45 * math.sin(w + math.pi), .9)), 'RightArm': ('aim', (-.3, -.15 + .45 * math.sin(w), .9)),
         'LeftForeArm': ('aim', (.15, .1 + .3 * math.sin(w + math.pi), 1)), 'RightForeArm': ('aim', (-.15, .1 + .3 * math.sin(w), 1))}
    s.update(run_legs(w, .95, 1.5))
    return s, .06 + .05 * math.cos(2 * w)

def feral(p):  # bounding low, nearly on all fours: hands slap the ground ahead, the legs drive together
    w = 2 * math.pi * p
    s = {'Hips': ('rot', [(X, .55 + .1 * math.sin(w))]),
         'Spine02': ('rot', [(X, .3 + .08 * math.sin(w + 1))]), 'Spine01': ('rot', [(X, .25)]),
         'neck': ('rot', [(X, -1.05)]), 'Head': ('rot', [(X, -.2)]),
         'LeftArm': ('aim', (.25, -1, .55 + .55 * math.sin(w + 2.2))), 'RightArm': ('aim', (-.25, -1, .55 + .55 * math.sin(w + 2.6))),
         'LeftForeArm': ('aim', (.15, -1, .35 + .45 * math.sin(w + 2.2))), 'RightForeArm': ('aim', (-.15, -1, .35 + .45 * math.sin(w + 2.6)))}
    s.update(run_legs(w, .8, 1.2, .14, .45))   # a gallop: the legs nearly together
    return s, .36 + .08 * math.cos(w)

def charge(p):  # a brute's charge: head down, shoulders forward, arms thrown back, long heavy strides
    w = 2 * math.pi * p
    s = {'Hips': ('rot', [(X, .1), (Z, .05 * math.sin(w))]), 'Spine02': ('rot', [(X, .3)]), 'Spine01': ('rot', [(X, .18), (Y, .1 * math.sin(w))]),
         'neck': ('rot', [(X, .25)]), 'Head': ('rot', [(X, -.35)]),
         'LeftArm': ('aim', (.55, -.75, -.3 + .2 * math.sin(w + math.pi))), 'RightArm': ('aim', (-.55, -.75, -.3 + .2 * math.sin(w))),
         'LeftForeArm': ('aim', (.4, -.8, .2)), 'RightForeArm': ('aim', (-.4, -.8, .2))}
    s.update(run_legs(w, .75, 1.1, .12))
    return s, .08 + .06 * math.cos(2 * w)

clip('jog', .8, 16, jog)
clip('sprint', .56, 16, sprint)
clip('feral', .5, 16, feral)
clip('charge', .72, 16, charge)
clip('crawl', 1.0, 16, crawl)
clip('shamble', 1.6, 16, shamble)
clip('swipe', .9, 18, swipe, loop=False)
clip('fall', 1.7, 20, fall, loop=False)
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.export_scene.gltf(filepath=DST, export_format='GLB', export_animations=True, export_animation_mode='NLA_TRACKS',
                          export_skins=True, export_tangents=False)
print('CLIPS', [a.name for a in bpy.data.actions])
