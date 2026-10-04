import re,struct
exec(open('extract.py').read().split('nodes=[]')[0])
def strings(i):
    b=sc[inst[i]['o']:inst[i]['e']];return [m.group().decode('utf-16le') for m in re.finditer(rb'(?:[\x20-\x7e]\x00){4,}',b)]
def walk(i,seen,dep=0):
    if i<0 or i in seen or dep>8:return []
    seen.add(i);out=[]
    for s in strings(i):
        if re.search(r'\.(tga|png|dds|ace|jpg)$',s,re.I) and '\\' not in s:out.append(s)
    for k,v in refs(inst[i]).items():out+=walk(v,seen,dep+1)
    return out
import sys
for ix,c in enumerate(inst):
    if cls[c['id']]!='Node':continue
    r=refs(c);nm=raw(c,0x962).decode('utf-16le');m=r.get(3,-1)
    print(nm, cname(m) if m>=0 else None, sorted(set(walk(m,set()))) if m>=0 else '')
