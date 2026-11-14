// teste de continuidade geométrica e de igualdade do troço comum nas três linhas
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader']});const G={};let bad=0;
for(const line of ['guimaraes','povoa','gp']){const ctx=await b.newContext();const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+require('path').resolve(__dirname,'../index.html'));await p.evaluate(l=>localStorage.setItem('gf-line',l),line);await p.reload();await p.waitForTimeout(2500);
 G[line]=await p.evaluate(()=>window.__GEO());if(errs.length){console.log(line,'ERROS',errs.join('|'));bad++}await ctx.close()}
const g=G.guimaraes,S=g.SEG,iE=Math.floor(g.JSH/S);
// 1) continuidade: saltos de rumo, curvatura, cota e declive em cada linha até 1,5 km depois da bifurcação
for(const [ln,q] of Object.entries(G)){let mH=0,mC=0,mG=0,mY=0,mR=1e9;const n=Math.floor((q.JSH+1500)/S);
 for(let i=1;i<n;i++){const dh=Math.abs(q.HDG[i]-q.HDG[i-1]);mH=Math.max(mH,dh);const k=Math.abs(q.HDG[i+1]-2*q.HDG[i]+q.HDG[i-1]);mC=Math.max(mC,k);
  mG=Math.max(mG,Math.abs(q.grade[i]-q.grade[i-1]));mY=Math.max(mY,Math.abs(q.grade[i]));const c=Math.abs(q.HDG[i+1]-q.HDG[i-1])/(2*S);if(c>1e-6)mR=Math.min(mR,1/c)}
 console.log(ln.padEnd(10),'rumo máx/5m',(mH*180/Math.PI).toFixed(2)+'°','Δcurv',(mC*180/Math.PI).toFixed(3)+'°','raio mín',Math.round(mR)+' m','Δdeclive',(mG*1000).toFixed(2)+'‰','declive máx',(mY*1000).toFixed(1)+'‰');
 if(mH*180/Math.PI>2||mR<150)bad++}
// 2) troço comum idêntico nas três (posição, rumo, cota) até à bifurcação
for(const ln of ['povoa','gp']){const q=G[ln];let d=0,dh=0,dy=0;for(let i=0;i<=iE;i++){d=Math.max(d,Math.hypot(q.WX[i]-g.WX[i],q.WZ[i]-g.WZ[i]));dh=Math.max(dh,Math.abs(q.HDG[i]-g.HDG[i]));dy=Math.max(dy,Math.abs(q.hy[i]-g.hy[i]))}
 console.log('comum guimaraes vs',ln,': Δpos',d.toFixed(3),'m Δrumo',dh.toFixed(5),'rad Δcota',dy.toFixed(3),'m');if(d>0.01||dh>1e-6||dy>1e-3)bad++}
// 3) estações e perfil
for(const s of g.stations.slice(0,6)){const i=Math.floor(s.pos/S);console.log(s.n.padEnd(20),'PK',((s.pos-400)/1000).toFixed(3),'cota',g.hy[i].toFixed(1),'declive',(g.grade[i]*1000).toFixed(1)+'‰')}
console.log('túnel',JSON.stringify(g.TUN.filter(t=>t[0]<2000)),'bifurcação p',g.JSH);

console.log(bad?'FALHOU ('+bad+')':'OK');await b.close()})();
