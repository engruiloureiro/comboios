import math
PROJ=lambda la,lo:((lo+8.23)*math.cos(41.44*math.pi/180)*111320,(la-41.44)*110574)
P={'head':(41.15142,-8.60897),'trinM':(41.152528,-8.609306),'lapa':(41.157092,-8.616786),'cm':(41.158611,-8.621925),'avf':(41.160703,-8.628869),'boav':(41.159056,-8.629383),
 'fra':(41.165853,-8.636775),'ram':(41.173033,-8.641861),'cir':(41.17755,-8.646828),'sb':(41.1825,-8.652222),'sdh':(41.18703,-8.65439),'sdhM':(41.188094,-8.654467),'cust':(41.2009611,-8.6553361),'ara':(41.21686,-8.64103)}
X={k:PROJ(*v) for k,v in P.items()}
brg=lambda a,b:math.degrees(math.atan2(b[0]-a[0],b[1]-a[1]))
dist=lambda a,b:math.hypot(b[0]-a[0],b[1]-a[1])
for a,b in [('head','trinM'),('head','lapa'),('lapa','cm'),('cm','avf'),('avf','fra'),('fra','ram'),('ram','cir'),('cir','sb'),('sb','sdh'),('sdh','cust'),('sdh','ara'),('avf','boav')]:
  print(a,b,round(brg(X[a],X[b]),1),round(dist(X[a],X[b])))

def unit(b):r=math.radians(b);return(math.sin(r),math.cos(r))
def add(a,b,s=1):return(a[0]+b[0]*s,a[1]+b[1]*s)
# vértices (PI) e raios: P1 resolvido para que a curva de 160 m comece a 560 m dos para-choques (dentro do túnel)
b0=-35.0;H=X['head']
for it in range(20):
  T1g=locals().get('T1',40);P1=add(H,unit(b0),560+T1g);b1=brg(P1,X['lapa']);T1=160*math.tan(math.radians(abs(b1-b0))/2)
V=[('head',H,0),('P1',P1,160),('avf',X['avf'],200),('fra',X['fra'],300),('ram',X['ram'],400),('sb',X['sb'],300),('sdh',X['sdh'],0),('n',add(X['sdh'],unit(-19.9),700),0)]
# elementos: retas e arcos, s desde os para-choques
els=[];s=0;pos=V[0][1];h=brg(V[0][1],V[1][1])
for k in range(1,len(V)-1):
  A,B,C=V[k-1][1],V[k][1],V[k+1][1];bi=brg(A,B);bo=brg(B,C);d=(bo-bi+540)%360-180;R=V[k][2]
  T=R*math.tan(math.radians(abs(d))/2) if R else 0
  Ls=dist(pos,B)-T;els.append(('L',s,bi,Ls,0));s+=Ls;pos=add(pos,unit(bi),Ls)
  if R:
    La=R*math.radians(abs(d));els.append(('C',s,bi,La,d/La));
    # posição no fim do arco
    pos=add(B,unit(bo),T);s+=La
  print(V[k][0],'deflexão',round(d,1),'T',round(T),'arco',round(R*math.radians(abs(d))) if R else 0,'s0',round(s))
els.append(('L',s,brg(V[-2][1],V[-1][1]),1500,0))
# posição de cada ponto de controlo projetada no eixo
def walk(ds=1):
  pts=[];p=H;s=0
  for t,s0,h0,L,kk in els:
    n=int(L/ds)
    for i in range(n):
      hh=h0+kk*(i+0.5)*ds;p=add(p,unit(hh),ds);s+=ds;pts.append((s,p,h0+kk*(i+1)*ds))
  return pts
pts=walk()
for k in ['trinM','lapa','cm','avf','boav','fra','ram','cir','sb','sdh','sdhM']:
  best=min(pts,key=lambda q:dist(q[1],X[k]));print(k,'s=',best[0],'km(jogo)=',round((best[0]-180)/1000,3),'afast.',round(dist(best[1],X[k]),1))
for e in els:print(e[0],round(e[1],1),round(e[2],2),round(e[3],1),round(e[4],6))
