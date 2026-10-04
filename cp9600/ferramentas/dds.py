import struct,zlib,sys
def png(w,h,rgba):
    raw=b''.join(b'\x00'+bytes(rgba[y*w*4:(y+1)*w*4]) for y in range(h))
    ck=lambda t,d:struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+ck(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+ck(b'IDAT',zlib.compress(raw,9))+ck(b'IEND',b'')
def c565(c):return [((c>>11)&31)*255//31,((c>>5)&63)*255//63,(c&31)*255//31]
def dds(path):
    d=open(path,'rb').read();h,w=struct.unpack_from('<II',d,12);pf=d[76:108];fourcc=pf[8:12];flags=struct.unpack_from('<I',pf,4)[0];bits=struct.unpack_from('<I',pf,12)[0]
    o=128;out=bytearray(w*h*4)
    if fourcc in(b'DXT1',b'DXT3',b'DXT5'):
        bs=8 if fourcc==b'DXT1' else 16
        for by in range(0,h,4):
            for bx in range(0,w,4):
                blk=d[o:o+bs];o+=bs;al=[255]*16
                if fourcc==b'DXT5':
                    a0,a1=blk[0],blk[1];ab=int.from_bytes(blk[2:8],'little')
                    pal=[a0,a1]+([((6-k)*a0+(k+1)*a1)//7 for k in range(6)] if a0>a1 else [((4-k)*a0+(k+1)*a1)//5 for k in range(4)]+[0,255])
                    al=[pal[(ab>>(3*k))&7] for k in range(16)];cb=blk[8:]
                elif fourcc==b'DXT3':
                    ab=int.from_bytes(blk[0:8],'little');al=[((ab>>(4*k))&15)*17 for k in range(16)];cb=blk[8:]
                else:cb=blk
                c0,c1,bitsc=struct.unpack('<HHI',cb);p0,p1=c565(c0),c565(c1)
                if c0>c1 or fourcc!=b'DXT1':cs=[p0,p1,[(2*a+b)//3 for a,b in zip(p0,p1)],[(a+2*b)//3 for a,b in zip(p0,p1)]];tr=False
                else:cs=[p0,p1,[(a+b)//2 for a,b in zip(p0,p1)],[0,0,0]];tr=True
                for k in range(16):
                    x,y=bx+k%4,by+k//4
                    if x<w and y<h:
                        ci=(bitsc>>(2*k))&3;q=(y*w+x)*4;out[q:q+3]=bytes(cs[ci]);out[q+3]=0 if (tr and ci==3) else al[k]
    else:
        bpp=bits//8;rm,gm,bm,am=struct.unpack_from('<IIII',pf,16)
        def ch(v,m):
            if not m:return 255
            s=(m&-m).bit_length()-1;return ((v&m)>>s)*255//(m>>s)
        for k in range(w*h):
            v=int.from_bytes(d[o+k*bpp:o+k*bpp+bpp],'little');out[k*4:k*4+4]=bytes([ch(v,rm),ch(v,gm),ch(v,bm),ch(v,am) if flags&1 else 255])
    return w,h,fourcc,out
if __name__=='__main__':
    for p in sys.argv[1:]:
        w,h,f,o=dds(p);open(p[:-4]+'.png','wb').write(png(w,h,o));print(p,w,h,f)
