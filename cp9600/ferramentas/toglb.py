import sys,struct,json,math,os
fn=sys.argv[1];out=sys.argv[2];TEX=sys.argv[3]
sys.argv=[None,fn,'x']
exec(open('mt3.py').read())   # dá MAT, inst, poly, refs, world...
exec(open('extract.py').read().split('nodes=[]')[1].split('for n in nodes:\n    W=')[0].replace('json.dump','#'),globals()) if False else None
# reconstruir nós (cópia do extract)
nodes=[]
for ix,c in enumerate(inst):
    if cls[c['id']]!='Node':continue
    nm=raw(c,0x962).decode('utf-16le');par=struct.unpack_from('<i',raw(c,0x960))[0]
    r=refs(c);M,info=prs(r[0]) if r.get(0,-1)>=0 else ([[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]],{})
    op=struct.unpack('<3f',raw(c,0x96a));oq=struct.unpack('<4f',raw(c,0x96b));os_=struct.unpack_from('<3f',raw(c,0x96c))
    nodes.append(dict(ix=ix,name=nm,parent=par,M=M,off=compose(op,mat_qs(oq),os_),obj=r.get(1,-1)))
byix={n['ix']:n for n in nodes}
def world(n):
    p=byix.get(n['parent']);return mul(world(p),n['M']) if p else n['M']
def xf(M,v):return [M[r][0]*v[0]+M[r][1]*v[1]+M[r][2]*v[2]+M[r][3] for r in range(3)]
def tri_poly(idx,tri):
    m=len(idx)
    if m==3:return [(0,1,2)]
    if not tri:return [(0,k,k+1) for k in range(1,m-1)]
    polys=[list(range(m))]
    for k in range(0,len(tri),2):
        a,b=tri[k],tri[k+1]
        for pi,P in enumerate(polys):
            if a in P and b in P:
                ia,ib=sorted((P.index(a),P.index(b)))
                polys[pi:pi+1]=[P[ia:ib+1],P[ib:]+P[:ia+1]];break
    return [tuple(P) for P in polys if len(P)==3]
# z-up (max) -> y-up (gltf): (x,y,z)->(x,z,-y)
def cv(v):return [v[0],v[2],-v[1]]
bin_=bytearray();views=[];accs=[];meshes=[];gnodes=[];mats=[];texs={};images=[];samplers=[{"magFilter":9729,"minFilter":9987,"wrapS":10497,"wrapT":10497}]
def addview(b,target=None):
    while len(bin_)%4:bin_.append(0)
    o=len(bin_);bin_.extend(b);v={"buffer":0,"byteOffset":o,"byteLength":len(b)}
    if target:v["target"]=target
    views.append(v);return len(views)-1
def addacc(arr,ctype,typ,cnt,mn=None,mx=None,target=34962):
    fmt={5126:'f',5125:'I'}[ctype];b=struct.pack('<%d%s'%(len(arr),fmt),*arr)
    a={"bufferView":addview(b,target),"componentType":ctype,"count":cnt,"type":typ}
    if mn:a["min"]=mn;a["max"]=mx
    accs.append(a);return len(accs)-1
def tex(f):
    p=os.path.splitext(f)[0]+'.png';path=os.path.join(TEX,p);jp=os.path.join('tex',os.path.splitext(f)[0]+'.jpg')
    if p not in texs:
        if os.path.exists(jp):images.append({"bufferView":addview(open(jp,'rb').read()),"mimeType":"image/jpeg","name":p})
        else:images.append({"bufferView":addview(open(path,'rb').read()),"mimeType":"image/png","name":p})
        texs[p]=len(images)-1
    return texs[p]
MI={}
def material(f):
    if f in MI:return MI[f]
    t=tex(f);m={"name":os.path.splitext(f)[0],"pbrMetallicRoughness":{"baseColorTexture":{"index":t},"metallicFactor":0.0,"roughnessFactor":0.8},"doubleSided":True}
    if 'Glass' in f:m["alphaMode"]="BLEND";m["pbrMetallicRoughness"]["baseColorFactor"]=[1,1,1,0.35]
    if 'Glow' in f:m["emissiveTexture"]={"index":t};m["emissiveFactor"]=[1,1,1];m["alphaMode"]="BLEND"
    mats.append(m);MI[f]=len(mats)-1;return MI[f]
