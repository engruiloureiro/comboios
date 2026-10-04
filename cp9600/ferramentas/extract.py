import sys,struct,json,math
from maxr import *
fn=sys.argv[1]
sc,cd,dd=load(fn)
cls=[]
for c in chunks(cd,0,len(cd)):
    nm=''
    for e in c['ch']:
        if e['id']==0x2042:nm=cd[e['o']:e['e']].decode('utf-16le')
    cls.append(nm)
inst=chunks(sc,0,len(sc))[0]['ch']
def ch(c,i):
    for x in c.get('ch',[]):
        if x['id']==i:return x
def raw(c,i):
    x=ch(c,i);return sc[x['o']:x['e']] if x else None
def refs(c):
    r=raw(c,0x2034)
    if r is not None:return {k:v for k,v in enumerate(struct.unpack('<%di'%(len(r)//4),r))}
    r=raw(c,0x2035)
    if r is not None:
        a=struct.unpack('<%di'%(len(r)//4),r)[1:];return {a[k]:a[k+1] for k in range(0,len(a)-1,2)}
    return {}
def cname(i):return cls[inst[i]['id']]
def bez(i):
    c=inst[i];x=ch(c,0x7127)
    if x:
        for y in x['ch']:
            if y['id']==0x2501:return struct.unpack_from('<f',sc,y['o'])[0]
    r=raw(c,0x2501)
    if r:return struct.unpack('<f',r)[0]
    return 0.0
def keys(i):
    # devolve as chaves de animação (se houver) para inspeção
    c=inst[i];out=[]
    def walk(t):
        for y in t:
            if y['id'] in(0x2520,0x2521,0x2522,0x2523,0x2524,0x2525):out.append((hex(y['id']),y['e']-y['o']))
            if y['cont']:walk(y['ch'])
    walk(c.get('ch',[]));return out
def mat_qs(q):
    x,y,z,w=q
    return [[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]]
def compose(t,R,s):
    return [[R[r][0]*s[0],R[r][1]*s[1],R[r][2]*s[2],t[r]] for r in range(3)]+[[0,0,0,1]]
def mul(A,B):return [[sum(A[r][k]*B[k][c] for k in range(4)) for c in range(4)] for r in range(4)]
def euler(rx,ry,rz):
    # 3ds Max Euler XYZ: R = Rz*Ry*Rx (aplicado x primeiro)
    cx,sx,cy,sy,cz,sz=math.cos(rx),math.sin(rx),math.cos(ry),math.sin(ry),math.cos(rz),math.sin(rz)
    Rx=[[1,0,0],[0,cx,-sx],[0,sx,cx]];Ry=[[cy,0,sy],[0,1,0],[-sy,0,cy]];Rz=[[cz,-sz,0],[sz,cz,0],[0,0,1]]
    m=lambda A,B:[[sum(A[r][k]*B[k][c] for k in range(3)) for c in range(3)] for r in range(3)]
    return m(Rz,m(Ry,Rx))
def prs(i):
    r=refs(inst[i]);t=[0,0,0];R=[[1,0,0],[0,1,0],[0,0,1]];s=[1,1,1];info={}
    p=r.get(0);
    if p is not None and p>=0:
        if cname(p)=='Position XYZ':
            pr=refs(inst[p]);t=[bez(pr[k]) for k in range(3)];info['pk']=[keys(pr[k]) for k in range(3)]
        else: info['pos']=cname(p)
    q=r.get(1)
    if q is not None and q>=0:
        if cname(q)=='Euler XYZ':
            rr=refs(inst[q]);e=[bez(rr[k]) for k in range(3)];R=euler(*e);info['rot']=e
        else: info['rotc']=cname(q)
    sc_=r.get(2)
    if sc_ is not None and sc_>=0:
        v=raw(inst[sc_],0x2505)
        if v:s=list(struct.unpack_from('<3f',v))
    return compose(t,R,s),info
def poly(i):
    c=inst[i];g=ch(c,0x8fe)
    if not g:return None
    v=raw(g,0x100);n=struct.unpack_from('<I',v)[0];V=[struct.unpack_from('<3f',v,4+16*k+4) for k in range(n)]
    d=raw(g,0x11a);o=4;nf=struct.unpack_from('<I',d)[0];F=[]
    for k in range(nf):
        m=struct.unpack_from('<I',d,o)[0];o+=4;idx=list(struct.unpack_from('<%dI'%m,d,o));o+=4*m
        f=struct.unpack_from('<H',d,o)[0];o+=2;mat=0;sm=0;tri=None
        if f&1:sm=struct.unpack_from('<I',d,o)[0];o+=4
        if f&8:mat=struct.unpack_from('<H',d,o)[0];o+=2
        if f&0x10:o+=4
        if f&0x20:tri=list(struct.unpack_from('<%dI'%((m-3)*2),d,o));o+=(m-3)*8
        F.append((idx,mat,tri,sm))
    UV={}
    kids=g['ch'];j=0
    while j<len(kids):
        if kids[j]['id']==0x124:
            chn=struct.unpack_from('<i',sc,kids[j]['o'])[0]
            tv=sc[kids[j+1]['o']:kids[j+1]['e']];tf=sc[kids[j+2]['o']:kids[j+2]['e']]
            nt=struct.unpack_from('<I',tv)[0];T=[struct.unpack_from('<3f',tv,4+12*k) for k in range(nt)]
            o=0;TF=[]
            for k in range(nf):
                m=struct.unpack_from('<I',tf,o)[0];o+=4;TF.append(list(struct.unpack_from('<%dI'%m,tf,o)));o+=4*m
            UV[chn]=(T,TF);j+=3
        else:j+=1
    return V,F,UV
nodes=[]
for ix,c in enumerate(inst):
    if cls[c['id']]!='Node':continue
    nm=raw(c,0x962).decode('utf-16le');par=struct.unpack_from('<i',raw(c,0x960))[0]
    r=refs(c);M,info=prs(r[0]) if r.get(0,-1)>=0 else ([[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]],{})
    op=struct.unpack('<3f',raw(c,0x96a)) if raw(c,0x96a) else (0,0,0)
    oq=struct.unpack('<4f',raw(c,0x96b)) if raw(c,0x96b) else (0,0,0,1)
    os_=struct.unpack_from('<3f',raw(c,0x96c)) if raw(c,0x96c) else (1,1,1)
    obj=r.get(1,-1);oc=cname(obj) if obj>=0 else None
    nodes.append(dict(ix=ix,name=nm,parent=par,M=M,info=info,off=compose(op,mat_qs(oq),os_),obj=obj,objc=oc,mat=r.get(3,-1)))
byix={n['ix']:n for n in nodes}
def world(n):
    p=byix.get(n['parent'])
    return mul(world(p),n['M']) if p else n['M']
for n in nodes:
    W=mul(world(n),n['off'])
    print(n['name'],n['objc'],'par',byix[n['parent']]['name'] if n['parent'] in byix else n['parent'],'T',[round(W[r][3],3) for r in range(3)],n['info'] if n['info'] else '')
    n['W']=W
json.dump([{k:v for k,v in n.items() if k in('name','W','obj','objc','mat')} for n in nodes],open(sys.argv[2],'w'))
