# Blender model cleanup for Dead Acre: run as  python clean.py -- src.gltf dst.glb '{json options}'
#  merge: merge-by-distance threshold; dedupe: drop faces that repeat the same corners; decimate: collapse ratio;
#  keep_anims: names to keep (others dropped); one_uv: drop extra UV layers; one_mat: give every mesh one material
import bpy,bmesh,sys,json
a=sys.argv[sys.argv.index('--')+1:];src,dst=a[0],a[1];o=json.loads(a[2]) if len(a)>2 else {}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src,bone_heuristic='BLENDER')
rep={}
for ob in [x for x in bpy.data.objects if x.type=='MESH']:
    me=ob.data;v0=len(me.vertices);bm=bmesh.new();bm.from_mesh(me)
    if o.get('dedupe'):
        bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=o.get('merge',1e-5))
        seen=set();dup=[]
        for f in bm.faces:
            k=tuple(sorted(v.index for v in f.verts))
            if k in seen:dup.append(f)
            else:seen.add(k)
        bmesh.ops.delete(bm,geom=dup,context='FACES_ONLY')
        bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
    elif o.get('merge'):
        bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=o['merge'])
    bm.to_mesh(me);bm.free()
    if o.get('one_uv'):
        while len(me.uv_layers)>1:me.uv_layers.remove(me.uv_layers[-1])
    if o.get('one_mat') and len(me.materials)>1:
        m0=me.materials[0];me.materials.clear();me.materials.append(m0)
    if o.get('decimate'):
        bpy.context.view_layer.objects.active=ob
        d=ob.modifiers.new('dec','DECIMATE');d.ratio=o['decimate'];d.use_collapse_triangulate=True
        # keep the armature modifier after the decimation so weights carry through
        bpy.ops.object.modifier_move_to_index(modifier='dec',index=0)
        bpy.ops.object.modifier_apply(modifier='dec')
    rep[ob.name]=(v0,len(me.vertices),len(me.polygons))
if 'keep_anims' in o:
    for act in list(bpy.data.actions):
        if not any(k.lower() in act.name.lower() for k in o['keep_anims']):bpy.data.actions.remove(act)
bpy.ops.export_scene.gltf(filepath=dst,export_format='GLB',export_tangents=False,export_animations=True,
    export_image_format='JPEG' if o.get('jpeg') else 'AUTO')
print('REPORT',json.dumps(rep),[a.name for a in bpy.data.actions])