gltf_tex=[]
skipped=[]
for n in nodes:
    if n['obj']<0 or cname(n['obj'])!='Editable Poly':skipped.append(n['name']);continue
    V,F,UV=poly(n['obj']);T,TF=UV.get(1,UV.get(min(UV)) if UV else (None,None))
    off=n['off'];Vo=[xf(off,v) for v in V]
    tl=MAT.get(n['name'],[])
    multi=bool(tl) and isinstance(tl[0],list)
    groups={}
    # normais por grupos de suavização
    fn_=[]
    for fi,(idx,mat,tri,sm) in enumerate(F):
        a,b,c=(Vo[idx[0]],Vo[idx[1]],Vo[idx[2]])
        # normal de Newell
        nx=ny=nz=0
        for k in range(len(idx)):
            p=Vo[idx[k]];q=Vo[idx[(k+1)%len(idx)]];nx+=(p[1]-q[1])*(p[2]+q[2]);ny+=(p[2]-q[2])*(p[0]+q[0]);nz+=(p[0]-q[0])*(p[1]+q[1])
        l=math.sqrt(nx*nx+ny*ny+nz*nz) or 1;fn_.append((nx/l,ny/l,nz/l))
    vs={}
    for fi,(idx,mat,tri,sm) in enumerate(F):
        for v in idx:vs.setdefault(v,[]).append(fi)
    def vnorm(fi,v):
        sm=F[fi][3];acc=[0,0,0]
        for g in vs[v]:
            if g==fi or (sm and (F[g][3]&sm)):
                for k in range(3):acc[k]+=fn_[g][k]
        l=math.sqrt(sum(x*x for x in acc)) or 1;return [x/l for x in acc]
    for fi,(idx,mat,tri,sm) in enumerate(F):
        if multi:sub=tl[mat%len(tl)];f=sub[0] if sub else 'White.dds'
        else:f=tl[0] if tl else 'White.dds'
        g=groups.setdefault(f,{'p':[],'n':[],'t':[],'i':[]})
        tf=TF[fi] if TF else None;loc=[]
        dd=g.setdefault('d',{})
        for k,v in enumerate(idx):
            P3=cv(Vo[v]);N3=cv(vnorm(fi,v));UV2=[T[tf[k]][0],1-T[tf[k]][1]] if tf else [0,0]
            key=tuple(round(x,5) for x in P3+N3+UV2)
            if key not in dd:dd[key]=len(g['p'])//3;g['p']+=P3;g['n']+=N3;g['t']+=UV2
            loc.append(dd[key])
        for a,b,c in tri_poly(idx,tri):g['i']+=[loc[a],loc[b],loc[c]]
    prims=[]
    for f,g in groups.items():
        cnt=len(g['p'])//3;P=g['p']
        mn=[min(P[k::3]) for k in range(3)];mx=[max(P[k::3]) for k in range(3)]
        prims.append({"attributes":{"POSITION":addacc(P,5126,"VEC3",cnt,mn,mx),"NORMAL":addacc(g['n'],5126,"VEC3",cnt),"TEXCOORD_0":addacc(g['t'],5126,"VEC2",cnt)},
                      "indices":addacc(g['i'],5125,"SCALAR",len(g['i']),target=34963),"material":material(f)})
    meshes.append({"name":n['name'],"primitives":prims})
    W=world(n)
    # matriz do nó convertida para y-up: C*W*C^-1, C=(x,y,z)->(x,z,-y)
    C=[[1,0,0,0],[0,0,1,0],[0,-1,0,0],[0,0,0,1]];Ci=[[1,0,0,0],[0,0,-1,0],[0,1,0,0],[0,0,0,1]]
    Wy=mul(mul(C,W),Ci)
    gnodes.append({"name":n['name'],"mesh":len(meshes)-1,"matrix":[Wy[r][c] for c in range(4) for r in range(4)]})
for i,img in enumerate(images):gltf_tex.append({"source":i,"sampler":0})
G={"asset":{"version":"2.0","generator":"extrator .max (cp9600) — conversão direta do modelo original"},"scene":0,"scenes":[{"nodes":list(range(len(gnodes)))}],
   "nodes":gnodes,"meshes":meshes,"materials":mats,"textures":gltf_tex,"images":images,"samplers":samplers,"accessors":accs,"bufferViews":views,"buffers":[{"byteLength":len(bin_)}]}
js=json.dumps(G).encode();js+=b' '*((4-len(js)%4)%4)
while len(bin_)%4:bin_.append(0)
glb=struct.pack('<III',0x46546C67,2,12+8+len(js)+8+len(bin_))+struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(bin_),0x004E4942)+bytes(bin_)
open(out,'wb').write(glb)
print('nodes',len(gnodes),'skipped',skipped,'bytes',len(glb))
