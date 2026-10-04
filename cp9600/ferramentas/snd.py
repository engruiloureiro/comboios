import wave,struct,json,array,math
R='../rw/CP_9600_RW-main/Sound/'
L=[('idle%d'%k,'Enginesound/idle %d.wav'%k) for k in range(1,8)]+[('up%d'%k,'Enginesound/up %d - %d.wav'%(k,k+1)) for k in range(1,7)]+[('dn%d'%k,'Enginesound/down %d - %d.wav'%(k+1,k)) for k in range(1,7)]
L+=[('door_open','Enginesound/Door_Open.wav'),('door_close','Enginesound/Door_Close.wav'),('door_release','Enginesound/Door_Release.wav'),('door_lock','Enginesound/Door_Lock.wav'),
    ('air1','Enginesound/Air1.wav'),('tacho','Enginesound/Tacograph.wav'),('ding','Enginesound/Ding.wav'),
    ('horn_hi','Hornsound/Horn_Hi.wav'),('horn_lo','Hornsound/Horn_Lo.wav'),('horn','Hornsound/Horn.wav'),
    ('compressor','Diesel/20_compressor.wav'),('airbrake1','Diesel/20_air_brake_1.wav'),('airbrake2','Diesel/20_air_brake_2.wav'),('ebrake','Diesel/20_ebrake_hiss.wav'),
    ('startup','Diesel/20_startup.wav'),('shutdown','Diesel/20_shutdown.wav'),
    ('rumble1','Railsound/rumble1.wav'),('rumble2','Railsound/rumble2.wav'),('flange','Railsound/Flange.wav')]+[('tim%d'%k,'Railsound/tim%d.wav'%k) for k in range(1,5)]
def mulaw(x):
    s=0x80 if x<0 else 0;x=min(32635,abs(x))+132;e=7
    m=0x4000
    while e>0 and not (x&m):e-=1;m>>=1
    man=(x>>(e+3))&0x0f;return (~(s|(e<<4)|man))&0xff
TAB=bytes(mulaw(v) for v in range(-32768,32768))
hdr=[];blob=bytearray()
for nm,f in L:
    w=wave.open(R+f);sr=w.getframerate();n=w.getnframes();d=array.array('h',w.readframes(n))
    if w.getnchannels()==2:d=d[::2]
    out=sr
    if sr>=44100:
        f2=sr//22050;d=array.array('h',[sum(d[i:i+f2])//f2 for i in range(0,len(d)-f2+1,f2)]);out=sr//f2
    b=bytes(TAB[v+32768] for v in d)
    hdr.append([nm,out,len(blob),len(b)]);blob+=b
js=json.dumps(hdr).encode()
pack=struct.pack('<I',len(js))+js+bytes(blob)
open('cp9600_sons.bin','wb').write(pack);print(len(pack),sum(h[3] for h in hdr)/22050)
