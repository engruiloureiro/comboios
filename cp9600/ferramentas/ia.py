import struct,sys,json
def ia(fn):
    d=open(fn,'rb').read();nf=struct.unpack_from('<i',d,76)[0];nn=struct.unpack_from('<i',d,92)[0]
    nodes=[];o=96
    for k in range(nn):
        nm=d[o+8:o+40].split(b'\0')[0].decode();nt,to=struct.unpack_from('<ii',d,o+40);nodes.append([nm,to,nt]);o+=44
    out={}
    for nm,to,nt in nodes:
        tr={}
        for t in range(nt):
            typ,st,off=struct.unpack_from('<iii',d,to+12*t)
            tr['pos' if typ==0 else 'rot']=[list(struct.unpack_from('<4f',d,off+16*f)) for f in range(nf)]
        out[nm]=tr
    return nf,out
if __name__=='__main__':
    nf,o=ia(sys.argv[1]);print(nf)
    for nm,tr in o.items():
        for k,v in tr.items():print(nm,k,[[round(x,3) for x in v[f]] for f in (0,10,20,31)])
