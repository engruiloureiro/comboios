import re,olefile
exec(open('mats.py').read().split('import sys')[0])
fa=[s for s in olefile.OleFileIO(fn).listdir() if s[0].startswith('FileAssetMetaData')][0][0]
d=olefile.OleFileIO(fn).openstream(fa).read()
A={}
for m in re.finditer(rb'B\x00i\x00t\x00m\x00a\x00p\x00',d):
    g=d[m.start()-20:m.start()-4];p=re.match(rb'(?:[\x20-\x7e]\x00)+',d[m.end()+6:]).group().decode('utf-16le')
    A[g]=p.split('\\')[-1]
def bmfile(i):
    for k,v in refs(inst[i]).items():
        if v>=0 and cname(v)=='ParamBlock2':
            b=sc[inst[v]['o']:inst[v]['e']]
            for g,p in A.items():
                if g in b:return p
def texs(i,seen=None,dep=0):
    seen=seen or set()
    if i<0 or i in seen or dep>5:return []
    seen.add(i);out=[]
    if cname(i)=='Bitmap':f=bmfile(i);return [f] if f else []
    if cname(i)=='Multi/Sub-Object':
        res=[]
        for k,v in sorted(refs(inst[i]).items()):
            if v>=0 and cname(v)!='ParamBlock2':res.append(texs(v,set(),dep+1))
        return res
    for k,v in refs(inst[i]).items():out+=texs(v,seen,dep+1)
    return out
MAT={}
for ix,c in enumerate(inst):
    if cls[c['id']]=='Node':
        nm=raw(c,0x962).decode('utf-16le');m=refs(c).get(3,-1)
        MAT[nm]=texs(m) if m>=0 else []
        if __name__=='__main__':print(nm,MAT[nm])
