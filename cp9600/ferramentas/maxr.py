import olefile,struct,sys
def chunks(d,o,end):
    out=[]
    while o<end:
        if end-o<6:break
        cid,sz=struct.unpack_from('<HI',d,o);h=6
        if sz==0:
            sz=struct.unpack_from('<Q',d,o+6)[0];h=14;cont=bool(sz&(1<<63));sz&=~(1<<63)
        else:
            cont=bool(sz&(1<<31));sz&=~(1<<31)
        if sz<h or o+sz>end: return None
        c={'id':cid,'o':o+h,'e':o+sz,'cont':cont}
        if cont:
            c['ch']=chunks(d,o+h,o+sz)
            if c['ch'] is None:c['cont']=False
        out.append(c);o+=sz
    return out
def load(fn):
    ole=olefile.OleFileIO(fn)
    sc=ole.openstream('Scene').read();cd=ole.openstream('ClassDirectory3').read();dd=ole.openstream('DllDirectory').read()
    return sc,cd,dd
def classdir(cd):
    t=chunks(cd,0,len(cd));res=[]
    for c in t:
        for e in c.get('ch',[c]):
            pass
    return t
if __name__=='__main__':
    sc,cd,dd=load(sys.argv[1])
    t=chunks(cd,0,len(cd))
    def pr(t,dep,d):
        for c in t[:60]:
            print(' '*dep,hex(c['id']),c['e']-c['o'],c['cont'],d[c['o']:min(c['e'],c['o']+40)] if not c['cont'] else '')
            if c['cont'] and dep<4:pr(c['ch'],dep+1,d)
    pr(t,0,cd)
