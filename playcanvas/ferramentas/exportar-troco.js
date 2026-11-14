// Exporta um troço do simulador (index.html) para o protótipo PlayCanvas: eixo, perfil, limites, vias, relevo, estações,
// passagens de nível e sinais. Uso, a partir da raiz do repositório: node playcanvas/ferramentas/exportar-troco.js
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');const ROOT=path.resolve(__dirname,'..','..');
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader']});const p=await b.newPage();
await p.goto('file://'+path.join(ROOT,'index.html'));await p.evaluate(()=>localStorage.setItem('gf-line','guimaraes'));await p.reload();await p.waitForTimeout(2500);await p.click('#bStart4');await p.waitForTimeout(2500);
const D=await p.evaluate(()=>{const T=window.__T,g=window.__GEO(),SEG=g.SEG,A=46600,B=54000,i0=A/SEG,i1=B/SEG;
  const r=v=>Math.round(v*1000)/1000,ax=[];
  for(let i=i0;i<=i1;i++){const q=i*SEG;ax.push([r(g.WX[i]),r(g.WZ[i]),r(g.hy[i]),+g.HDG[i].toFixed(6),T.lim(q),T.LNS(q).map(l=>r(l.o))])}
  // relevo: cota do terreno relativa à via, de 10 em 10 m ao longo e nos desvios laterais de offs (até ±1000 m)
  const offs=[];for(const o of [-1000,-850,-700,-560,-440,-340,-260,-200,-150,-110,-80,-60,-45,-35,-27,-21,-16,-12,-9,-7,-5.5,-4.2,-3,-1.5,0,1.5,3,4.2,5.5,7,9,12,16,21,27,35,45,60,80,110,150,200,260,340,440,560,700,850,1000])offs.push(o);const terr=[];
  for(let q=A;q<=B;q+=10){terr.push(offs.map(o=>Math.round(T.TH(q,o)*100)/100))}
  const st=T.STN.filter(s=>s.pos>A-200&&s.pos<B+200).map(s=>({n:s.n,pos:s.pos,pa:s.pa,pb:s.pb,bc:s.bc,ty:s.ty,pl:s.pl,stopF:s.stopF,stopR:s.stopR,ph:s.ph,dep:s.dep}));
  const pn=T.PNS().filter(x=>x.pos>A&&x.pos<B).map(x=>({pos:x.pos}));
  const sig=T.SIG().filter(g=>g.p>A&&g.p<B).map(g=>({p:g.p,d:g.d,k:g.k}));return{sig,fonte:'Exportado do simulador (index.html): eixo, perfil, limites e vias do troço Lordelo–Vizela da Linha de Guimarães',seg:SEG,p0:A,p1:B,ax,terrOffs:offs,terrStep:10,terr,stations:st,pn}});
fs.writeFileSync(path.join(ROOT,'playcanvas','data','lordelo-vizela.json'),JSON.stringify(D));console.log(D.ax.length,D.terr.length,D.stations.map(s=>s.n),D.pn.length);await b.close()})();
